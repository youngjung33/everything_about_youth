import 'dart:async';

import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finders.dart';
import '../support/fixtures.dart';
import '../support/pump_app.dart';

NoticePage onePage(List<Map<String, dynamic>> items) => NoticePage.fromJson(pageJson(items: items));

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
    expect(find.text('강남 A단지'), findsOneWidget);
    expect(find.text('16A'), findsOneWidget);
    expect(find.text('500만원'), findsNothing); // 5,000만원이어야 한다
    expect(find.text('5,000만원'), findsOneWidget);
    expect(find.text('문의: 1600-1004'), findsOneWidget);
    expect(find.textContaining('LH청약플러스'), findsWidgets);

    // 목록은 화면에 보이는 만큼만 그려지므로 맨 아래 버튼은 스크롤해서 찾는다.
    // (헤더의 가로 메뉴 스크롤이 아니라 본문 ListView 의 스크롤)
    final bodyScrollable = find.descendant(of: find.byType(ListView), matching: find.byType(Scrollable)).first;
    await tester.scrollUntilVisible(find.text('원문 공고 보기'), 300, scrollable: bodyScrollable);
    expect(find.text('원문 공고 보기'), findsOneWidget);
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
    await tester.tap(find.text('저장'));
    await tester.pumpAndSettle();

    expect(find.text('내 조건: 만 29세 · 무주택'), findsOneWidget);
    expect(find.text('자격 판정으로 거르기'), findsOneWidget);
    expect(repo.searchCalls.last.profile.age, 29);
    expect(repo.searchCalls.last.profile.isHomeless, isTrue);
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
}
