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
import 'package:everything_about_youth/features/benefits/benefits_container.dart';
import 'package:everything_about_youth/features/benefits/benefits_module.dart';
import 'package:everything_about_youth/features/benefits/data/mapping_benefits_repository.dart';
import 'package:everything_about_youth/features/benefits/data/profile_store.dart';
import 'package:everything_about_youth/features/benefits/data/saved_program_reminder_prefs.dart';
import 'package:everything_about_youth/features/benefits/data/saved_program_store.dart';
import 'package:everything_about_youth/features/benefits/presentation/providers.dart';
import 'package:everything_about_youth/features/benefits/presentation/saved_program_reminder_sync.dart';
import 'package:everything_about_youth/core/providers/core_providers.dart';
import 'package:everything_about_youth/core/security/cipher_key_store.dart';
import 'package:everything_about_youth/core/security/field_cipher.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'benefits_fixtures.dart';
import 'fake_app_update.dart';
import 'fake_auth_server.dart';
import 'fake_feature_config.dart';
import 'fake_sso_launcher.dart';
import 'pump_app.dart';

Future<ProviderContainer> pumpBenefitsApp(
  WidgetTester tester,
  FakeBenefitsRepository repo, {
  String location = '/',
  Size size = const Size(1200, 900),
  EdgeInsets systemInsets = EdgeInsets.zero,
  double keyboard = 0,
  bool settle = true,
  List<BootstrapTask> tasks = const [],
  List<FeatureModule> modules = const [BenefitsModule(bootstrapTasks: [])],
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
        benefitsContainerProvider.overrideWithValue(
          BenefitsContainer.fromStores(
            repository: MappingBenefitsRepository(repo),
            profileLocalStore: ProfileStore(prefs, resolvedCipher),
            savedProgramLocalStore: SavedProgramStore(prefs, resolvedCipher),
            reminderPrefs: SavedProgramReminderPrefs(prefs),
          ),
        ),
        sharedPreferencesProvider.overrideWithValue(prefs),
        fieldCipherProvider.overrideWithValue(resolvedCipher),
        appUpdateRemoteProvider.overrideWithValue(update ?? FakeAppUpdateRemote()),
        ssoRedirectUriProvider.overrideWithValue('everythingaboutyouth://auth'),
        if (launcher != null || authServer != null)
          ssoLauncherProvider.overrideWithValue(launcher ?? FakeSsoLauncher.succeeding()),
        if (authServer != null) ...[
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
        bootstrapMinDurationProvider.overrideWithValue(Duration.zero),
        benefitsDeadlineNotificationServiceProvider.overrideWithValue(NoopDeadlineNotificationService()),
      ],
      child: EveryThingAboutYouthApp(initialLocation: location),
    ),
  );
  final container = ProviderScope.containerOf(tester.element(find.byType(EveryThingAboutYouthApp)));

  if (settle) {
    await tester.pumpAndSettle();
  } else {
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    await tester.pump(const Duration(milliseconds: 50));
  }
  return container;
}
