import '../network/api_client.dart';
import '../network/api_error_code.dart';

/// 업데이트 화면을 띄워야 하는 상태.
class UpdateRequirement {
  const UpdateRequirement({this.message = defaultMessage, this.storeUrl, this.minVersion});

  static const defaultMessage = '앱을 최신 버전으로 업데이트해야 사용할 수 있습니다.';

  /// 화면에 보여줄 안내 문구
  final String message;

  /// 업데이트 버튼이 여는 스토어 주소. 모르면 null
  final String? storeUrl;
  final String? minVersion;

  /// 서버가 업데이트 필요(또는 API 버전 닫힘)로 거절한 응답에서 만든다.
  factory UpdateRequirement.fromException(ApiException error) {
    final store = error.details['storeUrl'];
    final min = error.details['minVersion'];
    return UpdateRequirement(
      message: error.message.isEmpty ? defaultMessage : error.message,
      storeUrl: store is String && store.isNotEmpty ? store : null,
      minVersion: min is String ? min : null,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is UpdateRequirement &&
      other.message == message &&
      other.storeUrl == storeUrl &&
      other.minVersion == minVersion;

  @override
  int get hashCode => Object.hash(message, storeUrl, minVersion);
}

enum UpdateStatus {
  none,
  optional,
  required;

  static UpdateStatus parse(Object? raw) => switch (raw) {
    'required' => UpdateStatus.required,
    'optional' => UpdateStatus.optional,
    _ => UpdateStatus.none, // 모르는 값은 막지 않는다
  };
}

/// `GET /app-config` 응답
class AppUpdateInfo {
  const AppUpdateInfo({required this.status, this.minVersion, this.latestVersion, this.storeUrl, this.message});

  final UpdateStatus status;
  final String? minVersion;
  final String? latestVersion;
  final String? storeUrl;
  final String? message;

  factory AppUpdateInfo.fromJson(Map<String, dynamic> json) {
    final update = json['update'];
    if (update is! Map) {
      throw const ApiException('앱 설정 응답 형식이 올바르지 않습니다.', code: ApiErrorCode.badResponse);
    }
    String? text(String key) =>
        update[key] is String && (update[key] as String).isNotEmpty ? update[key] as String : null;
    return AppUpdateInfo(
      status: UpdateStatus.parse(update['status']),
      minVersion: text('minVersion'),
      latestVersion: text('latestVersion'),
      storeUrl: text('storeUrl'),
      message: text('message'),
    );
  }

  UpdateRequirement toRequirement() => UpdateRequirement(
    message: message ?? UpdateRequirement.defaultMessage,
    storeUrl: storeUrl,
    minVersion: minVersion,
  );
}

/// 서버에 업데이트가 필요한지 묻는다. 세션(JWT)보다 먼저 물을 수 있도록 토큰 없는 클라이언트로 부른다.
abstract interface class AppUpdateRemote {
  Future<AppUpdateInfo> fetch();
}

class ApiAppUpdateRemote implements AppUpdateRemote {
  ApiAppUpdateRemote(this._api);

  final ApiClient _api;

  @override
  Future<AppUpdateInfo> fetch() async => AppUpdateInfo.fromJson(await _api.getJson('/app-config'));
}
