import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bootstrap/bootstrap_controller.dart';
import '../providers/core_providers.dart';
import 'feature_config.dart';
import 'feature_module.dart';

/// 앱에 꽂을 수 있는 서비스 전체. 어떤 서비스가 있는지는 앱 조립부(`lib/app`)가 정한다.
/// core 는 서비스를 모르므로 기본값은 비어 있다.
final featureModulesProvider = Provider<List<FeatureModule>>((ref) => const []);

/// 서버의 서비스 켜짐/꺼짐 (`GET /api/v1/features`). 테스트에서는 이 값을 override 한다.
final featureConfigRemoteProvider = Provider<FeatureConfigRemote>(
  (ref) => ApiFeatureConfigRemote(ref.watch(apiClientProvider)),
);

/// 마지막으로 받은 서버 설정을 기기에 남기는 곳
final featureConfigCacheProvider = Provider<FeatureConfigCache>(
  (ref) => SharedPrefsFeatureConfigCache(ref.watch(sharedPreferencesProvider)),
);

/// 서버 설정을 기다리는 최대 시간. 넘기면 기기에 남은 설정(없으면 기본값)으로 시작한다.
final featureConfigTimeoutProvider = Provider<Duration>((ref) => const Duration(seconds: 3));

/// 꺼진 서비스 id 집합. 홈 카드와 라우터가 이 값을 따라 서비스를 숨기고 막는다.
///
/// 값의 우선순위: **서버 설정 > 기기에 남은 직전 서버 설정 > 서비스의 기본값(`defaultEnabled`)**
/// - 시작할 때는 기본값과 직전 서버 설정으로 만들고, 부트스트랩이 [syncWithServer] 로 서버 값을 받아 덮어쓴다.
/// - 서버에 닿지 못해도(오프라인, 서버 장애) 앱은 직전 설정이나 기본값으로 그대로 동작한다.
class FeatureFlags extends Notifier<Set<String>> {
  @override
  Set<String> build() => _disabledFrom(ref.read(featureModulesProvider), ref.read(featureConfigCacheProvider).read());

  /// 서버에서 서비스 켜짐 여부를 받아 반영한다. 절대 던지지 않는다. 실패하면 지금 값을 그대로 둔다.
  Future<void> syncWithServer() async {
    try {
      final config = await ref
          .read(featureConfigRemoteProvider)
          .fetch()
          .timeout(ref.read(featureConfigTimeoutProvider));
      state = _disabledFrom(ref.read(featureModulesProvider), config);
      await ref.read(featureConfigCacheProvider).write(config);
    } catch (error) {
      debugPrint('[features] 서버 설정을 받지 못해 기존 설정으로 시작합니다: $error');
    }
  }

  /// 실행 중에 서비스를 끄고 켠다. 다음에 서버 값을 받으면 서버 값이 우선한다.
  void disable(String id) => state = {...state, id};
  void enable(String id) => state = {...state}..remove(id);

  static Set<String> _disabledFrom(List<FeatureModule> modules, Map<String, bool> config) => {
    for (final module in modules)
      if (!(config[module.id] ?? module.defaultEnabled)) module.id,
  };
}

final featureFlagsProvider = NotifierProvider<FeatureFlags, Set<String>>(FeatureFlags.new);

/// 켜져 있는 서비스
final enabledFeaturesProvider = Provider<List<FeatureModule>>((ref) {
  final disabled = ref.watch(featureFlagsProvider);
  return [
    for (final module in ref.watch(featureModulesProvider))
      if (!disabled.contains(module.id)) module,
  ];
});

/// 서비스의 현재 상태
enum FeatureAvailability {
  /// 정상
  available,

  /// 꺼져 있음 (홈에 보이지 않고, 주소로 들어와도 열리지 않는다)
  disabled,

  /// 시작 작업이 실패해서 쓸 수 없음 (홈에 "다시 시도"가 보인다). 다른 서비스에는 영향이 없다.
  failed,
}

/// 서비스 상태를 원본 값([disabled] 꺼진 id, [result] 시작 결과)에서 바로 계산한다.
///
/// 라우터 가드처럼 "값이 바뀐 직후" 읽는 곳은 파생 provider 가 아직 이전 값을 줄 수 있으므로
/// 원본을 직접 읽어 이 함수로 계산한다. (화면은 [featureAvailabilityProvider] 를 watch 하면 된다)
FeatureAvailability featureAvailabilityOf(String id, {required Set<String> disabled, BootstrapResult? result}) {
  if (disabled.contains(id)) return FeatureAvailability.disabled;
  if (result != null && result.failedFeatures.containsKey(id)) return FeatureAvailability.failed;
  return FeatureAvailability.available;
}

final featureAvailabilityProvider = Provider.family<FeatureAvailability, String>(
  (ref, id) =>
      featureAvailabilityOf(id, disabled: ref.watch(featureFlagsProvider), result: ref.watch(bootstrapProvider).value),
);
