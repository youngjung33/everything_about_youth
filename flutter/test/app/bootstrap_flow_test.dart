import 'dart:async';

import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/housing/housing_module.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finders.dart';
import '../support/fixtures.dart';
import '../support/pump_app.dart';

NoticePage onePage() => NoticePage.fromJson(pageJson(items: [summaryJson()]));

void main() {
  testWidgets('작업이 끝나기 전에는 스플래시(빈 자리 + 로딩)만 보이고, 끝나면 홈이 열린다', (tester) async {
    final gate = Completer<void>();
    final repo = FakeHousingRepository(pages: [onePage()]);
    await pumpApp(
      tester,
      repo,
      settle: false,
      tasks: [BootstrapTask(name: 'gate', run: (ref) => gate.future)],
    );

    // 스플래시: 로딩 표시만 있고 홈 내용은 없다. (아무리 기다려도 작업이 끝나기 전에는 넘어가지 않는다)
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(homeText('임대주택'), findsNothing);
    await tester.pump(const Duration(seconds: 5));
    expect(homeText('임대주택'), findsNothing);

    gate.complete();
    await tester.pumpAndSettle();

    expect(homeText('임대주택'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);
  });

  testWidgets('주소로 바로 들어와도 로딩이 끝난 뒤 원래 가려던 화면으로 간다', (tester) async {
    final gate = Completer<void>();
    final repo = FakeHousingRepository(detail: NoticeDetail.fromJson(detailJson()));
    await pumpApp(
      tester,
      repo,
      location: '/housing/notices/n1',
      settle: false,
      tasks: [BootstrapTask(name: 'gate', run: (ref) => gate.future)],
    );

    expect(find.text('공고 개요'), findsNothing);

    gate.complete();
    await tester.pumpAndSettle();

    expect(find.text('공고 개요'), findsOneWidget);
  });

  testWidgets('필수 작업이 실패하면 오류와 다시 시도가 보이고, 다시 시도해서 성공하면 홈이 열린다', (tester) async {
    var attempts = 0;
    final repo = FakeHousingRepository(pages: [onePage()]);
    await pumpApp(
      tester,
      repo,
      tasks: [
        BootstrapTask(
          name: 'flaky',
          critical: true,
          run: (ref) async {
            attempts++;
            if (attempts == 1) throw StateError('boom');
          },
        ),
      ],
    );

    expect(find.byType(ErrorView), findsOneWidget);
    expect(homeText('임대주택'), findsNothing);

    await tester.tap(find.text('다시 시도'));
    await tester.pumpAndSettle();

    expect(attempts, 2);
    expect(find.byType(ErrorView), findsNothing);
    expect(homeText('임대주택'), findsOneWidget);
  });

  testWidgets('필수가 아닌 작업이 실패해도 앱은 시작된다', (tester) async {
    final repo = FakeHousingRepository(pages: [onePage()]);
    await pumpApp(
      tester,
      repo,
      tasks: [BootstrapTask(name: 'optional', run: (ref) async => throw StateError('boom'))],
    );

    expect(find.byType(ErrorView), findsNothing);
    expect(homeText('임대주택'), findsOneWidget);
  });

  testWidgets('임대주택 시작 작업: 목록을 미리 받아 두어, 들어가면 다시 받지 않고 바로 보인다', (tester) async {
    final repo = FakeHousingRepository(pages: [onePage()]);
    await pumpApp(tester, repo, modules: const [HousingModule()]);

    expect(repo.searchCalls, hasLength(1), reason: '시작 중에 한 번 받았다');

    await tester.tap(homeText('임대주택'));
    await tester.pumpAndSettle();

    expect(find.text('청년 행복주택 입주자 모집'), findsOneWidget);
    expect(repo.searchCalls, hasLength(1), reason: '화면에 들어가도 다시 받지 않는다');
  });

  testWidgets('임대주택 시작 작업: 서버가 실패해도 앱은 시작되고, 목록 화면이 오류와 재시도를 보여준다', (tester) async {
    final repo = FakeHousingRepository(searchError: const FormatException('서버 오류'));
    await pumpApp(tester, repo, modules: const [HousingModule()]);

    expect(homeText('임대주택'), findsOneWidget, reason: '홈까지는 열린다');

    await tester.tap(homeText('임대주택'));
    await tester.pumpAndSettle();
    expect(find.byType(ErrorView), findsOneWidget);
  });
}
