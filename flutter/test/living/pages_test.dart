import 'dart:async';

import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/living/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/living/domain/living_guide.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finders.dart';
import '../support/living_fixtures.dart';
import '../support/pump_living_app.dart';

GuidePage onePage(List<Map<String, dynamic>> items) => GuidePage.fromJson(schemePageJson(items: items));

class _SlowDetailRepository extends FakeLivingRepository {
  _SlowDetailRepository(this._detail);

  final Future<GuideDetail> _detail;

  @override
  Future<GuideDetail> getGuide(String id, {required ApplicantProfile profile}) => _detail;
}

void main() {
  testWidgets('홈에서 이사·생활을 선택해 들어가고, 뒤로가기로 홈에 돌아온다', (tester) async {
    final repo = FakeLivingRepository(
      pages: [onePage([schemeSummaryJson(title: '전입신고 안내')])],
    );
    await pumpLivingApp(tester, repo);

    await tester.tap(homeText('이사·생활'));
    await tester.pumpAndSettle();

    expect(find.text('전입신고 안내'), findsOneWidget);

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(homeText('청년의 모든 것'), findsOneWidget);
  });

  testWidgets('공용 로딩: 목록을 불러오는 동안 메시지가 보이고 끝나면 사라진다', (tester) async {
    final gate = Completer<GuidePage>();
    final repo = FakeLivingRepository()..searchHook = (_, _) => gate.future;
    await pumpLivingApp(tester, repo, location: '/living', settle: false);

    expect(find.text('안내를 불러오는 중…'), findsOneWidget);

    gate.complete(onePage([schemeSummaryJson(title: '전입신고 안내')]));
    await tester.pumpAndSettle();

    expect(find.byType(LoadingView), findsNothing);
  });

  testWidgets('목록: 결과가 없으면 안내를 보여준다', (tester) async {
    await pumpLivingApp(tester, FakeLivingRepository(pages: [onePage([])]), location: '/living');
    expect(find.text('조건에 맞는 안내가 없습니다.'), findsOneWidget);
  });

  testWidgets('공용 로딩: 상세를 불러오는 동안 메시지가 보인다', (tester) async {
    final gate = Completer<GuideDetail>();
    await pumpLivingApp(tester, _SlowDetailRepository(gate.future), location: '/living/guides/b1', settle: false);
    expect(find.text('안내 상세를 불러오는 중…'), findsOneWidget);
    gate.complete(GuideDetail.fromJson(schemeDetailJson()));
    await tester.pumpAndSettle();
    expect(find.text('안내 상세'), findsOneWidget);
  });
}
