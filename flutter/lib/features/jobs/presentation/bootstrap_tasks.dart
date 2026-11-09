import '../../../core/bootstrap/bootstrap_task.dart';
import '../../../core/design/service_accent.dart';
import 'providers.dart';
import 'saved_posting_reminder_sync.dart';

const _accent = ServiceAccent.jobs;

/// 일자리 섹션이 앱 시작 때 끝내 둘 작업.
final jobsBootstrapTasks = <BootstrapTask>[
  BootstrapTask(
    name: '내 조건 불러오기',
    critical: true,
    run: (ref) async {
      await ref.read(jobsContainerProvider).loadProfile();
      ref.read(profileProvider);
    },
  ),

  BootstrapTask(
    name: _accent.bootstrapSavedTaskName,
    run: (ref) async {
      await ref.read(savedPostingsProvider.future);
      await syncSavedPostingRemindersBootstrap(ref);
    },
  ),

  BootstrapTask(
    name: _accent.bootstrapListPrefetchName,
    run: (ref) async {
      await Future.wait([ref.read(jobsMetaProvider.future), ref.read(postingListProvider.future)]);
    },
  ),
];
