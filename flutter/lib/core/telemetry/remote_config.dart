/// 원격 설정. 2차에 Firebase Remote Config 구현을 여기에 연결한다.
///
/// 서버 `GET /features`·`GET /app-config` 가 1차의 진실이고, Remote Config 는
/// 긴급 토글·문구 보조용으로만 쓸 계획이다. (구현 전까지는 모두 null)
abstract interface class RemoteConfigReader {
  Future<String?> getString(String key);
  Future<bool?> getBool(String key);
}

class NoopRemoteConfigReader implements RemoteConfigReader {
  @override
  Future<String?> getString(String key) async => null;

  @override
  Future<bool?> getBool(String key) async => null;
}

RemoteConfigReader _remoteConfig = NoopRemoteConfigReader();

RemoteConfigReader get remoteConfig => _remoteConfig;

void installRemoteConfig(RemoteConfigReader reader) {
  _remoteConfig = reader;
}
