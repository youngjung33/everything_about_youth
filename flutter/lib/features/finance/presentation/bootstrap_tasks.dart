import '../../../core/bootstrap/bootstrap_task.dart';
import '../../../core/design/service_accent.dart';
import 'providers.dart';
import 'saved_scheme_reminder_sync.dart';

const _accent = ServiceAccent.finance;

/// 주거·자금 섹션이 앱 시작 때 끝내 둘 작업.
final financeBootstrapTasks = <BootstrapTask>[
  BootstrapTask(
    name: '내 조건 불러오기',
    critical: true,
    run: (ref) async {
      await ref.read(financeContainerProvider).loadProfile();
      ref.read(profileProvider);
    },
  ),

  BootstrapTask(
    name: _accent.bootstrapSavedTaskName,
    run: (ref) async {
      await ref.read(savedSchemesProvider.future);
      await syncSavedSchemeRemindersBootstrap(ref);
    },
  ),

  BootstrapTask(
    name: _accent.bootstrapListPrefetchName,
    run: (ref) async {
      await Future.wait([ref.read(financeMetaProvider.future), ref.read(schemeListProvider.future)]);
    },
  ),
];
