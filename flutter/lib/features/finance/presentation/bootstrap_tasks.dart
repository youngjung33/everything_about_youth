import '../../../core/bootstrap/bootstrap_task.dart';
import 'providers.dart';
import 'saved_scheme_reminder_sync.dart';

/// 청년정책 섹션이 앱 시작 때 끝내 둘 작업.
/// 이 목록을 앱 조립부(`lib/app/bootstrap_tasks.dart`)가 모아서 실행한다.
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
    name: '관심 정책 불러오기',
    run: (ref) async {
      await ref.read(savedSchemesProvider.future);
      await syncSavedSchemeRemindersBootstrap(ref);
    },
  ),

  BootstrapTask(
    name: '정책 목록 미리 불러오기',
    run: (ref) async {
      await Future.wait([ref.read(financeMetaProvider.future), ref.read(schemeListProvider.future)]);
    },
  ),
];
