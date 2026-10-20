import 'dart:async';

import 'package:everything_about_youth/app/router.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_controller.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/bootstrap_container.dart';

void main() {
  group('bootstrapRedirect (라우터 가드)', () {
    String? redirect(String location, {required bool ready}) =>
        bootstrapRedirect(ready: ready, uri: Uri.parse(location));

    test('준비 전에는 어디로 오든 스플래시로 보내고, 원래 주소를 from 으로 들고 간다', () {
      expect(redirect('/housing', ready: false), '/splash?from=%2Fhousing');
      expect(redirect('/housing/notices/n1?x=1', ready: false), '/splash?from=%2Fhousing%2Fnotices%2Fn1%3Fx%3D1');
    });

    test('준비 전 홈(/)은 from 없이 스플래시로 보낸다', () {
      expect(redirect('/', ready: false), '/splash');
    });

    test('준비 전 스플래시에 있으면 그대로 둔다', () {
      expect(redirect('/splash', ready: false), isNull);
      expect(redirect('/splash?from=%2Fhousing', ready: false), isNull);
    });

    test('준비 후 스플래시에서는 from 으로, 없으면 홈으로 보낸다', () {
      expect(redirect('/splash?from=%2Fhousing%2Fnotices%2Fn1', ready: true), '/housing/notices/n1');
      expect(redirect('/splash', ready: true), '/');
    });

    test('준비 후 다른 화면은 간섭하지 않는다', () {
      expect(redirect('/', ready: true), isNull);
      expect(redirect('/housing', ready: true), isNull);
    });

    test('from 이 앱 밖을 가리키면 무시하고 홈으로 보낸다', () {
      for (final bad in ['https://evil.com', '//evil.com', 'housing', '/splash', '/splash?from=%2F']) {
        expect(redirect('/splash?from=${Uri.encodeQueryComponent(bad)}', ready: true), '/', reason: bad);
      }
    });
  });

  group('BootstrapController', () {
    test('모든 작업이 끝나면 data 가 된다 (작업은 병렬로 돈다)', () async {
      final gateA = Completer<void>();
      final gateB = Completer<void>();
      final started = <String>[];
      final container = containerWith([
        BootstrapTask(
          name: 'a',
          run: (ref) {
            started.add('a');
            return gateA.future;
          },
        ),
        BootstrapTask(
          name: 'b',
          run: (ref) {
            started.add('b');
            return gateB.future;
          },
        ),
      ]);

      final future = container.read(bootstrapProvider.future);
      await Future<void>.delayed(Duration.zero);
      expect(started, ['a', 'b']);
      expect(container.read(bootstrapProvider).isLoading, isTrue);

      gateA.complete();
      await Future<void>.delayed(Duration.zero);
      expect(container.read(bootstrapProvider).isLoading, isTrue, reason: 'b 가 남아 있다');

      gateB.complete();
      await future;
      expect(container.read(bootstrapProvider), isA<AsyncData<BootstrapResult>>());
    });

    test('작업이 없으면 바로 끝난다', () async {
      final container = containerWith(const []);
      await container.read(bootstrapProvider.future);
      expect(container.read(bootstrapProvider), isA<AsyncData<BootstrapResult>>());
    });

    test('필수 작업이 실패하면 error 가 된다', () async {
      final container = containerWith([
        BootstrapTask(name: 'x', critical: true, run: (ref) async => throw StateError('boom')),
      ]);
      await expectLater(container.read(bootstrapProvider.future), throwsStateError);
      expect(container.read(bootstrapProvider).hasError, isTrue);
    });

    test('필수가 아닌 작업은 실패해도 건너뛰고 끝난다', () async {
      var otherRan = false;
      final container = containerWith([
        BootstrapTask(name: 'x', run: (ref) async => throw StateError('boom')),
        BootstrapTask(name: 'y', run: (ref) async => otherRan = true),
      ]);
      await container.read(bootstrapProvider.future);
      expect(otherRan, isTrue);
      expect(container.read(bootstrapProvider), isA<AsyncData<BootstrapResult>>());
    });

    test('제한 시간을 넘긴 작업: 필수가 아니면 건너뛰고, 필수면 실패한다', () async {
      final never = Completer<void>();
      final skip = containerWith([
        BootstrapTask(name: 'slow', timeout: const Duration(milliseconds: 20), run: (ref) => never.future),
      ]);
      await skip.read(bootstrapProvider.future);

      final fail = containerWith([
        BootstrapTask(
          name: 'slow',
          critical: true,
          timeout: const Duration(milliseconds: 20),
          run: (ref) => never.future,
        ),
      ]);
      await expectLater(fail.read(bootstrapProvider.future), throwsA(isA<TimeoutException>()));
    });

    test('작업이 빨라도 최소 표시 시간만큼은 기다린다', () async {
      final container = containerWith(const [], minDuration: const Duration(milliseconds: 120));
      final watch = Stopwatch()..start();
      await container.read(bootstrapProvider.future);
      expect(watch.elapsedMilliseconds, greaterThanOrEqualTo(100));
    });

    test('invalidate 하면 처음부터 다시 돈다 (다시 시도)', () async {
      var runs = 0;
      final container = containerWith([
        BootstrapTask(
          name: 'flaky',
          critical: true,
          run: (ref) async {
            runs++;
            if (runs == 1) throw StateError('first');
          },
        ),
      ]);
      await expectLater(container.read(bootstrapProvider.future), throwsStateError);

      container.invalidate(bootstrapProvider);
      await container.read(bootstrapProvider.future);
      expect(runs, 2);
      expect(container.read(bootstrapProvider), isA<AsyncData<BootstrapResult>>());
    });
  });
}
