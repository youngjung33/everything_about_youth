import 'package:everything_about_youth/app/app.dart';
import 'package:everything_about_youth/core/auth/auth_mode.dart';
import 'package:everything_about_youth/core/auth/auth_providers.dart';
import 'package:everything_about_youth/core/auth/sso.dart';
import 'package:everything_about_youth/core/auth/token_store.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_controller.dart';
import 'package:everything_about_youth/core/bootstrap/bootstrap_task.dart';
import 'package:everything_about_youth/core/feature/feature_flags.dart';
import 'package:everything_about_youth/core/feature/feature_module.dart';
import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/core/notifications/deadline_notification_service.dart';
import 'package:everything_about_youth/features/housing/data/saved_notice_reminder_prefs.dart';
import 'package:everything_about_youth/features/housing/data/mapping_housing_repository.dart';
import 'package:everything_about_youth/features/housing/data/profile_store.dart';
import 'package:everything_about_youth/features/housing/data/saved_notice_store.dart';
import 'package:everything_about_youth/features/housing/housing_container.dart';
import 'package:everything_about_youth/features/housing/presentation/providers.dart';
import 'package:everything_about_youth/features/housing/presentation/saved_notice_reminder_sync.dart';
import 'package:everything_about_youth/core/providers/core_providers.dart';
import 'package:everything_about_youth/core/security/cipher_key_store.dart';
import 'package:everything_about_youth/core/security/field_cipher.dart';
import 'package:everything_about_youth/features/housing/housing_module.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'fake_app_update.dart';
import 'fake_auth_server.dart';
import 'fake_feature_config.dart';
import 'fake_sso_launcher.dart';
import 'fixtures.dart';

/// 기기의 시스템 영역을 흉내 낸다. (devicePixelRatio 1 이라 값이 곧 논리 픽셀)
///
/// - [system]: 노치/상태바(top), 홈 인디케이터·내비게이션바(bottom), 가로 모드 카메라 구멍(left/right)
/// - [keyboard]: 올라온 키보드 높이
///
/// 실제 기기와 같이, 키보드가 시스템 영역을 덮으면 `padding` 은 그만큼 줄고 `viewPadding` 은 그대로다.
void setSystemInsets(WidgetTester tester, EdgeInsets system, {double keyboard = 0}) {
  FakeViewPadding fake(EdgeInsets e) => FakeViewPadding(left: e.left, top: e.top, right: e.right, bottom: e.bottom);
  final padding = system.copyWith(bottom: (system.bottom - keyboard).clamp(0.0, double.infinity));
  tester.view.viewPadding = fake(system);
  tester.view.padding = fake(padding);
  tester.view.viewInsets = fake(EdgeInsets.only(bottom: keyboard));
}

/// 앱 전체를 가짜 저장소와 함께 띄운다.
///
/// - [modules]: 꽂을 서비스. 기본은 임대주택 하나이고, 시작 작업 없이(서버 미리 불러오기 없이) 곧바로 열린다.
/// - [tasks]: 코어 시작 작업. 기본은 없음.
/// - [disabled]: 서버가 꺼 둔 서비스 id. ([remote] 를 직접 넘기면 무시한다)
/// - [remote]/[cache]: 서버 설정과 기기에 남은 직전 설정 가짜
/// - [authMode]: 로그인 상태. 기본은 비회원이라 로그인 화면 없이 바로 앱이 열린다. AuthMode.none 이면 로그인 화면이 뜬다.
/// - [authServer]: 주면 로그인·세션 요청이 이 가짜 서버로 간다. (토큰은 메모리에 보관)
/// - [launcher]: 소셜 로그인 창을 대신하는 가짜
/// - [settle]: false 면 로딩 중인 상태에서 멈춘다. (로딩 표시를 확인할 때)
///   스플래시나 로딩처럼 계속 도는 스피너가 있으면 pumpAndSettle 이 끝나지 않기 때문이다.
Future<ProviderContainer> pumpApp(
  WidgetTester tester,
  FakeHousingRepository repo, {
  String location = '/',
  Size size = const Size(1200, 900),
  EdgeInsets systemInsets = EdgeInsets.zero,
  double keyboard = 0,
  bool settle = true,
  List<BootstrapTask> tasks = const [],
  List<FeatureModule> modules = const [HousingModule(bootstrapTasks: [])],
  Set<String> disabled = const {},
  FakeFeatureConfigRemote? remote,
  MemoryFeatureConfigCache? cache,
  FakeAppUpdateRemote? update,
  FieldCipher? cipher,
  AuthMode authMode = AuthMode.guest,
  FakeAuthServer? authServer,
  SsoLauncher? launcher,
}) async {
  SharedPreferences.setMockInitialValues({if (authMode != AuthMode.none) AuthModeStore.key: authMode.name});
  final prefs = await SharedPreferences.getInstance();
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  setSystemInsets(tester, systemInsets, keyboard: keyboard);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPadding);
  addTearDown(tester.view.resetViewPadding);
  addTearDown(tester.view.resetViewInsets);

  final resolvedCipher = cipher ?? AesGcmFieldCipher(MemoryCipherKeyStore());
  final key = UniqueKey();
  await tester.pumpWidget(
    ProviderScope(
      key: key,
      retry: (_, _) => null,
      overrides: [
        housingContainerProvider.overrideWithValue(
          HousingContainer.fromStores(
            repository: MappingHousingRepository(repo),
            profileLocalStore: ProfileStore(prefs, resolvedCipher),
            savedNoticeLocalStore: SavedNoticeStore(prefs, resolvedCipher),
            reminderPrefs: SavedNoticeReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        // 진짜 보안 저장소(플랫폼 채널) 대신 메모리 키를 쓴다.
        fieldCipherProvider.overrideWithValue(resolvedCipher),
        appUpdateRemoteProvider.overrideWithValue(update ?? FakeAppUpdateRemote()),
        ssoRedirectUriProvider.overrideWithValue('everythingaboutyouth://auth'),
        // 진짜 로그인 창(플랫폼 채널)은 테스트에서 열 수 없다. 서버를 흉내 낼 때는 로그인에 성공하는 창이 기본이다.
        if (launcher != null || authServer != null)
          ssoLauncherProvider.overrideWithValue(launcher ?? FakeSsoLauncher.succeeding()),
        if (authServer != null) ...[
          // 로그인·세션 요청을 가짜 서버로 보내고, 토큰은 보안 저장소 대신 메모리에 둔다.
          tokenStoreProvider.overrideWithValue(MemoryTokenStore()),
          plainApiClientProvider.overrideWith(
            (ref) => ApiClient(baseUrl: 'http://test', httpClient: authServer.client),
          ),
          apiClientProvider.overrideWith(
            (ref) =>
                ApiClient(baseUrl: 'http://test', httpClient: authServer.client, auth: ref.watch(authSessionProvider)),
          ),
        ],
        bootstrapTasksProvider.overrideWithValue(tasks),
        featureModulesProvider.overrideWithValue(modules),
        featureConfigRemoteProvider.overrideWithValue(
          remote ?? FakeFeatureConfigRemote(config: {for (final id in disabled) id: false}),
        ),
        featureConfigCacheProvider.overrideWithValue(cache ?? MemoryFeatureConfigCache()),
        // 테스트에서는 스플래시를 일부러 늘리지 않는다.
        bootstrapMinDurationProvider.overrideWithValue(Duration.zero),
        deadlineNotificationServiceProvider.overrideWithValue(NoopDeadlineNotificationService()),
      ],
      child: EveryThingAboutYouthApp(initialLocation: location),
    ),
  );
  final container = ProviderScope.containerOf(tester.element(find.byType(EveryThingAboutYouthApp)));

  if (settle) {
    await tester.pumpAndSettle();
  } else {
    // 시작 작업이 끝나고 라우터가 화면을 바꿀 만큼만 프레임을 진행한다.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pump(const Duration(milliseconds: 50));
  }
  return container;
}
