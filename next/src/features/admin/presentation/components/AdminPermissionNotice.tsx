import type { ReactNode } from "react";

/** 권한 부족·부분 노출 안내(관리자 UI 공통). */
export function AdminPermissionNotice(props: {
  title: string;
  message: string;
  variant?: "denied" | "partial" | "dev";
  children?: ReactNode;
}) {
  const variant = props.variant ?? "partial";
  const color =
    variant === "denied" ? "var(--danger)" : variant === "dev" ? "var(--link)" : "var(--muted)";
  return (
    <div
      className="hint"
      role="status"
      style={{
        margin: "12px 0",
        padding: "12px 14px",
        border: `1px solid ${color}`,
        borderRadius: 8,
      }}
    >
      <strong>{props.title}</strong>
      <p style={{ margin: "8px 0 0" }}>{props.message}</p>
      {props.children}
    </div>
  );
}