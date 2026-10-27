import 'dart:async';

import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/housing_meta.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finders.dart';
import '../support/fixtures.dart';
import '../support/pump_app.dart';

NoticePage onePage(List<Map<String, dynamic>> items) => NoticePage.fromJson(pageJson(items: items));

/// '내 조건' 입력 화면의 세로 스크롤. (입력 칸마다 자체 Scrollable 이 있어서 첫 번째 Scrollable 은 맞지 않는다)
Finder get _formScrollable => find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;

/// 상세 응답을 원하는 시점에 내려주는 저장소 (로딩 표시 확인용)
class _SlowDetailRepository extends FakeHousingRepository {
  _SlowDetailRepository(this._detail);

  final Future<NoticeDetail> _detail;

  @override
  Future<NoticeDetail> getNotice(String id, {required ApplicantProfile profile}) => _detail;
}

void main() {
  testWidgets('홈에서 임대주택을 선택해 들어가고, 뒤로가기로 홈에 돌아온다', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
    );
    await pumpApp(tester, repo);

    expect(homeText('청년의 모든 것'), findsOneWidget);
    await tester.tap(homeText('임대주택'));
    await tester.pumpAndSettle();

    expect(find.text('청년 행복주택 입주자 모집'), findsOneWidget);

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(homeText('청년의 모든 것'), findsOneWidget);
    expect(find.text('청년 행복주택 입주자 모집'), findsNothing);
  });

  testWidgets('공용 로딩: 목록을 불러오는 동안 메시지가 보이고 끝나면 사라진다', (tester) async {
    final gate = Completer<NoticePage>();
    final repo = FakeHousingRepository()..searchHook = (_, _) => gate.future;
    await pumpApp(tester, repo, location: '/housing', settle: false);

    expect(find.text('공고를 불러오는 중…'), findsOneWidget);
    expect(find.byType(LoadingView), findsOneWidget);

    gate.complete(onePage([summaryJson()]));
    await tester.pumpAndSettle();

    expect(find.byType(LoadingView), findsNothing);
    expect(find.text('청년 행복주택 입주자 모집'), findsOneWidget);
  });

  testWidgets('공용 로딩: 상세를 불러오는 동안 메시지가 보인다', (tester) async {
    final gate = Completer<NoticeDetail>();
    final repo = _SlowDetailRepository(gate.future);
    await pumpApp(tester, repo, location: '/housing/notices/n1', settle: false);

    expect(find.text('공고 상세를 불러오는 중…'), findsOneWidget);

    gate.complete(NoticeDetail.fromJson(detailJson()));
    await tester.pumpAndSettle();
    expect(find.byType(LoadingView), findsNothing);
    expect(find.text('공고 개요'), findsOneWidget);
  });

  testWidgets('목록: 카드에 상태·유형·지역·세대수·금액이 보인다 (넓은 화면은 필터 사이드바)', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
    );
    await pumpApp(tester, repo, location: '/housing');

    expect(find.text('공고 목록'), findsOneWidget);
    expect(find.text('2026.10.12 10:00 갱신'), findsOneWidget);
    expect(find.text('청년 행복주택 입주자 모집'), findsOneWidget);
    expect(find.text('접수중'), findsWidgets);
    expect(find.text('행복주택'), findsWidgets);
    expect(find.text('서울특별시 강남구'), findsOneWidget);
    expect(find.text('120세대'), findsOneWidget);
    expect(find.text('5,000만원~'), findsOneWidget);
    // 사이드바의 필터
    expect(find.text('검색'), findsOneWidget);
    expect(find.text('서울특별시'), findsWidgets);
  });

  testWidgets('목록: 결과가 없으면 안내를 보여준다', (tester) async {
    final repo = FakeHousingRepository(pages: [onePage([])]);
    await pumpApp(tester, repo, location: '/housing');

    expect(find.text('조건에 맞는 공고가 없습니다.'), findsOneWidget);
  });

  testWidgets('목록: 오류가 나면 메시지와 다시 시도 버튼, 복구 후 목록', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
      searchError: const ApiException('서버에 연결할 수 없습니다.'),
    );
    await pumpApp(tester, repo, location: '/housing');

    expect(find.text('서버에 연결할 수 없습니다.'), findsOneWidget);

    repo.searchError = null;
    await tester.tap(find.text('다시 시도'));
    await tester.pumpAndSettle();

    expect(find.text('청년 행복주택 입주자 모집'), findsOneWidget);
  });

  testWidgets('목록: 좁은 화면에서는 필터가 바텀시트로 열린다', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
    );
    await pumpApp(tester, repo, location: '/housing', size: const Size(400, 900));

    expect(find.text('검색'), findsNothing);
    await tester.tap(find.byTooltip('필터'));
    await tester.pumpAndSettle();
    expect(find.text('검색'), findsOneWidget);

    await tester.tap(find.text('검색'));
    await tester.pumpAndSettle();
    expect(find.text('검색'), findsNothing);
  });

  testWidgets('카드를 누르면 상세로 이동하고 단지/세대유형/출처가 보인다', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
      detail: NoticeDetail.fromJson(detailJson()),
    );
    await pumpApp(tester, repo, location: '/housing');

    await tester.tap(find.text('청년 행복주택 입주자 모집'));
    await tester.pumpAndSettle();

    expect(find.text('공고 상세'), findsOneWidget);
    expect(find.text('공고 개요'), findsOneWidget);
    final bodyScrollable = find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;
    await tester.scrollUntilVisible(find.text('강남 A단지'), 300, scrollable: bodyScrollable);
    expect(find.text('강남 A단지'), findsOneWidget);
    expect(find.text('16A'), findsOneWidget);
    expect(find.text('500만원'), findsNothing); // 5,000만원이어야 한다
    expect(find.text('5,000만원'), findsOneWidget);
    expect(find.text('문의: 1600-1004'), findsOneWidget);
    await tester.scrollUntilVisible(find.textContaining('LH청약플러스'), 300, scrollable: bodyScrollable);
    expect(find.textContaining('LH청약플러스'), findsWidgets);

    await tester.scrollUntilVisible(find.text('원문 공고 보기'), 400, scrollable: bodyScrollable);
    expect(find.text('원문 공고 보기'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('접수 마감일 캘린더에 넣기'), 400, scrollable: bodyScrollable);
    expect(find.text('접수 마감일 캘린더에 넣기'), findsOneWidget);
  });

  testWidgets('상세: 없는 공고는 오류 문구', (tester) async {
    final repo = FakeHousingRepository();
    await pumpApp(tester, repo, location: '/housing/notices/none');

    expect(find.text('공고를 찾을 수 없습니다.'), findsOneWidget);
  });

  testWidgets('내 조건을 저장하면 요약이 보이고 판정 거르기 칩이 나타난다', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
    );
    await pumpApp(tester, repo, location: '/housing');

    expect(find.text('"내 조건"을 입력하면 신청 가능 여부를 판정합니다.'), findsOneWidget);
    expect(find.text('자격 판정으로 거르기'), findsNothing);

    await tester.tap(find.text('입력하기'));
    await tester.pumpAndSettle();
    expect(find.text('내 조건'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, '만 나이'), '29');
    await tester.tap(find.text('무주택'));
    await tester.scrollUntilVisible(find.text('저장'), 300, scrollable: _formScrollable);
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    expect(find.text('내 조건: 만 29세 · 무주택'), findsOneWidget);
    expect(find.text('자격 판정으로 거르기'), findsOneWidget);
    expect(repo.searchCalls.last.profile.age, 29);
    expect(repo.searchCalls.last.profile.isHomeless, isTrue);
  });

  testWidgets('내 조건: 가구원수·월 소득·자산을 입력하면 소득 수준을 안내하고 서버 쿼리에 실린다', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
    );
    // 입력 칸이 많아서, 화면 밖 칸은 아직 만들어지지 않는다. 전체가 한 화면에 들어오는 높이로 연다.
    await pumpApp(tester, repo, location: '/housing/profile', size: const Size(600, 3200));
    final scrollable = _formScrollable;

    // 가구원수를 고르기 전에는 소득 수준 안내가 없다
    await tester.scrollUntilVisible(find.byKey(const ValueKey('household-3')), 300, scrollable: scrollable);
    await tester.enterText(find.widgetWithText(TextField, '가구 월 소득 (세전, 가구원 전체 합계)'), '650');
    await tester.pump();
    expect(find.byKey(const ValueKey('income-hint')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('household-3')));
    await tester.pump();
    // 3인 가구 도시근로자 월평균소득 8,168,429원의 80%
    expect(find.byKey(const ValueKey('income-hint')), findsOneWidget);
    expect(find.textContaining('2026년 기준 3인 가구'), findsOneWidget);
    expect(find.textContaining('약 80%'), findsOneWidget);

    // 선택한 칩을 다시 누르면 입력 안 함으로 돌아간다
    await tester.tap(find.byKey(const ValueKey('household-3')));
    await tester.pump();
    expect(find.byKey(const ValueKey('income-hint')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('household-3')));
    await tester.pump();

    await tester.scrollUntilVisible(find.widgetWithText(TextField, '총자산 (부채를 뺀 금액)'), 300, scrollable: scrollable);
    await tester.enterText(find.widgetWithText(TextField, '총자산 (부채를 뺀 금액)'), '5000');
    await tester.enterText(find.widgetWithText(TextField, '자동차 가액'), '0');

    await tester.scrollUntilVisible(find.text('저장'), 300, scrollable: scrollable);
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    final saved = repo.searchCalls.last.profile;
    expect(saved.householdSize, 3);
    expect(saved.monthlyIncomeMan, 650);
    expect(saved.totalAssetMan, 5000);
    expect(saved.carValueMan, 0);
    expect(saved.toQuery(), containsPair('household', '3'));
  });

  testWidgets('내 조건: 신혼부부로 답했을 때만 맞벌이를 묻는다', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
    );
    // 입력 칸이 많아서, 화면 밖 칸은 아직 만들어지지 않는다. 전체가 한 화면에 들어오는 높이로 연다.
    await pumpApp(tester, repo, location: '/housing/profile', size: const Size(600, 3200));
    final scrollable = _formScrollable;

    expect(find.textContaining('맞벌이'), findsNothing);
    await tester.scrollUntilVisible(find.text('신혼부부 (혼인 7년 이내)'), 300, scrollable: scrollable);
    await tester.tap(find.text('해당').first);
    await tester.pump();
    await tester.scrollUntilVisible(find.textContaining('맞벌이 (본인과 배우자'), 300, scrollable: scrollable);
    expect(find.textContaining('맞벌이 (본인과 배우자'), findsOneWidget);
  });

  testWidgets('내 조건: 서버가 기준표를 주지 않아도 입력 화면은 동작한다', (tester) async {
    final meta = metaJson()..remove('standards');
    final repo = FakeHousingRepository(
      meta: HousingMeta.fromJson(meta),
      pages: [
        onePage([summaryJson()]),
      ],
    );
    // 입력 칸이 많아서, 화면 밖 칸은 아직 만들어지지 않는다. 전체가 한 화면에 들어오는 높이로 연다.
    await pumpApp(tester, repo, location: '/housing/profile', size: const Size(600, 3200));
    final scrollable = _formScrollable;

    await tester.scrollUntilVisible(find.byKey(const ValueKey('household-2')), 300, scrollable: scrollable);
    await tester.enterText(find.widgetWithText(TextField, '가구 월 소득 (세전, 가구원 전체 합계)'), '300');
    await tester.tap(find.byKey(const ValueKey('household-2')));
    await tester.pump();

    expect(find.byKey(const ValueKey('income-hint')), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('내 조건: 작은 폰과 최대 글꼴에서도 넘치지 않고, 맨 아래 저장 버튼까지 닿을 수 있다', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 3;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
    );
    await pumpApp(tester, repo, location: '/housing/profile', size: const Size(320, 480));
    expect(tester.takeException(), isNull);

    // 가구원수 칩(8개)이 여러 줄로 감겨도 넘치지 않는다
    await tester.dragUntilVisible(find.byKey(const ValueKey('household-8')), _formScrollable, const Offset(0, -200));
    expect(tester.takeException(), isNull);

    await tester.dragUntilVisible(find.text('저장'), _formScrollable, const Offset(0, -200));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(find.text('저장'), findsOneWidget);
    expect(find.text('모두 지우기'), findsOneWidget);
  });

  testWidgets('판정이 있는 공고는 배지를 보여준다', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([
          summaryJson(
            eligibility: {'verdict': 'eligible', 'verdictLabel': '신청 가능', 'reasons': <String>[], 'notes': <String>[]},
          ),
        ]),
      ],
    );
    await pumpApp(tester, repo, location: '/housing');

    expect(find.text('신청 가능'), findsOneWidget);
  });

  testWidgets('관심 공고: 북마크로 저장하면 관심 공고 화면에 보인다', (tester) async {
    final repo = FakeHousingRepository(
      pages: [
        onePage([summaryJson()]),
      ],
    );
    await pumpApp(tester, repo, location: '/housing');

    await tester.tap(find.byTooltip('관심 공고로 저장'));
    await tester.pumpAndSettle();
    expect(find.byTooltip('관심 공고에서 빼기'), findsOneWidget);

    await tester.tap(find.byTooltip('관심 공고'));
    await tester.pumpAndSettle();
    expect(find.text('저장한 관심 공고가 없습니다.'), findsNothing);
    expect(find.text('청년 행복주택 입주자 모집'), findsOneWidget);
  });

  testWidgets('관심 공고: 비어 있으면 안내를 보여준다', (tester) async {
    await pumpApp(tester, FakeHousingRepository(pages: [onePage([])]), location: '/housing/saved');
    expect(find.text('저장한 관심 공고가 없습니다.'), findsOneWidget);
  });
}
