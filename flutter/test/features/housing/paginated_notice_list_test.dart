import 'dart:async';

import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/housing_filters.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/paginated_notice_list.dart';
import 'package:everything_about_youth/features/housing/domain/use_cases/search_notices.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

NoticePage _page(List<String> ids, {int pageNo = 1, int totalPages = 2}) => NoticePage.fromJson(
  pageJson(
    items: [for (final id in ids) summaryJson(id: id, title: '공고 $id')],
    page: pageNo,
    totalPages: totalPages,
  ),
);

void main() {
  group('PaginatedNoticeListUseCase', () {
    test('loadFirstPage: generation 을 올리고 상태를 만든다', () async {
      final repo = FakeHousingRepository(pages: [_page(['a'])]);
      final uc = PaginatedNoticeListUseCase(SearchNoticesUseCase(repo));
      expect(uc.queryGeneration, 0);
      final state = await uc.loadFirstPage(filters: HousingFilters.initial, profile: ApplicantProfile.empty);
      expect(uc.queryGeneration, 1);
      expect(state.items.single.id, 'a');
    });

    test('loadNextPage: 성공 시 merged 상태', () async {
      final repo = FakeHousingRepository(pages: [_page(['a']), _page(['b'], pageNo: 2)]);
      final uc = PaginatedNoticeListUseCase(SearchNoticesUseCase(repo));
      final first = await uc.loadFirstPage(filters: HousingFilters.initial, profile: ApplicantProfile.empty);
      final outcome = await uc.loadNextPage(
        capturedGeneration: uc.queryGeneration,
        current: first,
        filters: HousingFilters.initial,
        profile: ApplicantProfile.empty,
      );
      expect(outcome.stale, isFalse);
      expect(outcome.state!.items.map((e) => e.id), ['a', 'b']);
    });

    test('loadNextPage: hasMore 가 false 면 stale', () async {
      final repo = FakeHousingRepository(pages: [_page(['a'], totalPages: 1)]);
      final uc = PaginatedNoticeListUseCase(SearchNoticesUseCase(repo));
      final first = await uc.loadFirstPage(filters: HousingFilters.initial, profile: ApplicantProfile.empty);
      final outcome = await uc.loadNextPage(
        capturedGeneration: uc.queryGeneration,
        current: first,
        filters: HousingFilters.initial,
        profile: ApplicantProfile.empty,
      );
      expect(outcome.stale, isTrue);
    });

    test('loadNextPage: search 실패면 error outcome', () async {
      late FakeHousingRepository repo;
      repo = FakeHousingRepository(
        pages: [_page(['a']), _page(['b'], pageNo: 2)],
        searchHook: (_, page) {
          if (page == 2) throw Exception('network');
          return Future.value(repo.pages[0]);
        },
      );
      final uc = PaginatedNoticeListUseCase(SearchNoticesUseCase(repo));
      final first = await uc.loadFirstPage(filters: HousingFilters.initial, profile: ApplicantProfile.empty);
      final outcome = await uc.loadNextPage(
        capturedGeneration: uc.queryGeneration,
        current: first,
        filters: HousingFilters.initial,
        profile: ApplicantProfile.empty,
      );
      expect(outcome.loadMoreError, '알 수 없는 오류가 발생했습니다.');
    });

    test('늦게 도착한 추가 페이지는 버린다', () async {
    final gate = Completer<NoticePage>();
    final repo = FakeHousingRepository(
      pages: [
        _page(['a']),
        _page(['b'], pageNo: 2),
      ],
    );
    repo.searchHook = (_, page) {
      if (page == 2) return gate.future;
      return Future.value(repo.pages[page - 1]);
    };

    final uc = PaginatedNoticeListUseCase(SearchNoticesUseCase(repo));
    final first = await uc.loadFirstPage(filters: HousingFilters.initial, profile: ApplicantProfile.empty);
    final gen = uc.queryGeneration;

    final pending = uc.loadNextPage(
      capturedGeneration: gen,
      current: first,
      filters: HousingFilters.initial,
      profile: ApplicantProfile.empty,
    );

    await uc.loadFirstPage(filters: HousingFilters.initial, profile: ApplicantProfile.empty);
    gate.complete(_page(['stale'], pageNo: 2));

    expect((await pending).stale, isTrue);
    });
  });
}
