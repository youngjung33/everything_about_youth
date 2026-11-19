import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_task.dart';
import '../../core/feature/feature_module.dart';
import 'presentation/bootstrap_tasks.dart';
import 'presentation/jobs_routes.dart';
import 'presentation/pages/posting_detail_page.dart';
import 'presentation/pages/posting_list_page.dart';
import 'presentation/pages/profile_page.dart';
import 'presentation/pages/posting_schedule_page.dart';
import 'presentation/pages/saved_postings_page.dart';

/// 일자리 서비스가 코어에 꽂히는 **앱 어댑터**. 라우트·홈 카드·시작 작업만 담당한다.
/// use case·저장소 조립은 [JobsContainer], UI 상태는 `presentation/providers.dart`.
class JobsModule extends FeatureModule {
  const JobsModule({List<BootstrapTask>? bootstrapTasks}) : _bootstrapTasks = bootstrapTasks;

  final List<BootstrapTask>? _bootstrapTasks; // 테스트·주입용 시작 작업 목록. null 이면 기본값

  @override
  String get id => 'jobs';

  @override
  String get basePath => JobsRoutes.base;

  @override
  bool get defaultEnabled => true;

  @override
  FeatureEntry get entry => const FeatureEntry(
    title: '청년·공공 일자리',
    description: '청년·신입·공공 채용 공고를 모아 보고, 내 조건으로 지원 가능 여부를 참고합니다.',
    icon: Icons.work_outline,
  );

  @override
  List<RouteBase> get routes => [
    GoRoute(
      path: JobsRoutes.base,
      builder: (context, state) => const PostingListPage(),
      routes: [
        GoRoute(path: 'profile', builder: (context, state) => const ProfilePage()),
        GoRoute(path: 'saved', builder: (context, state) => const SavedPostingsPage()),
        GoRoute(path: 'schedule', builder: (context, state) => const PostingSchedulePage()),
        GoRoute(
          path: 'postings/:id',
          builder: (context, state) => PostingDetailPage(id: state.pathParameters['id']!),
        ),
      ],
    ),
  ];

  @override
  List<BootstrapTask> get bootstrapTasks => _bootstrapTasks ?? jobsBootstrapTasks;
}
