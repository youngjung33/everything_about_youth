import 'package:everything_about_youth/core/theme/app_text_scale.dart';
import 'package:everything_about_youth/core/update/update_gate.dart';
import 'package:everything_about_youth/core/update/update_requirement.dart';
import 'package:everything_about_youth/features/home/home_page.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:everything_about_youth/features/update_required/update_required_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/fake_app_update.dart';
import '../support/finders.dart';
import '../support/fixtures.dart';
import '../support/pump_app.dart';

FakeHousingRepository repo() => FakeHousingRepository(
  pages: [
    NoticePage.fromJson(pageJson(items: [summaryJson()])),
  ],
);

void main() {
  group('강제 업데이트 화면', () {
    testWidgets('서버가 업데이트를 요구하면 앱 대신 업데이트 화면만 보인다', (tester) async {
      await pumpApp(tester, repo(), update: FakeAppUpdateRemote.required(storeUrl: 'https://store.test/app'));

      expect(find.byType(UpdateRequiredPage), findsOneWidget);
      expect(find.text('업데이트가 필요합니다'), findsOneWidget);
      expect(find.byKey(UpdateRequiredPage.buttonKey), findsOneWidget);
      expect(find.byType(HomePage), findsNothing);
      expect(find.byType(Drawer), findsNothing);
      expect(find.byTooltip('메뉴'), findsNothing, reason: '헤더 메뉴로 우회할 수 없다');
    });

    testWidgets('서버가 준 문구를 보여준다', (tester) async {
      await pumpApp(
        tester,
        repo(),
        update: FakeAppUpdateRemote.required(storeUrl: 'https://store.test/app', message: '2.0 으로 올려 주세요'),
      );
      expect(find.text('2.0 으로 올려 주세요'), findsOneWidget);
    });

    testWidgets('스토어 주소를 모르면 버튼 대신 안내 문구를 보인다', (tester) async {
      await pumpApp(tester, repo(), update: FakeAppUpdateRemote.required());
      expect(find.byKey(UpdateRequiredPage.buttonKey), findsNothing);
      expect(find.textContaining('업데이트'), findsWidgets);
    });

    testWidgets('주소로 직접 들어와도 업데이트 화면이다', (tester) async {
      await pumpApp(
        tester,
        repo(),
        location: '/housing/notices/n1',
        update: FakeAppUpdateRemote.required(storeUrl: 'https://store.test/app'),
      );
      expect(find.byType(UpdateRequiredPage), findsOneWidget);
      expect(find.text('공고 개요'), findsNothing);
    });

    testWidgets('실행 중에 서버가 업데이트를 요구하면 그 자리에서 업데이트 화면으로 바뀐다', (tester) async {
      final container = await pumpApp(tester, repo());
      expect(homeText('임대주택'), findsOneWidget);

      container
          .read(updateGateProvider.notifier)
          .require(const UpdateRequirement(message: '지금 업데이트하세요', storeUrl: 'https://store.test/app'));
      await tester.pumpAndSettle();

      expect(find.byType(UpdateRequiredPage), findsOneWidget);
      expect(find.text('지금 업데이트하세요'), findsOneWidget);
      expect(find.byType(HomePage), findsNothing);
    });

    testWidgets('업데이트가 필요 없으면 평소처럼 홈이 열린다', (tester) async {
      await pumpApp(tester, repo());
      expect(find.byType(UpdateRequiredPage), findsNothing);
      expect(homeText('임대주택'), findsOneWidget);
    });

    testWidgets('작은 화면에서 글자를 크게 해도 넘치지 않는다', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 3;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

      await pumpApp(
        tester,
        repo(),
        size: const Size(320, 480),
        update: FakeAppUpdateRemote.required(storeUrl: 'https://store.test/app'),
      );

      expect(tester.takeException(), isNull);
      expect(find.byKey(UpdateRequiredPage.buttonKey), findsOneWidget);
    });
  });

  group('글꼴 크기 상한 정책', () {
    double scaleSeenByHome(WidgetTester tester) =>
        MediaQuery.of(tester.element(find.byType(HomePage))).textScaler.scale(10) / 10;

    testWidgets('시스템 설정이 상한보다 크면 상한까지만 커진다', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 3;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

      await pumpApp(tester, repo());
      expect(scaleSeenByHome(tester), closeTo(AppTextScale.max, 0.001));
    });

    testWidgets('상한 안의 설정은 그대로 따른다', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 1.2;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

      await pumpApp(tester, repo());
      expect(scaleSeenByHome(tester), closeTo(1.2, 0.001));
    });

    testWidgets('너무 작은 설정은 하한으로 올린다', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 0.5;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

      await pumpApp(tester, repo());
      expect(scaleSeenByHome(tester), closeTo(AppTextScale.min, 0.001));
    });

    testWidgets('최대로 키워도 좁은 화면의 홈과 목록이 넘치지 않는다', (tester) async {
      tester.platformDispatcher.textScaleFactorTestValue = 3;
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

      await pumpApp(tester, repo(), size: const Size(320, 640), location: '/housing');
      expect(tester.takeException(), isNull);

      await pumpApp(tester, repo(), size: const Size(320, 640));
      expect(tester.takeException(), isNull);
    });
  });
}
