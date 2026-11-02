export function regionLabel(regions: Array<{ sido: string; sigungu: string | null }>): string {
  const detailedSidos = new Set(regions.filter((r) => r.sigungu).map((r) => r.sido));
  const list = regions.filter((r) => r.sigungu || !detailedSidos.has(r.sido));
  if (list.length === 0) return "지역 미상";
  const shown = list.slice(0, 3).map((r) => (r.sigungu ? `${r.sido} ${r.sigungu}` : r.sido));
  return list.length > 3 ? `${shown.join(", ")} 외 ${list.length - 3}곳` : shown.join(", ");
}
