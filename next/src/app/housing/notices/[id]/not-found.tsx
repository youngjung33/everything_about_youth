import Link from "next/link";
import { HOUSING_BASE } from "@/features/housing/presentation/routes";

export default function NoticeNotFound() {
  return (
    <div className="empty">
      <p>공고를 찾을 수 없습니다.</p>
      <Link href={HOUSING_BASE}>목록으로 돌아가기</Link>
    </div>
  );
}
