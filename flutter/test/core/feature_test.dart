import 'dart:async';

import 'package:everything_about_youth/app/router.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_controller.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:everything_about_youth/core/feature/feature_flags.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/bootstrap_container.dart';
import '../support/fake_feature.dart';
import '../support/fake_feature_config.dart';

BootstrapTask failing(String name) =>
    BootstrapTask(name: name, critical: true, run: (ref) async => throw StateError('$name 실패'));

void main() {
  group('서비스 켜기/끄기: 기본값 + 서버 설정', () {
    const modules = [FakeFeature('a'), FakeFeature('b'), FakeFeature('beta', defaultEnabled: false)];

    List<String> enabled(ProviderContainer c) => c.read(enabledFeaturesProvider).map((m) => m.id).toList();

    test('서버 설정을 받기 전에는 서비스의 기본값을 쓴다 (defaultEnabled: false 는 숨김)', () {
      final container = containerWith(const [], modules: modules);
      expect(enabled(container), ['a', 'b']);
      expect(container.read(featureAvailabilityProvider('beta')), FeatureAvailability.disabled);
    });

    test('서버가 끄면 숨기고, 서버가 켜면 기본값이 꺼짐이던 서비스도 켜진다', () async {
      final remote = FakeFeatureConfigRemote(config: {'b': false, 'beta': true});
      final container = containerWith(const [], modules: modules, remote: remote);

      await container.read(featureFlagsProvider.notifier).syncWithServer();

      expect(enabled(container), ['a', 'beta']);
    });

    test('서버 응답에 없는 서비스는 기본값을, 앱이 모르는 서비스 id 는 무시한다', () async {
      final remote = FakeFeatureConfigRemote(config: {'a': true, 'unknown': false});
      final container = containerWith(const [], modules: modules, remote: remote);

      await container.read(featureFlagsProvider.notifier).syncWithServer();

      expect(enabled(container), ['a', 'b']);
    });

    test('서버 설정은 기기에 남은 직전 설정보다 우선하고, 받은 설정을 기기에 저장한다', () async {
      final cache = MemoryFeatureConfigCache({'a': false});
      final remote = FakeFeatureConfigRemote(config: {'a': true, 'b': false});
      final container = containerWith(const [], modules: modules, remote: remote, cache: cache);

      expect(enabled(container), ['b'], reason: '시작 직후에는 직전 서버 설정을 쓴다');
      await container.read(featureFlagsProvider.notifier).syncWithServer();

      expect(enabled(container), ['a']);
      expect(cache.data, {'a': true, 'b': false});
    });

    test('서버에 닿지 못하면 기기에 남은 직전 설정으로 계속한다', () async {
      final cache = MemoryFeatureConfigCache({'b': false});
      final remote = FakeFeatureConfigRemote(error: StateError('서버 꺼짐'));
      final container = containerWith(const [], modules: modules, remote: remote, cache: cache);

      await container.read(featureFlagsProvider.notifier).syncWithServer();

      expect(enabled(container), ['a']);
      expect(cache.data, {'b': false}, reason: '실패했으니 저장된 값은 그대로');
    });

    test('서버에 닿지 못하고 직전 설정도 없으면 기본값으로 계속한다', () async {
      final remote = FakeFeatureConfigRemote(error: StateError('서버 꺼짐'));
      final container = containerWith(const [], modules: modules, remote: remote);

      await container.read(featureFlagsProvider.notifier).syncWithServer();

      expect(enabled(container), ['a', 'b']);
    });

    test('서버가 너무 느리면 기다리지 않고 기존 설정으로 계속한다', () async {
      final never = Completer<void>();
      final cache = MemoryFeatureConfigCache({'a': false});
      final container = containerWith(
        const [],
        modules: modules,
        remote: FakeFeatureConfigRemote(config: {'a': true}, gate: never.future),
        cache: cache,
        configTimeout: const Duration(milliseconds: 20),
      );

      await container.read(featureFlagsProvider.notifier).syncWithServer();

      expect(enabled(container), ['b']);
    });

    test('실행 중에도 끄고 켤 수 있다 (다음 서버 설정을 받으면 서버 값이 우선)', () async {
      final container = containerWith(const [], modules: modules);

      container.read(featureFlagsProvider.notifier).disable('a');
      expect(enabled(container), ['b']);
      container.read(featureFlagsProvider.notifier).enable('a');
      expect(enabled(container), ['a', 'b']);
    });
  });

  group('서비스 격리 (BootstrapController)', () {
    test('한 서비스의 필수 작업이 실패해도 앱은 시작되고, 그 서비스만 failed 가 된다', () async {
      final container = containerWith(
        const [],
        modules: [
          FakeFeature('bad', tasks: [failing('bad-task')]),
          const FakeFeature('good'),
        ],
      );

      final result = await container.read(bootstrapProvider.future);

      expect(result.failedFeatures.keys, ['bad']);
      expect(container.read(featureAvailabilityProvider('bad')), FeatureAvailability.failed);
      expect(container.read(featureAvailabilityProvider('good')), FeatureAvailability.available);
    });

    test('서비스의 작업은 서로 기다리지 않는다 (느린 서비스가 빠른 서비스를 막지 않는다)', () async {
      final gate = Completer<void>();
      var fastDone = false;
      final container = containerWith(
        const [],
        modules: [
          FakeFeature(
            'slow',
            tasks: [BootstrapTask(name: 's', run: (ref) => gate.future)],
          ),
          FakeFeature(
            'fast',
            tasks: [BootstrapTask(name: 'f', run: (ref) async => fastDone = true)],
          ),
        ],
      );

      final future = container.read(bootstrapProvider.future);
      await Future<void>.delayed(const Duration(milliseconds: 10));
      expect(fastDone, isTrue, reason: 'slow 가 끝나기 전에 fast 가 이미 돌았다');

      gate.complete();
      await future;
    });

    test('필수가 아닌 서비스 작업이 실패하거나 시간을 넘기면 건너뛰고 서비스는 정상이다', () async {
      final never = Completer<void>();
      final container = containerWith(
        const [],
        modules: [
          FakeFeature(
            'a',
            tasks: [
              BootstrapTask(name: 'x', run: (ref) async => throw StateError('boom')),
              BootstrapTask(name: 'y', timeout: const Duration(milliseconds: 20), run: (ref) => never.future),
            ],
          ),
        ],
      );

      final result = await container.read(bootstrapProvider.future);
      expect(result.failedFeatures, isEmpty);
    });

    test('꺼진 서비스의 작업은 돌리지 않는다', () async {
      var ran = false;
      final container = containerWith(
        const [],
        modules: [
          FakeFeature(
            'off',
            tasks: [BootstrapTask(name: 'x', run: (ref) async => ran = true)],
          ),
        ],
        disabled: {'off'},
      );

      await container.read(bootstrapProvider.future);
      expect(ran, isFalse);
    });

    test('코어 필수 작업이 실패하면 서비스와 무관하게 앱 시작이 실패한다', () async {
      final container = containerWith([failing('core')], modules: const [FakeFeature('a')]);
      await expectLater(container.read(bootstrapProvider.future), throwsStateError);
    });

    test('retryFeature: 실패한 서비스 하나만 다시 돌리고, 성공하면 정상으로 돌아온다', () async {
      var attempts = 0;
      var otherRuns = 0;
      final container = containerWith(
        const [],
        modules: [
          FakeFeature(
            'flaky',
            tasks: [
              BootstrapTask(
                name: 'x',
                critical: true,
                run: (ref) async {
                  if (++attempts == 1) throw StateError('first');
                },
              ),
            ],
          ),
          FakeFeature(
            'other',
            tasks: [BootstrapTask(name: 'o', run: (ref) async => otherRuns++)],
          ),
        ],
      );
      await container.read(bootstrapProvider.future);
      expect(container.read(featureAvailabilityProvider('flaky')), FeatureAvailability.failed);

      await container.read(bootstrapProvider.notifier).retryFeature('flaky');

      expect(attempts, 2);
      expect(otherRuns, 1, reason: '다른 서비스는 다시 돌지 않는다');
      expect(container.read(featureAvailabilityProvider('flaky')), FeatureAvailability.available);
    });

    test('실행 중에 꺼 둔 서비스를 켜면 그때 시작 작업이 돌고, 실패하면 그 서비스만 failed', () async {
      var ran = 0;
      final container = containerWith(
        const [],
        modules: [
          FakeFeature(
            'late',
            tasks: [
              BootstrapTask(
                name: 'x',
                critical: true,
                run: (ref) async {
                  ran++;
                  throw StateError('늦게 켜졌는데 실패');
                },
              ),
            ],
          ),
          const FakeFeature('other'),
        ],
        disabled: {'late'},
      );
      await container.read(bootstrapProvider.future);
      expect(ran, 0);

      container.read(featureFlagsProvider.notifier).enable('late');
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(ran, 1);
      expect(container.read(featureAvailabilityProvider('late')), FeatureAvailability.failed);
      expect(container.read(featureAvailabilityProvider('other')), FeatureAvailability.available);
    });
  });

  group('부트스트랩 + 서버 설정', () {
    BootstrapTask marker(void Function() onRun) => BootstrapTask(name: 'm', run: (ref) async => onRun());

    test('서버가 켜라고 한 서비스(기본값 꺼짐)는 작업이 돌고, 서버가 끈 서비스는 작업이 돌지 않는다', () async {
      final ran = <String>[];
      final container = containerWith(
        const [],
        modules: [
          FakeFeature('beta', defaultEnabled: false, tasks: [marker(() => ran.add('beta'))]),
          FakeFeature('old', tasks: [marker(() => ran.add('old'))]),
          FakeFeature('stay', tasks: [marker(() => ran.add('stay'))]),
        ],
        remote: FakeFeatureConfigRemote(config: {'beta': true, 'old': false}),
      );

      await container.read(bootstrapProvider.future);

      expect(ran..sort(), ['beta', 'stay']);
    });

    test('서버가 죽어 있어도 앱은 시작되고, 기본값대로 서비스가 열린다', () async {
      final ran = <String>[];
      final container = containerWith(
        const [],
        modules: [
          FakeFeature('a', tasks: [marker(() => ran.add('a'))]),
          FakeFeature('beta', defaultEnabled: false, tasks: [marker(() => ran.add('beta'))]),
        ],
        remote: FakeFeatureConfigRemote(error: StateError('서버 꺼짐')),
      );

      final result = await container.read(bootstrapProvider.future);

      expect(result.failedFeatures, isEmpty);
      expect(ran, ['a']);
    });

    test('서버 설정을 받는 동안(최대 timeout)만 기다리고, 그 사이 서비스 작업은 시작하지 않는다', () async {
      final gate = Completer<void>();
      var ran = false;
      final container = containerWith(
        const [],
        modules: [
          FakeFeature('a', tasks: [marker(() => ran = true)]),
        ],
        remote: FakeFeatureConfigRemote(gate: gate.future),
      );

      final future = container.read(bootstrapProvider.future);
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(ran, isFalse, reason: '꺼질 수도 있는 서비스라서 서버 설정을 먼저 반영한다');

      gate.complete();
      await future;
      expect(ran, isTrue);
    });

    test('나중에 서버 값을 다시 받아 서비스가 켜지면 그때 그 서비스의 작업이 돈다', () async {
      var ran = 0;
      final remote = FakeFeatureConfigRemote(config: {'late': false});
      final container = containerWith(
        const [],
        modules: [
          FakeFeature('late', tasks: [marker(() => ran++)]),
        ],
        remote: remote,
      );
      await container.read(bootstrapProvider.future);
      expect(ran, 0);

      remote.config = {'late': true};
      await container.read(featureFlagsProvider.notifier).syncWithServer();
      await Future<void>.delayed(const Duration(milliseconds: 20));

      expect(ran, 1);
      expect(container.read(featureAvailabilityProvider('late')), FeatureAvailability.available);
    });
  });

  group('featureRedirect (서비스 가드)', () {
    const modules = [FakeFeature('a'), FakeFeature('b')];

    String? redirect(String location, Map<String, FeatureAvailability> status) => featureRedirect(
      uri: Uri.parse(location),
      modules: modules,
      availabilityOf: (id) => status[id] ?? FeatureAvailability.available,
    );

    test('정상인 서비스는 간섭하지 않는다', () {
      expect(redirect('/a', const {}), isNull);
      expect(redirect('/a/detail/1', const {}), isNull);
      expect(redirect('/', const {}), isNull);
    });

    test('꺼졌거나 장애인 서비스의 모든 하위 경로를 안내 화면으로 보낸다', () {
      expect(redirect('/a', {'a': FeatureAvailability.disabled}), '/unavailable/a');
      expect(redirect('/a/detail/1', {'a': FeatureAvailability.failed}), '/unavailable/a');
    });

    test('다른 서비스는 영향이 없다', () {
      final status = {'a': FeatureAvailability.failed};
      expect(redirect('/b', status), isNull);
      expect(redirect('/b/x', status), isNull);
    });

    test('경로 접두사만 비슷한 경우는 그 서비스로 보지 않는다 (/ab 는 /a 의 것이 아니다)', () {
      expect(redirect('/ab', {'a': FeatureAvailability.disabled}), isNull);
    });

    test('안내 화면: 아직 문제면 머물고, 정상으로 돌아오면 서비스 첫 화면으로, 모르는 서비스면 홈으로', () {
      expect(redirect('/unavailable/a', {'a': FeatureAvailability.failed}), isNull);
      expect(redirect('/unavailable/a', {'a': FeatureAvailability.disabled}), isNull);
      expect(redirect('/unavailable/a', const {}), '/a');
      expect(redirect('/unavailable/nope', const {}), '/');
    });
  });
}
