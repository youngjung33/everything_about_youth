/**
 * 지역 목록을 한 줄 라벨로. 같은 시도에 시군구가 있으면 "시도만 있는" 항목은 생략하고,
 * 3곳까지 표시한 뒤 나머지는 "외 N곳" 으로 줄인다.
 */
export function regionLabel(regions: Array<{ sido: string; sigungu: string | null }>): string {
  const detailedSidos = new Set(regions.filter((r) => r.sigungu).map((r) => r.sido));
  const list = regions.filter((r) => r.sigungu || !detailedSidos.has(r.sido));
  if (list.length === 0) return "지역 미상";
  const shown = list.slice(0, 3).map((r) => (r.sigungu ? `${r.sido} ${r.sigungu}` : r.sido));
  return list.length > 3 ? `${shown.join(", ")} 외 ${list.length - 3}곳` : shown.join(", ");
}
