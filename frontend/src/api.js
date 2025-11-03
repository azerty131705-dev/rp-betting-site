const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001";

export async function fetchMatches(dateStr) {
  const url = dateStr ? `${API_BASE}/api/matches-odds?date=${dateStr}` : `${API_BASE}/api/matches-odds`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Erreur API matches-odds");
  const data = await res.json();
  return data.matches || [];
}

export async function submitBet(payload) {
  const res = await fetch(`${API_BASE}/api/submit-bet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "HTTP error");
  }
  return res.json();
}
