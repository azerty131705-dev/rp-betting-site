import React from "react";
export default function MatchCard({ match, onPick, selected }) {
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <span className="badge">{match.competition}</span>
          <span className="badge">{match.kickOff}</span>
        </div>
      </div>
      <div className="row" style={{ marginTop: 8, justifyContent: "space-between" }}>
        <div style={{ fontWeight: 700 }}>{match.home} vs {match.away}</div>
      </div>
      <div className="row" style={{ marginTop: 8, gap: 6 }}>
        <button className={`oddbtn ${selected === match.home ? "active" : ""}`} onClick={() => onPick(match, "home")}>
          {match.home} ({match.odds.home})
        </button>
        <button className={`oddbtn ${selected === "Nul" ? "active" : ""}`} onClick={() => onPick(match, "draw")}>
          Nul ({match.odds.draw})
        </button>
        <button className={`oddbtn ${selected === match.away ? "active" : ""}`} onClick={() => onPick(match, "away")}>
          {match.away} ({match.odds.away})
        </button>
      </div>
    </div>
  );
}
