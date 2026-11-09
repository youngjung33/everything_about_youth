import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_task.dart';
import '../../core/feature/feature_module.dart';
import 'presentation/bootstrap_tasks.dart';
import 'presentation/finance_routes.dart';
import 'presentation/pages/scheme_detail_page.dart';
import 'presentation/pages/scheme_list_page.dart';
import 'presentation/pages/profile_page.dart';
import 'presentation/pages/scheme_schedule_page.dart';
import 'presentation/pages/saved_schemes_page.dart';

class FinanceModule extends FeatureModule {
  const FinanceModule({List<BootstrapTask>? bootstrapTasks}) : _bootstrapTasks = bootstrapTasks;

  final List<BootstrapTask>? _bootstrapTasks;

  @override
  String get id => 'finance';

  @override
  String get basePath => FinanceRoutes.base;

  @override
  bool get defaultEnabled => true;

  @override
  FeatureEntry get entry => const FeatureEntry(
    title: '청년 주거·자금',
    description: '주거·일자리·금융 등 청년 정책을 모아 보고, 내 조건으로 신청 가능 여부를 확인합니다.',
    icon: Icons.account_balance_outlined,
  );

  @override
  List<RouteBase> get routes => [
    GoRoute(
      path: FinanceRoutes.base,
      builder: (context, state) => const SchemeListPage(),
      routes: [
        GoRoute(path: 'profile', builder: (context, state) => const ProfilePage()),
        GoRoute(path: 'saved', builder: (context, state) => const SavedSchemesPage()),
        GoRoute(path: 'schedule', builder: (context, state) => const SchemeSchedulePage()),
        GoRoute(
          path: 'schemes/:id',
          builder: (context, state) => SchemeDetailPage(id: state.pathParameters['id']!),
        ),
      ],
    ),
  ];

  @override
  List<BootstrapTask> get bootstrapTasks => _bootstrapTasks ?? financeBootstrapTasks;
}
