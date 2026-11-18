import 'dart:async';

import 'package:everything_about_youth/core/copy/service_copy.dart';
import 'package:everything_about_youth/core/design/service_accent.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/core/network/api_user_message.dart';
import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/living/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/living/domain/living_guide.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finders.dart';
import '../support/living_fixtures.dart';
import '../support/pump_living_app.dart';

GuidePage onePage(List<Map<String, dynamic>> items) => GuidePage.fromJson(guidePageJson(items: items));

Finder get _profileScrollable => find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;

class _SlowDetailRepository extends FakeLivingRepository {
  _SlowDetailRepository(this._detail);

  final Future<GuideDetail> _detail;

  @override
  Future<GuideDetail> getGuide(String id, {required ApplicantProfile profile}) => _detail;
}

void main() {
  testWidgets('홈에서 이사·생활을 선택해 들어가고, 뒤로가기로 홈에 돌아온다', (tester) async {
    final repo = FakeLivingRepository(pages: [onePage([guideSummaryJson()])]);
    await pumpLivingApp(tester, repo);

    expect(homeText('청년의 모든 것'), findsOneWidget);
    await tester.tap(homeText('이사·생활'));
    await tester.pumpAndSettle();

    expect(find.text('전입신고 안내'), findsOneWidget);

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(homeText('청년의 모든 것'), findsOneWidget);
    expect(find.text('전입신고 안내'), findsNothing);
  });

  testWidgets('공용 로딩: 목록을 불러오는 동안 메시지가 보이고 끝나면 사라진다', (tester) async {
    final gate = Completer<GuidePage>();
    final repo = FakeLivingRepository()..searchHook = (_, _) => gate.future;
    await pumpLivingApp(tester, repo, location: '/living', settle: false);

    expect(find.text('안내를 불러오는 중…'), findsOneWidget);
    expect(find.byType(LoadingView), findsOneWidget);

    gate.complete(onePage([guideSummaryJson()]));
    await tester.pumpAndSettle();

    expect(find.byType(LoadingView), findsNothing);
    expect(find.text('전입신고 안내'), findsOneWidget);
  });

  testWidgets('공용 로딩: 상세를 불러오는 동안 메시지가 보인다', (tester) async {
    final gate = Completer<GuideDetail>();
    await pumpLivingApp(tester, _SlowDetailRepository(gate.future), location: '/living/guides/b1', settle: false);

    expect(find.text('안내 상세를 불러오는 중…'), findsOneWidget);

    gate.complete(GuideDetail.fromJson(guideDetailJson()));
    await tester.pumpAndSettle();
    expect(find.byType(LoadingView), findsNothing);
    expect(find.text('안내 개요'), findsOneWidget);
  });

  testWidgets('목록: 카드에 제목·상태·지역이 보인다 (넓은 화면은 필터 사이드바)', (tester) async {
    await pumpLivingApp(tester, FakeLivingRepository(pages: [onePage([guideSummaryJson()])]), location: '/living');

    expect(find.text('안내 목록'), findsOneWidget);
    expect(find.text('2026.10.12 10:00 갱신'), findsOneWidget);
    expect(find.text('전입신고 안내'), findsOneWidget);
    expect(find.text('진행중'), findsWidgets);
    expect(find.text('서울'), findsWidgets);
    expect(find.text('검색'), findsWidgets);
  });

  testWidgets('목록: 결과가 없으면 안내를 보여준다', (tester) async {
    await pumpLivingApp(tester, FakeLivingRepository(pages: [onePage([])]), location: '/living');
    expect(find.text('조건에 맞는 안내가 없습니다.'), findsOneWidget);
  });

  testWidgets('목록: 오류가 나면 메시지와 다시 시도 버튼, 복구 후 목록', (tester) async {
    final repo = FakeLivingRepository(
      pages: [onePage([guideSummaryJson()])],
      searchError: const ApiException(ApiUserMessages.networkUnavailable, code: ApiErrorCode.networkError),
    );
    await pumpLivingApp(tester, repo, location: '/living');

    expect(find.text(ApiUserMessages.networkUnavailable), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);

    repo.searchError = null;
    await tester.tap(find.text('다시 시도'));
    await tester.pumpAndSettle();

    expect(find.text('전입신고 안내'), findsOneWidget);
  });

  testWidgets('목록: 좁은 화면에서는 필터가 바텀시트로 열린다', (tester) async {
    await pumpLivingApp(
      tester,
      FakeLivingRepository(pages: [onePage([guideSummaryJson()])]),
      location: '/living',
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

  testWidgets('내 조건을 저장하면 요약이 보이고 판정 거르기 칩이 나타난다', (tester) async {
    final repo = FakeLivingRepository(pages: [onePage([guideSummaryJson()])]);
    await pumpLivingApp(tester, repo, location: '/living');

    expect(find.textContaining('참고 판정을 제공합니다'), findsOneWidget);
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

  testWidgets('내 조건: 기준표(meta standards) 없어도 입력 화면은 동작한다', (tester) async {
    await pumpLivingApp(
      tester,
      FakeLivingRepository(pages: [onePage([guideSummaryJson()])]),
      location: '/living/profile',
      size: const Size(600, 3200),
    );
    await tester.tap(find.byKey(const ValueKey('household-2')));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('내 조건: 신혼부부로 답했을 때만 맞벌이를 묻는다', (tester) async {
    await pumpLivingApp(
      tester,
      FakeLivingRepository(pages: [onePage([guideSummaryJson()])]),
      location: '/living/profile',
      size: const Size(600, 3200),
    );
    final scrollable = _profileScrollable;
    await tester.scrollUntilVisible(find.text('신혼부부 (혼인 7년 이내)'), 300, scrollable: scrollable);
    await tester.tap(find.text('해당').first);
    await tester.pump();
    await tester.scrollUntilVisible(find.textContaining('맞벌이 (본인과 배우자'), 300, scrollable: scrollable);
    expect(find.textContaining('맞벌이 (본인과 배우자'), findsOneWidget);
  });

  testWidgets('내 조건: 거주 시·도를 고를 수 있다', (tester) async {
    await pumpLivingApp(
      tester,
      FakeLivingRepository(pages: [onePage([guideSummaryJson()])]),
      location: '/living/profile',
      size: const Size(600, 2000),
    );
    await tester.scrollUntilVisible(find.text('현재 거주 시·도'), 300, scrollable: _profileScrollable);
    await tester.pumpAndSettle();
    await tester.tap(find.byType(DropdownButtonFormField<String?>));
    await tester.pumpAndSettle();
    await tester.tap(find.text('서울').last);
    await tester.pump();
    expect(tester.takeException(), isNull);
  });

  testWidgets('내 조건: 작은 폰과 최대 글꼴에서도 저장 버튼까지 닿을 수 있다', (tester) async {
    tester.platformDispatcher.textScaleFactorTestValue = 3;
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await pumpLivingApp(
      tester,
      FakeLivingRepository(pages: [onePage([guideSummaryJson()])]),
      location: '/living/profile',
      size: const Size(320, 480),
    );
    await tester.dragUntilVisible(find.text('저장'), _profileScrollable, const Offset(0, -200));
    expect(find.text('저장'), findsOneWidget);
  });

  testWidgets('판정이 있는 안내는 배지를 보여준다', (tester) async {
    await pumpLivingApp(
      tester,
      FakeLivingRepository(
        pages: [
          onePage([
            guideSummaryJson(
              eligibility: {
                'verdict': 'eligible',
                'verdictLabel': '신청 가능',
                'reasons': <String>[],
                'notes': <String>[],
              },
            ),
          ]),
        ],
      ),
      location: '/living',
    );
    expect(find.text('신청 가능'), findsOneWidget);
  });

  testWidgets('상세: 없는 안내는 오류 문구', (tester) async {
    await pumpLivingApp(tester, FakeLivingRepository(), location: '/living/guides/none');
    expect(find.text('안내를 찾을 수 없습니다.'), findsOneWidget);
  });

  testWidgets('상세: 카드를 누르면 체크리스트 단계가 보인다', (tester) async {
    final repo = FakeLivingRepository(
      pages: [onePage([guideSummaryJson()])],
      detail: GuideDetail.fromJson(guideDetailJson()),
    );
    await pumpLivingApp(tester, repo, location: '/living');

    await tester.tap(find.text('전입신고 안내'));
    await tester.pumpAndSettle();

    expect(find.text('안내 상세'), findsOneWidget);
    expect(find.text('진행 단계'), findsOneWidget);
    expect(find.text('1. 준비'), findsOneWidget);
    expect(find.text('서류 확인'), findsOneWidget);
    final bodyScrollable = find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;
    await tester.scrollUntilVisible(find.text('출처'), 300, scrollable: bodyScrollable);
    expect(find.text(ServiceCopy.officialPolicyButtonLabel), findsOneWidget);
    expect(find.text('마감일 캘린더'), findsOneWidget);
  });

  testWidgets('일정: 접수 일정이 없으면 안내를 보여준다', (tester) async {
    await pumpLivingApp(tester, FakeLivingRepository(pages: [onePage([])]), location: '/living/schedule');
    expect(find.text(ServiceAccent.living.scheduleEmptyMessage), findsOneWidget);
  });

  testWidgets('관심 안내: 비어 있으면 안내를 보여준다', (tester) async {
    await pumpLivingApp(tester, FakeLivingRepository(pages: [onePage([])]), location: '/living/saved');
    expect(find.text(ServiceAccent.living.savedEmptyMessage), findsOneWidget);
  });

  testWidgets('관심 안내: 북마크로 저장하면 관심 안내 화면에 보인다', (tester) async {
    await pumpLivingApp(tester, FakeLivingRepository(pages: [onePage([guideSummaryJson()])]), location: '/living');

    final accent = ServiceAccent.living;
    await tester.tap(find.byTooltip(accent.savedBookmarkTooltip(saved: false)));
    await tester.pumpAndSettle();
    expect(find.byTooltip(accent.savedBookmarkTooltip(saved: true)), findsOneWidget);

    await tester.tap(find.text(accent.savedQuickActionLabel));
    await tester.pumpAndSettle();
    expect(find.text(accent.savedEmptyMessage), findsNothing);
    expect(find.text('전입신고 안내'), findsOneWidget);
  });
}
