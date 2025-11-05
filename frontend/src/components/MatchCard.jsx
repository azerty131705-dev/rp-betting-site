import React from "react";

export default function MatchCard({ match, onPick, selected }) {
    const fmtOdd = (v) => {
        const n = Number(v);
        if (!isFinite(n)) return "-";
        // 2 décimales, puis on enlève un zéro final pour obtenir 2.0, 8.5, 1.05
        const s = n.toFixed(2);
        return s.replace(/(\.\d)0$/, "$1");
    };

    const btn = (key, label) => (
        <button
            className={`chip ${selected === label ? "active" : ""}`}
            onClick={() => onPick(match, key)}
            title={`${label} @ ${fmtOdd(match.odds[key])}`}
        >
            {label} ({fmtOdd(match.odds[key])})
        </button>
    );

    return (
        <div className="card">
            <div className="small">
                {match.competition} <span style={{ marginLeft: 8 }}>— {match.kickOff}</span>
            </div>
            <h3 style={{ marginTop: 6 }}>{match.home} vs {match.away}</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {btn("home", match.home)}
                {btn("draw", "Nul")}
                {btn("away", match.away)}
            </div>
        </div>
    );
}
