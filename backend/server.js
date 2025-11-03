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

// CORS (autorise localhost + domaine Vercel)
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [ "http://localhost:5173", CORS_ORIGIN ];
    if (!origin || allowed.includes(origin)) return cb(null, true);
    return cb(null, true); // en prod stricte: cb(new Error("Not allowed by CORS"));
  }
}));
app.use(express.json());

// paths / cache (support Render Disks via CACHE_DIR)
import { fileURLToPath as furl } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CACHE_DIR = process.env.CACHE_DIR || path.join(__dirname, "cache");
await fs.mkdir(CACHE_DIR, { recursive: true }).catch(() => {});

// -------- health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// -------- submit bet -> Discord
app.post("/api/submit-bet", async (req, res) => {
  try {
    const { bettorName, stake, selections } = req.body || {};
    if (!bettorName || !stake || !Array.isArray(selections) || selections.length === 0) {
      return res.status(400).json({ error: "Requête invalide: nom, mise et sélections requis." });
    }
    const totalOdd = selections.reduce((acc, s) => acc * Number(s.odd || 1), 1);
    const potentialWin = (Number(stake) * totalOdd).toFixed(2);

    const content = [
      `**Nouveau pari** 💸`,
      `👤 Parieur: **${bettorName}**`,
      `💶 Mise: **${stake}**`,
      `🧮 Cote totale: **${totalOdd.toFixed(2)}**`,
      `🏆 Gain potentiel: **${potentialWin}**`,
      "",
      selections.map((s, idx) =>
        `• ${idx+1}. ${s.home} vs ${s.away} — *${s.competition}* (${s.kickOff})\n   ➜ **Choix:** ${s.pick} @ ${s.odd}`
      ).join("\n")
    ].join("\n");

    if (!WEBHOOK_URL) {
      console.warn("[WARN] DISCORD_WEBHOOK_URL is not set. Bets will not be sent to Discord.");
    } else {
      await axios.post(WEBHOOK_URL, { content });
    }

    res.json({ ok: true, totalOdd: totalOdd.toFixed(2), potentialWin });
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ====== helpers ======
function toYMDParis(d = new Date()) {
  // YYYY-MM-DD en Europe/Paris
  return new Date(d).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
}
async function readCache(date) {
  try {
    const buf = await fs.readFile(path.join(CACHE_DIR, `${date}.json`), "utf-8");
    return JSON.parse(buf);
  } catch { return null; }
}
async function writeCache(date, payload) {
  await fs.writeFile(path.join(CACHE_DIR, `${date}.json`), JSON.stringify(payload, null, 2), "utf-8");
}

// The Odds API
const SPORTS = {
  EPL: "soccer_epl",
  LALIGA: "soccer_spain_la_liga",
  L1: "soccer_france_ligue_one",
  BL1: "soccer_germany_bundesliga",
  UCL: "soccer_uefa_champs_league"
};
const SPORT_LABEL = {
  [SPORTS.EPL]: "Premier League",
  [SPORTS.LALIGA]: "LaLiga",
  [SPORTS.L1]: "Ligue 1",
  [SPORTS.BL1]: "Bundesliga",
  [SPORTS.UCL]: "Ligue des Champions"
};

async function getLeagueOdds(sportKey, dateISO) {
  if (!ODDS_API_KEY) throw new Error("THEODDS_API_KEY manquant dans .env");
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${sportKey}/odds`);
  url.searchParams.set("regions", "eu");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");
  url.searchParams.set("apiKey", ODDS_API_KEY);

  const { data } = await axios.get(url.toString());

  const isSameParisDay = (iso) =>
    new Date(iso).toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" }) === dateISO;

  const events = (data || []).filter(e => isSameParisDay(e.commence_time));

  return events.map(ev => {
    const markets = (ev.bookmakers || []).flatMap(bm =>
      (bm.markets || []).map(m => ({ bm: bm.title, market: m }))
    );
    const h2h = markets.find(x => x.market && x.market.key === "h2h");

    let best = { home: null, draw: null, away: null, bookmaker: null };
    if (h2h && Array.isArray(h2h.market.outcomes)) {
      for (const o of h2h.market.outcomes) {
        const label = (o.name || "").toLowerCase();
        const price = Number(o.price);
        if (!isFinite(price)) continue;
        if (label.includes("draw")) {
          if (!best.draw || price > best.draw) best.draw = price, best.bookmaker = h2h.bm;
        } else if (label === (ev.home_team || "").toLowerCase()) {
          if (!best.home || price > best.home) best.home = price, best.bookmaker = h2h.bm;
        } else if (label === (ev.away_team || "").toLowerCase()) {
          if (!best.away || price > best.away) best.away = price, best.bookmaker = h2h.bm;
        } else {
          if ((ev.home_team||"").toLowerCase().includes(label)) {
            if (!best.home || price > best.home) best.home = price, best.bookmaker = h2h.bm;
          } else if ((ev.away_team||"").toLowerCase().includes(label)) {
            if (!best.away || price > best.away) best.away = price, best.bookmaker = h2h.bm;
          }
        }
      }
    }

    const kick = new Date(ev.commence_time).toLocaleTimeString("fr-FR", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris"
    });

    return {
      id: String(ev.id),
      competition: SPORT_LABEL[sportKey] || "Compétition",
      kickOff: kick,
      home: ev.home_team,
      away: ev.away_team,
      odds: {
        home: best.home ?? 2.2,
        draw: best.draw ?? 3.3,
        away: best.away ?? 3.2
      },
      source: best.bookmaker || "The Odds API"
    };
  });
}

async function buildDailyStock(dateISO) {
  const sports = [SPORTS.EPL, SPORTS.LALIGA, SPORTS.L1, SPORTS.BL1, SPORTS.UCL];
  const chunks = await Promise.all(sports.map(s => getLeagueOdds(s, dateISO)));
  const all = chunks.flat();

  all.sort((a, b) => (a.kickOff || "").localeCompare(b.kickOff || ""));

  return { date: dateISO, generatedAt: new Date().toISOString(), matches: all };
}

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

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  if (!WEBHOOK_URL) console.warn("[WARN] DISCORD_WEBHOOK_URL is not set. Bets will not be sent to Discord.");
  if (!ODDS_API_KEY) console.warn("[WARN] THEODDS_API_KEY is not set.");
});
