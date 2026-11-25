import { AdminPermissionNotice } from "./AdminPermissionNotice";
import { adminDevDiagnosticsEnabled } from "../admin-dev-diagnostics";
import type { AdminSessionView } from "../../application/use-cases/verify-admin-session";

type SyncAccess = {
  canViewSources: boolean;
  canViewRuns: boolean;
  canTrigger: boolean;
};

/** 수집 관리 화면: 권한별로 숨겨진 블록을 안내한다. */
export function AdminSyncAccessNotices(props: { session: AdminSessionView; access: SyncAccess }) {
  const dev = adminDevDiagnosticsEnabled(props.session);
  const { canViewSources, canViewRuns, canTrigger } = props.access;
  if (!canViewSources && !canViewRuns && !canTrigger) {
    return (
      <AdminPermissionNotice
        variant="denied"
        title="이 화면에 대한 보기 권한이 없습니다"
        message="메뉴에 표시되었더라도 세부 권한이 없으면 데이터를 표시하지 않습니다. 상위 관리자에게 권한을 요청하세요."
      />
    );
  }
  return (
    <>
      {!canViewSources && (
        <AdminPermissionNotice
          title="소스별 상태 표"
          message="현재 권한으로는 소스별 수집 상태를 볼 수 없습니다."
        />
      )}
      {!canViewRuns && (
        <AdminPermissionNotice
          title="실행 이력"
          message="최근 실행 이력과 오류 상세는 보기 권한이 없어 숨깁니다."
        />
      )}
      {!canTrigger && canViewSources && (
        <AdminPermissionNotice
          title="수집 실행"
          message="수동 수집 버튼은 권한이 없어 표시되지 않습니다. CLI 로 실행할 수 있습니다."
        />
      )}
      {dev && (
        <AdminPermissionNotice variant="dev" title="개발자 진단 모드" message="수집 오류 원문·긴 메시지가 표시됩니다. 운영 환경에서는 자동으로 축약됩니다." />
      )}
    </>
  );
}