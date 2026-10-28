import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/format.dart';
import '../../../../core/layout/app_bottom_sheet.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../../domain/housing_filters.dart';
import '../../domain/housing_meta.dart';
import '../housing_routes.dart';
import '../widgets/filter_panel.dart';
import '../widgets/filter_preset_chips.dart';
import '../widgets/notice_card.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_fonts.dart';

/// 이 너비 이상이면 필터를 왼쪽 사이드바로 보여준다. (웹/태블릿)
const double kWideLayoutWidth = 960;

class NoticeListPage extends ConsumerStatefulWidget {
  const NoticeListPage({super.key});

  @override
  ConsumerState<NoticeListPage> createState() => _NoticeListPageState();
}

class _NoticeListPageState extends ConsumerState<NoticeListPage> {
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scroll
      ..removeListener(_onScroll)
      ..dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scroll.hasClients) return;
    if (_scroll.position.pixels >= _scroll.position.maxScrollExtent - 480) {
      ref.read(noticeListProvider.notifier).loadMore();
    }
  }

  void _applyFilters(HousingFilters filters) {
    ref.read(filtersProvider.notifier).apply(filters);
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  Future<void> _openFilterSheet(HousingMeta meta) async {
    // 안전 영역(홈 인디케이터, 내비게이션바)과 키보드, 스크롤은 공통 바텀시트가 처리한다.
    await showAppBottomSheet<void>(
      context: context,
      builder: (sheetContext) => FilterPanel(
        meta: meta,
        initial: ref.read(filtersProvider),
        onApply: (filters) {
          Navigator.of(sheetContext).pop();
          _applyFilters(filters);
        },
        onReset: () => ref.read(filtersProvider.notifier).reset(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= kWideLayoutWidth;
    final filters = ref.watch(filtersProvider);
    final metaAsync = ref.watch(housingMetaProvider);
    final meta = metaAsync.value;

    final results = _Results(scroll: _scroll);

    return AppScaffold(
      appBar: AppTopBar(
        title: const Text('임대주택'),
        actions: [
          if (!wide)
            IconButton(
              tooltip: '필터',
              onPressed: meta == null ? null : () => _openFilterSheet(meta),
              icon: Badge(
                isLabelVisible: filters.activeCount > 0,
                label: Text('${filters.activeCount}'),
                child: const Icon(Icons.tune),
              ),
            ),
          IconButton(
            tooltip: '접수 일정',
            onPressed: () => context.push(HousingRoutes.schedule),
            icon: const Icon(Icons.calendar_month_outlined),
          ),
          IconButton(
            tooltip: '관심 공고',
            onPressed: () => context.push(HousingRoutes.saved),
            icon: const Icon(Icons.bookmarks_outlined),
          ),
          IconButton(
            tooltip: '내 조건',
            onPressed: () => context.push(HousingRoutes.profile),
            icon: const Icon(Icons.person_outline),
          ),
        ],
      ),
      body: wide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 340,
                  child: ColoredBox(
                    color: AppColors.surface,
                    child: metaAsync.when(
                      data: (m) => SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: FilterPanel(
                          // 정렬/자격 거르기만 바뀐 경우에는 편집 중인 입력을 지우지 않는다.
                          key: ValueKey(filters.copyWith(verdicts: const {}, sort: 'deadline')),
                          meta: m,
                          initial: filters,
                          onApply: _applyFilters,
                          onReset: () => ref.read(filtersProvider.notifier).reset(),
                        ),
                      ),
                      loading: () => const LoadingView(),
                      error: (e, _) =>
                          ErrorView(message: errorMessage(e), onRetry: () => ref.invalidate(housingMetaProvider)),
                    ),
                  ),
                ),
                const VerticalDivider(width: 1),
                Expanded(child: results),
              ],
            )
          : results,
    );
  }
}

class _Results extends ConsumerWidget {
  const _Results({required this.scroll});

  final ScrollController scroll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listAsync = ref.watch(noticeListProvider);

    return listAsync.when(
      loading: () => const LoadingView(message: '공고를 불러오는 중…'),
      error: (error, _) => ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(noticeListProvider)),
      data: (list) {
        return RefreshIndicator(
          onRefresh: () => ref.refresh(noticeListProvider.future),
          child: ListView.builder(
            controller: scroll,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            // 0: 머리글, 1..n: 공고, n+1: 바닥글
            itemCount: list.items.length + 2,
            itemBuilder: (context, index) {
              final Widget child;
              if (index == 0) {
                child = _Header(total: list.total);
              } else if (index == list.items.length + 1) {
                child = _Footer(list: list);
              } else {
                child = Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: NoticeCard(notice: list.items[index - 1]),
                );
              }
              return Align(
                alignment: Alignment.topCenter,
                child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 900), child: child),
              );
            },
          ),
        );
      },
    );
  }
}

class _Header extends ConsumerWidget {
  const _Header({required this.total});

  final int total;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(filtersProvider);
    final profile = ref.watch(profileProvider);
    final meta = ref.watch(housingMetaProvider).value;
    final scheme = Theme.of(context).colorScheme;
    final onlyEligible = filters.verdicts.length == 1 && filters.verdicts.contains('eligible');

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                onlyEligible ? '신청 가능한 공고' : '공고 목록',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: AppFonts.bold),
              ),
              const SizedBox(width: 8),
              Text(
                '${formatCount(total)}건',
                style: TextStyle(color: scheme.primary, fontWeight: AppFonts.bold),
              ),
            ],
          ),
          if (formatUpdatedAt(meta?.dataUpdatedAt) != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(formatUpdatedAt(meta!.dataUpdatedAt)!, style: TextStyle(fontSize: 12, color: scheme.outline)),
            ),
          const SizedBox(height: 4),
          const HousingFilterPresetChips(),
          const SizedBox(height: 10),
          Card(
            color: scheme.primaryContainer.withValues(alpha: 0.35),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  Icon(Icons.person_outline, size: 20, color: scheme.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      profile.isEmpty ? '"내 조건"을 입력하면 신청 가능 여부를 판정합니다.' : '내 조건: ${profile.summary}',
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  TextButton(
                    onPressed: () => context.push(HousingRoutes.profile),
                    child: Text(profile.isEmpty ? '입력하기' : '수정'),
                  ),
                ],
              ),
            ),
          ),
          if (!profile.isEmpty && meta != null) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text('자격 판정으로 거르기', style: TextStyle(fontSize: 12, color: scheme.outline)),
                for (final v in meta.verdicts)
                  FilterChip(
                    label: Text(v.label),
                    selected: filters.verdicts.contains(v.value),
                    visualDensity: VisualDensity.compact,
                    onSelected: (on) {
                      final next = {...filters.verdicts};
                      on ? next.add(v.value) : next.remove(v.value);
                      ref.read(filtersProvider.notifier).setVerdicts(next);
                    },
                  ),
              ],
            ),
          ],
          if (meta != null && meta.sorts.isNotEmpty) ...[
            const SizedBox(height: 10),
            SegmentedButton<String>(
              showSelectedIcon: false,
              style: const ButtonStyle(visualDensity: VisualDensity.compact),
              segments: [for (final s in meta.sorts) ButtonSegment(value: s.value, label: Text(s.label))],
              selected: {filters.sort},
              onSelectionChanged: (s) => ref.read(filtersProvider.notifier).setSort(s.first),
            ),
          ],
        ],
      ),
    );
  }
}

class _Footer extends ConsumerWidget {
  const _Footer({required this.list});

  final NoticeListState list;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;

    if (list.items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: EmptyView(message: '조건에 맞는 공고가 없습니다.', hint: '필터를 완화해 보세요.'),
      );
    }
    if (list.loadingMore) {
      return const InlineLoading();
    }
    if (list.loadMoreError != null) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(list.loadMoreError!, textAlign: TextAlign.center),
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: () => ref.read(noticeListProvider.notifier).loadMore(),
              child: const Text('다시 시도'),
            ),
          ],
        ),
      );
    }
    if (list.hasMore) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: OutlinedButton(
            onPressed: () => ref.read(noticeListProvider.notifier).loadMore(),
            child: const Text('더 보기'),
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 16, 0, 32),
      child: Text(
        '자격 판정은 일반 기준에 따른 참고용이며, 신청 전 반드시 원문 공고를 확인하세요.',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12, color: scheme.outline),
      ),
    );
  }
}
