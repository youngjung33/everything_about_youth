import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_task.dart';
import '../../core/feature/feature_module.dart';
import 'application/bootstrap_tasks.dart';
import 'presentation/housing_routes.dart';
import 'presentation/pages/notice_detail_page.dart';
import 'presentation/pages/notice_list_page.dart';
import 'presentation/pages/profile_page.dart';
import 'presentation/pages/saved_notices_page.dart';

/// 임대주택 서비스가 코어에 꽂히는 유일한 접점. 서비스 안의 모든 레이어를 아는 곳은 이 파일뿐이다.
class HousingModule extends FeatureModule {
  /// [bootstrapTasks] 를 넘기면 기본 시작 작업 대신 그것을 쓴다. (테스트에서 서버 호출을 막을 때)
  const HousingModule({List<BootstrapTask>? bootstrapTasks}) : _bootstrapTasks = bootstrapTasks;

  final List<BootstrapTask>? _bootstrapTasks;

  @override
  String get id => 'housing';

  @override
  String get basePath => HousingRoutes.base;

  @override
  FeatureEntry get entry => const FeatureEntry(
    title: '임대주택',
    description: 'LH·SH·iH·GH·마이홈·청약홈의 공고를 모아 보고, 내 조건으로 신청 가능 여부를 확인합니다.',
    icon: Icons.apartment_outlined,
  );

  @override
  List<RouteBase> get routes => [
    GoRoute(
      path: HousingRoutes.base,
      builder: (context, state) => const NoticeListPage(),
      routes: [
        GoRoute(path: 'profile', builder: (context, state) => const ProfilePage()),
        GoRoute(path: 'saved', builder: (context, state) => const SavedNoticesPage()),
        GoRoute(
          path: 'notices/:id',
          builder: (context, state) => NoticeDetailPage(id: state.pathParameters['id']!),
        ),
      ],
    ),
  ];

  @override
  List<BootstrapTask> get bootstrapTasks => _bootstrapTasks ?? housingBootstrapTasks;
}
