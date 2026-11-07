import 'dart:async';

import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/jobs/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/jobs/domain/jobs_filters.dart';
import 'package:everything_about_youth/features/jobs/domain/job_posting.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/paginated_posting_list.dart';
import 'package:everything_about_youth/features/jobs/domain/use_cases/search_job_postings.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/jobs_fixtures.dart';

PostingPage _page(List<String> ids, {int pageNo = 1, int totalPages = 2}) => PostingPage.fromJson(
  postingPageJson(
    items: [for (final id in ids) postingSummaryJson(id: id, title: '공고 $id')],
    page: pageNo,
    totalPages: totalPages,
  ),
);

void main() {
  group('PaginatedPostingListUseCase', () {
    test('loadFirstPage: search 실패는 전파', () {
      final repo = FakeJobsRepository(searchError: const ApiException('first fail'));
      final uc = PaginatedPostingListUseCase(SearchJobPostingsUseCase(repo));
      expect(
        uc.loadFirstPage(filters: JobsFilters.initial, profile: ApplicantProfile.empty),
        throwsA(isA<ApiException>()),
      );
    });

    test('loadNextPage: search 실패면 error outcome', () async {
      late FakeJobsRepository repo;
      repo = FakeJobsRepository(
        pages: [_page(['a']), _page(['b'], pageNo: 2)],
        searchHook: (_, page) {
          if (page == 2) throw Exception('network');
          return Future.value(repo.pages[0]);
        },
      );
      final uc = PaginatedPostingListUseCase(SearchJobPostingsUseCase(repo));
      final first = await uc.loadFirstPage(filters: JobsFilters.initial, profile: ApplicantProfile.empty);
      final outcome = await uc.loadNextPage(
        capturedGeneration: uc.queryGeneration,
        current: first,
        filters: JobsFilters.initial,
        profile: ApplicantProfile.empty,
      );
      expect(outcome.loadMoreError, '알 수 없는 오류가 발생했습니다.');
    });

    test('loadNextPage: hasMore 가 false 면 stale', () async {
      final repo = FakeJobsRepository(pages: [_page(['a'], totalPages: 1)]);
      final uc = PaginatedPostingListUseCase(SearchJobPostingsUseCase(repo));
      final first = await uc.loadFirstPage(filters: JobsFilters.initial, profile: ApplicantProfile.empty);
      final outcome = await uc.loadNextPage(
        capturedGeneration: uc.queryGeneration,
        current: first,
        filters: JobsFilters.initial,
        profile: ApplicantProfile.empty,
      );
      expect(outcome.stale, isTrue);
    });

    test('loadNextPage: 잘못된 generation 이면 stale', () async {
      final repo = FakeJobsRepository(pages: [_page(['a']), _page(['b'], pageNo: 2)]);
      final uc = PaginatedPostingListUseCase(SearchJobPostingsUseCase(repo));
      final first = await uc.loadFirstPage(filters: JobsFilters.initial, profile: ApplicantProfile.empty);
      final outcome = await uc.loadNextPage(
        capturedGeneration: uc.queryGeneration - 1,
        current: first,
        filters: JobsFilters.initial,
        profile: ApplicantProfile.empty,
      );
      expect(outcome.stale, isTrue);
    });

    test('늦게 도착한 추가 페이지는 버린다', () async {
      final gate = Completer<PostingPage>();
      final repo = FakeJobsRepository(
        pages: [
          _page(['a']),
          _page(['b'], pageNo: 2),
        ],
      );
      repo.searchHook = (_, page) {
        if (page == 2) return gate.future;
        return Future.value(repo.pages[page - 1]);
      };

      final uc = PaginatedPostingListUseCase(SearchJobPostingsUseCase(repo));
      final first = await uc.loadFirstPage(filters: JobsFilters.initial, profile: ApplicantProfile.empty);
      final gen = uc.queryGeneration;

      final pending = uc.loadNextPage(
        capturedGeneration: gen,
        current: first,
        filters: JobsFilters.initial,
        profile: ApplicantProfile.empty,
      );

      await uc.loadFirstPage(filters: JobsFilters.initial, profile: ApplicantProfile.empty);
      gate.complete(_page(['stale'], pageNo: 2));

      expect((await pending).stale, isTrue);
    });

    test('loadFirstPage: generation 을 올리고 상태를 만든다', () async {
      final repo = FakeJobsRepository(pages: [_page(['a'])]);
      final uc = PaginatedPostingListUseCase(SearchJobPostingsUseCase(repo));
      expect(uc.queryGeneration, 0);
      final state = await uc.loadFirstPage(filters: JobsFilters.initial, profile: ApplicantProfile.empty);
      expect(uc.queryGeneration, 1);
      expect(state.items.single.id, 'a');
    });

    test('loadNextPage: 성공 시 merged 상태', () async {
      final repo = FakeJobsRepository(pages: [_page(['a']), _page(['b'], pageNo: 2)]);
      final uc = PaginatedPostingListUseCase(SearchJobPostingsUseCase(repo));
      final first = await uc.loadFirstPage(filters: JobsFilters.initial, profile: ApplicantProfile.empty);
      final outcome = await uc.loadNextPage(
        capturedGeneration: uc.queryGeneration,
        current: first,
        filters: JobsFilters.initial,
        profile: ApplicantProfile.empty,
      );
      expect(outcome.stale, isFalse);
      expect(outcome.state!.items.map((e) => e.id), ['a', 'b']);
    });
  });
}
