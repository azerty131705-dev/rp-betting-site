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

        // selected est le "label" choisi (ex: "Nul", "Chelsea", etc.)
        const isActive =
            selected === label || (selected === "Nul" && key === "draw");

        return (
            <button
                className={`odd-btn ${isActive ? "selected" : ""}`}
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
            <div className="odds-row">
                {btn("home", match.home)}
                {btn("draw", "Nul")}
                {btn("away", match.away)}
            </div>
        </div>
    );
}
