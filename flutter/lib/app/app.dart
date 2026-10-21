import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/bootstrap/bootstrap_controller.dart';
import '../core/feature/feature_flags.dart';
import '../core/providers/core_providers.dart';
import '../core/theme/app_text_scale.dart';
import '../core/theme/app_theme.dart';
import '../core/update/update_gate.dart';
import 'router.dart';

/// 라우터에게 "가드를 다시 평가하라"고 알리는 신호
class _RouterRefresh extends ChangeNotifier {
  void notify() => notifyListeners();
}

class EveryThingAboutYouthApp extends ConsumerStatefulWidget {
  const EveryThingAboutYouthApp({super.key, this.initialLocation = '/'});

  /// 테스트에서 시작 위치를 바꿀 때 쓴다. 웹에서는 주소창의 주소가 우선한다.
  final String initialLocation;

  @override
  ConsumerState<EveryThingAboutYouthApp> createState() => _EveryThingAboutYouthAppState();
}

class _EveryThingAboutYouthAppState extends ConsumerState<EveryThingAboutYouthApp> {
  final _refresh = _RouterRefresh();
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = buildRouter(
      refresh: _refresh,
      // 라우터는 Riverpod 을 모르고, 아래 세 가지만 우리에게 묻는다.
      isReady: () => ref.read(bootstrapProvider) is AsyncData,
      isUpdateRequired: () => ref.read(updateGateProvider) != null,
      authMode: () => ref.read(authModeProvider),
      modules: ref.read(featureModulesProvider),
      // 값이 바뀐 직후에 불리므로 파생 provider 가 아니라 원본 상태를 직접 읽는다.
      availabilityOf: (id) => featureAvailabilityOf(
        id,
        disabled: ref.read(featureFlagsProvider),
        result: ref.read(bootstrapProvider).value,
      ),
      initialLocation: widget.initialLocation,
    );

    // 시작 작업을 여기서 시작하고, 완료/실패/재시도와 서비스 켜짐·꺼짐이 바뀌면 라우터가 가드를 다시 평가한다.
    ref.listenManual(bootstrapProvider, (previous, next) => _refresh.notify());
    ref.listenManual(featureFlagsProvider, (previous, next) => _refresh.notify());
    // 실행 중에 서버가 업데이트를 요구해도(최소 버전을 올림) 바로 업데이트 화면으로 간다.
    ref.listenManual(updateGateProvider, (previous, next) => _refresh.notify());
    // 로그인·로그아웃·탈퇴·세션 만료로 상태가 바뀌면 로그인 화면과 앱 화면 사이를 바로 오간다.
    ref.listenManual(authModeProvider, (previous, next) => _refresh.notify());
  }

  @override
  void dispose() {
    _router.dispose();
    _refresh.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: '청년의 모든 것',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      // 글꼴 크기 설정은 따르되 범위를 넘지 않게 한다. (AppTextScale)
      builder: (context, child) => AppTextScaleClamp(child: child ?? const SizedBox.shrink()),
      routerConfig: _router,
    );
  }
}
