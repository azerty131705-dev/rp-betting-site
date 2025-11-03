import React from "react";
export default function BetSlip({ selections, onRemove }) {
  if (selections.length === 0) return <div className="small">Aucun pari sélectionné.</div>;
  return (
    <div>
      {selections.map((s) => (
        <div key={s.matchId} className="card" style={{ padding: 8, margin: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{s.home} vs {s.away}</div>
              <div className="small">{s.competition} — {s.kickOff}</div>
              <div>Choix: <b>{s.pick}</b> @ <b>{s.odd}</b></div>
            </div>
            <button className="oddbtn" onClick={() => onRemove(s.matchId)}>Enlever</button>
          </div>
        </div>
      ))}
    </div>
  );
}
