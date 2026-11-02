import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const failureName =
  /실패|전파|오류|throws|stale|404|NOT_FOUND|비어|상한|invalid|failed|skipped|BAD_REQUEST|건너|missing|limit|clamp|cancelAll|not_found|없는|잘못|늦게|변조|손상|거절|네트워크|실패면|실패는|실패 전|조회 실패|search 실패|getProgram 실패|getNotice 실패|getScheme 실패|fetchMeta 실패|fetchSaved 실패|merge 실패|저장 실패|해제 실패|상세 실패|목록 실패|first fail|page2 fail|hasMore 가 false|generation 이면|id 가 비어|알림이 꺼져|로드하기 전|키를 잃|평문|context 불일치|손상된|rejects|clearError|error 팩토리|오류가|오류와|오류 문구|다시 시도|장애|끈 서비스|닿지|거부|incompatible|취소|Cancelled|닫으면|탈퇴할 수 없|BAD_RESPONSE|이상하면|https 가 아니|401|403|500|503/i;

const happyName =
  /위임한다|위임\$|성공 시|정상 저장|목록·|캘린더 ICS|load 와 save|fetchMeta 위임|fetchSaved[^실]|merged 상태|generation 을 올리|dedup|이번 주|프리셋|조립|eligible\$|켜져 있으면|기본값|정상 수집|있으면 program|있으면 notice|페이지 필드|다음 페이지를|선택해|로그인|비회원|회원이|카드|필터|판정|북마크|타임라인|신청 가능|파싱한다\$|contract|fromJson|green|returns 200|200 and/i;

function indent(line: string): number {
  const m = /^ */.exec(line);
  return m ? m[0].length : 0;
}

function checkFile(filePath: string, violations: string[]): void {
  const rel = filePath.replace(/\\/g, "/");
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const groupStack: string[] = [];
  const groupIndents: number[] = [];
  const groupTests = new Map<string, string[]>();

  for (const line of lines) {
    const groupMatch = /describe\s*\(\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (groupMatch && line.includes("{")) {
      groupStack.push(groupMatch[1]!);
      groupIndents.push(indent(line));
      const key = groupStack.join(" > ");
      if (!groupTests.has(key)) groupTests.set(key, []);
      continue;
    }

    if (line.trim() === "});" && groupStack.length > 0) {
      const lineIndent = indent(line);
      if (lineIndent === groupIndents[groupIndents.length - 1]) {
        groupStack.pop();
        groupIndents.pop();
      }
      continue;
    }

    const testMatch = /(?:^|\s)(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/.exec(line);
    if (testMatch && groupStack.length > 0) {
      const key = groupStack.join(" > ");
      const list = groupTests.get(key) ?? [];
      list.push(testMatch[1]!);
      groupTests.set(key, list);
    }
  }

  for (const [key, names] of groupTests) {
    if (names.length < 2) continue;
    let firstFailure: number | undefined;
    let firstHappy: number | undefined;
    for (let i = 0; i < names.length; i++) {
      const name = names[i]!;
      if (firstFailure === undefined && failureName.test(name)) firstFailure = i;
      if (firstHappy === undefined && happyName.test(name) && !failureName.test(name)) firstHappy = i;
    }
    if (firstFailure !== undefined && firstHappy !== undefined && firstHappy < firstFailure) {
      violations.push(`${rel} :: ${key}`);
    }
  }
}

function walk(dir: string, violations: string[]): void {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      walk(full, violations);
    } else if (name.name.endsWith(".test.ts") && !full.includes(`${path.sep}principles${path.sep}failure-first-order.test.ts`)) {
      checkFile(full, violations);
    }
  }
}

describe("failure-first order", () => {
  it("each describe block lists failure/boundary tests before happy-path names", () => {
    const root = path.join(process.cwd(), "src");
    const violations: string[] = [];
    walk(root, violations);
    expect(violations, violations.join("\n")).toEqual([]);
  });
});
