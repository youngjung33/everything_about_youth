# 릴리스·버전 운영

앱 버전(`flutter/pubspec.yaml`)과 서버 강제 업데이트(`APP_MIN_VERSION`)를 **한 세트**로 관리한다.

## 버전 번호

| 위치 | 의미 |
| --- | --- |
| `pubspec.yaml` 의 `version: 1.2.3+45` | `1.2.3` = 사용자에게 보이는 버전, `45` = 빌드 번호(스토어 `versionCode`) |
| 서버 `APP_MIN_VERSION` | 이 버전 **미만** 앱은 API 426 (`APP_UPDATE_REQUIRED`) |
| 서버 `APP_LATEST_VERSION` | 선택 업데이트(`optional`) — 앱 상단 배너(`OptionalUpdateBanner`) |

`X-App-Version` 헤더에는 `1.2.3` 만 보낸다 (`AppInfo`).

## 출시 순서 (권장)

1. **CHANGELOG.md** `[Unreleased]` 를 새 버전 섹션으로 옮기고 날짜를 적는다.
2. `pubspec.yaml` 버전·빌드 번호를 올린다.
3. release 빌드 (API 주소·환경 필수):

   ```bash
   cd flutter
   flutter build apk --release \
     --dart-define=API_BASE_URL=https://api.example.com \
     --dart-define=APP_ENV=prod
   ```

4. 스토어에 업로드·심사를 기다린다.
5. **심사 통과 후** 서버 `APP_MIN_VERSION` 을 새 버전으로 올리고 재배포한다. (먼저 올리면 업데이트할 곳이 없는 사용자가 막힌다.)
6. git tag: `git tag v1.2.3` && `git push origin v1.2.3`

## 서버 배포 체크

- `APP_ENV=prod`
- `JWT_SECRET` (32자 이상)
- `OPERATOR_TOKEN` (24자 이상, 수집 API)
- `API_CORS_ORIGIN` (Flutter 웹 도메인)
- `npm run db:migrate`
- 헬스: `GET /api/v1/health` → `ready: true`
- 1차: `DB_DRIVER` 미설정 또는 `sqlite`. `REDIS_URL`·`SUPABASE_DATABASE_URL` 은 비워 두기 (설정 시 2차 미구현 오류)

## 임대주택 앱 기능 (1차)

- 관심 공고 **로컬 알림**(Android/iOS): 권한 허용 필요. 재부팅 후에는 앱을 한 번 열어 알림을 다시 맞춘다.
- 접수 일정·빠른 필터·상세 «다음 행동» 은 서버 배포 없이 앱만 올려도 동작한다.

## 계약·오류 코드

DTO나 오류 코드를 바꾼 뒤:

```bash
cd next && npm run contracts:sync && npm test
cd ../flutter && flutter test test/contracts/
```
