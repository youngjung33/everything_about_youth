# 청년의 모든 것 (everything_about_youth)

한국 청년이 이용할 수 있는 정보를 섹션별로 모으는 서비스. 지금은 **임대주택** 섹션(공고 통합 조회 + 내 조건 자격 판정)이 있습니다.

```
next/      서버: 공고 수집(LH·마이홈·청약홈·SH·iH·GH), DB(SQLite), 관리자 페이지, JSON API
flutter/   앱: 웹 · Android · iOS 를 하나의 Dart 코드로. 서버의 JSON API 만 호출합니다.
```

```
 공공데이터/기관 사이트 ──수집──▶ next (SQLite) ──JSON API──▶ flutter (web / android / ios)
```

- 데이터 수집·병합·자격 판정 규칙은 모두 **서버(`next/`)** 에 있고, 앱은 화면과 "내 조건"(기기에만 저장)만 담당합니다.
- 기존 Next 웹 화면(`next/src/app/housing` 등)은 Flutter 앱이 확인될 때까지 남겨 두었습니다.

## 실행

### 1. 서버 (`next/`)

```bash
cd next
npm install
# next/.env.local 에 DATA_GO_KR_SERVICE_KEY 등 설정 (자세한 항목은 next/README.md)
npm run db:migrate
npm run housing:sync        # 공고 수집
npm run dev                 # http://localhost:3000
```

JSON API 설명과 CORS 설정(`API_CORS_ORIGIN`)은 [next/README.md](next/README.md#json-api-flutter-앱용) 를 보세요.

### 2. 앱 (`flutter/`)

```bash
cd flutter
flutter pub get

# 웹
flutter run -d chrome
# Android 에뮬레이터 (서버 기본 주소 http://10.0.2.2:3000)
flutter run -d <android-device>
# iOS 시뮬레이터 (macOS 필요, 서버 기본 주소 http://localhost:3000)
flutter run -d <ios-device>
```

서버 주소를 바꾸려면 `--dart-define=API_BASE_URL=https://api.example.com` 을 붙입니다. 실기기에서는 PC 의 LAN 주소(`http://192.168.x.x:3000`)나 배포한 서버 주소를 써야 합니다.

배포용 빌드:

```bash
flutter build web --release --dart-define=API_BASE_URL=https://api.example.com --dart-define=APP_ENV=prod
flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com --dart-define=APP_ENV=prod
flutter build ios --release --dart-define=API_BASE_URL=https://api.example.com --dart-define=APP_ENV=prod   # macOS 에서만
```

### 3. 테스트

```bash
cd next    && npm test && npm run typecheck && npm run lint
cd flutter && flutter analyze && flutter test
# 서버 DTO ↔ 앱 fromJson 계약 (contracts/api/*.json)
cd next    && npm run contracts:sync && npm test -- src/contracts/api-contract.test.ts
cd flutter && flutter test test/contracts/api_contract_test.dart
```

## 앱 구조 (`flutter/lib`)

"코어 + 꽂는 서비스" 구조입니다. 코어는 서비스를 모르고, 서비스(임대주택, 앞으로의 일자리·금융 …)가 코어의 규격을 구현해 꽂힙니다. 서비스 하나는 `features/<id>/` 폴더 하나이고, 그 안은 클린 아키텍처 레이어로 나눕니다. 자세한 규칙과 새 서비스 추가 방법은 [`flutter/lib/features/README.md`](flutter/lib/features/README.md).

```
app/                          조립부: 어떤 서비스를 꽂을지, 라우트와 가드를 정한다
  app.dart                    MaterialApp + 시작 상태/서비스 켜짐 변화를 라우터에 전달
  router.dart                 라우트 + 가드(updateRedirect > bootstrapRedirect > featureRedirect)
  feature_modules.dart        꽂힌 서비스 목록 (서비스 추가/제거는 여기 한 줄)
  shell/                      모든 화면의 공통 틀: 헤더(로고·메뉴), 푸터, 모바일 서랍 메뉴, 메뉴 항목 만들기
core/                         서비스와 무관한 공용 코드 (features/app 을 import 하지 않음)
  feature/                    서비스 규격(FeatureModule)과 켜기/끄기(FeatureFlags)
  bootstrap/                  시작 작업 파이프라인 (서비스별로 격리해서 실행)
  providers/                  서비스가 받아 쓰는 공용 인프라 (API 클라이언트, 기기 저장소, 설정)
  error/                      처리되지 않은 오류를 받는 전역 처리기
  layout/                     화면 공통 틀: AppScaffold, AppTopBar, CenteredScrollView, showAppBottomSheet, AppSystemUi
  update/ security/           앱 버전·강제 업데이트 상태, 개인정보 암호화(FieldCipher)
  config/ network/ format/ theme/ util/
  widgets/                    공용 위젯: AppLogo, 상태 화면 LoadingView(전체/영역), InlineLoading(작은 크기), ErrorView, EmptyView
features/
  home/ splash/ unavailable/ update_required/  앱 셸 화면 (홈 카드, 시작 화면, 꺼짐/장애 안내, 강제 업데이트)
  housing/                    임대주택 서비스
    housing_module.dart       코어에 꽂히는 유일한 접점 (라우트, 홈 카드, 시작 작업)
    domain/                   모델, 필터, 내 조건, 저장소 인터페이스 (순수 Dart)
    data/                     API 저장소, 내 조건 저장(암호화해서 SharedPreferences 에)
    application/              Riverpod 상태(목록 무한 스크롤, 필터, 상세, 내 조건)
    presentation/             페이지와 위젯 (넓은 화면: 필터 사이드바 / 좁은 화면: 바텀시트)
```

의존 방향(`core ← features ← app`, 서비스끼리 금지, 서비스 안은 `presentation → application → data → domain`)은 `test/architecture_test.dart` 가 자동으로 검사합니다.

### 화면 틀 (헤더 · 푸터 · 메뉴)

스플래시를 뺀 모든 화면은 `app/shell/` 의 공통 틀 안에서 바뀝니다. (라우터의 `ShellRoute`) 화면을 옮겨도 헤더와 푸터는 다시 만들어지지 않습니다.

- **헤더**: 왼쪽 위에 로고(누르면 홈)와 메뉴. 너비 760 이상이면 `[로고] [홈] [임대주택] …` 처럼 메뉴가 펼쳐지고, 그보다 좁으면 `[☰] [로고]` 이며 ☰ 를 누르면 **왼쪽에서 서랍 메뉴**가 열립니다. 서랍에서 항목을 고르면 닫히고 이동하며, 바깥을 눌러도 닫힙니다. 지금 보고 있는 항목은 강조됩니다.
- **메뉴 항목은 "홈 + 켜져 있는 서비스"로 자동 생성**됩니다(`buildMenuItems`). 서비스가 서버에서 꺼지면 메뉴에서도 사라지고, 새 서비스를 꽂으면 코드를 고치지 않아도 메뉴에 나옵니다. 이름·아이콘·경로는 서비스가 `FeatureModule.entry`/`basePath` 로 알려 준 값을 씁니다.
- **푸터**: 저작권과 안내 문구. 특정 서비스를 언급하지 않아 서비스가 늘어도 그대로 맞습니다. 좁은 화면에서는 두 줄로 쌓입니다.
- **로고**는 임시 마크(아이콘 + 앱 이름)입니다. 실제 로고가 생기면 `core/widgets/app_logo.dart` 한 곳만 바꾸면 헤더와 서랍에 모두 반영됩니다.
- 서비스 화면의 자체 앱바(뒤로가기, 필터 등)는 헤더 아래에 그대로 나옵니다.

### 안전 영역과 스크롤 (노치 · 홈 인디케이터 · 갤럭시 내비게이션바 · 키보드)

기기마다 화면이 잘리는 방식이 달라서(아이폰 아래 홈 인디케이터, 갤럭시 3버튼 내비게이션바, 노치, 가로 모드 카메라 구멍, 키보드) 이를 **`core/layout/` 한 곳에서만** 처리합니다. 화면은 이 공통 틀만 쓰고, 직접 `Scaffold`/`AppBar`/`SafeArea`/`showModalBottomSheet` 를 쓰면 `test/architecture_test.dart` 가 실패합니다.

| 위젯 | 역할 |
| --- | --- |
| `AppTopBar` | `AppBar` 를 상속한 공통 상단바. `primary:false`(상태바 높이는 직접 더하지 않음)와 시스템 바 스타일을 고정한다. 화면은 `AppBar` 대신 이것을 쓴다. |
| `AppScaffold` | 위에서 아래로 `SafeArea ▸ 상단바`, `SafeArea ▸ 본문`, `SafeArea ▸ 하단 바(푸터)`. 상단바·하단 바 배경은 상태바/내비게이션바 뒤까지 칠한다. 위·아래가 이미 처리됐음을 안쪽 화면에 알려서 **중첩해도 여백이 두 번 더해지지 않는다.** 키보드가 올라오면 하단 바를 숨긴다. |
| `CenteredScrollView` | 짧으면 가운데, 길면 스크롤. 오류·안내 화면이 작은 폰·가로 모드·큰 글꼴에서 잘리지 않게 한다. |
| `showAppBottomSheet` | 기본 바텀시트는 아래 안전 영역을 피하지 않아서 맨 아래 버튼이 가려진다. 아래 여백, 키보드, 스크롤을 함께 처리한다. |
| `AppSystemUi` | 앱 시작 때 edge-to-edge 로 통일하고(안드로이드 15 이상은 기본 강제), 시스템 바를 투명하게 해서 갤럭시 3버튼 내비게이션바에 반투명 막이 덮이지 않게 한다. |

- **스크롤은 `SafeArea` 안쪽**에서 합니다. 본문이 `ListView`/`SingleChildScrollView` 이므로 마지막 내용이 홈 인디케이터·내비게이션바에 가려지지 않습니다.
- **서랍 메뉴**는 본문 바깥이라 `SafeArea` 가 닿지 않아서 `AppDrawer` 가 아래 여백을 직접 더합니다.
- **웹**은 시스템 영역이 없어 여백이 0 이라 `SafeArea` 가 아무 일도 하지 않고, `AppSystemUi.apply()` 도 건너뜁니다.
- 테스트(`test/core/layout_test.dart`)가 아이폰(위 47/아래 34), 갤럭시 3버튼(아래 48), 가로 모드 구멍(좌우 48), 키보드를 흉내 내서 위·아래·좌우가 가려지지 않는지, 중첩해도 여백이 중복되지 않는지 확인합니다. **실제 기기(아이폰/갤럭시)에서의 확인은 별도로 필요합니다.**

### 서비스 켜기/끄기와 장애 격리

- **켜고 끄기는 서버가 관리합니다.** 서버에서 `cd next && npm run features -- off housing`(켜기는 `on`, 기본값으로는 `reset`)으로 바꾸면 서버 재시작 없이 반영됩니다. 앱은 서비스별 기본값(`defaultEnabled`)으로 시작하고, 시작할 때 `GET /api/v1/features` 로 서버 값을 받아 꺼진 서비스를 숨깁니다. 서버는 꺼진 서비스의 API 도 503 으로 막습니다.
- **서버가 죽었어도** 앱은 시작됩니다. 값의 우선순위는 서버 설정 > 기기에 남은 직전 서버 설정 > 기본값이고, 서버 설정은 최대 3초만 기다립니다.
- 꺼진 서비스는 홈에 보이지 않고, 주소로 들어와도 안내 화면이 나오며, 시작 작업도 돌지 않습니다.
- **장애 격리**: 서비스의 시작 작업은 서로 독립적으로 병렬 실행됩니다. 한 서비스가 실패하거나 시간을 넘겨도 다른 서비스와 앱 시작에는 영향이 없고, 그 서비스만 "사용 불가"가 되어 홈 카드에 "다시 시도"가 뜹니다.
- 처리되지 않은 오류는 `core/error` 가 받아 앱이 중단되지 않게 하고, 위젯 빌드 오류는 해당 위젯만 오류 표시로 바뀝니다.

### 서버 요청과 JWT

- **모든 API 요청에 JWT 가 자동으로 붙습니다.** 서비스의 data 레이어는 `apiClientProvider` 만 쓰면 되고 토큰은 신경 쓰지 않습니다. (`core/network/api_client.dart` 가 `Authorization: Bearer` 를 붙입니다)
- 처음 실행하면 `POST /api/v1/auth/session` 으로 토큰을 받고(서버가 기기 id 를 만들어 토큰에 넣습니다), 만료되면 `POST /api/v1/auth/refresh` 로 갱신합니다. 서버가 401 을 주면 갱신해서 **한 번만** 다시 보내고, 여러 요청이 동시에 만료돼도 갱신은 한 번입니다. 리프레시도 거절되면(폐기, 서버 DB 초기화) 새 세션을 받습니다.
- 앱은 id 를 서버와 맞추지 않습니다. 서버가 토큰으로 준 값을 서버가 읽는 방식입니다. 토큰은 플랫폼 보안 저장소(`flutter_secure_storage`: iOS Keychain, Android Keystore, 웹은 암호화한 localStorage)에 보관하며 평문 SharedPreferences 에는 두지 않습니다. 저장이 안 돼도 앱은 동작합니다(다음 실행 때 새로 받을 뿐).
- 코드는 `core/auth/`(세션·토큰·저장소). 서버 규칙과 한계는 [next/README.md](next/README.md#인증-jwt) 를 보세요.

### 로그인 (소셜 로그인만 + 비회원)

자체 로그인(아이디·비밀번호)은 없습니다. 처음 실행하면 **로그인 화면**(`features/login/`)이 뜨고, 아래 둘 중 하나를 고릅니다.

- **비회원으로 시작하기**: 서버 호출 없이 바로 앱으로 들어갑니다. 조회는 모두 됩니다. 선택은 기기에 기억되므로 다음 실행부터 로그인 화면이 뜨지 않고, 헤더의 **로그인**(좁은 화면은 아이콘)으로 언제든 회원이 될 수 있습니다. 로그인하면 보던 화면으로 돌아옵니다.
- **Google · Apple · 네이버 · 카카오**: 네 개를 **항상 보여주고**, 서버에 설정이 있어서 지금 쓸 수 있는 것만 누를 수 있습니다. 나머지는 "준비 중"으로 비활성입니다. (앱 시작이 아니라 로그인 화면이 열릴 때마다 `GET /api/v1/auth/providers` 로 묻습니다. 서버에 닿지 못하면 "준비 중"이라고 하지 않고 "불러오지 못했습니다 + 다시 시도"를 보여주며, 이때도 비회원 시작은 됩니다.)

로그인 방식: 앱이 시스템 브라우저로 로그인 창을 열면(`flutter_web_auth_2`: Android 커스텀 탭, iOS `ASWebAuthenticationSession`, 웹은 팝업) **서버**가 로그인 업체와 통신하고, 앱은 서버가 돌려주는 일회용 티켓을 PKCE 로 회원 토큰과 교환합니다. 앱은 업체의 코드나 토큰을 보지 않습니다. 자세한 흐름과 보안 규칙은 [next/README.md](next/README.md#소셜-로그인-sso) 를 보세요.

- 상태(`AuthMode`: 로그인 전 / 비회원 / 회원)는 `core/auth/auth_mode.dart`, 라우터 가드는 `app/router.dart` 의 `authRedirect`(로그인 전이면 어디로 오든 로그인 화면, 회원이면 로그인 화면에 머물지 않음)입니다. 가드 순서는 강제 업데이트 > 시작 작업 > 로그인 > 서비스 켜짐/꺼짐입니다.
- 헤더 오른쪽의 계정 메뉴(`app/shell/account_menu.dart`): 비회원은 **로그인**, 회원은 **로그아웃 · 회원 탈퇴**(확인 창). 로그아웃은 서버에 알리지 못해도 이 기기에서는 반드시 됩니다. 탈퇴는 서버에서 지우지 못하면 로그인 상태를 유지하고 이유를 알립니다.
- **회원 세션이 끝나면**(다른 기기에서 탈퇴, 서버 DB 초기화 등) 조용히 비회원으로 바꾸지 않고 로그인 화면으로 돌아옵니다. 비회원은 예전처럼 알아서 새 세션을 받습니다.
- **네이티브 설정**: 로그인이 끝나면 서버가 `everythingaboutyouth://auth?ticket=…` 로 돌려보냅니다. Android 는 `AndroidManifest.xml` 의 `CallbackActivity`, iOS 는 별도 설정이 필요 없습니다(`ASWebAuthenticationSession`). 웹은 `web/auth.html` 이 결과를 앱 창에 전달하므로 **서버의 `SSO_ALLOWED_REDIRECTS` 에 `https://<웹 주소>/auth.html` 을 넣어야 합니다.**
- 업체별 로고 이미지는 없고 임시 글자·아이콘 마크를 씁니다(버튼 색은 각 업체 가이드 색). 정식 출시 전에 업체 브랜드 가이드의 로고로 바꿔야 하며, **iOS 앱에 다른 소셜 로그인을 넣으면 Apple 로그인도 함께 제공해야 한다는 App Store 심사 규정**이 있으므로 Apple 을 끄고 출시하지 마세요.

### API 버전 · 오류 코드 · 강제 업데이트 · 요청 제한

서버와 앱이 같이 지키는 규약입니다. 서버 쪽 자세한 내용(오류 코드 표, 환경변수, 제한 값)은 [next/README.md](next/README.md#json-api-flutter-앱용) 에 있습니다.

- **API 버전**: 모든 경로가 `/api/v1/...` 입니다. 앱의 `ApiClient` 가 접두사(`core/network/api_version.dart` 의 `kApiPrefix`)를 붙이므로 서비스 코드는 `/housing/notices` 처럼 버전 없이 씁니다. 호환이 깨지는 변경이 생기면 서버에 `v2` 를 만들고 앱의 `kApiPrefix` 만 바꿉니다.
- **오류 코드**: 서버의 모든 오류는 `{ "error": { "code", "message", "requestId", "details" } }` 한 가지 모양입니다. 앱은 `ApiException`(`code`, `message`, `requestId`, `retryAfter`)으로 받고, 코드는 `core/network/api_error_code.dart` 에 있습니다. `message` 는 그대로 화면에 보여줘도 되는 한글입니다. 서버까지 못 간 실패(연결·시간 초과·해석 불가)는 앱이 `NETWORK_ERROR`/`TIMEOUT`/`BAD_RESPONSE` 코드를 붙입니다.
- **강제 업데이트**: 모든 요청에 `X-App-Version`/`X-App-Platform` 이 실립니다(`package_info_plus`). 서버의 `APP_MIN_VERSION` 보다 낮은 모바일 앱은 426 을 받고, 앱 전체가 **업데이트 화면**(`features/update_required/`)으로 바뀝니다. 시작할 때 `GET /api/v1/app-config` 로 미리 확인하고(서버에 닿지 못하면 막지 않음), 실행 중에 서버가 최소 버전을 올려도 다음 API 호출에서 같은 화면이 됩니다. 업데이트 화면에서는 헤더·메뉴로 우회할 수 없고 뒤로 가기도 막힙니다. 서버가 `API v1` 을 닫아도(410) 같은 화면입니다.
- **요청 제한**: 기기별 분당 120회 등(서버 설정). 넘으면 429 `RATE_LIMITED` 와 `retryAfter` 를 받습니다. 앱이 자동으로 재시도하지는 않습니다.

### 글꼴 크기 상한

시스템의 "글자 크기" 설정은 따르되 **0.85배 ~ 1.4배** 안으로 제한합니다(`core/theme/app_text_scale.dart` 의 `AppTextScale.min/max`, `MaterialApp.builder` 에서 한 번 적용). 접근성 설정이 최대(안드로이드 약 2.0배, iOS 3배 이상)여도 헤더·칩·버튼이 깨지지 않게 하려는 것입니다. 더 크게 허용하려면 `max` 만 올리면 되고, 테스트(`update_flow_test.dart`)가 3배 설정에서도 좁은 화면(320px)에서 넘치지 않는지 확인합니다.

### 개인정보 암호화

- 기기에 저장하는 개인정보("내 조건": 나이·가구원수·소득·자산·무주택 등)는 **AES-256-GCM 으로 암호화**해서 저장합니다. 규격은 `core/security/field_cipher.dart`(`FieldCipher`, `AesGcmFieldCipher`)이고 서비스는 `fieldCipherProvider` 를 받아 씁니다. 개인정보를 기기에 저장하는 새 기능은 평문 SharedPreferences 에 직접 쓰지 말고 이것을 거치세요.
- **키는 암호문과 다른 곳에** 둡니다. 암호문은 SharedPreferences, 키는 보안 저장소(iOS Keychain, Android Keystore; `core/security/cipher_key_store.dart`)입니다. 앱 저장소 파일만 유출돼도 읽을 수 없습니다.
- `context`(예 `housing.profile`)가 암호문에 묶여 있어 다른 값의 암호문을 끼워 넣어도 읽히지 않고, 변조나 다른 키는 복호화 실패입니다. **복호화 실패는 예외가 아니라 "값 없음"** 으로 처리되어 앱이 죽지 않고 사용자가 다시 입력하게 됩니다. (앱을 지웠다 다시 깔면 키를 잃어 옛 값은 못 읽습니다 — 의도한 동작입니다.)
- 암호화 이전 버전이 저장한 평문 값은 처음 읽을 때 암호화해서 다시 저장합니다.
- **웹의 한계**: 웹은 키도 브라우저 저장소에 있어서, 같은 브라우저 프로필에 접근할 수 있는 사람에게는 막지 못합니다. 모바일에서만 기기 보안 저장소의 보호를 받습니다. 서버 쪽 암호화는 [next/README.md](next/README.md#개인정보-암호화) 를 보세요.

### 시작 흐름 (스플래시 → 홈)

고정 시간이 아니라 **시작 작업이 모두 끝나야** 홈이 열립니다.

0. 가장 먼저 앱 버전을 확인합니다(최대 3초). 강제 업데이트면 아래 작업을 모두 건너뛰고 업데이트 화면으로 갑니다.
1. 앱이 뜨면 `bootstrapProvider` 가 코어 작업(`bootstrapTasksProvider`)과 켜져 있는 서비스의 작업(`FeatureModule.bootstrapTasks`)을 병렬로 실행합니다. 지금은 임대주택의 "내 조건 읽기"(필수)와 "필터 선택지 + 첫 페이지 공고 미리 받기"(선택)가 있습니다.
2. 끝나기 전에는 라우터 가드(`bootstrapRedirect`)가 어떤 주소로 들어와도 `/splash` 로 보내고 원래 주소를 `from` 에 보관합니다. 끝나면 `from`(없으면 홈)으로 보냅니다. 웹에서 `#/housing/notices/..` 를 직접 열어도 로딩 뒤 그 화면으로 갑니다.
3. **코어** 필수 작업이 실패하면 스플래시가 오류와 "다시 시도"를 보여줍니다. **서비스** 작업은 필수여도 앱을 막지 않고 그 서비스만 사용 불가로 만들며, 선택 작업은 실패하거나 시간(기본 10초)을 넘기면 건너뜁니다. 너무 빨리 끝나도 600ms 는 보여줍니다.

스플래시 내용은 의도적으로 비워 두었습니다. 나중에 `features/splash/splash_brand.dart` 의 `SplashBrand` 와 `web/index.html` 의 `#boot-brand` 에 로고/문구를 넣으면 됩니다.

### 글꼴

글꼴 파일은 앱에 포함해 웹에서도 따로 받지 않습니다. 굵기는 **400/700 두 가지만** 씁니다.

- `assets/fonts/pretendard/`: iOS, 웹에서 쓰는 Pretendard (SIL OFL 1.1)
- `assets/fonts/android/`: Android 에서 쓸 글꼴 자리. 지금은 비어 있어서 Android 도 Pretendard 를 씁니다. 추가 순서는 `assets/fonts/README.md`

글꼴과 색상은 `core/theme` 에서 한곳에 모읍니다. 위젯은 `Color(0xFF..)`, `FontWeight.w800` 을 직접 쓰지 않습니다.

- `app_fonts.dart`: 플랫폼별 글꼴 선택, 굵기(`regular`/`bold`)
- `app_colors.dart`: 색상 팔레트와 상태 색(성공/정보/주의/위험/중립)
- `app_text_styles.dart`: 글꼴·굵기·글자색을 입힌 `textTheme` (제목/라벨 bold, 본문 regular)
- `app_theme.dart`: 위 셋을 모아 `ThemeData` 를 만든다

## 플랫폼별 준비

### Android (Windows/macOS/Linux)
`flutter doctor` 의 Android toolchain 이 `[√]` 여야 합니다. Android SDK 36, BuildTools 28.0.3 과 라이선스 동의(`flutter doctor --android-licenses`)가 필요하고, 첫 빌드 때 NDK/CMake 를 Gradle 이 자동 설치합니다(첫 빌드는 10~20분 걸릴 수 있음).

디버그 빌드는 로컬 http 서버(`http://10.0.2.2:3000`)를 위해 cleartext 를 허용하고(`android/app/src/debug/AndroidManifest.xml`), release 는 https 서버만 호출합니다.

### iOS (macOS + Xcode 필요)
이 저장소에는 iOS 설정만 들어 있고 **빌드는 macOS 에서만** 가능합니다(Windows 에서는 빌드할 수 없음). 설정된 항목:

- 앱 이름 "청년의 모든 것"(`CFBundleDisplayName`), 번들 ID `com.everythingaboutyouth.everythingAboutYouth`, 최소 iOS 13.0
- 로컬 서버(`http://localhost:3000`) 호출 허용(`NSAllowsLocalNetworking`). 실기기에서 LAN 의 http 서버를 쓰려면 별도 예외가 필요하고, 배포 서버는 https 를 쓰세요.
- 원문 링크를 Safari 로 열기(`LSApplicationQueriesSchemes: https`)

macOS 에서 처음 한 번:

```bash
cd flutter
flutter pub get
open ios/Runner.xcworkspace       # Xcode → Runner → Signing & Capabilities 에서 Team 선택
flutter run -d <ios-simulator-or-device> --dart-define=API_BASE_URL=http://localhost:3000
```

배포용: Apple Developer 계정에서 번들 ID 를 등록하고 `flutter build ipa --dart-define=API_BASE_URL=https://...` 로 빌드합니다. `Podfile` 은 macOS 에서 첫 빌드 때 Flutter 가 생성합니다.

### 웹
- 글꼴(Pretendard)은 앱에 포함돼 있어 외부에서 내려받지 않습니다. 대신 웹 번들 크기가 커질 수 있습니다(서브셋은 `flutter/assets/fonts/README.md` 참고).
- 토큰은 `Authorization` 헤더로 보내므로 서버의 `API_CORS_ORIGIN` 이 Flutter 웹 주소를 허용해야 합니다.
- 라우팅은 해시 방식(`/#/housing/notices/...`)이라 정적 호스팅에 별도 설정이 필요 없고, 상세 주소를 새로 열거나 공유할 수 있습니다.

## 알려진 제한

- 앱은 서버가 떠 있어야 동작합니다. 서버를 배포할 때는 https 주소를 쓰고 `API_CORS_ORIGIN` 을 Flutter 웹 주소로 좁히세요.
- 서버 개발 포트(3000)를 다른 프로젝트가 쓰고 있으면 `npm run dev -- --port 3100` 으로 띄우고 앱을 `--dart-define=API_BASE_URL=http://localhost:3100` 으로 실행하세요.
