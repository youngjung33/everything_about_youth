import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:everything_about_youth/core/feature/feature_module.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// 테스트용 서비스. 코어가 서비스 하나를 몰라도 동작하는지, 서비스끼리 격리되는지 확인하는 데 쓴다.
class FakeFeature extends FeatureModule {
  const FakeFeature(this.id, {this.tasks = const [], this.title, this.defaultEnabled = true});

  @override
  final String id;
  final List<BootstrapTask> tasks;
  final String? title;

  @override
  final bool defaultEnabled;

  @override
  String get basePath => '/$id';

  @override
  FeatureEntry get entry =>
      FeatureEntry(title: title ?? '서비스-$id', description: '$id 설명', icon: Icons.extension_outlined);

  @override
  List<RouteBase> get routes => [
    GoRoute(
      path: basePath,
      builder: (context, state) => Scaffold(body: Center(child: Text('$id 첫 화면'))),
    ),
  ];

  @override
  List<BootstrapTask> get bootstrapTasks => tasks;
}
