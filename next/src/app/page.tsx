import Link from "next/link";
import { SECTIONS } from "./sections";

export default function HomePage() {
  return (
    <div className="detail">
      <h1>청년의 모든 것</h1>
      <p className="hint">한국 청년이 이용할 수 있는 정보를 섹션별로 모았습니다.</p>
      <div className="cards">
        {SECTIONS.map((s) => (
          <section key={s.id} className="card">
            <h2 className="card-title">
              <Link href={s.href}>{s.title}</Link>
            </h2>
            <p className="hint">{s.description}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
