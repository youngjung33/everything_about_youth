import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_task.dart';
import '../../core/feature/feature_module.dart';
import 'presentation/bootstrap_tasks.dart';
import 'presentation/living_routes.dart';
import 'presentation/pages/guide_detail_page.dart';
import 'presentation/pages/guide_list_page.dart';
import 'presentation/pages/guide_schedule_page.dart';
import 'presentation/pages/saved_guides_page.dart';

class LivingModule extends FeatureModule {
  const LivingModule({List<BootstrapTask>? bootstrapTasks}) : _bootstrapTasks = bootstrapTasks;

  final List<BootstrapTask>? _bootstrapTasks;

  @override
  String get id => 'living';

  @override
  String get basePath => LivingRoutes.base;

  @override
  bool get defaultEnabled => true;

  @override
  FeatureEntry get entry => const FeatureEntry(
    title: '이사·생활',
    description: '전입·임대차·공과금 등 이사·생활 절차 안내를 모아 봅니다.',
    icon: Icons.home_work_outlined,
  );

  @override
  List<RouteBase> get routes => [
    GoRoute(
      path: LivingRoutes.base,
      builder: (context, state) => const GuideListPage(),
      routes: [
        GoRoute(path: 'saved', builder: (context, state) => const SavedGuidesPage()),
        GoRoute(path: 'schedule', builder: (context, state) => const GuideSchedulePage()),
        GoRoute(
          path: 'guides/:id',
          builder: (context, state) => GuideDetailPage(id: state.pathParameters['id']!),
        ),
      ],
    ),
  ];

  @override
  List<BootstrapTask> get bootstrapTasks => _bootstrapTasks ?? livingBootstrapTasks;
}
