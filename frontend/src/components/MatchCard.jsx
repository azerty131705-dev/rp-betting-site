import React from "react";

const fmtOdd = (v) => {
    const n = Number(String(v).replace(",", "."));
    if (!isFinite(n)) return "-";
    // affichage fr : 2,0 / 8,5 / 1,05
    return n.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
};

export default function MatchCard({ match, onPick, selected }) {
    const btn = (key, label) => {
        const odd = fmtOdd(match.odds[key]);
        return (
            <button
                className={`chip ${selected === label ? "active" : ""}`}
                onClick={() => onPick(match, key)}
                title={`${label} @ ${odd}`}
            >
                {label} ({odd})
            </button>
        );
    };

    return (
        <div className="card">
            <div className="small">
                {match.competition} <span style={{ marginLeft: 8 }}>— {match.kickOff}</span>
            </div>
            <h3 style={{ marginTop: 6 }}>
                {match.home} vs {match.away}
            </h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {btn("home", match.home)}
                {btn("draw", "Nul")}
                {btn("away", match.away)}
            </div>
        </div>
    );
}
