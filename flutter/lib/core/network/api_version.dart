/// 서버 API 버전. 앱이 이 문자열을 아는 유일한 곳이다.
///
/// 서비스의 data 레이어는 `/housing/notices` 처럼 버전 없는 경로만 쓰고, [ApiClient] 가 앞에 이 접두어를 붙인다.
/// 서버가 `/api/v2` 를 내면 이 값 하나만 바꾸면 된다. (서버의 `common/presentation/api/version.ts` 와 같은 값)
const String kApiPrefix = '/api/v1';
