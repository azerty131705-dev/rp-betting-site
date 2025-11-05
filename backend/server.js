import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const ODDS_API_KEY = process.env.THEODDS_API_KEY || "";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// ---------- CORS
app.use(
    cors({
        origin: (origin, cb) => {
            const allowed = [
                "http://localhost:5173",
                ...String(CORS_ORIGIN || "")
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
            ];
            if (!origin || allowed.includes(origin) || allowed.includes("*")) return cb(null, true);
            // pour être permissif en prod RP
            return cb(null, true);
        },
    })
);
app.use(express.json());

// ---------- cache local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = process.env.CACHE_DIR || path.join(__dirname, "cache");
await fs.mkdir(CACHE_DIR, { recursive: true }).catch(() => { });

// ---------- utils
function toYMDParis(d = new Date()) {
    return new Date(d).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
}
async function readCache(date) {
    try {
        const s = await fs.readFile(path.join(CACHE_DIR, `${date}.json`), "utf-8");
        return JSON.parse(s);
    } catch {
        return null;
    }
}
async function writeCache(date, payload) {
    await fs.writeFile(path.join(CACHE_DIR, `${date}.json`), JSON.stringify(payload, null, 2), "utf-8");
}

// Normalise une cote : gère "8,5", "8.5", 85 -> 8.5, 20 -> 2.0 etc.
function sanitizeOdd(v) {
    let s = String(v ?? "").trim().replace(",", ".");
    let n = Number(s);
    if (!isFinite(n)) return null;

    // Certains books renvoient 85 au lieu de 8.5 : on corrige prudemment
    if (Number.isInteger(n) && n >= 20 && n < 100 && (n % 5 === 0 || n % 10 === 0)) {
        n = n / 10;
    }
    return Math.round(n * 100) / 100;
}

function sameParisDay(iso, dateISO) {
    return new Date(iso).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }) === dateISO;
}

// ---------- endpoints simples
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ---------- submit bet (SOMME des cotes)
app.post("/api/submit-bet", async (req, res) => {
    try {
        const { bettorName, stake, selections } = req.body || {};
        if (!bettorName || !stake || !Array.isArray(selections) || selections.length === 0) {
            return res.status(400).json({ error: "Requête invalide: nom, mise et sélections requis." });
        }

        const totalOdd = selections.reduce((acc, s) => acc + Number(s.odd || 0), 0);
        const potentialWin = (Number(stake) * totalOdd).toFixed(2);

        const content = [
            `**Nouveau pari** 💸`,
            `👤 Parieur: **${bettorName}**`,
            `💶 Mise: **${stake}**`,
            `🧮 Somme des cotes: **${totalOdd.toFixed(2)}**`,
            `🏆 Gain potentiel: **${potentialWin}**`,
            "",
            selections
                .map(
                    (s, i) =>
                        `• ${i + 1}. ${s.home} vs ${s.away} — *${s.competition}* (${s.kickOff})\n   ➜ **Choix:** ${s.pick} @ ${s.odd}`
                )
                .join("\n"),
        ].join("\n");

        if (!WEBHOOK_URL) {
            console.warn("[WARN] DISCORD_WEBHOOK_URL is not set. Bets will not be sent to Discord.");
        } else {
            await axios.post(WEBHOOK_URL, { content });
        }

        res.json({ ok: true, totalOdd: totalOdd.toFixed(2), potentialWin });
    } catch (e) {
        console.error(e?.response?.data || e.message);
        res.status(500).json({ error: "Erreur serveur" });
    }
});

// ---------- sports constants
const SPORTS = {
    EPL: "soccer_epl",
    LALIGA: "soccer_spain_la_liga",
    L1: "soccer_france_ligue_one",
    BL1: "soccer_germany_bundesliga",
    UCL: "soccer_uefa_champs_league",
};
const SPORT_LABEL = {
    [SPORTS.EPL]: "Premier League",
    [SPORTS.LALIGA]: "Laliga",
    [SPORTS.L1]: "Ligue 1",
    [SPORTS.BL1]: "Bundesliga",
    [SPORTS.UCL]: "Ligue des Champions",
};

// merge events + odds pour garder les matchs même en cours
async function getLeagueMerged(sportKey, dateISO) {
    if (!ODDS_API_KEY) throw new Error("THEODDS_API_KEY manquant dans .env");

    const eventsUrl = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/events`);
    eventsUrl.searchParams.set("dateFormat", "iso");
    eventsUrl.searchParams.set("apiKey", ODDS_API_KEY);
    const { data: eventsData = [] } = await axios.get(eventsUrl.toString());

    const todayEvents = (eventsData || []).filter((e) => sameParisDay(e.commence_time, dateISO));

    const oddsUrl = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
    oddsUrl.searchParams.set("regions", "eu");
    oddsUrl.searchParams.set("markets", "h2h");
    oddsUrl.searchParams.set("oddsFormat", "decimal");
    oddsUrl.searchParams.set("dateFormat", "iso");
    oddsUrl.searchParams.set("apiKey", ODDS_API_KEY);
    const { data: oddsData = [] } = await axios.get(oddsUrl.toString());

    const oddsById = new Map();
    for (const o of oddsData || []) oddsById.set(String(o.id), o);

    const out = [];
    for (const ev of todayEvents) {
        const o = oddsById.get(String(ev.id));
        let best = { home: null, draw: null, away: null, bookmaker: null };

        if (o && Array.isArray(o.bookmakers)) {
            const markets = o.bookmakers.flatMap((bm) =>
                (bm.markets || []).map((m) => ({ bm: bm.title, market: m }))
            );
            const h2h = markets.find((x) => x.market && x.market.key === "h2h");
            if (h2h && Array.isArray(h2h.market.outcomes)) {
                for (const outc of h2h.market.outcomes) {
                    const label = (outc.name || "").toLowerCase();
                    const price = sanitizeOdd(outc.price);
                    if (!isFinite(price)) continue;

                    if (label.includes("draw")) {
                        if (!best.draw || price > best.draw) (best.draw = price), (best.bookmaker = h2h.bm);
                    } else if (label === (ev.home_team || "").toLowerCase()) {
                        if (!best.home || price > best.home) (best.home = price), (best.bookmaker = h2h.bm);
                    } else if (label === (ev.away_team || "").toLowerCase()) {
                        if (!best.away || price > best.away) (best.away = price), (best.bookmaker = h2h.bm);
                    } else {
                        if ((ev.home_team || "").toLowerCase().includes(label)) {
                            if (!best.home || price > best.home) (best.home = price), (best.bookmaker = h2h.bm);
                        } else if ((ev.away_team || "").toLowerCase().includes(label)) {
                            if (!best.away || price > best.away) (best.away = price), (best.bookmaker = h2h.bm);
                        }
                    }
                }
            }
        }

        const kick = new Date(ev.commence_time).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Europe/Paris",
        });

        out.push({
            id: String(ev.id),
            competition: SPORT_LABEL[sportKey] || "Compétition",
            kickOff: kick,
            home: ev.home_team,
            away: ev.away_team,
            odds: {
                home: sanitizeOdd(best.home) ?? 2.2,
                draw: sanitizeOdd(best.draw) ?? 3.3,
                away: sanitizeOdd(best.away) ?? 3.2,
            },
            source: o ? best.bookmaker || "The Odds API" : "En cours — pas de cotes",
        });
    }

    out.sort((a, b) => (a.kickOff || "").localeCompare(b.kickOff || ""));
    return out;
}

async function buildDailyStock(dateISO) {
    const sports = [SPORTS.EPL, SPORTS.LALIGA, SPORTS.L1, SPORTS.BL1, SPORTS.UCL];
    const chunks = await Promise.all(sports.map((s) => getLeagueMerged(s, dateISO)));
    const all = chunks.flat();
    return { date: dateISO, generatedAt: new Date().toISOString(), matches: all };
}

// ---------- API matches + odds (avec cache jour)
app.get("/api/matches-odds", async (req, res) => {
    try {
        const date = req.query.date || toYMDParis();
        const cached = await readCache(date);
        if (cached) return res.json(cached);

        const built = await buildDailyStock(date);
        await writeCache(date, built);
        res.json(built);
    } catch (e) {
        console.error("matches-odds error", e?.response?.data || e.message);
        res.status(500).json({ error: "Impossible de récupérer matchs/cotes." });
    }
});

// ---------- start
app.listen(PORT, () => {
    console.log(`[server] Listening on http://localhost:${PORT}`);
    if (!WEBHOOK_URL) console.warn("[WARN] DISCORD_WEBHOOK_URL is not set.");
    if (!ODDS_API_KEY) console.warn("[WARN] THEODDS_API_KEY is not set.");
});
