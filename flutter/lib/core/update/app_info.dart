import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

/// 지금 실행 중인 앱의 버전과 플랫폼. 모든 API 요청 헤더(`X-App-Version`, `X-App-Platform`)로 서버에 알린다.
/// 서버는 이 값으로 강제 업데이트 대상인지 판단한다.
class AppInfo {
  const AppInfo({required this.version, required this.platform});

  /// pubspec 의 `version` (빌드 번호 제외). 예: `1.0.0`
  final String version;

  /// `android` | `ios` | `web` | `other`
  final String platform;

  /// 버전을 알 수 없는 상태. 헤더를 보내지 않는다. (테스트와 버전 조회 실패)
  static const unknown = AppInfo(version: '', platform: 'other');

  Map<String, String> get headers =>
      version.isEmpty ? const {} : {'X-App-Version': version, 'X-App-Platform': platform};

  static String currentPlatform() {
    if (kIsWeb) return 'web';
    return switch (defaultTargetPlatform) {
      TargetPlatform.android => 'android',
      TargetPlatform.iOS => 'ios',
      _ => 'other',
    };
  }

  /// 설치된 앱의 정보를 읽는다. 읽지 못해도 앱은 시작해야 하므로 [unknown] 으로 계속한다.
  static Future<AppInfo> load() async {
    try {
      final info = await PackageInfo.fromPlatform();
      return AppInfo(version: info.version, platform: currentPlatform());
    } catch (e) {
      debugPrint('[app] 앱 버전을 읽지 못했습니다: $e');
      return unknown;
    }
  }
}

/// main.dart 에서 실제 값으로 override 한다. 기본값은 [AppInfo.unknown].
final appInfoProvider = Provider<AppInfo>((ref) => AppInfo.unknown);
