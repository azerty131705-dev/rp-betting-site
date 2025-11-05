import React from "react";

// 8.420 -> "8.42", 8.50 -> "8.5", 2.00 -> "2"
const fmtOdd = (v) => {
    const n = Number(String(v).replace(",", "."));
    if (!isFinite(n)) return "-";
    const s = n.toFixed(2);
    return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
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
