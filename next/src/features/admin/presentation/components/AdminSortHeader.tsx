"use client";

/** 클릭으로 오름/내림차기 토글하는 테이블 헤더 */
export function AdminSortHeader<K extends string>(props: {
  column: K;
  label: string;
  sortKey: K;
  sortOrder: "asc" | "desc";
  onSort: (key: K) => void;
}) {
  const active = props.sortKey === props.column;
  const arrow = !active ? "↕" : props.sortOrder === "asc" ? "↑" : "↓";
  return (
    <th scope="col">
      <button
        type="button"
        className={`admin-th-sort${active ? " admin-th-sort--active" : ""}`}
        onClick={() => props.onSort(props.column)}
        aria-sort={active ? (props.sortOrder === "asc" ? "ascending" : "descending") : "none"}
      >
        {props.label}
        <span className="admin-th-sort__icon" aria-hidden>
          {arrow}
        </span>
      </button>
    </th>
  );
}