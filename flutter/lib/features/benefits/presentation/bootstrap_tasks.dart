import '../../../core/bootstrap/bootstrap_task.dart';
import '../../../core/design/service_accent.dart';
import 'providers.dart';
import 'saved_program_reminder_sync.dart';

const _accent = ServiceAccent.benefits;

/// 청년 혜택 섹션이 앱 시작 때 끝내 둘 작업.
final benefitsBootstrapTasks = <BootstrapTask>[
  BootstrapTask(
    name: '내 조건 불러오기',
    critical: true,
    run: (ref) async {
      await ref.read(benefitsContainerProvider).loadProfile();
      ref.read(profileProvider);
    },
  ),

  BootstrapTask(
    name: _accent.bootstrapSavedTaskName,
    run: (ref) async {
      await ref.read(savedProgramsProvider.future);
      await syncSavedProgramRemindersBootstrap(ref);
    },
  ),

  BootstrapTask(
    name: _accent.bootstrapListPrefetchName,
    run: (ref) async {
      await Future.wait([ref.read(benefitsMetaProvider.future), ref.read(programListProvider.future)]);
    },
  ),
];
