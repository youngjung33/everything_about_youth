import 'package:everything_about_youth/app/router.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_controller.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/core/update/app_info.dart';
import 'package:everything_about_youth/core/update/update_gate.dart';
import 'package:everything_about_youth/core/update/update_requirement.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/bootstrap_container.dart';
import '../support/fake_app_update.dart';
import '../support/fake_feature_config.dart';

void main() {
  group('AppInfo', () {
    test('버전이 있으면 버전과 플랫폼 헤더를 만든다', () {
      const info = AppInfo(version: '1.2.3', platform: 'android');
      expect(info.headers, {'X-App-Version': '1.2.3', 'X-App-Platform': 'android'});
    });

    test('버전을 모르면 헤더를 보내지 않는다 (서버가 막지 않는다)', () {
      expect(AppInfo.unknown.headers, isEmpty);
    });
  });

  group('AppUpdateInfo.fromJson', () {
    test('서버 app-config 응답을 읽는다', () {
      final info = AppUpdateInfo.fromJson({
        'api': {'version': 'v1'},
        'update': {
          'status': 'required',
          'minVersion': '2.0.0',
          'latestVersion': '2.1.0',
          'storeUrl': 'https://store.test/app',
          'message': '업데이트해 주세요',
        },
      });
      expect(info.status, UpdateStatus.required);
      expect(info.toRequirement().storeUrl, 'https://store.test/app');
      expect(info.toRequirement().message, '업데이트해 주세요');
      expect(info.toRequirement().minVersion, '2.0.0');
    });

    test('모르는 상태나 빈 값은 막지 않는 쪽으로 해석한다', () {
      expect(
        AppUpdateInfo.fromJson({
          'update': {'status': 'weird'},
        }).status,
        UpdateStatus.none,
      );
      expect(AppUpdateInfo.fromJson({'update': <String, Object?>{}}).status, UpdateStatus.none);
      expect(
        AppUpdateInfo.fromJson({
          'update': {'status': 'optional', 'storeUrl': ''},
        }).storeUrl,
        isNull,
      );
    });

    test('update 가 없는 응답은 형식 오류', () {
      expect(() => AppUpdateInfo.fromJson({'api': {}}), throwsA(isA<ApiException>()));
    });

    test('문구가 없으면 기본 문구', () {
      expect(
        AppUpdateInfo.fromJson({
          'update': {'status': 'required'},
        }).toRequirement().message,
        UpdateRequirement.defaultMessage,
      );
    });
  });

  group('UpdateGate', () {
    ProviderContainer newContainer() {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      return container;
    }

    const timeout = Duration(milliseconds: 50);

    test('필요 없으면 켜지지 않는다 (none, optional)', () async {
      for (final status in [UpdateStatus.none, UpdateStatus.optional]) {
        final container = newContainer();
        await container
            .read(updateGateProvider.notifier)
            .check(
              FakeAppUpdateRemote(info: AppUpdateInfo(status: status)),
              timeout: timeout,
            );
        expect(container.read(updateGateProvider), isNull, reason: '$status');
      }
    });

    test('required 면 켜지고 스토어 주소와 문구를 담는다', () async {
      final container = newContainer();
      await container
          .read(updateGateProvider.notifier)
          .check(
            FakeAppUpdateRemote.required(storeUrl: 'https://store.test', message: '꼭 업데이트'),
            timeout: timeout,
          );
      final gate = container.read(updateGateProvider);
      expect(gate, isNotNull);
      expect(gate!.storeUrl, 'https://store.test');
      expect(gate.message, '꼭 업데이트');
    });

    test('서버에 닿지 못하거나 이상한 응답이면 막지 않는다 (fail-open)', () async {
      for (final remote in [
        FakeAppUpdateRemote(error: const ApiException('끊김', code: ApiErrorCode.networkError)),
        FakeAppUpdateRemote(error: const ApiException('서버 오류', statusCode: 500)),
        FakeAppUpdateRemote(error: StateError('예상 못한 오류')),
        FakeAppUpdateRemote(hang: true),
      ]) {
        final container = newContainer();
        await container.read(updateGateProvider.notifier).check(remote, timeout: timeout);
        expect(container.read(updateGateProvider), isNull);
      }
    });

    test('확인 중 서버가 426 으로 거절하면 켠다', () async {
      final container = newContainer();
      await container
          .read(updateGateProvider.notifier)
          .check(
            FakeAppUpdateRemote(
              error: const ApiException('업데이트 필요', statusCode: 426, code: ApiErrorCode.appUpdateRequired),
            ),
            timeout: timeout,
          );
      expect(container.read(updateGateProvider), isNotNull);
    });

    test('한 번 켜지면 꺼지지 않고, 처음 값이 유지된다', () async {
      final container = newContainer();
      final gate = container.read(updateGateProvider.notifier);
      gate.require(const UpdateRequirement(message: '처음'));
      gate.require(const UpdateRequirement(message: '나중'));
      await gate.check(FakeAppUpdateRemote(), timeout: timeout); // 이후 확인이 괜찮다고 해도 유지
      expect(container.read(updateGateProvider)!.message, '처음');
    });

    test('requireFrom 은 예외의 details 에서 스토어 주소를 읽는다', () {
      final container = newContainer();
      container
          .read(updateGateProvider.notifier)
          .requireFrom(
            const ApiException(
              '업데이트 필요',
              statusCode: 426,
              code: ApiErrorCode.appUpdateRequired,
              details: {'storeUrl': 'https://store.test', 'minVersion': '3.0.0'},
            ),
          );
      final requirement = container.read(updateGateProvider)!;
      expect(requirement.storeUrl, 'https://store.test');
      expect(requirement.minVersion, '3.0.0');
    });
  });

  group('updateRedirect (라우터 가드)', () {
    String? redirect(String location, {required bool required}) =>
        updateRedirect(required: required, uri: Uri.parse(location));

    test('업데이트가 필요하면 어디로 오든 업데이트 화면으로 보낸다', () {
      for (final location in ['/', '/splash', '/housing', '/housing/notices/n1?x=1', '/unavailable/housing']) {
        expect(redirect(location, required: true), updateRequiredPath, reason: location);
      }
    });

    test('이미 업데이트 화면이면 그대로 둔다 (무한 이동 방지)', () {
      expect(redirect(updateRequiredPath, required: true), isNull);
    });

    test('필요 없는데 업데이트 화면으로 들어오면 홈으로 보낸다', () {
      expect(redirect(updateRequiredPath, required: false), '/');
    });

    test('필요 없으면 다른 화면은 간섭하지 않는다', () {
      expect(redirect('/housing', required: false), isNull);
      expect(redirect('/splash', required: false), isNull);
    });
  });

  group('BootstrapController + 강제 업데이트', () {
    test('강제 업데이트면 서비스 설정 조회와 시작 작업을 하지 않고 끝낸다', () async {
      var coreRan = false;
      final features = FakeFeatureConfigRemote();
      final container = containerWith(
        [
          BootstrapTask(
            name: 'core',
            run: (ref) async {
              coreRan = true;
            },
          ),
        ],
        update: FakeAppUpdateRemote.required(storeUrl: 'https://store.test'),
        remote: features,
      );

      await container.read(bootstrapProvider.future);

      expect(container.read(updateGateProvider), isNotNull);
      expect(coreRan, isFalse);
      expect(features.fetchCount, 0, reason: '막힌 앱은 서버에 더 묻지 않는다');
    });

    test('업데이트가 필요 없으면 평소처럼 시작 작업이 돈다', () async {
      var coreRan = false;
      final container = containerWith([
        BootstrapTask(
          name: 'core',
          run: (ref) async {
            coreRan = true;
          },
        ),
      ]);

      await container.read(bootstrapProvider.future);

      expect(container.read(updateGateProvider), isNull);
      expect(coreRan, isTrue);
    });

    test('버전 확인이 서버에 닿지 못해도(시간 초과) 시작은 계속된다', () async {
      var coreRan = false;
      final container = containerWith(
        [
          BootstrapTask(
            name: 'core',
            run: (ref) async {
              coreRan = true;
            },
          ),
        ],
        update: FakeAppUpdateRemote(hang: true),
        updateTimeout: const Duration(milliseconds: 30),
      );

      await container.read(bootstrapProvider.future);

      expect(container.read(updateGateProvider), isNull);
      expect(coreRan, isTrue);
    });
  });
}
