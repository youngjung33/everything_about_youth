/// [ApiClient] 가 요청마다 붙일 액세스 토큰을 얻어 오는 곳.
/// 네트워크 계층은 토큰이 어디서 오는지(저장/갱신/발급)를 모르고 이 인터페이스만 안다.
abstract interface class AuthTokenSource {
  /// 지금 쓸 수 있는 액세스 토큰. 없거나 만료 직전이면 알아서 갱신/발급한다.
  ///
  /// [rejected] 는 서버가 401 로 거절한 토큰이다. 이미 다른 요청이 새 토큰으로 바꿔 놨다면 그것을 돌려주고,
  /// 아니면 갱신한다. (동시에 여러 요청이 401 을 받아도 갱신은 한 번만 일어난다)
  Future<String> accessToken({String? rejected});
}
