import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../feature/feature_flags.dart';
import '../feature/feature_module.dart';
import '../providers/core_providers.dart';
import '../update/update_gate.dart';
import 'bootstrap_task.dart';

/// 앱 전체(코어)가 시작할 때 돌릴 작업. 서비스의 작업은 [FeatureModule.bootstrapTasks] 에 둔다.
/// 코어 작업의 필수 실패는 앱이 시작되지 못하게 하므로, 정말 앱이 못 도는 일에만 쓴다.
final bootstrapTasksProvider = Provider<List<BootstrapTask>>((ref) => const []);

/// 작업이 아무리 빨리 끝나도 스플래시를 최소한 이만큼은 보여준다. (화면이 번쩍이는 것 방지)
final bootstrapMinDurationProvider = Provider<Duration>((ref) => const Duration(milliseconds: 600));

/// 시작 결과. 앱은 시작됐지만 쓸 수 없게 된 서비스와 그 원인.
class BootstrapResult {
  const BootstrapResult({this.failedFeatures = const {}});

  final Map<String, Object> failedFeatures;

  BootstrapResult withFailure(String id, Object error) =>
      BootstrapResult(failedFeatures: {...failedFeatures, id: error});
  BootstrapResult without(String id) => BootstrapResult(failedFeatures: {...failedFeatures}..remove(id));
}

/// 시작 작업을 모두 끝낼 때까지의 상태.
///
/// - loading : 작업 진행 중 (스플래시)
/// - data    : 앱 시작 완료 → 라우터 가드가 메인 화면을 연다. 일부 서비스가 실패했어도 data 다. ([BootstrapResult])
/// - error   : **코어** 필수 작업 실패 → 스플래시가 오류와 "다시 시도"를 보여준다
///
/// 서비스는 서로 격리된다. 한 서비스의 작업이 실패하거나 시간을 넘겨도 다른 서비스와 앱 시작에는 영향이 없고,
/// 그 서비스만 [FeatureAvailability.failed] 가 된다. 꺼진 서비스의 작업은 아예 돌리지 않는다.
///
/// 앱 전체를 다시 돌리려면 `ref.invalidate(bootstrapProvider)`, 서비스 하나만 다시 하려면 [retryFeature].
class BootstrapController extends AsyncNotifier<BootstrapResult> {
  /// 시작 작업을 돌려 본 서비스. 나중에 켜진 서비스의 작업을 한 번만 돌리려고 기억한다.
  final _started = <String>{};

  @override
  Future<BootstrapResult> build() async {
    _started.clear();
    final minWait = Future<void>.delayed(ref.read(bootstrapMinDurationProvider));

    // 0. 앱 버전을 확인한다. 강제 업데이트면 나머지 작업(서버 호출 포함)을 하지 않는다. 라우터가 업데이트 화면으로 막는다.
    //    서버에 닿지 못하면 막지 않고 계속한다. (진짜 차단은 모든 API 요청에서 서버가 한다)
    final gate = ref.read(updateGateProvider.notifier);
    await gate.check(ref.read(appUpdateRemoteProvider), timeout: ref.read(updateCheckTimeoutProvider));
    if (ref.read(updateGateProvider) != null) {
      await minWait;
      return const BootstrapResult();
    }

    // 1. 서버에서 서비스 켜짐 여부를 받아 반영한다. (꺼진 서비스의 작업은 아예 돌리지 않으려고 가장 먼저 한다)
    //    서버에 닿지 못하면 기기에 남은 직전 설정, 그것도 없으면 서비스의 기본값으로 계속한다. 이 단계는 실패하지 않는다.
    await ref.read(featureFlagsProvider.notifier).syncWithServer();

    // 2. 이후에 서비스가 켜지면(서버 값을 다시 받거나 실행 중에 켠 경우) 그때 그 서비스의 작업을 돌린다.
    ref.listen<Set<String>>(featureFlagsProvider, (previous, next) {
      final newlyEnabled = (previous ?? const <String>{}).difference(next);
      for (final id in newlyEnabled) {
        if (!_started.contains(id)) retryFeature(id);
      }
    });

    final coreTasks = ref.read(bootstrapTasksProvider);
    final modules = ref.read(enabledFeaturesProvider);

    // 서로 기다릴 이유가 없으니 모두 병렬로 돌린다.
    final core = Future.wait([for (final task in coreTasks) _run(task)], eagerError: true);
    final features = Future.wait([for (final module in modules) _startFeature(module)]);

    await core; // 코어 필수 작업이 실패하면 여기서 던져진다
    final failures = {
      for (final failure in await features)
        if (failure != null) failure.key: failure.value,
    };
    await minWait;

    return BootstrapResult(failedFeatures: failures);
  }

  /// 서비스 하나의 시작 작업만 다시 돌린다. 성공하면 사용 가능한 상태로 돌아온다.
  Future<void> retryFeature(String id) async {
    final module = ref.read(featureModulesProvider).where((m) => m.id == id).firstOrNull;
    if (module == null) return;

    final failure = await _startFeature(module);
    final current = state.value;
    if (current == null) return; // 앱 전체 시작 중이면 그 결과에 맡긴다
    state = AsyncData(failure == null ? current.without(id) : current.withFailure(id, failure.value));
  }

  /// 서비스의 작업을 돌린다. 절대 던지지 않고, 필수 작업이 실패했으면 (id, 원인)을 돌려준다.
  Future<MapEntry<String, Object>?> _startFeature(FeatureModule module) async {
    _started.add(module.id);
    Object? failed;
    await Future.wait([
      for (final task in module.bootstrapTasks)
        _run(task, owner: module.id).catchError((Object error) {
          failed ??= error;
        }),
    ]);
    return failed == null ? null : MapEntry(module.id, failed!);
  }

  Future<void> _run(BootstrapTask task, {String? owner}) async {
    try {
      await task.run(ref).timeout(task.timeout);
    } catch (error) {
      if (task.critical) rethrow;
      debugPrint('[bootstrap] ${owner == null ? '' : '$owner/'}"${task.name}" 건너뜀: $error');
    }
  }
}

final bootstrapProvider = AsyncNotifierProvider<BootstrapController, BootstrapResult>(BootstrapController.new);
