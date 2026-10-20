import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import 'update_requirement.dart';

/// 앱을 업데이트해야만 쓸 수 있는 상태인지. `null` 이면 쓸 수 있고, 값이 있으면 라우터가 업데이트 화면으로 막는다.
///
/// 두 길로 켜진다.
///  1. 시작할 때 `GET /app-config` 로 물어서 ([check])
///  2. 실행 중 어떤 API 가 `APP_UPDATE_REQUIRED`/`API_VERSION_UNSUPPORTED` 로 거절되면 ([requireFrom])
///     — 서버가 최소 버전을 올린 순간 이미 켜져 있던 앱도 막힌다.
///
/// 한 번 켜지면 꺼지지 않는다. (스토어에서 업데이트하고 앱을 다시 실행해야 한다)
class UpdateGate extends Notifier<UpdateRequirement?> {
  @override
  UpdateRequirement? build() => null;

  void require(UpdateRequirement requirement) {
    if (state == null) state = requirement;
  }

  void requireFrom(ApiException error) => require(UpdateRequirement.fromException(error));

  /// 서버에 물어 강제 업데이트면 켠다.
  ///
  /// 서버에 닿지 못하거나 응답이 이상하면 **막지 않는다**(fail-open). 서버가 죽었다는 이유로 모든 사용자를 막으면 안 되고,
  /// 진짜 차단은 어차피 모든 API 요청에서 서버가 한다.
  Future<void> check(AppUpdateRemote remote, {required Duration timeout}) async {
    try {
      final info = await remote.fetch().timeout(timeout);
      if (info.status == UpdateStatus.required) require(info.toRequirement());
    } on ApiException catch (e) {
      if (e.isUpdateRequired) requireFrom(e);
    } catch (e) {
      debugPrint('[update] 앱 버전 확인을 건너뜁니다: $e');
    }
  }
}

final updateGateProvider = NotifierProvider<UpdateGate, UpdateRequirement?>(UpdateGate.new);

/// 시작할 때 버전 확인을 기다리는 최대 시간
final updateCheckTimeoutProvider = Provider<Duration>((ref) => const Duration(seconds: 3));
