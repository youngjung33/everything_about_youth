import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_task.dart';
import '../../core/feature/feature_module.dart';
import 'presentation/bootstrap_tasks.dart';
import 'presentation/benefits_routes.dart';
import 'presentation/pages/program_detail_page.dart';
import 'presentation/pages/program_list_page.dart';
import 'presentation/pages/profile_page.dart';
import 'presentation/pages/program_schedule_page.dart';
import 'presentation/pages/saved_programs_page.dart';

class BenefitsModule extends FeatureModule {
  const BenefitsModule({List<BootstrapTask>? bootstrapTasks}) : _bootstrapTasks = bootstrapTasks;

  final List<BootstrapTask>? _bootstrapTasks;

  @override
  String get id => 'benefits';

  @override
  String get basePath => BenefitsRoutes.base;

  @override
  FeatureEntry get entry => const FeatureEntry(
    title: '청년 혜택',
    description: '주거·일자리·금융 등 청년 정책을 모아 보고, 내 조건으로 신청 가능 여부를 확인합니다.',
    icon: Icons.volunteer_activism_outlined,
  );

  @override
  List<RouteBase> get routes => [
    GoRoute(
      path: BenefitsRoutes.base,
      builder: (context, state) => const ProgramListPage(),
      routes: [
        GoRoute(path: 'profile', builder: (context, state) => const ProfilePage()),
        GoRoute(path: 'saved', builder: (context, state) => const SavedProgramsPage()),
        GoRoute(path: 'schedule', builder: (context, state) => const ProgramSchedulePage()),
        GoRoute(
          path: 'programs/:id',
          builder: (context, state) => ProgramDetailPage(id: state.pathParameters['id']!),
        ),
      ],
    ),
  ];

  @override
  List<BootstrapTask> get bootstrapTasks => _bootstrapTasks ?? benefitsBootstrapTasks;
}
