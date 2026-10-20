import Link from "next/link";
import {
  HOUSING_TYPES,
  HOUSING_TYPE_LABELS,
  NOTICE_STATUSES,
  NOTICE_STATUS_LABELS,
  SUPPLY_TYPES,
  SUPPLY_TYPE_LABELS,
} from "@/features/housing/domain/enums";
import { VERDICT_LABELS } from "@/features/housing/domain/eligibility/evaluate";
import { SIDO_LIST } from "@/common/domain/region";
import { HOUSING_BASE } from "../routes";
import type { ParsedSearch } from "../search-params";
import { VERDICTS } from "../search-params";

function CheckGroup<T extends string>(props: {
  name: string;
  options: readonly T[];
  labels: Record<T, string> | ((v: T) => string);
  checked: readonly T[];
}) {
  const label = (v: T) => (typeof props.labels === "function" ? props.labels(v) : props.labels[v]);
  return (
    <div className="chips">
      {props.options.map((o) => (
        <label key={o} className="chip">
          <input type="checkbox" name={props.name} value={o} defaultChecked={props.checked.includes(o)} />
          <span>{label(o)}</span>
        </label>
      ))}
    </div>
  );
}

function TriState(props: { name: string; label: string; yes: string; no: string; value: boolean | undefined }) {
  const current = props.value === undefined ? "" : props.value ? "y" : "n";
  return (
    <label className="field">
      <span>{props.label}</span>
      <select name={props.name} defaultValue={current}>
        <option value="">입력 안 함</option>
        <option value="y">{props.yes}</option>
        <option value="n">{props.no}</option>
      </select>
    </label>
  );
}

export function FilterForm({ parsed }: { parsed: ParsedSearch }) {
  const { form, profile } = parsed;
  const statuses = form.statuses.length > 0 ? form.statuses : (["open", "upcoming"] as const);

  return (
    <form method="get" action={HOUSING_BASE} className="filters">
      {/* p=1 : '내 조건' 영역을 제출했다는 표시. 비어 있으면 저장된 조건도 지운다. */}
      <input type="hidden" name="p" value="1" />

      <section>
        <h2>지역</h2>
        <CheckGroup name="sido" options={SIDO_LIST} labels={(v) => v} checked={form.sidos} />
        <label className="field">
          <span>시군구 (시도 선택 시)</span>
          <input type="text" name="sigungu" defaultValue={form.sigungu} placeholder="예: 강남구, 수원시" />
        </label>
      </section>

      <section>
        <h2>공급유형</h2>
        <CheckGroup name="supply" options={SUPPLY_TYPES} labels={SUPPLY_TYPE_LABELS} checked={form.supplyTypes} />
      </section>

      <section>
        <h2>주택유형</h2>
        <CheckGroup name="housing" options={HOUSING_TYPES} labels={HOUSING_TYPE_LABELS} checked={form.housingTypes} />
      </section>

      <section>
        <h2>접수 상태</h2>
        <CheckGroup name="status" options={NOTICE_STATUSES} labels={NOTICE_STATUS_LABELS} checked={statuses} />
      </section>

      <section>
        <h2>금액 · 면적</h2>
        <div className="grid2">
          <label className="field">
            <span>보증금/분양가 상한 (만원)</span>
            <input type="number" name="maxDeposit" min={0} defaultValue={form.maxDepositMan} placeholder="예: 5000" />
          </label>
          <label className="field">
            <span>월 임대료 상한 (만원)</span>
            <input type="number" name="maxRent" min={0} defaultValue={form.maxRentMan} placeholder="예: 30" />
          </label>
          <label className="field">
            <span>전용면적 최소 (㎡)</span>
            <input type="number" name="minArea" min={0} defaultValue={form.minArea} />
          </label>
          <label className="field">
            <span>전용면적 최대 (㎡)</span>
            <input type="number" name="maxArea" min={0} defaultValue={form.maxArea} />
          </label>
        </div>
        <label className="field">
          <span>검색어 (공고명/기관/단지/주소)</span>
          <input type="text" name="q" defaultValue={form.q} />
        </label>
      </section>

      <section>
        <h2>내 조건 (브라우저에만 저장)</h2>
        <div className="grid2">
          <label className="field">
            <span>만 나이</span>
            <input type="number" name="age" min={0} max={120} defaultValue={profile.age ?? ""} />
          </label>
          <label className="field">
            <span>소득 (도시근로자 월평균소득 대비 %)</span>
            <input type="number" name="income" min={0} max={1000} defaultValue={profile.incomeRatioPercent ?? ""} placeholder="예: 80" />
          </label>
          <TriState name="home" label="주택 보유" yes="무주택" no="유주택" value={profile.isHomeless} />
          <TriState name="married" label="혼인" yes="기혼" no="미혼" value={profile.isMarried} />
          <TriState name="newlywed" label="신혼부부(혼인 7년 이내)" yes="해당" no="해당 없음" value={profile.isNewlywed} />
          <TriState name="student" label="대학생·취업준비생" yes="해당" no="해당 없음" value={profile.isStudent} />
        </div>
        <h3>자격 판정으로 거르기</h3>
        <CheckGroup name="v" options={VERDICTS} labels={VERDICT_LABELS} checked={parsed.verdicts} />
        <p className="hint">조건을 입력해야 판정됩니다. 선택하지 않으면 전부 표시합니다.</p>
      </section>

      <section>
        <label className="field">
          <span>정렬</span>
          <select name="sort" defaultValue={parsed.sort}>
            <option value="deadline">마감 임박순</option>
            <option value="latest">최신 공고순</option>
          </select>
        </label>
      </section>

      <div className="actions">
        <button type="submit" className="btn primary">
          검색
        </button>
        <Link className="btn" href={`${HOUSING_BASE}?p=1`}>
          초기화
        </Link>
      </div>
    </form>
  );
}
