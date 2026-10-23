# 청년의 모든 것 (everything_about_youth)

한국 청년이 이용할 수 있는 정보를 섹션별로 모으는 사이트. 지금은 **임대주택** 섹션 하나만 있고(1차, 개인용), 이후 섹션이 계속 추가됩니다.

- Next.js 16 (App Router) + TypeScript
- 클린 아키텍처 + **섹션(feature) 단위 폴더 구조**
- 1차 DB는 SQLite(Drizzle + better-sqlite3), 2차에 Supabase(Postgres) 전환 예정
- 로그인은 **소셜 로그인(SSO)만** — Google · Apple · 네이버 · 카카오. 자체 회원가입/로그인(아이디·비밀번호)은 없고, 로그인하지 않은 **비회원도 조회**할 수 있습니다. (아래 "소셜 로그인")

## 폴더 구조

```
src/
  common/                    ← 모든 섹션이 공유하는 코드 (어떤 섹션도 알지 못함)
    domain/                    날짜(KST), 시도/시군구 지역
    application/               Clock, Logger 포트
    infrastructure/
      config/                  공통 환경변수(DB, 크롤러, 서비스키)
      container.ts             공통 의존성 조립 (설정, 시계, 로거, DB 연결, 마이그레이션)
      persistence/sqlite/      SQLite 연결/마이그레이션 실행
      http/                    HTTP 재시도, 공공데이터포털(data.go.kr) 파서, JSON 매핑 유틸
      crawler/                 robots.txt 준수 + 호스트별 간격 크롤링 fetcher
    presentation/              금액/날짜/D-day 포맷
  features/
    housing/                 ← 임대주택 섹션: 이 섹션의 모든 코드가 여기 한곳에
      domain/                  공고/단지/세대유형, 공급·주택유형, 동일 공고 병합, 자격 판정 규칙
      application/             포트(리포지토리, 소스) + 유스케이스(검색, 상세, 수집)
      infrastructure/          SQLite 스키마/리포지토리, 수집 소스(LH·마이홈·청약홈 API, SH·iH·GH 크롤러), container, config
      presentation/            필터 파싱, 컴포넌트, 경로(routes.ts)
  app/                       ← Next.js 라우트 (조립만)
    page.tsx                   섹션 목록 홈
    housing/                   /housing, /housing/notices/[id], /housing/admin/sync
    api/v1/housing/sync/       수동 수집 API
    sections.ts                섹션 등록부 (홈/헤더 메뉴)
scripts/
  migrate.ts, load-env.ts      공통
  housing/                     임대주택 전용 CLI (sync, seed-demo)
drizzle/                     마이그레이션 (모든 섹션이 하나의 이력으로 관리)
```

### 의존 규칙 (`eslint.config.mjs` 로 강제)
1. **레이어**: `domain ← application ← infrastructure / presentation`. `common` 과 각 `features/<name>` 안에서 똑같이 적용됩니다. `app`/`presentation` 은 infrastructure 의 `container`(와 `config`)를 통해서만 구현체에 접근합니다.
2. **섹션 경계**: `common` 은 `features` 를 import 할 수 없고, 섹션끼리도 서로 import 할 수 없습니다. 여러 섹션이 필요로 하는 코드는 `common` 으로 옮깁니다.

### 새 섹션 추가하기 (예: jobs)
1. `src/features/jobs/{domain,application,infrastructure,presentation}` 생성 (`infrastructure/container.ts` 에서 `CommonContainer` 를 받아 조립)
2. `infrastructure/persistence/sqlite/schema.ts` 에 테이블 정의 → `npm run db:generate` (drizzle.config 가 `features/*` 스키마를 자동 수집)
3. `src/app/jobs/...` 라우트 + `src/app/sections.ts` 에 등록
4. `scripts/jobs/` 에 필요한 CLI, `package.json` 에 `jobs:*` 스크립트 추가
5. `eslint.config.mjs` 의 `FEATURES` 배열에 `"jobs"` 추가

## 실행

```bash
npm install
# 환경변수는 .env.local 에 직접 작성 (아래 표 참고. .env.example 은 2차에서 추가 예정)
npm run housing:sync -- --list   # 수집 소스 상태 확인
npm run housing:sync             # 사용 가능한 모든 소스 수집
npm run dev                      # http://localhost:3000
```

DB 마이그레이션은 앱/스크립트 시작 시 자동 적용됩니다(`npm run db:migrate` 로 수동 실행도 가능).

| 명령 | 설명 |
| --- | --- |
| `npm run housing:sync -- --source=sh,lh` | 특정 소스만 수집 (`--list`로 목록/사용 가능 여부) |
| `npm run housing:seed-demo` / `-- --clear` | 화면 확인용 `[데모]` 공고 10건 입력 / 삭제 |
| `npm run typecheck` · `npm run lint` · `npm test` | 검증 |
| `npm run db:generate` | 스키마 변경 후 마이그레이션 SQL 생성 |

### 환경변수 (`.env.local`)

공통

| 변수 | 설명 |
| --- | --- |
| `DATA_GO_KR_SERVICE_KEY` | 공공데이터포털 서비스키. LH·마이홈·청약홈 수집에 필요 (없으면 해당 소스는 건너뜀) |
| `DB_DRIVER` | `sqlite`(기본) · `supabase`(2차, 미구현) |
| `SQLITE_PATH` | SQLite 파일 경로 (기본 `./data/app.db`) |
| `CRAWL_DELAY_MS` / `CRAWL_USER_AGENT` | 크롤러 호스트별 최소 간격(기본 1500) / UA |
| `CRAWL_IGNORE_ROBOTS_HOSTS` | robots.txt 확인을 건너뛸 호스트(콤마 구분, 기본 비어 있음). 지정한 호스트에만 적용되며 UA 위장 없이 요청 간격은 유지, 실행 시 경고 로그를 남김. 사이트 이용약관 책임은 본인에게 있음 |
| `ALLOW_WEB_SYNC` | production 에서 웹 수집 버튼/API 허용 여부 (기본 차단, `true` 로 허용) |

인증 (JWT)

| 변수 | 설명 |
| --- | --- |
| `JWT_SECRET` | 토큰 서명 키. **production 에서는 필수이고 32자 이상**이 아니면 서버가 시작하지 않습니다(예: `openssl rand -base64 48`). 개발에서는 없으면 임시 키를 쓰고 경고를 남깁니다. 키를 바꾸면 발급된 토큰이 모두 무효가 되고, 앱은 알아서 새 세션을 받습니다. |
| `JWT_ISSUER` / `JWT_AUDIENCE` | 발급자/대상 검증값 (기본 `everything-about-youth` / `everything-about-youth-app`) |
| `JWT_ACCESS_TTL_SEC` / `JWT_REFRESH_TTL_SEC` | 액세스 토큰(기본 900=15분) / 리프레시 토큰(기본 2592000=30일) 유효 시간 |

소셜 로그인 (SSO) — **값이 모두 있는 업체만 켜집니다.** 나머지는 앱 로그인 화면에 "준비 중"으로 보입니다. 아무것도 없어도 서버는 정상이고 비회원 조회만 됩니다.

| 변수 | 설명 |
| --- | --- |
| `SSO_PUBLIC_BASE_URL` | 로그인 업체 콘솔에 등록한 **서버 주소**(예: `https://api.example.com`, 끝의 `/` 는 무시). 없으면 요청의 origin 을 씁니다. 운영에서는 꼭 넣으세요. (프록시 뒤에서는 origin 이 내부 주소가 될 수 있습니다) |
| `SSO_ALLOWED_REDIRECTS` | 로그인이 끝나고 **앱으로 돌아올 주소**의 허용 목록(콤마 구분). 앱(Android/iOS)용 `everythingaboutyouth://auth` 는 항상 허용입니다. **Flutter 웹**을 배포하면 `https://<웹 주소>/auth.html` 을 넣어야 합니다. 개발(`NODE_ENV!=production`)에는 `http://localhost:<아무 포트>/auth.html` 도 허용합니다. |
| `SSO_GOOGLE_CLIENT_ID` · `SSO_GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 클라이언트(웹 애플리케이션) |
| `SSO_APPLE_CLIENT_ID` · `SSO_APPLE_TEAM_ID` · `SSO_APPLE_KEY_ID` · `SSO_APPLE_PRIVATE_KEY` | Apple Developer → **Services ID**, Team ID, Sign in with Apple 키의 Key ID, 그 키의 `.p8` 내용(줄바꿈은 `\n` 로 한 줄에). Apple 은 **HTTPS 도메인**이 필요합니다. |
| `SSO_NAVER_CLIENT_ID` · `SSO_NAVER_CLIENT_SECRET` | 네이버 개발자센터 → 네이버 로그인 |
| `SSO_KAKAO_CLIENT_ID` · `SSO_KAKAO_CLIENT_SECRET` | 카카오 디벨로퍼스 → **REST API 키**. Client Secret 은 콘솔에서 켰을 때만 넣습니다. |

업체 콘솔에는 **콜백(Redirect) URL** 로 `<SSO_PUBLIC_BASE_URL>/api/v1/auth/sso/callback/<google|apple|naver|kakao>` 를 등록합니다. 한 업체의 값이 **일부만** 있으면(예: Google ID 만 있고 SECRET 이 없음) 그 업체는 켜지지 않고 서버 시작 로그에 빠진 환경변수 이름이 경고로 남습니다. 키 값은 로그에 남기지 않습니다.

앱 버전 · 요청 제한 · 암호화 · CORS

| 변수 | 설명 |
| --- | --- |
| `APP_MIN_VERSION` | 이 버전 **미만**의 앱은 모든 API 가 426 `APP_UPDATE_REQUIRED` 로 막힙니다. (예: `1.2.0`, 비우면 아무도 막지 않음) |
| `APP_LATEST_VERSION` | 최신 버전. 안내용이며 최소 버전보다 작으면 최소 버전으로 올려 씁니다. |
| `APP_STORE_URL_ANDROID` / `APP_STORE_URL_IOS` | 업데이트 화면의 버튼이 여는 스토어 주소(`http(s)://`). 앱이 보낸 플랫폼에 맞는 것을 응답에 넣습니다. |
| `APP_UPDATE_MESSAGE` | 업데이트 화면에 보여줄 문구 (기본 문구 있음) |
| `RATE_LIMIT_DISABLED` | `true` 면 요청 제한을 끕니다. (개발·부하 테스트용) |
| `API_CORS_ORIGIN` | 허용할 출처 (기본 `*`). 배포 때 Flutter 웹 주소로 좁히세요. |
| `DATA_ENCRYPTION_KEY` | 개인정보 암호화 키. base64 로 인코딩한 **32바이트**. 개인정보를 저장하는 기능이 생길 때 필수입니다. (아래 "개인정보 암호화") |
| `DATA_ENCRYPTION_KEY_PREVIOUS` | 키를 바꿀 때 이전 키들(콤마 구분). 복호화에만 쓰고 암호화는 항상 `DATA_ENCRYPTION_KEY` 로 합니다. |

잘못된 `APP_MIN_VERSION`/`APP_STORE_URL_*` 값은 **서버가 시작할 때 오류로 알립니다.** (오타로 모든 앱을 막거나 풀어 버리는 일을 막으려는 것)

임대주택

| 변수 | 설명 |
| --- | --- |
| `HOUSING_SYNC_SOURCES` | 활성 소스 제한 (`lh,myhome,applyhome,sh,gh,ih`). 비우면 가능한 전부 |
| `HOUSING_SYNC_INTERVAL_MINUTES` | 서버가 떠 있는 동안 공고를 자동 수집하는 간격(분). `0`(기본)이면 끄고, 켜려면 **30 이상**. 프로세스 시작 때 한 번 돌고 그 뒤 주기적으로 돕니다. |
| `OPERATOR_TOKEN` | 운영자용 `POST /housing/sync` 헤더 `X-Operator-Token` 값. 운영에서는 **24자 이상**이어야 이 API 가 열립니다. 개발에서는 값이 있으면 일치할 때만 허용합니다. |

공공데이터포털에서 활용신청이 필요한 API: LH 임대공고(`B552555/lhLeaseNoticeInfo1`), 마이홈포털 공공임대 공고(`1613000/HWSPR02`), 청약홈 분양정보(`ApplyhomeInfoDetailSvc`).

## 임대주택 섹션

공고를 여러 출처에서 수집해 한 목록으로 합치고, 지역·유형·금액·면적·나이/소득 등으로 거르고, 내 조건 기준 자격 판정(참고용)을 보여줍니다. "내 조건"은 브라우저 localStorage 에만 저장됩니다.

### 데이터 출처와 검증 상태

| 소스 | 방식 | 상태 |
| --- | --- | --- |
| LH | 공공데이터 API | 실제 키로 수집 확인 (공고 목록만 — 세대수·금액·단지 정보 없음) |
| 마이홈포털 | 공공데이터 API (시도별 순회) | 실제 키로 수집 확인 (단지·세대수·보증금·월세 포함, 같은 공고는 LH 와 병합) |
| 청약홈 | odcloud API (APT/오피스텔·도시형/잔여세대/공공지원민간임대 + 주택형) | 실제 키로 수집 확인 |
| SH 서울주택도시공사 | 게시판 크롤링 | 실사이트로 수집 확인 |
| iH 인천도시공사 | 게시판 크롤링 | 실사이트로 수집 확인 |
| GH 경기주택도시공사 | 게시판 크롤링 | 실사이트로 수집 확인. GH 의 robots.txt 가 `Disallow: /` 이므로 `CRAWL_IGNORE_ROBOTS_HOSTS=www.gh.or.kr` 로 **명시적으로 허용한 경우에만** 수집(미설정이면 skipped). 마이홈포털 API(서비스키)로도 GH 공고를 받을 수 있음 |

API 소스는 서비스키를 넣고 `npm run housing:sync -- --source=lh` 등으로 돌립니다. 응답 필드가 바뀌면 각 소스의 `*-mapper.ts`(+ 테스트)만 고치면 됩니다. 매핑 규칙을 바꾼 뒤에는 병합 규칙상 이전에 저장된 값이 남을 수 있으므로, 필요하면 `data/app.db` 를 지우고 `npm run db:migrate` 후 다시 수집하세요.

크롤링 정책: `robots.txt` 를 매 실행마다 확인해 막힌 사이트는 실패가 아니라 "건너뜀"으로 처리하고(우회하지 않음), 호스트별 요청 간격과 실행 중 URL 캐시를 적용합니다. 본문 전체를 복제하지 않고 제목·기간·기관과 **원문 링크** 중심으로 저장합니다(개인용 전제).

### 핵심 동작
- **동일 공고 병합**: 정규화한 `제목|기관|접수종료일` 해시로 결정적 id 생성 → 여러 소스의 같은 공고는 하나로 합쳐지고 출처가 누적됩니다. 재수집해도 id가 유지됩니다.
- **필터**: 지역/주택유형 정보를 모르는 공고는 필터로 숨기지 않습니다(놓치지 않기 위해). 금액·면적도 동일.
- **상태**: 접수 상태는 저장하지 않고 날짜로 계산(KST). 날짜가 없으면 접수중으로 취급.
- **자격 판정**: 공급유형별 일반 기준으로 판정하며 **참고용**입니다. 모르는 입력은 `조건 확인 필요`(사유에 무엇을 입력해야 하는지 나옵니다). 공고마다 요건이 다르므로 원문을 확인하세요. 판정 항목은 다음과 같습니다.
  - **나이·무주택·미혼**, 청년/신혼부부/대학생(취준생) 중 하나 이상
  - **소득**: 가구원수와 가구 월 소득(세전 합계)을 **금액으로** 비교합니다. 기준은 도시근로자 월평균소득(국민임대 70%, 영구임대 50%, 행복주택 100% 등) 또는 기준 중위소득(통합공공임대 150%)이고, 1인 가구 +20%p·2인 가구 +10%p 가산을 반영합니다. 신혼부부는 맞벌이일 때 상한이 높습니다(행복주택 120%, 통합공공임대 180%).
  - **자산**: 총자산(부채 차감)과 자동차 가액. 행복주택은 계층별로 다릅니다(청년 2.51억, 신혼·한부모 3.45억, 대학생 1.08억·자동차 보유 불가). 계층이 여럿에 해당하면 가장 유리한 쪽으로 봅니다.
  - **청약통장**: 공공·민간 분양, 신혼희망타운에서 가입 여부.
  - 소득이 이미 기준을 넘으면 자산을 입력하지 않았어도 `신청 불가`로 판정합니다.
  - 기준표는 `domain/eligibility/standards.ts` 한 곳에 있고 **매년 바뀝니다**(아래 "자격 기준표 갱신").

## JSON API (Flutter 앱용)

`../flutter` 앱이 쓰는 API 입니다. 구현은 `src/features/housing/presentation/api/`(`dto.ts`, `handlers.ts`), 라우트는 `src/app/api/v1/housing/`.

모든 경로는 `/api/v1` 로 시작합니다. (아래 표는 `/api/v1` 뒤의 경로)

| 엔드포인트 | 설명 |
| --- | --- |
| `GET /housing/meta` | 필터 선택지와 한글 라벨(공급유형·주택유형·상태·판정·정렬·시도), 자격 기준표 `standards`, 마지막 수집 성공 시각 `dataUpdatedAt`(ISO UTC, 한 번도 없으면 `null`). 앱은 라벨 표를 복제하지 않고 이 응답을 씁니다. |
| `GET /housing/notices` | 공고 목록. 웹과 같은 쿼리(`sido, sigungu, supply, housing, status, q, maxDeposit(만원), maxRent(만원), minArea, maxArea, sort, page, v`)에 `pageSize`(1~50, 기본 20) 추가. |
| `GET /housing/notices/:id` | 공고 상세(단지·세대유형·출처, 접수 마감 Google 캘린더 주소 `googleCalendarUrl`). 없으면 404 `NOTICE_NOT_FOUND` |
| `GET /housing/notices/:id/calendar` | 접수 마감일 ICS(`text/calendar`). 마감일이 없으면 400. 캘린더 앱이 연다. |
| `GET /housing/saved` | **회원 전용.** 관심 공고 목록(최근 저장 순). '내 조건' 쿼리가 있으면 자격 판정 포함. 비회원이면 403 `LOGIN_REQUIRED` |
| `GET /housing/saved/ids` | **회원 전용.** 관심 공고 id 만. 목록 하트 표시용 |
| `PUT /housing/saved/:id` | **회원 전용.** 관심 공고로 저장. 없으면 404, 100개 초과면 400. 이미 있으면 그대로 성공 |
| `DELETE /housing/saved/:id` | **회원 전용.** 관심 공고에서 빼기 |
| `PUT /housing/saved` | **회원 전용.** 본문 `{ "ids": string[] }`. 비회원 기기 목록을 회원 목록에 합친다. 없는 공고는 건너뛰고, 상한(100)을 넘기면 거기서 멈춘다 |
| `GET /features` | 서비스 켜짐/꺼짐 `{ "features": [{ "id": "housing", "enabled": true }] }`. 앱이 시작할 때 받아 꺼진 서비스를 숨깁니다. 캐시하지 않습니다. |
| `GET /app-config` | **토큰 없이** 호출. `{ api: { version }, update: { status: none｜optional｜required, minVersion, latestVersion, storeUrl, message } }`. 앱이 시작할 때 강제 업데이트인지 묻습니다. |
| `POST /auth/session` | **토큰 없이** 호출. 서버가 기기 id 를 만들어 토큰 쌍을 줍니다. `{ tokenType, accessToken, accessExpiresIn, refreshToken, refreshExpiresIn }` (만료는 남은 초) |
| `POST /auth/refresh` | **토큰 없이** 호출. 본문 `{ "refreshToken": "..." }` → 새 토큰 쌍. 만료·위조·폐기·모르는 기기는 모두 401 `AUTH_REFRESH_INVALID`. 응답의 `member` 는 회원이면 `true` |
| `GET /auth/providers` | **토큰 없이** 호출. 로그인 화면용 `{ providers: [{ id, name, enabled }] }`. Google·Apple·네이버·카카오 **네 곳을 항상** 주고, 서버에 설정이 있는 곳만 `enabled: true` |
| `POST /auth/sso/start` | **토큰 없이** 호출. `{ provider, redirectUri, codeChallenge }` → `{ authorizationUrl }`. 설정 없는 업체는 503 `SSO_PROVIDER_UNAVAILABLE`, 허용 목록에 없는 `redirectUri` 는 400 |
| `GET /auth/sso/callback/:provider` | 로그인 업체가 브라우저를 되돌려 보내는 곳. JSON 이 아니라 **앱 주소로 302** (`?ticket=…`, 취소는 `?error=cancelled`, 실패는 `?error=failed`) |
| `POST /auth/sso/exchange` | **토큰 없이** 호출. `{ ticket, verifier }` → **회원** 토큰 쌍(`member: true`). 티켓이 없거나 만료·사용됨·verifier 불일치는 401 `SSO_TICKET_INVALID` |
| `POST /auth/logout` | 토큰 필요. 이 세션을 폐기합니다. (비회원 세션도 가능) |
| `POST /auth/account/delete` | 토큰 필요. **회원 탈퇴**. 로그인 정보와 그 회원의 모든 세션을 지웁니다. 비회원 세션이면 403 `LOGIN_REQUIRED` |

`/auth/session`, `/auth/refresh`, `/auth/providers`, `/auth/sso/*` 와 `/app-config` 를 뺀 나머지는 모두 `Authorization: Bearer <accessToken>` 이 있어야 합니다. (`/auth/logout`, `/auth/account/delete` 도 토큰이 필요합니다)

### 요청이 지나는 순서 (`src/proxy.ts` → `runGateway`)

모든 `/api/*` 요청은 라우트에 닿기 전에 **한 곳**(`src/common/presentation/api/gateway.ts`)에서 아래 순서로 검사합니다. 앞에서 걸리면 뒤는 실행하지 않습니다.

1. API 버전 — 지원하지 않는 버전이거나 버전이 없는 옛 주소(`/api/features`)면 410 `API_VERSION_UNSUPPORTED`
2. CORS 사전 요청(`OPTIONS`) — 204
3. 앱 버전 — `X-App-Version` 이 `APP_MIN_VERSION` 미만이면 426 `APP_UPDATE_REQUIRED`
4. 인증(JWT) — 기기 id 를 알아냄(아직 응답은 안 함)
5. 요청 제한 — 초과하면 429 `RATE_LIMITED` (토큰이 틀린 요청도 센다: 토큰 추측 방지)
6. 인증 실패 응답 — 401 `AUTH_*`
7. 통과 — 요청 번호(`X-Request-Id`), CORS, 제한 안내 헤더를 붙여 라우트로

### API 버전

- 주소에 버전을 넣습니다(`/api/v1/...`). 코드는 `src/common/presentation/api/version.ts`(`API_VERSION`, `SUPPORTED_API_VERSIONS`, `apiPath()`).
- **호환되는 변경**(필드 추가, 새 엔드포인트)은 `v1` 에 그대로 넣습니다. **호환이 깨지는 변경**(필드 삭제·이름 변경·의미 변경)만 `v2` 를 만듭니다.
- `v2` 추가 방법: ① `src/app/api/v2/` 에 바뀐 라우트만 만들고 ② `SUPPORTED_API_VERSIONS` 에 `"v2"` 추가 ③ 새 앱은 `kApiPrefix`(flutter `core/network/api_version.dart`)를 `/api/v2` 로. 옛 앱이 남아 있는 동안 `v1` 을 같이 둡니다.
- `v1` 을 닫으려면 `SUPPORTED_API_VERSIONS` 에서 빼면 됩니다. 옛 앱은 410 을 받고 **업데이트 화면**으로 안내됩니다.
- 알 수 없는 `/api/v1/*` 주소는 템플릿 오류(404 `NOT_FOUND`)입니다. (인증이 먼저라 토큰이 없으면 401 입니다.) (`src/app/api/v1/[...path]/route.ts`)

### 오류 템플릿

서버의 **모든** 오류(proxy 가 막은 것, 라우트가 던진 것, 예상 못한 것)는 같은 모양입니다. 코드는 `src/common/presentation/api/errors.ts` 한 곳에만 정의합니다.

```json
{ "error": { "code": "RATE_LIMITED", "message": "요청이 너무 많습니다. 12초 후 다시 시도해 주세요.", "requestId": "…", "details": { "retryAfterSeconds": 12 } } }
```

| code | HTTP | 의미 |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | 요청이 올바르지 않음 |
| `AUTH_REQUIRED` · `AUTH_TOKEN_EXPIRED` · `AUTH_TOKEN_INVALID` | 401 | 토큰 없음 · 만료(앱이 갱신 후 재시도) · 위조/종류 불일치. `WWW-Authenticate: Bearer` 동반 |
| `AUTH_REFRESH_INVALID` | 401 | 리프레시 토큰 거절 (비회원 앱은 새 세션을 받고, **회원은 로그인 화면으로** 돌아감) |
| `SSO_TICKET_INVALID` | 401 | 로그인 티켓이 없거나 만료(2분)·이미 사용·verifier 불일치 → 앱은 처음부터 다시 로그인 |
| `FORBIDDEN` · `OPERATOR_DISABLED` | 403 | 허용되지 않음 · 운영 환경에서 웹 수집 비활성 |
| `LOGIN_REQUIRED` | 403 | 회원만 할 수 있는 일(회원 탈퇴)을 비회원 세션으로 요청 |
| `NOT_FOUND` · `NOTICE_NOT_FOUND` | 404 | 없는 주소 · 없는 공고 |
| `API_VERSION_UNSUPPORTED` | 410 | 닫힌(또는 없는) API 버전 → 앱은 업데이트 화면 |
| `APP_UPDATE_REQUIRED` | 426 | 앱 버전이 최소 버전 미만. `details: { minVersion, storeUrl }` → 앱은 업데이트 화면 |
| `RATE_LIMITED` | 429 | 요청 제한 초과. `Retry-After` 헤더와 `details.retryAfterSeconds` |
| `SERVICE_DISABLED` | 503 | 운영자가 끈 서비스 |
| `SSO_PROVIDER_UNAVAILABLE` | 503 | 서버에 이 로그인 방법의 설정이 아직 없음 |
| `INTERNAL_ERROR` | 500 | 예상 못한 오류. **내부 문구는 숨기고** 요청 번호만 알려 줍니다. 상세는 서버 로그에서 `requestId` 로 찾습니다. |

- `message` 는 사용자에게 그대로 보여줘도 되는 한글 문장입니다. 앱은 `code` 로 분기하고 `message` 를 화면에 씁니다.
- 라우트는 `try/catch` 를 쓰지 않고 `apiHandler(...)` 로 감싸 `throw new ApiError("NOTICE_NOT_FOUND")` 만 합니다. 새 오류는 `ERROR_CODES` 에 한 줄을 더하고, 앱의 `core/network/api_error_code.dart` 에 같은 이름을 더합니다.
- 모든 응답(성공 포함)에 `X-Request-Id` 가 붙습니다. 사용자 문의에는 이 값을 받으세요.

### 강제 업데이트

- 앱은 모든 요청에 `X-App-Version`(예 `1.2.3`)과 `X-App-Platform`(`android｜ios｜web`)을 붙입니다.
- `APP_MIN_VERSION` 보다 낮은 **모바일** 앱의 요청은 라우트에 닿기 전에 426 으로 거절됩니다. 웹은 서버와 같이 배포되므로 대상이 아닙니다. 헤더가 없거나 형식이 틀린 요청도 막지 않습니다(버전을 모르는 것을 이유로 막지 않기 위해).
- 앱은 시작할 때 `GET /app-config` 로 미리 알아 업데이트 화면을 보여 주고, 실행 중에 최소 버전이 올라가도 어떤 API 가 426 을 받는 순간 같은 화면으로 바뀝니다.
- 올리는 방법: 새 앱을 스토어에 올리고 심사가 끝난 **뒤에** `APP_MIN_VERSION` 을 새 버전으로 바꾸고 서버를 다시 시작합니다. (먼저 올리면 업데이트할 곳이 없는 사용자를 막게 됩니다.) 올리기 전에 `APP_LATEST_VERSION` 만 올려 두면 `status` 가 `optional` 로 나오지만, 선택 업데이트 안내 화면은 아직 만들지 않았습니다.

### 요청 제한 (rate limit)

| 대상 | 기준 | 한도 |
| --- | --- | --- |
| 앱용 API (토큰이 맞음) | **기기별** (JWT 의 기기 id) | 120회/분 |
| `/auth/session`, `/auth/refresh`, `/auth/providers`, `/auth/sso/*` (로그인 전 호출) | IP 별 | 30회/분 |
| `/app-config` | IP 별 | 60회/분 |
| 운영자 수집 트리거 | IP 별 | 3회/분 |
| 토큰이 없거나 틀린 요청 | IP 별 | 30회/분 |

- 값은 `rate-limit-policy.ts` 의 `RATE_LIMITS` 한 곳입니다. 같은 와이파이를 쓰는 사용자끼리 서로 막지 않도록 정상 요청은 기기별로 셉니다.
- 초과하면 429 `RATE_LIMITED` + `Retry-After`. 모든 응답에 `RateLimit-Limit/Remaining/Reset` 헤더가 붙습니다.
- **한계**: 카운터가 서버 프로세스 메모리에 있습니다. 서버를 여러 대로 늘리거나 서버리스(인스턴스마다 메모리가 따로)로 배포하면 한도가 인스턴스 수만큼 늘어납니다. 그때는 `RateLimiter` 인터페이스(`common/application/rate-limit.ts`)를 Redis 등으로 구현해 `proxy.ts` 에서 교체하세요. (다른 코드는 바뀌지 않습니다)
- IP 는 `X-Forwarded-For` 의 첫 값을 씁니다. 이 헤더는 직접 접속한 클라이언트가 위조할 수 있으므로, 운영에서는 **앞단 프록시/로드밸런서가 이 헤더를 덮어쓰도록** 구성해야 IP 별 제한이 의미가 있습니다.

### 개인정보 암호화

- 아직 서버에 개인정보를 저장하는 기능은 없습니다(내 조건은 앱 기기에만 암호화되어 저장). 저장하는 기능이 생길 때 **그 컬럼은 반드시 `FieldCipher` 를 거쳐** 저장하도록 코드를 먼저 갖춰 두었습니다.
- `common/application/field-cipher.ts`(인터페이스) + `common/infrastructure/crypto/aes-gcm-field-cipher.ts`(AES-256-GCM). 암호문은 `v1.<base64url(nonce 12B | 암호문 | 태그 16B)>` 이고 앱의 `AesGcmFieldCipher` 와 같은 형식입니다.
- `encrypt(plain, context)` / `decrypt(token, context)` 의 `context`(예: `users.phone`)는 암호문에 묶입니다. 다른 컬럼의 암호문을 바꿔 끼워도 풀리지 않습니다. 같은 값도 암호화할 때마다 다른 암호문이 되므로 **암호화한 컬럼으로는 검색·정렬·중복 검사를 할 수 없습니다.** (필요하면 별도의 해시 컬럼을 두세요)
- 키 만들기: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` → `DATA_ENCRYPTION_KEY`
- **키 교체**: 새 키를 `DATA_ENCRYPTION_KEY` 로, 이전 키를 `DATA_ENCRYPTION_KEY_PREVIOUS` 에 넣으면 새로 쓰는 값은 새 키로 암호화되고 옛 값은 계속 읽힙니다. 모든 값을 다시 저장한 뒤 이전 키를 지웁니다.
- ⚠️ **키를 잃으면 암호화된 데이터를 복구할 수 없습니다.** 키는 DB 와 **다른 곳**(비밀 관리자)에 백업하세요. 복호화에 실패하면 `FieldCipherError` 가 납니다.

### 인증 (JWT)

- **모든 `/api/*` 는 `src/proxy.ts` 한 곳에서 검사**합니다(Next 16 의 proxy). 새 API 를 추가해도 따로 붙일 것이 없고, 토큰이 없으면 라우트에 닿기 전에 401 입니다. 예외는 `src/common/presentation/api/auth.ts` 의 `PUBLIC_API_PATHS`(세션 발급/갱신, 로그인 업체 목록·시작·교환·콜백, 앱 설정)와 `OPERATOR_API_PATHS`(수집 트리거), 그리고 CORS 사전 요청(`OPTIONS`)뿐이며 테스트가 우회 경로(`/api/v1/auth/session/x`, `/api/v1/auth/sso/start/x` 등)까지 확인합니다. 로그아웃과 회원 탈퇴는 공개 경로가 **아닙니다.**
- 토큰은 HS256 JWT 이고 알고리즘을 고정해 검증합니다(`alg: none`·다른 알고리즘 거절). 서명, 발급자, 대상, 만료, **토큰 종류(access/refresh)** 를 모두 봅니다. 리프레시 토큰으로 데이터 API 를 부르거나 그 반대는 안 됩니다.
- 401 응답의 `code`: `AUTH_REQUIRED`(토큰 없음) · `AUTH_TOKEN_EXPIRED`(만료, 앱이 갱신해서 다시 시도) · `AUTH_TOKEN_INVALID`(위조·종류 불일치). `WWW-Authenticate: Bearer` 헤더도 함께 줍니다.
- **식별**: 서버가 세션마다 id(JWT `sub`)를 만들어 `auth_clients` 테이블에 저장합니다. 앱이 id 를 보내서 서버와 맞추는 방식이 아니라, **서버가 토큰에 넣은 값을 서버가 읽습니다.** 폐기(`AuthService.revoke`)한 세션은 갱신이 거절됩니다. 비회원 세션은 `user_id` 가 비어 있고, 로그인한 **회원 세션**은 `user_id` 로 회원과 이어집니다. gateway 는 검증된 세션 id 를 `x-client-id` 요청 헤더로 라우트에 넘기고, **바깥에서 보낸 같은 이름의 헤더는 먼저 지웁니다.**
- 코드 위치: 유스케이스·포트 `src/common/application/auth.ts`, JWT 구현(jose) `src/common/infrastructure/auth/`, 요청 검사·핸들러 `src/common/presentation/api/auth.ts`.

### 소셜 로그인 (SSO)

자체 로그인은 **없습니다.** Google · Apple · 네이버 · 카카오만 열려 있고, 서버에 설정이 있는 곳만 켜집니다. 로그인하지 않아도(비회원) 조회는 모두 됩니다.

```
앱                             서버                              로그인 업체
 │ POST /auth/sso/start         │                                    │
 │  {provider, redirectUri,     │ state(서명 JWT, 10분)에             │
 │   codeChallenge}             │ provider·nonce·돌아올 주소·challenge │
 │─────────────────────────────▶│ 를 담아 인증 주소를 만든다           │
 │◀── authorizationUrl ─────────│                                    │
 │ 시스템 브라우저(커스텀 탭/ASWebAuthenticationSession/팝업)로 연다 ──▶│ 사용자가 로그인
 │                              │◀── GET callback/<provider>?code&state
 │                              │ state 검증 → 코드를 토큰으로 교환(TLS)
 │                              │ → 고유 번호(sub/id) 확인 → 회원 찾기/만들기
 │                              │ → 일회용 티켓(2분)을 해시로 저장
 │◀── 302 앱주소?ticket=… ───────│
 │ POST /auth/sso/exchange      │ 티켓을 한 번만 꺼내고,
 │  {ticket, verifier}          │ sha256(verifier) == challenge 확인
 │─────────────────────────────▶│
 │◀── 회원 토큰 쌍(member:true) ──│
```

- **서버가 로그인 업체와 통신합니다(BFF).** 앱은 업체의 코드나 토큰을 보지 못하고, 서버가 준 일회용 티켓만 받습니다. 업체의 토큰은 고유 번호를 확인한 직후 버리고 저장하지 않으며, 로그에도 남기지 않습니다(오류 문구에는 상태 코드와 업체의 오류 코드만).
- **PKCE(S256)**: 앱이 무작위 `verifier` 를 만들어 해시(`codeChallenge`)만 먼저 보냅니다. 앱으로 돌아오는 커스텀 스킴은 다른 앱도 받을 수 있으므로, 티켓을 가로채도 `verifier` 가 없으면 교환할 수 없습니다. 틀린 `verifier` 로 시도해도 티켓은 소모됩니다.
- **돌아올 주소 허용 목록**: `redirectUri` 가 `SSO_ALLOWED_REDIRECTS`(+ 앱 기본 주소)에 **정확히** 있어야 합니다. 쿼리·해시·사용자 정보가 붙은 주소는 거절합니다. (open redirect 방지) `state` 가 위조·만료·다른 업체 것이면 앱으로 보내지 않고 안내 페이지(400)만 보여 줍니다.
- **nonce**: Google·Apple 은 `id_token` 의 발급자·대상·만료·nonce 를 모두 확인합니다. (토큰 엔드포인트에서 TLS 로 직접 받았으므로 서명 검사는 생략합니다 — OIDC 가 허용하는 방식)
- **개인정보 최소화**: 이메일·이름·프로필 사진을 **요청하지도, 저장하지도 않습니다.** 저장하는 것은 `users`(내부 id, 가입/마지막 로그인 시각)와 `user_identities`(업체, 업체가 준 고유 번호) 뿐입니다. 업체가 다르면 같은 사람이어도 **다른 회원**입니다(계정 연결 없음).
- **회원 탈퇴**(`POST /auth/account/delete`): 회원과 로그인 정보, 남은 티켓을 지우고 그 회원의 모든 세션을 폐기합니다. 세션 기록은 `user_id` 만 비워져 남습니다. 같은 계정으로 다시 로그인하면 새 회원입니다.
- **세션 만료**: 회원의 리프레시 토큰이 거절되면(다른 기기에서 탈퇴, 장기간 미사용, DB 초기화) 앱은 **비회원으로 바꾸지 않고** 로그인 화면으로 돌려보냅니다.
- 코드: 흐름 `src/common/application/sso-service.ts`(+ `sso.ts` 의 규칙·포트), 업체별 어댑터 `src/common/infrastructure/auth/sso/`(`google.ts`·`apple.ts`·`naver.ts`·`kakao.ts`, 새 업체는 `SsoProvider` 하나를 구현), 설정 `src/common/infrastructure/config/sso-config.ts`, 핸들러 `src/common/presentation/api/sso.ts`, 테이블 `users`·`user_identities`·`sso_tickets`(`drizzle/0003_sso_login.sql`).

한계(의도한 범위)

- **실제 업체 계정으로는 확인하지 못했습니다.** 흐름·검증·실패 처리는 가짜 업체로 테스트했고(`sso-service.test.ts`, `providers.test.ts`), 업체 어댑터는 각 업체 문서의 요청/응답 모양을 따랐지만 업체 콘솔에 앱을 등록하고 실제로 로그인해 보는 확인은 필요합니다. Apple 은 HTTPS 도메인과 Services ID 가 있어야 시험할 수 있습니다.
- 비회원 세션(`POST /auth/session`)은 누구나 받을 수 있습니다. 비회원 JWT 는 **누구인지 증명하는 것이 아니라 세션을 식별하고 토큰 없는 호출을 막는 것**입니다. 남용은 IP 별 요청 제한(30회/분)으로 줄이지만, 세션을 계속 새로 받아 세션별 한도를 우회할 수는 있습니다. 회원 세션은 업체 로그인을 거치므로 이 한계가 덜합니다.
- 비회원의 **내 조건**과 **관심 공고 id** 는 이 기기에만 암호화되어 있습니다. 로그인하면 관심 공고 id 만 서버 회원 목록에 합칩니다(`PUT /housing/saved`). 내 조건은 기기에 남습니다. 회원 관심 공고는 같은 계정으로 로그인한 다른 기기에서도 보입니다.
- proxy 의 검증은 서명·만료만 보는 무상태 방식이라 DB 를 열지 않습니다. 그래서 폐기한 기기도 이미 받은 액세스 토큰은 만료(기본 15분)까지 유효하고, 그 뒤 갱신에서 막힙니다. 리프레시 토큰은 사용해도 이전 것이 즉시 무효가 되지는 않습니다(회전·재사용 탐지 없음).
- **`POST /api/v1/housing/sync` 는 JWT 대상이 아닙니다.** (앱 버전 확인과 CORS 도 적용하지 않고, 요청 제한(3회/분)만 받습니다.) 앱용 API 가 아니라 운영자용 수집 트리거이고, 앱 토큰(누구나 받을 수 있는)으로 열면 오히려 보호가 약해집니다. 헤더 `X-Operator-Token` 이 `OPERATOR_TOKEN` 과 같아야 하고, production 에서는 토큰이 없거나 24자 미만이면 이 API 는 꺼져 있습니다. 평소 수집은 `HOUSING_SYNC_INTERVAL_MINUTES` 자동 수집 또는 CLI(`npm run housing:sync`)로 하세요. 웹 수집 화면은 production 에서 `ALLOW_WEB_SYNC=true` 가 아니면 막힙니다.

- **서비스 켜기/끄기**: 서비스별 기본값은 코드(`src/features/<id>/feature.ts`, 목록은 `src/features/registry.ts`)에 두고, 운영자가 바꾼 값만 DB(`feature_flags`)에 저장합니다. 값은 CLI 로 바꾸며 서버를 다시 시작할 필요가 없습니다.

  ```bash
  npm run features                  # 목록과 현재 상태
  npm run features -- off housing   # 끄기: 앱에서 숨김 + 임대주택 API 는 503 SERVICE_DISABLED
  npm run features -- on housing    # 켜기
  npm run features -- reset housing # 운영자 설정을 지우고 기본값으로
  ```

  꺼진 서비스의 API 만 막히고 다른 서비스에는 영향이 없습니다. DB 를 읽지 못하면 서버는 멈추지 않고 기본값으로 동작합니다. 서비스 켜기/끄기를 웹 API 로 바꾸는 기능은 만들지 않았습니다. (운영자 인증이 없으므로) 새 서비스를 추가하면 같은 id 로 앱에도 등록합니다(앱의 `FeatureModule.id`).
- **내 조건**을 쿼리로 보내면 응답의 `eligibility`(판정·사유·안내)가 채워집니다. 서버는 조건을 저장하지 않고, 앱은 기기에만 저장합니다. 보내지 않으면 `eligibility: null`. 모든 항목은 선택이고 범위를 벗어난 값은 무시합니다.

  | 파라미터 | 뜻 | 값 |
  | --- | --- | --- |
  | `age` | 만 나이 | 0~120 |
  | `home` / `married` / `newlywed` / `student` | 무주택 / 기혼 / 신혼부부 / 대학생·취준생 | `y` `n` |
  | `household` | 가구원수 | 정수 1~8 |
  | `monthly` | 가구 월 소득(세전 합계) | **만원**, 0~100000 |
  | `dual` | 맞벌이 | `y` `n` |
  | `asset` | 총자산(부채 차감) | **만원** |
  | `car` | 자동차 가액 (없으면 `0`) | **만원** |
  | `account` | 청약통장 가입 | `y` `n` |
  | `income` | (호환용) 도시근로자 월평균소득 대비 %. `household`+`monthly` 가 있으면 무시 | 0~1000 |

  `GET /housing/meta` 의 `standards`(적용 연도, 가구원수별 도시근로자 월평균소득·기준 중위소득)로 앱이 입력 화면에서 "내 소득은 도시근로자 월평균소득의 약 N%"를 안내합니다.
- 응답은 값(코드)과 한글 라벨을 함께 주고, 금액은 원, 면적은 ㎡, 날짜는 `YYYY-MM-DD`(KST)입니다. 원본(raw) 응답은 노출하지 않습니다.
- **CORS**: gateway 가 모든 응답에 한 곳에서 붙입니다(`cors.ts`). `GET, PUT, DELETE, POST, OPTIONS` 와 헤더 `Authorization`, `Content-Type`, `X-App-Version`, `X-App-Platform` 을 허용하고, 앱이 읽는 `Retry-After`, `RateLimit-*`, `X-Request-Id` 를 노출합니다. 토큰은 쿠키가 아니라 헤더로 보내므로 `*` 출처여도 자격 증명이 새지 않지만, 허용 출처는 `API_CORS_ORIGIN`(기본 `*`)으로 배포할 때 Flutter 웹 주소로 좁히세요. 동기화(`POST /api/v1/housing/sync`)에는 CORS 를 열지 않습니다.
- 모바일 앱(Android/iOS)은 CORS 와 무관하지만, 서버 주소는 앱 빌드 시 `--dart-define=API_BASE_URL=...` 로 지정합니다.

## 2차(Supabase) 전환 가이드

저장소는 섹션별 포트 뒤에 있어 domain/application/화면은 바뀌지 않습니다.

1. **스키마**: `features/*/infrastructure/persistence/sqlite/schema.ts` 를 기준으로 Drizzle `pg-core` 스키마를 작성하고 마이그레이션 생성 (금액은 `bigint`, 날짜는 `date`).
2. **리포지토리**: 각 섹션의 `NoticeRepository`, `SyncRunRepository` 등 Postgres 구현 추가. 계약 테스트(`sqlite-repositories.test.ts`)를 공용화해 두 구현에 모두 적용.
3. **조립**: `common/infrastructure/container.ts` 의 `DB_DRIVER=supabase` 분기에서 Postgres 연결을 만들고, 각 섹션 `container.ts` 가 그 연결로 리포지토리를 조립하도록 분기 (현재는 "2차 개발 범위" 에러).
4. **수집 실행**: 웹 요청이 아닌 Supabase Edge Function / cron / GitHub Actions 로 `scripts/housing/sync.ts` 를 주기 실행.
5. **사용자 기능**: 프로필·저장 공고·알림 테이블 + RLS. 소셜 로그인은 이미 서버에 직접 구현되어 있으므로(`users`·`user_identities`·`sso_tickets` 테이블을 Postgres 로 옮기고 `UserStore`/`SsoTicketStore` 의 Postgres 구현을 추가), Supabase Auth 로 바꿀지는 그때 정합니다. 로그인/사용자 관련 코드는 모든 섹션이 쓰므로 `src/common` 에 둡니다. 현재 localStorage 의 "내 조건"은 `ApplicantProfile` 기준으로 서버 저장으로 이전. 공고 테이블은 읽기 전용 공개, 쓰기는 service role 만 허용.
6. **`.env.example`**: 2차에서 환경변수가 안정되면 추가합니다.

## 알려진 한계
- LH 공고는 목록 API + 공고별 공급정보 API(`getLeaseNoticeSplInfo1`)로 단지·주택형·세대수·면적을 채웁니다 (수집 시 공고마다 1회 추가 호출, 약 2분). 단, LH 가 임대(행복·국민·영구·통합)의 보증금·월세를 `공고문 참조` 문자열로만 주므로 **금액은 대부분 비어 있고**, 예비입주자 모집(금회공급 0)·일부 공급정보 코드는 세대수가 없습니다. 같은 공고가 마이홈포털에도 있으면 병합되어 그쪽 값으로 채워질 수 있습니다.
- 크롤러는 사이트 개편에 취약하므로 fixture 테스트가 깨지면 `*-strategy.ts` 를 먼저 확인.
- 크롤링 출처(SH 등)는 세대수·금액 같은 구조화 정보가 없어 금액/면적 필터가 적용되지 않습니다(필터에서 제외하지는 않음).
- 자격 판정은 단순화된 일반 기준이며 법적 효력이 없습니다. 특히 다음은 반영하지 않습니다: 순위·배점(수급자·한부모·차상위 1순위 등), 거주지 우선공급, 신혼·다자녀·생애최초 등 분양 특별공급의 소득·자산 기준, 우선공급 대상 자격, 자녀 수에 따른 자동차 기준 가산, 청약통장 가입기간·납입횟수. 자세한 건 공고문 원문을 확인하세요.
- 일부 유형은 2026년 기준표를 확인하지 못해 예전 기준을 유지합니다. **장기전세**(소득 100%만 판정, 자산 없음)와 **신혼희망타운**(소득 130%, 가산 없음). 공공임대(10·50년)·공공지원민간임대·민간임대·분양은 소득·자산을 판정하지 않습니다(공고별로 다름).
- 청년매입·전세임대는 2순위(본인+부모 소득, 국민임대 자산 기준)를 기준으로 가장 넓게 봅니다. 순위별 차이는 판정 안내(`notes`)에 적혀 있습니다.
- 월 소득과 자산은 사용자가 직접 입력한 값입니다. 실제 심사는 사회보장정보시스템의 공적 자료로 하므로 결과가 다를 수 있습니다.

## 자격 기준표 갱신

소득·자산 기준은 해마다 바뀝니다. (2026년에는 소득 기준이 1월 1일, 자산 기준이 2월 27일 공고문부터 적용됐습니다) `src/features/housing/domain/eligibility/standards.ts` 만 고치면 됩니다.

1. LH청약플러스 "임대가이드"와 마이홈포털에서 새 기준을 확인합니다. (출처는 파일 맨 위 주석)
2. `STANDARDS_YEAR`, `URBAN_WORKER_INCOME_100`(1~8인), `MEDIAN_INCOME_100`(1~8인), `TOTAL_ASSET_LIMIT_WON`, `CAR_LIMIT_WON` 을 고칩니다.
3. 판정 비율(70%, 100%, 150% 등)은 `rules.ts` 에 있고 제도가 바뀔 때만 고칩니다.
4. `domain/eligibility/eligibility.test.ts` 의 "공고문 표와 같다" 테스트는 공고문에 적힌 금액과 계산 결과를 맞춰 보는 것이므로, 새 공고문의 금액으로 바꿔 계산이 맞는지 확인합니다. (1인 +20%p, 2인 +10%p 가산과 반올림 규칙이 맞는지 검증됩니다)
5. 앱은 `meta.standards` 를 서버에서 받으므로 앱 배포는 필요 없습니다.
