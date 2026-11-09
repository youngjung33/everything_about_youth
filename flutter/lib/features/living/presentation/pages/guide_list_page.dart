import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/copy/service_copy.dart';
import '../../../../core/format/format.dart';
import '../../../../core/layout/app_bottom_sheet.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../providers.dart';
import '../../domain/living_filters.dart';
import '../../domain/living_meta.dart';
import '../../domain/guide_list_state.dart';
import '../living_routes.dart';
import '../widgets/filter_panel.dart';
import '../widgets/filter_preset_chips.dart';
import '../widgets/guide_card.dart';
import '../../../../core/design/service_accent.dart';
import '../../../../core/widgets/service_intro_banner.dart';
import '../../../../core/widgets/service_quick_actions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_fonts.dart';

/// 이 너비 이상이면 필터를 왼쪽 사이드바로 보여준다. (웹/태블릿)
const double kWideLayoutWidth = 960;
const _accent = ServiceAccent.living;

class GuideListPage extends ConsumerStatefulWidget {
  const GuideListPage({super.key});

  @override
  ConsumerState<GuideListPage> createState() => _GuideListPageState();
}

class _GuideListPageState extends ConsumerState<GuideListPage> {
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
      ref.read(guideListProvider.notifier).loadMore();
    }
  }

  void _applyFilters(LivingFilters filters) {
    ref.read(filtersProvider.notifier).apply(filters);
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  Future<void> _openFilterSheet(LivingMeta meta) async {
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
    final metaAsync = ref.watch(livingMetaProvider);
    final meta = metaAsync.value;

    final results = _Results(scroll: _scroll);

    return AppScaffold(
      appBar: AppTopBar(
        title: Text(_accent.title),
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
                          ErrorView(message: errorMessage(e), onRetry: () => ref.invalidate(livingMetaProvider)),
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
    final listAsync = ref.watch(guideListProvider);

    return listAsync.when(
      loading: () => LoadingView(message: _accent.listLoadingMessage),
      error: (error, _) => ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(guideListProvider)),
      data: (list) {
        return RefreshIndicator(
          onRefresh: () => ref.refresh(guideListProvider.future),
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
                  child: GuideCard(guide: list.items[index - 1]),
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

  static Future<void> openFilterSheet(BuildContext context, WidgetRef ref, LivingMeta meta) async {
    await showAppBottomSheet<void>(
      context: context,
      builder: (sheetContext) => FilterPanel(
        meta: meta,
        initial: ref.read(filtersProvider),
        onApply: (filters) {
          Navigator.of(sheetContext).pop();
          ref.read(filtersProvider.notifier).apply(filters);
        },
        onReset: () => ref.read(filtersProvider.notifier).reset(),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filters = ref.watch(filtersProvider);
    final profile = ref.watch(profileProvider);
    final meta = ref.watch(livingMetaProvider).value;
    final scheme = Theme.of(context).colorScheme;
    final onlyEligible = filters.verdicts.length == 1 && filters.verdicts.contains('eligible');

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const ServiceIntroBanner(accent: _accent),
          const SizedBox(height: 12),
          ServiceQuickActions(
            accent: _accent.accent,
            actions: [
              ServiceQuickAction(
                label: '접수 일정',
                icon: Icons.calendar_month_outlined,
                onPressed: () => context.push(LivingRoutes.schedule),
              ),
              ServiceQuickAction(
                label: '관심 안내',
                icon: Icons.bookmarks_outlined,
                onPressed: () => context.push(LivingRoutes.saved),
              ),
              if (MediaQuery.sizeOf(context).width < kWideLayoutWidth)
                ServiceQuickAction(
                  label: '필터',
                  icon: Icons.tune,
                  badge: filters.activeCount > 0 ? '${filters.activeCount}' : null,
                  onPressed: meta == null
                      ? null
                      : () => _Header.openFilterSheet(context, ref, meta),
                ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                _accent.listHeaderTitle(onlyEligible: onlyEligible),
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
          const LivingFilterPresetChips(),
          const SizedBox(height: 10),
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

  final GuideListState list;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;

    if (list.items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: EmptyView(
          message: _accent.emptyListMessage,
          hint: '필터를 완화하거나 프리셋을 바꿔 보세요.',
          actionLabel: '필터 초기화',
          onAction: () => ref.read(filtersProvider.notifier).reset(),
        ),
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
              onPressed: () => ref.read(guideListProvider.notifier).loadMore(),
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
            onPressed: () => ref.read(guideListProvider.notifier).loadMore(),
            child: const Text('더 보기'),
          ),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 16, 0, 32),
      child: Text(
        ServiceCopy.listEligibilityHint,
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12, color: scheme.outline),
      ),
    );
  }
}
