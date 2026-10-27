import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../core/auth/auth_mode.dart';
import '../core/feature/feature_flags.dart';
import '../core/feature/feature_module.dart';
import '../core/layout/app_scaffold.dart';
import '../core/layout/app_top_bar.dart';
import '../core/layout/centered_scroll_view.dart';
import '../features/home/home_page.dart';
import '../core/legal/legal_paths.dart';
import '../features/legal/open_source_licenses_page.dart';
import '../features/legal/privacy_policy_page.dart';
import '../features/legal/terms_page.dart';
import '../features/login/login_page.dart';
import '../features/splash/splash_page.dart';
import '../features/unavailable/unavailable_page.dart';
import '../features/update_required/update_required_page.dart';
import 'paths.dart';
import 'shell/app_shell.dart';

export 'paths.dart' show loginLocation, loginPath;

/// 앱을 업데이트해야만 쓸 수 있을 때 앱 전체를 대신하는 화면
const updateRequiredPath = '/update-required';

/// 강제 업데이트 가드. 모든 가드보다 먼저 평가한다. 순수 함수라 따로 테스트한다.
///
/// - 업데이트가 필요하면: 어디로 오든 업데이트 화면으로 보낸다. (시작 화면, 서비스 화면, 주소로 직접 들어온 경우 모두)
/// - 필요 없는데 업데이트 화면에 있으면 홈으로 보낸다. (직접 주소를 입력해서 들어온 경우)
String? updateRedirect({required bool required, required Uri uri}) {
  final atUpdate = uri.path == updateRequiredPath;
  if (required) return atUpdate ? null : updateRequiredPath;
  return atUpdate ? '/' : null;
}

/// 시작 작업이 끝나기 전까지 모든 요청이 머무는 화면
const splashPath = '/splash';

/// 꺼졌거나 장애인 서비스로 들어왔을 때 보내는 화면
const unavailableBase = '/unavailable';
String unavailablePath(String featureId) => '$unavailableBase/$featureId';

/// 시작 작업이 끝났는지에 따라 가야 할 곳을 정하는 라우터 가드(미들웨어). 순수 함수라 따로 테스트한다.
///
/// - 끝나기 전: 어디로 오든 스플래시로 보낸다. 원래 가려던 주소는 `from` 으로 들고 간다.
///   (웹에서 `#/housing/notices/..` 를 직접 열어도 로딩이 끝난 뒤 그 화면으로 간다)
/// - 끝난 뒤: 스플래시에 있다면 `from`(없으면 홈)으로 보낸다.
/// - 그 밖에는 간섭하지 않는다(null).
String? bootstrapRedirect({required bool ready, required Uri uri}) {
  final atSplash = uri.path == splashPath;

  if (!ready) {
    if (atSplash) return null;
    final target = uri.toString();
    return Uri(path: splashPath, queryParameters: target == '/' ? null : {'from': target}).toString();
  }

  if (atSplash) return _safeInternalPath(uri.queryParameters['from']) ?? '/';
  return null;
}

/// 로그인 가드. 순수 함수라 따로 테스트한다.
///
/// - 아직 로그인도 비회원 시작도 하지 않았으면: 어디로 오든 로그인 화면으로 보낸다. (원래 주소는 `from` 으로 들고 간다)
/// - 회원이면: 로그인 화면에 머물 이유가 없으므로 `from`(없으면 홈)으로 보낸다.
/// - 비회원은 로그인 화면을 열 수 있다. (헤더의 "로그인"으로 회원이 되려는 경우)
String? authRedirect({required AuthMode mode, required Uri uri}) {
  final atLogin = uri.path == loginPath;

  if (uri.path == LegalPaths.privacy || uri.path == LegalPaths.terms || uri.path == LegalPaths.licenses) {
    return null;
  }
  if (mode == AuthMode.none) {
    return atLogin ? null : loginLocation(from: uri.toString());
  }
  if (mode.isMember && atLogin) return _safeInternalPath(uri.queryParameters['from']) ?? '/';
  return null;
}

/// 앱 안의 경로만 허용한다. (`//evil.com`, `https://..` 같은 값으로 밖으로 빠져나가지 못하게)
String? _safeInternalPath(String? from) {
  if (from == null || !from.startsWith('/') || from.startsWith('//')) return null;
  for (final special in [splashPath, loginPath]) {
    if (from == special || from.startsWith('$special?')) return null;
  }
  return from;
}

/// 로그인 화면이 로그인(또는 비회원 시작) 뒤에 갈 곳. 앱 안의 주소가 아니면 홈이다.
String afterLoginPath(Uri loginUri) => _safeInternalPath(loginUri.queryParameters['from']) ?? '/';

/// 서비스 가드. 꺼졌거나 장애인 서비스의 경로로 들어오면 안내 화면으로 보낸다. 순수 함수라 따로 테스트한다.
///
/// 서비스 경로는 모두 열어 두고 여기서 막는다. 그래서 서비스를 켜고 끄는 즉시(앱 재시작 없이) 반영된다.
/// 안내 화면에 머물던 중 서비스가 정상으로 돌아오면(다시 켜짐, 재시도 성공) 서비스 첫 화면으로 보낸다.
String? featureRedirect({
  required Uri uri,
  required Iterable<FeatureModule> modules,
  required FeatureAvailability Function(String id) availabilityOf,
}) {
  if (uri.pathSegments.length == 2 && '/${uri.pathSegments.first}' == unavailableBase) {
    final module = modules.where((m) => m.id == uri.pathSegments.last).firstOrNull;
    if (module == null) return '/';
    return availabilityOf(module.id) == FeatureAvailability.available ? module.basePath : null;
  }

  for (final module in modules) {
    final base = module.basePath;
    if (uri.path == base || uri.path.startsWith('$base/')) {
      return availabilityOf(module.id) == FeatureAvailability.available ? null : unavailablePath(module.id);
    }
  }
  return null;
}

/// 앱 전체 라우트. 서비스의 라우트는 [modules] 에서 받아 붙인다. (라우터는 어떤 서비스가 있는지 모른다)
///
/// [refresh] 가 알리면(시작 작업 완료, 서비스 켜짐/꺼짐) 가드가 다시 평가된다.
GoRouter buildRouter({
  required Listenable refresh,
  required bool Function() isReady,
  required bool Function() isUpdateRequired,
  required AuthMode Function() authMode,
  required List<FeatureModule> modules,
  required FeatureAvailability Function(String id) availabilityOf,
  String initialLocation = '/',
}) {
  // push 로 연 화면(상세, 내 조건)도 웹 주소창에 반영한다. 새로고침과 링크 공유가 되려면 필요하다.
  GoRouter.optionURLReflectsImperativeAPIs = true;

  return GoRouter(
    initialLocation: initialLocation,
    refreshListenable: refresh,
    // 순서가 중요하다: 강제 업데이트 > 시작 작업 > 로그인 > 서비스 켜짐/꺼짐
    redirect: (context, state) =>
        updateRedirect(required: isUpdateRequired(), uri: state.uri) ??
        bootstrapRedirect(ready: isReady(), uri: state.uri) ??
        authRedirect(mode: authMode(), uri: state.uri) ??
        featureRedirect(uri: state.uri, modules: modules, availabilityOf: availabilityOf),
    routes: [
      // 스플래시, 업데이트 안내, 로그인은 헤더·푸터 없이 전체 화면이다.
      GoRoute(path: splashPath, builder: (context, state) => const SplashPage()),
      GoRoute(path: updateRequiredPath, builder: (context, state) => const UpdateRequiredPage()),
      GoRoute(
        path: loginPath,
        builder: (context, state) => LoginPage(afterLogin: afterLoginPath(state.uri)),
      ),
      // 그 밖의 모든 화면은 공통 틀(헤더·푸터·서랍 메뉴) 안에서 바뀐다.
      ShellRoute(
        builder: (context, state, child) => AppShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(path: '/', builder: (context, state) => const HomePage()),
          GoRoute(path: LegalPaths.privacy, builder: (context, state) => const PrivacyPolicyPage()),
          GoRoute(path: LegalPaths.terms, builder: (context, state) => const TermsPage()),
          GoRoute(path: LegalPaths.licenses, builder: (context, state) => const OpenSourceLicensesPage()),
          GoRoute(
            path: '$unavailableBase/:id',
            builder: (context, state) => UnavailablePage(featureId: state.pathParameters['id']!),
          ),
          for (final module in modules) ...module.routes,
        ],
      ),
    ],
    errorBuilder: (context, state) => AppScaffold(
      appBar: AppTopBar(title: const Text('페이지를 찾을 수 없습니다')),
      body: CenteredScrollView(
        child: FilledButton(onPressed: () => context.go('/'), child: const Text('홈으로')),
      ),
    ),
  );
}
