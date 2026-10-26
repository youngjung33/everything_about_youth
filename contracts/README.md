# API 계약 JSON

서버가 내려주는 JSON 형태와 Flutter `fromJson` 이 **같은 파일**을 기준으로 맞는지 검증한다.

- 파일 위치: `contracts/api/*.json` (DTO 샘플 + `error-codes.json`). 공통 API는 `app-config.json`, `features.json` 포함.
- 서버가 DTO를 바꾸면:

```bash
cd next
npm run contracts:sync
npm test   # api-contract.test.ts
cd ../flutter
flutter test test/contracts/api_contract_test.dart
```

서버 테스트는 DTO 빌더 출력과 JSON 파일이 **완전히 같아야** 통과한다. 앱 테스트는 **파싱이 깨지지 않으면** 통과한다.
