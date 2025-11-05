import React from "react";

// même format que sur les cartes
const fmtOdd = (v) => {
    const n = Number(String(v).replace(",", "."));
    if (!isFinite(n)) return "-";
    const s = n.toFixed(2);
    return s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
};

export default function BetSlip({ selections, onRemove }) {
    if (selections.length === 0) return null;

    return (
        <>
            {selections.map((s) => (
                <div className="row item" key={s.matchId} style={{ alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>
                            {s.home} vs {s.away}
                        </div>
                        <div className="small">
                            {s.competition} — {s.kickOff}
                        </div>
                        <div className="small">
                            Choix: <b>{s.pick}</b> @ <b>{fmtOdd(s.odd)}</b>
                        </div>
                    </div>
                    <button className="button ghost" onClick={() => onRemove(s.matchId)}>
                        Enlever
                    </button>
                </div>
            ))}
        </>
    );
}
