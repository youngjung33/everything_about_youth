import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/widgets/state_views.dart';
import '../../application/providers.dart';
import '../widgets/notice_card.dart';

/// 저장한 관심 공고. 비회원은 이 기기, 회원은 서버(로그인 때 기기 목록을 합친다).
class SavedNoticesPage extends ConsumerWidget {
  const SavedNoticesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(savedNoticeListProvider);

    return AppScaffold(
      appBar: AppTopBar(title: const Text('관심 공고')),
      body: async.when(
        loading: () => const LoadingView(message: '관심 공고를 불러오는 중…'),
        error: (error, _) =>
            ErrorView(message: errorMessage(error), onRetry: () => ref.invalidate(savedNoticeListProvider)),
        data: (list) {
          if (list.items.isEmpty) {
            return const EmptyView(message: '저장한 관심 공고가 없습니다.', hint: '공고 카드의 북마크를 눌러 저장하세요.');
          }
          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(savedNoticesProvider);
              await ref.read(savedNoticeListProvider.future);
            },
            child: ListView.builder(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: list.items.length,
              itemBuilder: (context, index) {
                return Align(
                  alignment: Alignment.topCenter,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 900),
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: NoticeCard(notice: list.items[index]),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}
