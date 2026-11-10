import 'dart:async';

import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/network/api_error_code.dart';
import 'package:everything_about_youth/core/network/api_user_message.dart';
import 'package:everything_about_youth/core/widgets/state_views.dart';
import 'package:everything_about_youth/features/jobs/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/jobs/domain/job_posting.dart';
import 'package:flutter_test/flutter_test.dart';

import '../support/finders.dart';
import '../support/jobs_fixtures.dart';
import '../support/pump_jobs_app.dart';

PostingPage onePage(List<Map<String, dynamic>> items) => PostingPage.fromJson(postingPageJson(items: items));

class _SlowDetailRepository extends FakeJobsRepository {
  _SlowDetailRepository(this._detail);

  final Future<PostingDetail> _detail;

  @override
  Future<PostingDetail> getPosting(String id, {required ApplicantProfile profile}) => _detail;
}

void main() {
  testWidgets('홈에서 일자리를 선택해 들어가고, 뒤로가기로 홈에 돌아온다', (tester) async {
    final repo = FakeJobsRepository(
      pages: [
        onePage([postingSummaryJson()]),
      ],
    );
    await pumpJobsApp(tester, repo);

    expect(homeText('청년의 모든 것'), findsOneWidget);
    await tester.tap(homeText('청년·공공 일자리'));
    await tester.pumpAndSettle();

    expect(find.text('청년 인턴 채용'), findsOneWidget);

    await tester.tap(find.byTooltip('Back'));
    await tester.pumpAndSettle();
    expect(homeText('청년의 모든 것'), findsOneWidget);
    expect(find.text('청년 인턴 채용'), findsNothing);
  });

  testWidgets('공용 로딩: 목록을 불러오는 동안 메시지가 보이고 끝나면 사라진다', (tester) async {
    final gate = Completer<PostingPage>();
    final repo = FakeJobsRepository()..searchHook = (_, _) => gate.future;
    await pumpJobsApp(tester, repo, location: '/jobs', settle: false);

    expect(find.text('공고를 불러오는 중…'), findsOneWidget);
    expect(find.byType(LoadingView), findsOneWidget);

    gate.complete(onePage([postingSummaryJson()]));
    await tester.pumpAndSettle();

    expect(find.byType(LoadingView), findsNothing);
    expect(find.text('청년 인턴 채용'), findsOneWidget);
  });

  testWidgets('공용 로딩: 상세를 불러오는 동안 메시지가 보인다', (tester) async {
    final gate = Completer<PostingDetail>();
    final repo = _SlowDetailRepository(gate.future);
    await pumpJobsApp(tester, repo, location: '/jobs/postings/b1', settle: false);

    expect(find.text('공고 상세를 불러오는 중…'), findsOneWidget);

    gate.complete(PostingDetail.fromJson(postingDetailJson()));
    await tester.pumpAndSettle();
    expect(find.byType(LoadingView), findsNothing);
    expect(find.text('공고 상세'), findsOneWidget);
  });

  testWidgets('목록: 카드에 제목·유형·지역이 보인다 (넓은 화면은 필터 사이드바)', (tester) async {
    final repo = FakeJobsRepository(
      pages: [
        onePage([postingSummaryJson()]),
      ],
    );
    await pumpJobsApp(tester, repo, location: '/jobs');

    expect(find.text('공고 목록'), findsOneWidget);
    expect(find.text('2026.10.12 10:00 갱신'), findsOneWidget);
    expect(find.text('청년 인턴 채용'), findsOneWidget);
    expect(find.text('신청중'), findsWidgets);
    expect(find.text('서울'), findsWidgets);
    expect(find.text('검색'), findsWidgets);
  });

  testWidgets('목록: 결과가 없으면 안내를 보여준다', (tester) async {
    final repo = FakeJobsRepository(pages: [onePage([])]);
    await pumpJobsApp(tester, repo, location: '/jobs');

    expect(find.text('조건에 맞는 공고가 없습니다.'), findsOneWidget);
  });

  testWidgets('목록: 오류가 나면 메시지와 다시 시도 버튼, 복구 후 목록', (tester) async {
    final repo = FakeJobsRepository(
      pages: [
        onePage([postingSummaryJson()]),
      ],
      searchError: const ApiException(ApiUserMessages.networkUnavailable, code: ApiErrorCode.networkError),
    );
    await pumpJobsApp(tester, repo, location: '/jobs');

    expect(find.text(ApiUserMessages.networkUnavailable), findsOneWidget);
    expect(find.text('다시 시도'), findsOneWidget);

    repo.searchError = null;
    await tester.tap(find.text('다시 시도'));
    await tester.pumpAndSettle();

    expect(find.text('청년 인턴 채용'), findsOneWidget);
  });
}
