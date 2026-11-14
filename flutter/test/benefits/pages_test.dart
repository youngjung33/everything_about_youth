import 'dart:async';

import 'package:everything_about_youth/core/design/service_accent.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/core/network/api_user_message.dart';
import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/benefits/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_program.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/benefits_fixtures.dart';
import '../support/finders.dart';
import '../support/pump_benefits_app.dart';

ProgramPage onePage(List<Map<String, dynamic>> items) => ProgramPage.fromJson(programPageJson(items: items));

Finder get _profileScrollable => find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;

class _SlowDetailRepository extends FakeBenefitsRepository {
  _SlowDetailRepository(this._detail);

  final Future<ProgramDetail> _detail;

  @override
  Future<ProgramDetail> getProgram(String id, {required ApplicantProfile profile}) => _detail;
}

void main() {
  testWidgets('홈에서 청년 혜택을 선택해 들어가고, 뒤로가기로 홈에 돌아온다', (tester) async {
    final repo = FakeBenefitsRepository(pages: [onePage([programSummaryJson()])]);
    await pumpBenefitsApp(tester, repo);

    expect(homeText('청년의 모든 것'), findsOneWidget);
    await tester.tap(homeText('청년 혜택'));
    await tester.pumpAndSettle();

    expect(find.text('청년 월세 지원'), findsOneWidget);

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(homeText('청년의 모든 것'), findsOneWidget);
    expect(find.text('청년 월세 지원'), findsNothing);
  });

  testWidgets('공용 로딩: 목록을 불러오는 동안 메시지가 보이고 끝나면 사라진다', (tester) async {
    final gate = Completer<ProgramPage>();
    final repo = FakeBenefitsRepository()..searchHook = (_, _) => gate.future;
    await pumpBenefitsApp(tester, repo, location: '/benefits', settle: false);

    expect(find.text('정책을 불러오는 중…'), findsOneWidget);
    expect(find.byType(LoadingView), findsOneWidget);

    gate.complete(onePage([programSummaryJson()]));
    await tester.pumpAndSettle();

    expect(find.byType(LoadingView), findsNothing);
    expect(find.text('청년 월세 지원'), findsOneWidget);
  });

  testWidgets('공용 로딩: 상세를 불러오는 동안 메시지가 보인다', (tester) async {
    final gate = Completer<ProgramDetail>();
    await pumpBenefitsApp(tester, _SlowDetailRepository(gate.future), location: '/benefits/programs/b1', settle: false);

    expect(find.text('정책 상세를 불러오는 중…'), findsOneWidget);

    gate.complete(ProgramDetail.fromJson(programDetailJson()));
    await tester.pumpAndSettle();
    expect(find.byType(LoadingView), findsNothing);
    expect(find.text('정책 상세'), findsOneWidget);
  });

  testWidgets('목록: 카드에 제목·상태·지역이 보인다 (넓은 화면은 필터 사이드바)', (tester) async {
    await pumpBenefitsApp(tester, FakeBenefitsRepository(pages: [onePage([programSummaryJson()])]), location: '/benefits');

    expect(find.text('정책 목록'), findsOneWidget);
    expect(find.text('2026.10.12 10:00 갱신'), findsOneWidget);
    expect(find.text('청년 월세 지원'), findsOneWidget);
    expect(find.text('신청중'), findsWidgets);
    expect(find.text('서울'), findsWidgets);
    expect(find.text('검색'), findsWidgets);
  });

  testWidgets('목록: 결과가 없으면 안내를 보여준다', (tester) async {
    await pumpBenefitsApp(tester, FakeBenefitsRepository(pages: [onePage([])]), location: '/benefits');
    expect(find.text('조건에 맞는 정책이 없습니다.'), findsOneWidget);
  });

  testWidgets('목록: 오류가 나면 메시지와 다시 시도 버튼, 복구 후 목록', (tester) async {
    final repo = FakeBenefitsRepository(
      pages: [onePage([programSummaryJson()])],
      searchError: const ApiException(ApiUserMessages.networkUnavailable, code: ApiErrorCode.networkError),
    );
    await pumpBenefitsApp(tester, repo, location: '/benefits');

    expect(find.text(ApiUserMessages.networkUnavailable), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);

    repo.searchError = null;
    await tester.tap(find.text('다시 시도'));
    await tester.pumpAndSettle();

    expect(find.text('청년 월세 지원'), findsOneWidget);
  });

  testWidgets('목록: 좁은 화면에서는 필터가 바텀시트로 열린다', (tester) async {
    await pumpBenefitsApp(
      tester,
      FakeBenefitsRepository(pages: [onePage([programSummaryJson()])]),
      location: '/benefits',
      size: const Size(400, 900),
    );

    expect(find.text('검색'), findsNothing);
    await tester.tap(find.byTooltip('필터'));
    await tester.pumpAndSettle();
    expect(find.text('검색'), findsWidgets);

    await tester.tap(
      find.descendant(of: find.byType(BottomSheet), matching: find.widgetWithText(FilledButton, '검색')),
    );
    await tester.pumpAndSettle();
    expect(find.text('검색'), findsNothing);
  });

  testWidgets('상세: 없는 정책은 오류 문구', (tester) async {
    await pumpBenefitsApp(tester, FakeBenefitsRepository(), location: '/benefits/programs/none');
    expect(find.text('정책을 찾을 수 없습니다.'), findsOneWidget);
  });

  testWidgets('내 조건을 저장하면 요약이 보이고 판정 거르기 칩이 나타난다', (tester) async {
    final repo = FakeBenefitsRepository(pages: [onePage([programSummaryJson()])]);
    await pumpBenefitsApp(tester, repo, location: '/benefits');

    expect(find.text('"내 조건"을 입력하면 신청 가능 여부를 판정합니다.'), findsOneWidget);
    expect(find.text('자격 판정으로 거르기'), findsNothing);

    await tester.tap(find.text('입력하기'));
    await tester.pumpAndSettle();
    expect(find.text('내 조건'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, '만 나이'), '29');
    await tester.tap(find.text('무주택'));
    await tester.scrollUntilVisible(find.text('저장'), 300, scrollable: _profileScrollable);
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    expect(find.text('내 조건: 만 29세 · 무주택'), findsOneWidget);
    expect(find.text('자격 판정으로 거르기'), findsOneWidget);
    expect(repo.searchCalls.last.profile.age, 29);
    expect(repo.searchCalls.last.profile.isHomeless, isTrue);
  });

  testWidgets('관심 정책: 비어 있으면 안내를 보여준다', (tester) async {
    await pumpBenefitsApp(tester, FakeBenefitsRepository(pages: [onePage([])]), location: '/benefits/saved');
    expect(find.text(ServiceAccent.benefits.savedEmptyMessage), findsOneWidget);
  });

  testWidgets('관심 정책: 북마크로 저장하면 관심 정책 화면에 보인다', (tester) async {
    await pumpBenefitsApp(tester, FakeBenefitsRepository(pages: [onePage([programSummaryJson()])]), location: '/benefits');

    final accent = ServiceAccent.benefits;
    await tester.tap(find.byTooltip(accent.savedBookmarkTooltip(saved: false)));
    await tester.pumpAndSettle();
    expect(find.byTooltip(accent.savedBookmarkTooltip(saved: true)), findsOneWidget);

    await tester.tap(find.text(accent.savedQuickActionLabel));
    await tester.pumpAndSettle();
    expect(find.text(accent.savedEmptyMessage), findsNothing);
    expect(find.text('청년 월세 지원'), findsOneWidget);
  });
}
