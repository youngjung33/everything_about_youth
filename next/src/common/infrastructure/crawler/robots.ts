/** 최소한의 robots.txt 해석기: User-agent 그룹 선택, Allow/Disallow 최장 일치(동률이면 Allow 우선), * 와 $ 지원 */

interface Rule {
  allow: boolean;
  pattern: string;
}

export interface RobotsPolicy {
  isAllowed(pathAndQuery: string): boolean;
}

export const ALLOW_ALL: RobotsPolicy = { isAllowed: () => true };

function patternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped.endsWith("\\$") ? `${escaped.slice(0, -2)}$` : escaped}`);
}

export function parseRobots(text: string, userAgent: string): RobotsPolicy {
  const ua = userAgent.toLowerCase();
  const groups: Array<{ agents: string[]; rules: Rule[] }> = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if (field === "allow" || field === "disallow") {
      lastWasAgent = false;
      if (current && value !== "") current.rules.push({ allow: field === "allow", pattern: value });
      // 빈 Disallow 는 "모두 허용" 이므로 규칙을 추가하지 않는다.
    } else {
      lastWasAgent = false;
    }
  }

  // 우리 UA 에 가장 구체적으로 일치하는 그룹, 없으면 '*'
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const selected = specific.length > 0 ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = selected.flatMap((g) => g.rules).map((r) => ({ ...r, regexp: patternToRegExp(r.pattern) }));

  return {
    isAllowed(pathAndQuery: string): boolean {
      let best: { allow: boolean; length: number } | null = null;
      for (const rule of rules) {
        if (!rule.regexp.test(pathAndQuery)) continue;
        const length = rule.pattern.length;
        if (!best || length > best.length || (length === best.length && rule.allow)) {
          best = { allow: rule.allow, length };
        }
      }
      return best ? best.allow : true;
    },
  };
}
