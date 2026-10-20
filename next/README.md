# 청년의 모든 것 (everything_about_youth)

한국 청년이 이용할 수 있는 정보를 섹션별로 모으는 사이트. 지금은 **임대주택** 섹션 하나만 있고(1차, 개인용), 이후 섹션이 계속 추가됩니다.

- Next.js 16 (App Router) + TypeScript
- 클린 아키텍처 + **섹션(feature) 단위 폴더 구조**
- 1차 DB는 SQLite(Drizzle + better-sqlite3), 2차에 Supabase(Postgres) 전환 예정
- 로그인 없음 (개인용)

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
- **자격 판정**: 공급유형별 일반 기준(나이 19~39세, 소득 %, 무주택, 미혼, 청년/신혼/대학생 중 하나 등)으로 판정하며 **참고용**입니다. 모르는 입력은 `조건 확인 필요`. 공고마다 요건이 다르므로 원문을 확인하세요.

## JSON API (Flutter 앱용)

`../flutter` 앱이 쓰는 읽기 전용 API 입니다. 구현은 `src/features/housing/presentation/api/`(`dto.ts`, `handlers.ts`), 라우트는 `src/app/api/v1/housing/`.

모든 경로는 `/api/v1` 로 시작합니다. (아래 표는 `/api/v1` 뒤의 경로)

| 엔드포인트 | 설명 |
| --- | --- |
| `GET /housing/meta` | 필터 선택지와 한글 라벨(공급유형·주택유형·상태·판정·정렬·시도). 앱은 라벨 표를 복제하지 않고 이 응답을 씁니다. |
| `GET /housing/notices` | 공고 목록. 웹과 같은 쿼리(`sido, sigungu, supply, housing, status, q, maxDeposit(만원), maxRent(만원), minArea, maxArea, sort, page, v`)에 `pageSize`(1~50, 기본 20) 추가. |
| `GET /housing/notices/:id` | 공고 상세(단지·세대유형·출처). 없으면 404 `NOTICE_NOT_FOUND` |
| `GET /features` | 서비스 켜짐/꺼짐 `{ "features": [{ "id": "housing", "enabled": true }] }`. 앱이 시작할 때 받아 꺼진 서비스를 숨깁니다. 캐시하지 않습니다. |
| `GET /app-config` | **토큰 없이** 호출. `{ api: { version }, update: { status: none｜optional｜required, minVersion, latestVersion, storeUrl, message } }`. 앱이 시작할 때 강제 업데이트인지 묻습니다. |
| `POST /auth/session` | **토큰 없이** 호출. 서버가 기기 id 를 만들어 토큰 쌍을 줍니다. `{ tokenType, accessToken, accessExpiresIn, refreshToken, refreshExpiresIn }` (만료는 남은 초) |
| `POST /auth/refresh` | **토큰 없이** 호출. 본문 `{ "refreshToken": "..." }` → 새 토큰 쌍. 만료·위조·폐기·모르는 기기는 모두 401 `AUTH_REFRESH_INVALID` |

`/auth/*` 와 `/app-config` 를 뺀 나머지는 모두 `Authorization: Bearer <accessToken>` 이 있어야 합니다.

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
| `AUTH_REFRESH_INVALID` | 401 | 리프레시 토큰 거절 (앱은 새 세션을 받음) |
| `FORBIDDEN` · `OPERATOR_DISABLED` | 403 | 허용되지 않음 · 운영 환경에서 웹 수집 비활성 |
| `NOT_FOUND` · `NOTICE_NOT_FOUND` | 404 | 없는 주소 · 없는 공고 |
| `API_VERSION_UNSUPPORTED` | 410 | 닫힌(또는 없는) API 버전 → 앱은 업데이트 화면 |
| `APP_UPDATE_REQUIRED` | 426 | 앱 버전이 최소 버전 미만. `details: { minVersion, storeUrl }` → 앱은 업데이트 화면 |
| `RATE_LIMITED` | 429 | 요청 제한 초과. `Retry-After` 헤더와 `details.retryAfterSeconds` |
| `SERVICE_DISABLED` | 503 | 운영자가 끈 서비스 |
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
| `/auth/session`, `/auth/refresh` | IP 별 | 30회/분 |
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

- **모든 `/api/*` 는 `src/proxy.ts` 한 곳에서 검사**합니다(Next 16 의 proxy). 새 API 를 추가해도 따로 붙일 것이 없고, 토큰이 없으면 라우트에 닿기 전에 401 입니다. 예외는 `src/common/presentation/api/auth.ts` 의 `PUBLIC_API_PATHS`(세션 발급/갱신, 앱 설정)와 `OPERATOR_API_PATHS`(수집 트리거), 그리고 CORS 사전 요청(`OPTIONS`)뿐이며 테스트가 우회 경로(`/api/v1/auth/session/x` 등)까지 확인합니다.
- 토큰은 HS256 JWT 이고 알고리즘을 고정해 검증합니다(`alg: none`·다른 알고리즘 거절). 서명, 발급자, 대상, 만료, **토큰 종류(access/refresh)** 를 모두 봅니다. 리프레시 토큰으로 데이터 API 를 부르거나 그 반대는 안 됩니다.
- 401 응답의 `code`: `AUTH_REQUIRED`(토큰 없음) · `AUTH_TOKEN_EXPIRED`(만료, 앱이 갱신해서 다시 시도) · `AUTH_TOKEN_INVALID`(위조·종류 불일치). `WWW-Authenticate: Bearer` 헤더도 함께 줍니다.
- **식별**: 서버가 기기마다 id(JWT `sub`)를 만들어 `auth_clients` 테이블에 저장합니다. 앱이 id 를 보내서 서버와 맞추는 방식이 아니라, **서버가 토큰에 넣은 값을 서버가 읽습니다.** 폐기(`AuthService.revoke`)한 기기는 갱신이 거절됩니다.
- 코드 위치: 유스케이스·포트 `src/common/application/auth.ts`, JWT 구현(jose) `src/common/infrastructure/auth/`, 요청 검사·핸들러 `src/common/presentation/api/auth.ts`. 로그인(2차)이 생기면 `AuthService.startSession` 만 "로그인 확인 후 발급"으로 바꾸면 되고 검증과 앱의 토큰 처리는 그대로입니다.

한계(의도한 범위)

- 로그인이 없으므로 `POST /auth/session` 은 누구나 호출할 수 있습니다. 즉 지금의 JWT 는 **누구인지 증명(인증)하는 것이 아니라 기기를 식별하고 토큰 없는 호출을 막는 것**입니다. 남용은 IP 별 요청 제한(30회/분)으로 줄이지만, 기기 id 를 계속 새로 받아 기기별 한도를 우회할 수는 있습니다. 로그인이 붙으면 발급 조건이 생깁니다.
- proxy 의 검증은 서명·만료만 보는 무상태 방식이라 DB 를 열지 않습니다. 그래서 폐기한 기기도 이미 받은 액세스 토큰은 만료(기본 15분)까지 유효하고, 그 뒤 갱신에서 막힙니다. 리프레시 토큰은 사용해도 이전 것이 즉시 무효가 되지는 않습니다(회전·재사용 탐지 없음).
- **`POST /api/v1/housing/sync` 는 JWT 대상이 아닙니다.** (앱 버전 확인과 CORS 도 적용하지 않고, 요청 제한(3회/분)만 받습니다.) 앱용 API 가 아니라 운영자용 수집 트리거이고, 앱 토큰(누구나 받을 수 있는)으로 열면 오히려 보호가 약해집니다. production 에서는 `ALLOW_WEB_SYNC=true` 가 아니면 403 이며, 운영자 인증은 로그인(2차)에서 추가합니다. 수집은 가능하면 CLI(`npm run housing:sync`)로 하세요.

- **서비스 켜기/끄기**: 서비스별 기본값은 코드(`src/features/<id>/feature.ts`, 목록은 `src/features/registry.ts`)에 두고, 운영자가 바꾼 값만 DB(`feature_flags`)에 저장합니다. 값은 CLI 로 바꾸며 서버를 다시 시작할 필요가 없습니다.

  ```bash
  npm run features                  # 목록과 현재 상태
  npm run features -- off housing   # 끄기: 앱에서 숨김 + 임대주택 API 는 503 SERVICE_DISABLED
  npm run features -- on housing    # 켜기
  npm run features -- reset housing # 운영자 설정을 지우고 기본값으로
  ```

  꺼진 서비스의 API 만 막히고 다른 서비스에는 영향이 없습니다. DB 를 읽지 못하면 서버는 멈추지 않고 기본값으로 동작합니다. 웹으로 바꾸는 API 는 로그인(2차) 전까지 만들지 않았습니다. 새 서비스를 추가하면 같은 id 로 앱에도 등록합니다(앱의 `FeatureModule.id`).
- **내 조건**(`age, home, married, newlywed, student, income`)을 쿼리로 보내면 응답의 `eligibility`(판정·사유·안내)가 채워집니다. 서버는 조건을 저장하지 않고, 앱은 기기에만 저장합니다. 보내지 않으면 `eligibility: null`.
- 응답은 값(코드)과 한글 라벨을 함께 주고, 금액은 원, 면적은 ㎡, 날짜는 `YYYY-MM-DD`(KST)입니다. 원본(raw) 응답은 노출하지 않습니다.
- **CORS**: gateway 가 모든 응답에 한 곳에서 붙입니다(`cors.ts`). `GET, POST, OPTIONS` 와 헤더 `Authorization`, `Content-Type`, `X-App-Version`, `X-App-Platform` 을 허용하고, 앱이 읽는 `Retry-After`, `RateLimit-*`, `X-Request-Id` 를 노출합니다. 토큰은 쿠키가 아니라 헤더로 보내므로 `*` 출처여도 자격 증명이 새지 않지만, 허용 출처는 `API_CORS_ORIGIN`(기본 `*`)으로 배포할 때 Flutter 웹 주소로 좁히세요. 동기화(`POST /api/v1/housing/sync`)에는 CORS 를 열지 않습니다.
- 모바일 앱(Android/iOS)은 CORS 와 무관하지만, 서버 주소는 앱 빌드 시 `--dart-define=API_BASE_URL=...` 로 지정합니다.

## 2차(Supabase) 전환 가이드

저장소는 섹션별 포트 뒤에 있어 domain/application/화면은 바뀌지 않습니다.

1. **스키마**: `features/*/infrastructure/persistence/sqlite/schema.ts` 를 기준으로 Drizzle `pg-core` 스키마를 작성하고 마이그레이션 생성 (금액은 `bigint`, 날짜는 `date`).
2. **리포지토리**: 각 섹션의 `NoticeRepository`, `SyncRunRepository` 등 Postgres 구현 추가. 계약 테스트(`sqlite-repositories.test.ts`)를 공용화해 두 구현에 모두 적용.
3. **조립**: `common/infrastructure/container.ts` 의 `DB_DRIVER=supabase` 분기에서 Postgres 연결을 만들고, 각 섹션 `container.ts` 가 그 연결로 리포지토리를 조립하도록 분기 (현재는 "2차 개발 범위" 에러).
4. **수집 실행**: 웹 요청이 아닌 Supabase Edge Function / cron / GitHub Actions 로 `scripts/housing/sync.ts` 를 주기 실행.
5. **사용자 기능**: 로그인(Supabase Auth), 프로필·저장 공고·알림 테이블 + RLS. 로그인/사용자 관련 코드는 모든 섹션이 쓰므로 `src/common` 에 둡니다. 현재 localStorage 의 "내 조건"은 `ApplicantProfile` 기준으로 서버 저장으로 이전. 공고 테이블은 읽기 전용 공개, 쓰기는 service role 만 허용.
6. **`.env.example`**: 2차에서 환경변수가 안정되면 추가합니다.

## 알려진 한계
- LH 공고는 목록 API + 공고별 공급정보 API(`getLeaseNoticeSplInfo1`)로 단지·주택형·세대수·면적을 채웁니다 (수집 시 공고마다 1회 추가 호출, 약 2분). 단, LH 가 임대(행복·국민·영구·통합)의 보증금·월세를 `공고문 참조` 문자열로만 주므로 **금액은 대부분 비어 있고**, 예비입주자 모집(금회공급 0)·일부 공급정보 코드는 세대수가 없습니다. 같은 공고가 마이홈포털에도 있으면 병합되어 그쪽 값으로 채워질 수 있습니다.
- 크롤러는 사이트 개편에 취약하므로 fixture 테스트가 깨지면 `*-strategy.ts` 를 먼저 확인.
- 크롤링 출처(SH 등)는 세대수·금액 같은 구조화 정보가 없어 금액/면적 필터가 적용되지 않습니다(필터에서 제외하지는 않음).
- 자격 판정은 단순화된 일반 기준이며 법적 효력이 없습니다.
