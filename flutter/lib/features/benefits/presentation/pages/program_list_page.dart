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
import '../../domain/benefit_filters.dart';
import '../../domain/benefit_meta.dart';
import '../../domain/program_list_state.dart';
import '../benefits_routes.dart';
import '../widgets/filter_panel.dart';
import '../widgets/filter_preset_chips.dart';
import '../widgets/program_card.dart';
import '../../../../core/design/service_accent.dart';
import '../../../../core/widgets/service_intro_banner.dart';
import '../../../../core/widgets/service_quick_actions.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_fonts.dart';

/// 이 너비 이상이면 필터를 왼쪽 사이드바로 보여준다. (웹/태블릿)
const double kWideLayoutWidth = 960;
const _accent = ServiceAccent.benefits;

class ProgramListPage extends ConsumerStatefulWidget {
  const ProgramListPage({super.key});

  @override
  ConsumerState<ProgramListPage> createState() => _ProgramListPageState();
}

class _ProgramListPageState extends ConsumerState<ProgramListPage> {
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
      ref.read(programListProvider.notifier).loadMore();
    }
  }

  void _applyFilters(BenefitFilters filters) {
    ref.read(filtersProvider.notifier).apply(filters);
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  Future<void> _openFilterSheet(BenefitMeta meta) async {
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
    final metaAsync = ref.watch(benefitsMetaProvider);
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
                          ErrorView(message: errorMessage(e), onRetry: () => ref.invalidate(benefitsMetaProvider)),
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
    final listAsync = ref.watch(programListProvider);

    return listAsync.when(
      loading: () => const LoadingView(message: '정책을 불러오는 중…'),
      error: (error, _) => ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(programListProvider)),
      data: (list) {
        return RefreshIndicator(
          onRefresh: () => ref.refresh(programListProvider.future),
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
                  child: ProgramCard(program: list.items[index - 1]),
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

  static Future<void> openFilterSheet(BuildContext context, WidgetRef ref, BenefitMeta meta) async {
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
    final meta = ref.watch(benefitsMetaProvider).value;
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
                onPressed: () => context.push(BenefitsRoutes.schedule),
              ),
              ServiceQuickAction(
                label: '관심 정책',
                icon: Icons.bookmarks_outlined,
                onPressed: () => context.push(BenefitsRoutes.saved),
              ),
              ServiceQuickAction(
                label: '내 조건',
                icon: Icons.person_outline,
                onPressed: () => context.push(BenefitsRoutes.profile),
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
                onlyEligible ? '신청 가능한 정책' : '정책 목록',
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
          const BenefitFilterPresetChips(),
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
                    onPressed: () => context.push(BenefitsRoutes.profile),
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

  final ProgramListState list;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheme = Theme.of(context).colorScheme;

    if (list.items.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: EmptyView(
          message: '조건에 맞는 정책이 없습니다.',
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
              onPressed: () => ref.read(programListProvider.notifier).loadMore(),
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
            onPressed: () => ref.read(programListProvider.notifier).loadMore(),
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
