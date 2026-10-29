import 'package:everything_about_youth/features/housing/domain/notice_list_state.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../support/fixtures.dart';

void main() {
  group('NoticeListState.fromPage', () {
    test('페이지 필드를 그대로 옮긴다', () {
      final page = NoticePage.fromJson(
        pageJson(items: [summaryJson(id: 'a')], total: 10, page: 2, totalPages: 5),
      );
      final state = NoticeListState.fromPage(page);
      expect(state.items.single.id, 'a');
      expect(state.total, 10);
      expect(state.page, 2);
      expect(state.totalPages, 5);
      expect(state.today, page.today);
      expect(state.hasMore, isTrue);
    });

    test('마지막 페이지면 hasMore 가 false', () {
      final page = NoticePage.fromJson(pageJson(items: [summaryJson()], page: 3, totalPages: 3));
      expect(NoticeListState.fromPage(page).hasMore, isFalse);
    });
  });

  group('NoticeListState.merged', () {
    test('다음 페이지를 이어 붙인다', () {
      final current = NoticeListState.fromPage(
        NoticePage.fromJson(pageJson(items: [summaryJson(id: 'a')], page: 1, totalPages: 2)),
      );
      final next = NoticePage.fromJson(
        pageJson(items: [summaryJson(id: 'b')], page: 2, totalPages: 2),
      );
      final merged = NoticeListState.merged(current, next);
      expect(merged.items.map((e) => e.id), ['a', 'b']);
      expect(merged.page, 2);
    });

    test('id 중복은 제거한다', () {
      final current = NoticeListState.fromPage(
        NoticePage.fromJson(pageJson(items: [summaryJson(id: 'a'), summaryJson(id: 'b')], page: 1, totalPages: 2)),
      );
      final next = NoticePage.fromJson(
        pageJson(items: [summaryJson(id: 'b'), summaryJson(id: 'c')], page: 2, totalPages: 2),
      );
      final merged = NoticeListState.merged(current, next);
      expect(merged.items.map((e) => e.id), ['a', 'b', 'c']);
    });
  });

  group('NoticeListState.copyWith', () {
    test('clearError 면 loadMoreError 를 지운다', () {
      const state = NoticeListState(
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

  group('NoticeListLoadMoreOutcome', () {
    test('stale / success / error 팩토리', () {
      const stale = NoticeListLoadMoreOutcome.stale();
      expect(stale.stale, isTrue);
      expect(stale.state, isNull);

      const ok = NoticeListState(items: [], total: 0, page: 1, totalPages: 1, today: 't');
      final success = NoticeListLoadMoreOutcome.success(ok);
      expect(success.stale, isFalse);
      expect(success.state, ok);

      const err = NoticeListLoadMoreOutcome.error('msg');
      expect(err.loadMoreError, 'msg');
      expect(err.stale, isFalse);
    });
  });
}
