import 'dart:async';

import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/finance/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/finance/domain/finance_scheme.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finance_fixtures.dart';
import '../support/finders.dart';
import '../support/pump_finance_app.dart';

SchemePage onePage(List<Map<String, dynamic>> items) => SchemePage.fromJson(schemePageJson(items: items));

class _SlowDetailRepository extends FakeFinanceRepository {
  _SlowDetailRepository(this._detail);

  final Future<SchemeDetail> _detail;

  @override
  Future<SchemeDetail> getScheme(String id, {required ApplicantProfile profile}) => _detail;
}

void main() {
  testWidgets('홈에서 주거·자금을 선택해 들어가고, 뒤로가기로 홈에 돌아온다', (tester) async {
    final repo = FakeFinanceRepository(pages: [onePage([schemeSummaryJson()])]);
    await pumpFinanceApp(tester, repo);

    await tester.tap(homeText('청년 주거·자금'));
    await tester.pumpAndSettle();

    expect(find.text('청년 월세 지원'), findsOneWidget);

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(homeText('청년의 모든 것'), findsOneWidget);
  });

  testWidgets('공용 로딩: 목록을 불러오는 동안 메시지가 보이고 끝나면 사라진다', (tester) async {
    final gate = Completer<SchemePage>();
    final repo = FakeFinanceRepository()..searchHook = (_, _) => gate.future;
    await pumpFinanceApp(tester, repo, location: '/finance', settle: false);

    expect(find.text('제도를 불러오는 중…'), findsOneWidget);

    gate.complete(onePage([schemeSummaryJson()]));
    await tester.pumpAndSettle();

    expect(find.byType(LoadingView), findsNothing);
  });

  testWidgets('목록: 결과가 없으면 안내를 보여준다', (tester) async {
    await pumpFinanceApp(tester, FakeFinanceRepository(pages: [onePage([])]), location: '/finance');
    expect(find.text('조건에 맞는 제도가 없습니다.'), findsOneWidget);
  });

  testWidgets('공용 로딩: 상세를 불러오는 동안 메시지가 보인다', (tester) async {
    final gate = Completer<SchemeDetail>();
    await pumpFinanceApp(tester, _SlowDetailRepository(gate.future), location: '/finance/schemes/b1', settle: false);
    expect(find.text('제도 상세를 불러오는 중…'), findsOneWidget);
    gate.complete(SchemeDetail.fromJson(schemeDetailJson()));
    await tester.pumpAndSettle();
    expect(find.text('제도 상세'), findsOneWidget);
  });
}
