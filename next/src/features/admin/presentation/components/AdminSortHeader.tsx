"use client";

/** 클릭으로 오름/내림차기 토글하는 테이블 헤더 */
export function AdminSortHeader(props: {
  column: string;
  label: string;
  sortKey: string;
  sortOrder: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const active = props.sortKey === props.column;
  const arrow = !active ? "↕" : props.sortOrder === "asc" ? "↑" : "↓";
  const ariaSort = active ? (props.sortOrder === "asc" ? "ascending" : "descending") : "none";
  return (
    <th scope="col" aria-sort={ariaSort}>
      <button
        type="button"
        className={`admin-th-sort${active ? " admin-th-sort--active" : ""}`}
        onClick={() => props.onSort(props.column)}
      >
        {props.label}
        <span className="admin-th-sort__icon" aria-hidden>
          {arrow}
        </span>
      </button>
    </th>
  );
}