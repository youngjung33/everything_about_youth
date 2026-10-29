# features

청년이 혜택을 받을 수 있는 서비스(임대주택, 일자리, 금융 …) 하나가 폴더 하나다.  
**지금 꽂힌 서비스는 `housing` 만**이고, `benefits`·`finance`·`jobs`·`living` 은 루트 [README.md](../../README.md) 로드맵에만 있습니다.
코어(`core`)는 서비스를 모르고, 서비스가 코어의 규격(`FeatureModule`)을 구현해서 꽂힌다.

```
core/feature/            규격과 켜기/끄기 (FeatureModule, FeatureFlags)
core/bootstrap/          시작 작업 (서비스별로 격리해서 실행)
core/providers/          서비스가 받아 쓰는 공용 인프라 (API 클라이언트, 기기 저장소, 설정)
features/<id>/           서비스 하나
  <id>_module.dart       코어에 꽂히는 **앱 어댑터** (라우트, 홈 카드, 시작 작업)
  <id>_container.dart    (선택) use case·data 조립 — 임대주택: `housing_container.dart`
  domain/                모델, 규칙, **use case**, 저장소 포트   (순수 Dart)
  data/                  API·기기 저장 구현
  presentation/          화면, Riverpod — **`housingContainerProvider` 하나만** (data import 금지)
features/home, splash, unavailable   앱 셸 화면 (서비스가 아님)
```

## 지키는 규칙 (`test/architecture_test.dart` 가 검사한다)

- `core` 는 `features`/`app` 을 import 하지 않는다.
- 서비스끼리 import 하지 않는다. 공유해야 하면 `core` 로 올린다.
- 서비스 안의 방향은 `presentation → data → domain` 한 방향이다. **앱 로직의 중심은 domain 의 use case** 이고, presentation 의 Provider 는 use case 를 호출만 한다.
- `domain` 은 Flutter 에 의존하지 않는다. (`core/util/pure_dart.dart` 사용)
- `app` 은 서비스의 `<id>_module.dart` 만 안다.
- **임대주택(housing) 추가**: `presentation` 은 `data` 를 import 하지 않는다. `data` 구현 import 는 `housing_container.dart` 와 `data/` 만. `presentation/providers.dart` 조립은 `housingContainerProvider`·`housing_container.dart` 만. `housing_module.dart` 는 `data`·`housing_container` 를 import 하지 않는다. `housing_container.dart` 가 composition root 이다. (`test/architecture_test.dart`)
- 화면은 `Scaffold`/`AppBar`/`SafeArea`/`showModalBottomSheet` 를 직접 쓰지 않는다. `core/layout/` 의
  `AppScaffold`(+`AppTopBar`), `CenteredScrollView`, `showAppBottomSheet` 를 쓴다. (아이폰 홈 인디케이터, 갤럭시 내비게이션바, 노치, 키보드를 한곳에서 처리한다)
  서비스 화면은 앱 헤더·푸터 안에 들어가므로 `AppScaffold(appBar: AppTopBar(...), body: ...)` 만 쓰면 되고, 여백이 중복되지 않는다.

## 새 서비스 추가

1. `features/<id>/` 를 만들고 위 레이어로 나눠 구현한다.
   - use case·저장소 조립은 `<id>_container.dart`, Riverpod 는 `presentation/providers.dart`.
   - API 는 `core/providers` 의 `apiClientProvider` 를 쓴다. 모든 요청에 JWT 와 앱 버전이 자동으로 붙고 만료되면 갱신되므로 서비스가 토큰을 다룰 일은 없다.
     경로는 **버전 없이** `/<id>/...` 로 쓴다. (`/api/v1` 은 클라이언트가 붙인다)
   - 실패: API 는 `data` 에서 `HousingUserMessage` 등 domain 실패로 바꾸고, 화면은 `housingErrorMessage` 로 문구만 표시한다. (426/410 은 코어가 가로챔)
   - 기기 저장은 `sharedPreferencesProvider` 를 쓴다. **개인정보(나이·소득·연락처 등)는 평문으로 쓰지 말고** `fieldCipherProvider` 로 암호화한 값을 저장한다.
     `encrypt`/`decrypt` 에 용도 문자열(`context`, 예 `<id>.profile`)을 같게 넘기고, 복호화는 실패하면 null 이므로 "없는 값"으로 처리한다. (참고: `housing/data/profile_store.dart`)
   - 글꼴 크기는 코어가 0.85~1.4배로 제한한다. 서비스 화면은 큰 글꼴에서도 넘치지 않게(고정 높이 대신 `Flexible`/`Wrap`/스크롤) 만든다.
2. `features/<id>/<id>_module.dart` 에 `FeatureModule` 을 구현한다. (임대주택: `housing/housing_module.dart`)
   - `routes` 는 `basePath` 로 시작해야 한다.
   - 시작 때 준비할 것은 `bootstrapTasks` 에 선언한다. `critical: true` 가 실패하면 앱이 아니라 **이 서비스만** 사용 불가가 되고 홈 카드에 "다시 시도"가 뜬다.
3. `app/feature_modules.dart` 의 목록에 한 줄을 추가한다. 이것으로 끝이다. (홈 카드, 라우트, 가드가 자동으로 붙는다)
4. 서버에도 같은 id 로 등록한다. `next/src/features/<id>/feature.ts` 에 기본값을 두고 `next/src/features/registry.ts` 의 `FEATURES` 에 한 줄을 더한다.
   (서버에 없는 서비스는 앱이 `defaultEnabled` 로 동작한다.)

## 켜고 끄기

**켜고 끄는 것은 서버가 관리한다.** 앱은 기본값으로 시작해서, 시작할 때 서버 값을 받아 와 꺼진 서비스를 숨긴다.

- 서버: `cd next && npm run features -- off housing` / `on housing` / `reset housing` (서버 재시작 불필요)
  서버는 꺼진 서비스의 API 도 503 으로 막는다.
- 앱의 값 우선순위: **서버 설정 > 기기에 남은 직전 서버 설정 > 서비스의 `defaultEnabled`**
  - 서버가 죽었거나 느려도(기본 3초) 앱은 직전 설정이나 기본값으로 그대로 시작한다.
  - 서버 응답에 없는 서비스는 `defaultEnabled`, 앱이 모르는 서비스 id 는 무시한다.
  - 출시 전 서비스는 `defaultEnabled => false` 로 두면 서버가 켜기 전까지 숨겨진다.
- 서버 설정은 서비스 작업보다 먼저 반영하므로, 꺼진 서비스의 시작 작업은 돌지 않는다.
- 실행 중 서버 값을 다시 받아(`featureFlagsProvider.notifier.syncWithServer()`) 서비스가 켜지면 그때 그 서비스의 작업이 돌고, 꺼지면 홈 카드와 열려 있던 화면이 바로 바뀐다.

꺼진 서비스는 홈에 보이지 않고, 주소로 들어와도 안내 화면이 나오며, 시작 작업도 돌지 않는다.

## 장애 격리

- 시작 작업은 서비스별로 병렬·독립 실행된다. 한 서비스가 실패하거나 시간을 넘겨도 다른 서비스와 앱 시작에는 영향이 없다.
- 실패한 서비스는 `failed` 상태가 되어 라우터 가드가 안내 화면으로 보내고, 홈 카드나 안내 화면에서 그 서비스만 다시 시도할 수 있다.
- 화면 안의 API 오류는 각 서비스의 `AsyncValue` 와 오류 화면이 처리한다. 처리되지 않은 오류는 `core/error/error_reporting.dart` 가 받아 앱이 중단되지 않게 한다.
