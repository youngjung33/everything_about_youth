import 'package:everything_about_youth/core/bootstrap/bootstrap_controller.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:everything_about_youth/core/feature/feature_flags.dart';
import 'package:everything_about_youth/core/feature/feature_module.dart';
import 'package:everything_about_youth/core/providers/core_providers.dart';
import 'package:everything_about_youth/core/update/update_gate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'fake_app_update.dart';
import 'fake_feature_config.dart';

/// 위젯 없이 코어(부트스트랩 + 서비스 켜기/끄기)만 검증할 때 쓰는 컨테이너
///
/// - [disabled]: 서버가 꺼 둔 서비스 id. ([remote] 를 직접 넘기면 무시한다)
/// - [remote]/[cache]: 서버 설정과 기기에 남은 직전 설정 가짜
/// - [configTimeout]: 서버 설정을 기다리는 최대 시간
ProviderContainer containerWith(
  List<BootstrapTask> tasks, {
  Duration minDuration = Duration.zero,
  List<FeatureModule> modules = const [],
  Set<String> disabled = const {},
  FakeFeatureConfigRemote? remote,
  MemoryFeatureConfigCache? cache,
  Duration configTimeout = const Duration(seconds: 3),
  FakeAppUpdateRemote? update,
  Duration updateTimeout = const Duration(seconds: 3),
}) {
  final container = ProviderContainer(
    retry: (_, _) => null,
    overrides: [
      appUpdateRemoteProvider.overrideWithValue(update ?? FakeAppUpdateRemote()),
      updateCheckTimeoutProvider.overrideWithValue(updateTimeout),
      bootstrapTasksProvider.overrideWithValue(tasks),
      bootstrapMinDurationProvider.overrideWithValue(minDuration),
      featureModulesProvider.overrideWithValue(modules),
      featureConfigRemoteProvider.overrideWithValue(
        remote ?? FakeFeatureConfigRemote(config: {for (final id in disabled) id: false}),
      ),
      featureConfigCacheProvider.overrideWithValue(cache ?? MemoryFeatureConfigCache()),
      featureConfigTimeoutProvider.overrideWithValue(configTimeout),
    ],
  );
  addTearDown(container.dispose);
  return container;
}
