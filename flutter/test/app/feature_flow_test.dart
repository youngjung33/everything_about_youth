import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:everything_about_youth/core/feature/feature_flags.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finders.dart';
import '../support/fake_feature.dart';
import '../support/fake_feature_config.dart';
import '../support/fixtures.dart';
import '../support/pump_app.dart';

BootstrapTask failing() => BootstrapTask(name: 'x', critical: true, run: (ref) async => throw StateError('boom'));

void main() {
  final repo = FakeHousingRepository();

  testWidgets('홈은 꽂힌 서비스를 카드로 보여주고, 카드를 누르면 그 서비스로 들어간다', (tester) async {
    await pumpApp(
      tester,
      repo,
      modules: const [
        FakeFeature('a', title: '서비스A'),
        FakeFeature('b', title: '서비스B'),
      ],
    );

    expect(homeText('서비스A'), findsOneWidget);
    expect(homeText('서비스B'), findsOneWidget);

    await tester.tap(homeText('서비스B'));
    await tester.pumpAndSettle();
    expect(find.text('b 첫 화면'), findsOneWidget);
  });

  testWidgets('꺼 둔 서비스는 홈에 보이지 않고, 주소로 들어와도 안내 화면이 나온다', (tester) async {
    await pumpApp(
      tester,
      repo,
      location: '/b',
      modules: const [
        FakeFeature('a', title: '서비스A'),
        FakeFeature('b', title: '서비스B'),
      ],
      disabled: {'b'},
    );

    expect(find.text('b 첫 화면'), findsNothing);
    expect(find.text('서비스B 서비스는 지금 사용할 수 없습니다.'), findsOneWidget);

    await tester.tap(find.text('홈으로'));
    await tester.pumpAndSettle();
    expect(homeText('서비스A'), findsOneWidget);
    expect(homeText('서비스B'), findsNothing);
  });

  testWidgets('실행 중에 서비스를 끄고 켜면 홈 카드와 화면이 바로 따라간다 (앱 재시작 없이)', (tester) async {
    final container = await pumpApp(
      tester,
      repo,
      modules: const [
        FakeFeature('a', title: '서비스A'),
        FakeFeature('b', title: '서비스B'),
      ],
    );
    final flags = container.read(featureFlagsProvider.notifier);

    flags.disable('b');
    await tester.pumpAndSettle();
    expect(homeText('서비스B'), findsNothing);
    expect(homeText('서비스A'), findsOneWidget);

    flags.enable('b');
    await tester.pumpAndSettle();
    expect(homeText('서비스B'), findsOneWidget);
  });

  testWidgets('열어 둔 서비스를 끄면 안내 화면으로 바뀌고, 다시 켜면 서비스 화면으로 돌아온다', (tester) async {
    final container = await pumpApp(
      tester,
      repo,
      location: '/a',
      modules: const [FakeFeature('a', title: '서비스A')],
    );
    expect(find.text('a 첫 화면'), findsOneWidget);

    container.read(featureFlagsProvider.notifier).disable('a');
    await tester.pumpAndSettle();
    expect(find.text('a 첫 화면'), findsNothing);
    expect(find.text('서비스A 서비스는 지금 사용할 수 없습니다.'), findsOneWidget);

    container.read(featureFlagsProvider.notifier).enable('a');
    await tester.pumpAndSettle();
    expect(find.text('a 첫 화면'), findsOneWidget);
  });

  testWidgets('한 서비스가 장애여도 앱은 열리고 다른 서비스는 그대로 쓸 수 있다', (tester) async {
    await pumpApp(
      tester,
      repo,
      modules: [
        FakeFeature('bad', title: '고장난서비스', tasks: [failing()]),
        const FakeFeature('good', title: '멀쩡한서비스'),
      ],
    );

    // 홈은 열리고, 고장난 카드는 오류 문구와 다시 시도가 보인다.
    expect(homeText('고장난서비스'), findsOneWidget);
    expect(find.text('지금은 이 서비스를 불러오지 못했습니다.'), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);

    // 다른 서비스는 정상 동작
    await tester.tap(homeText('멀쩡한서비스'));
    await tester.pumpAndSettle();
    expect(find.text('good 첫 화면'), findsOneWidget);
  });

  testWidgets('장애 서비스의 주소로 들어오면 안내 화면에서 다시 시도할 수 있고, 성공하면 서비스 화면으로 간다', (tester) async {
    var attempts = 0;
    await pumpApp(
      tester,
      repo,
      location: '/flaky',
      modules: [
        FakeFeature(
          'flaky',
          title: '불안정서비스',
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
      ],
    );

    expect(find.text('불안정서비스 서비스를 불러오지 못했습니다.'), findsOneWidget);

    await tester.tap(find.text('다시 시도'));
    await tester.pumpAndSettle();

    expect(attempts, 2);
    expect(find.text('flaky 첫 화면'), findsOneWidget);
  });

  testWidgets('홈 카드의 다시 시도로 장애 서비스를 복구한다', (tester) async {
    var attempts = 0;
    await pumpApp(
      tester,
      repo,
      modules: [
        FakeFeature(
          'flaky',
          title: '불안정서비스',
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
      ],
    );
    expect(find.text('지금은 이 서비스를 불러오지 못했습니다.'), findsOneWidget);

    await tester.tap(find.text('다시 시도'));
    await tester.pumpAndSettle();

    expect(find.text('지금은 이 서비스를 불러오지 못했습니다.'), findsNothing);
    expect(find.text('flaky 설명'), findsOneWidget);
  });

  testWidgets('서버가 끈 서비스는 홈에서 숨겨지고, 서버가 켠 서비스(기본값 꺼짐)는 보인다', (tester) async {
    await pumpApp(
      tester,
      repo,
      modules: const [
        FakeFeature('a', title: '서비스A'),
        FakeFeature('b', title: '서비스B'),
        FakeFeature('beta', title: '베타서비스', defaultEnabled: false),
      ],
      remote: FakeFeatureConfigRemote(config: {'b': false, 'beta': true}),
    );

    expect(homeText('서비스A'), findsOneWidget);
    expect(homeText('서비스B'), findsNothing);
    expect(homeText('베타서비스'), findsOneWidget);
  });

  testWidgets('서버 설정이 없고 서버에 닿지도 못하면 기본값대로 보인다 (기본값 꺼짐은 숨김)', (tester) async {
    await pumpApp(
      tester,
      repo,
      modules: const [
        FakeFeature('a', title: '서비스A'),
        FakeFeature('beta', title: '베타서비스', defaultEnabled: false),
      ],
      remote: FakeFeatureConfigRemote(error: StateError('서버 꺼짐')),
    );

    expect(homeText('서비스A'), findsOneWidget);
    expect(homeText('베타서비스'), findsNothing);
  });

  testWidgets('서버에 닿지 못하면 기기에 남은 직전 설정으로 숨긴다', (tester) async {
    await pumpApp(
      tester,
      repo,
      modules: const [
        FakeFeature('a', title: '서비스A'),
        FakeFeature('b', title: '서비스B'),
      ],
      remote: FakeFeatureConfigRemote(error: StateError('서버 꺼짐')),
      cache: MemoryFeatureConfigCache({'b': false}),
    );

    expect(homeText('서비스A'), findsOneWidget);
    expect(homeText('서비스B'), findsNothing);
  });

  testWidgets('서버가 끈 서비스의 주소로 들어오면 안내 화면이 나온다', (tester) async {
    await pumpApp(
      tester,
      repo,
      location: '/b',
      modules: const [
        FakeFeature('a', title: '서비스A'),
        FakeFeature('b', title: '서비스B'),
      ],
      remote: FakeFeatureConfigRemote(config: {'b': false}),
    );

    expect(find.text('b 첫 화면'), findsNothing);
    expect(find.text('서비스B 서비스는 지금 사용할 수 없습니다.'), findsOneWidget);
  });

  testWidgets('서비스가 하나도 없어도 앱은 열린다 (코어만 있는 상태)', (tester) async {
    await pumpApp(tester, repo, modules: const []);
    expect(homeText('청년의 모든 것'), findsOneWidget);
  });
}
