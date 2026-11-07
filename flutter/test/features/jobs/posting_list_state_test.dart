import 'package:everything_about_youth/features/jobs/domain/posting_list_state.dart';
import 'package:everything_about_youth/features/jobs/domain/job_posting.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/jobs_fixtures.dart';

void main() {
  group('PostingListState.fromPage', () {
    test('마지막 페이지면 hasMore 가 false', () {
      final page = PostingPage.fromJson(postingPageJson(items: [postingSummaryJson()], page: 3, totalPages: 3));
      expect(PostingListState.fromPage(page).hasMore, isFalse);
    });

    test('페이지 필드를 그대로 옮긴다', () {
      final page = PostingPage.fromJson(
        postingPageJson(items: [postingSummaryJson(id: 'a')], total: 10, page: 2, totalPages: 5),
      );
      final state = PostingListState.fromPage(page);
      expect(state.items.single.id, 'a');
      expect(state.total, 10);
      expect(state.page, 2);
      expect(state.totalPages, 5);
      expect(state.today, page.today);
      expect(state.hasMore, isTrue);
    });
  });

  group('PostingListState.merged', () {
    test('다음 페이지를 이어 붙인다', () {
      final current = PostingListState.fromPage(
        PostingPage.fromJson(postingPageJson(items: [postingSummaryJson(id: 'a')], page: 1, totalPages: 2)),
      );
      final next = PostingPage.fromJson(
        postingPageJson(items: [postingSummaryJson(id: 'b')], page: 2, totalPages: 2),
      );
      final merged = PostingListState.merged(current, next);
      expect(merged.items.map((e) => e.id), ['a', 'b']);
      expect(merged.page, 2);
    });

    test('id 중복은 제거한다', () {
      final current = PostingListState.fromPage(
        PostingPage.fromJson(postingPageJson(items: [postingSummaryJson(id: 'a'), postingSummaryJson(id: 'b')], page: 1, totalPages: 2)),
      );
      final next = PostingPage.fromJson(
        postingPageJson(items: [postingSummaryJson(id: 'b'), postingSummaryJson(id: 'c')], page: 2, totalPages: 2),
      );
      final merged = PostingListState.merged(current, next);
      expect(merged.items.map((e) => e.id), ['a', 'b', 'c']);
    });
  });

  group('PostingListState.copyWith', () {
    test('clearError 면 loadMoreError 를 지운다', () {
      const state = PostingListState(
        items: [],
        total: 0,
        page: 1,
        totalPages: 1,
        today: '2026-10-13',
        loadMoreError: '실패',
      );
      expect(state.copyWith(clearError: true).loadMoreError, isNull);
      expect(state.copyWith(loadMoreError: '다른').loadMoreError, '다른');
    });
  });

  group('PostingListLoadMoreOutcome', () {
    test('stale / success / error 팩토리', () {
      const stale = PostingListLoadMoreOutcome.stale();
      expect(stale.stale, isTrue);
      expect(stale.state, isNull);

      const ok = PostingListState(items: [], total: 0, page: 1, totalPages: 1, today: 't');
      final success = PostingListLoadMoreOutcome.success(ok);
      expect(success.stale, isFalse);
      expect(success.state, ok);

      const err = PostingListLoadMoreOutcome.error('msg');
      expect(err.loadMoreError, 'msg');
      expect(err.stale, isFalse);
    });
  });
}
