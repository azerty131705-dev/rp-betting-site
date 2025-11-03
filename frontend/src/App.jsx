import React, { useEffect, useMemo, useState } from "react";
import { fetchMatches, submitBet } from "./api";
import MatchCard from "./components/MatchCard";
import BetSlip from "./components/BetSlip";

export default function App() {
  const [matches, setMatches] = useState([]);
  const [selections, setSelections] = useState([]);
  const [bettorName, setBettorName] = useState("");
  const [stake, setStake] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMatches().then(setMatches).catch((e)=>{ console.error(e); setMatches([]); });
  }, []);

    // APRES — Somme des cotes
    const totalOdd = useMemo(
        () => selections.reduce((acc, s) => acc + Number(s.odd || 0), 0),
        [selections]
    );
    const potentialWin = useMemo(
        () => (Number(stake || 0) * totalOdd).toFixed(2),
        [stake, totalOdd]
    );

    useEffect(() => {
        console.log('DEBUG totalOdd (somme) =', totalOdd, selections.map(s => s.odd));
    }, [totalOdd, selections]);


  const togglePick = (match, pickKey) => {
    const existingIndex = selections.findIndex(s => s.matchId === match.id);
    const odd = match.odds[pickKey];
    const newSel = {
      matchId: match.id,
      home: match.home,
      away: match.away,
      competition: match.competition,
      kickOff: match.kickOff,
      pick: pickKey === "home" ? match.home : pickKey === "away" ? match.away : "Nul",
      odd
    };
    if (existingIndex >= 0) {
      const prev = selections[existingIndex];
      if (prev.pick === newSel.pick) {
        setSelections(selections.filter((_, i) => i !== existingIndex));
      } else {
        const copy = [...selections];
        copy[existingIndex] = newSel;
        setSelections(copy);
      }
    } else {
      setSelections([...selections, newSel]);
    }
  };

  const handleSubmit = async () => {
    if (!bettorName || !stake || selections.length === 0) return;
    setSending(true);
    try {
      const res = await submitBet({ bettorName, stake: Number(stake), selections });
      alert(`Pari envoyé ! Cote totale ${totalOdd.toFixed(2)} • Gain potentiel ${potentialWin}`);
      setSelections([]); setStake(""); setBettorName("");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'envoi du pari.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container">
      <h1>🍻 Paris Sportifs — RP</h1>
      <div className="grid">
        <div>
          {matches.length === 0 && <div className="small">Aucun match aujourd'hui ou chargement...</div>}
          {matches.map(m => (
            <MatchCard key={m.id} match={m} onPick={togglePick} selected={selections.find(s => s.matchId === m.id)?.pick} />
          ))}
        </div>
        <div>
          <div className="card">
            <h3>🧾 Ticket</h3>
            <div className="row" style={{ marginBottom: 8 }}>
              <input className="input" placeholder="Nom du parieur" value={bettorName} onChange={e => setBettorName(e.target.value)} />
            </div>
            <div className="row" style={{ marginBottom: 8 }}>
              <input className="input" placeholder="Mise (ex: 10)" value={stake} onChange={e => setStake(e.target.value)} type="number" min="0" step="0.01" />
            </div>
            <BetSlip selections={selections} onRemove={(id) => setSelections(selections.filter(s => s.matchId !== id))} />
            <div className="row" style={{ justifyContent: "space-between", marginTop: 8 }}>
              <div className="small">Cote totale: <b>{totalOdd.toFixed(2)}</b></div>
              <div className="small">Gain potentiel: <b>{potentialWin}</b></div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="button" disabled={sending || !bettorName || !stake || selections.length===0} onClick={handleSubmit}>
                {sending ? "Envoi..." : "Valider et envoyer à Discord"}
              </button>
            </div>
          </div>
          <div className="small"><p>Astuce: cliquez une 2ᵉ fois sur le même pari pour l'enlever du ticket.</p></div>
        </div>
      </div>
    </div>
  );
}
