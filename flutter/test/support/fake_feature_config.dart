import 'package:everything_about_youth/core/feature/feature_config.dart';

/// 서버의 서비스 켜짐/꺼짐 가짜. [config] 를 돌려주고, [error] 가 있으면 실패하며, [gate] 로 응답 시점을 늦출 수 있다.
class FakeFeatureConfigRemote implements FeatureConfigRemote {
  FakeFeatureConfigRemote({this.config = const {}, this.error, this.gate});

  Map<String, bool> config;
  Object? error;
  Future<void>? gate;
  int fetchCount = 0;

  @override
  Future<Map<String, bool>> fetch() async {
    fetchCount++;
    if (gate != null) await gate;
    if (error != null) throw error!;
    return config;
  }
}

/// 기기에 남긴 직전 서버 설정 가짜
class MemoryFeatureConfigCache implements FeatureConfigCache {
  MemoryFeatureConfigCache([Map<String, bool>? initial]) : data = {...?initial};

  Map<String, bool> data;
  int writeCount = 0;

  @override
  Map<String, bool> read() => {...data};

  @override
  Future<void> write(Map<String, bool> config) async {
    writeCount++;
    data = {...config};
  }
}
