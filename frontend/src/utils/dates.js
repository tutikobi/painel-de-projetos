const DAY_MS = 24 * 60 * 60 * 1000;

function parseISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(iso) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function relativeDueLabel(iso) {
  if (!iso) return "sem prazo";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((parseISODate(iso) - today) / DAY_MS);
  if (days === 0) return "vence hoje";
  if (days === 1) return "vence amanhã";
  if (days === -1) return "venceu ontem";
  if (days < 0) return `venceu há ${-days} dias`;
  return `vence em ${days} dias`;
}
