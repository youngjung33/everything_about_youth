import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app/app.dart';
import 'app/feature_modules.dart';
import 'core/config/app_config.dart';
import 'core/config/app_runtime.dart';
import 'core/error/error_reporting.dart';
import 'core/feature/feature_flags.dart';
import 'core/layout/system_ui.dart';
import 'core/providers/core_providers.dart';
import 'core/notifications/deadline_notification_service.dart';
import 'core/notifications/notification_launcher.dart';
import 'core/update/app_info.dart';
import 'features/housing/presentation/saved_notice_reminder_sync.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final appConfig = AppConfig.fromEnvironment();
  AppRuntime.install(appConfig.env);
  installGlobalErrorHandlers();
  // 상태바·내비게이션바 뒤까지 그리는 edge-to-edge 로 모든 기기를 맞춘다. 피하는 일은 AppScaffold 가 한다.
  await AppSystemUi.apply();
  final prefs = await SharedPreferences.getInstance();
  // 앱 버전은 모든 API 요청에 실려 서버가 강제 업데이트 대상인지 판단한다.
  final appInfo = await AppInfo.load();

  final deadlineNotifications = kIsWeb ? NoopDeadlineNotificationService() : LocalDeadlineNotificationService();
  if (!kIsWeb) {
    await deadlineNotifications.initialize(onOpenNotice: openNoticeFromNotification);
  }

  runApp(
    ProviderScope(
      // 실패한 요청을 자동으로 재시도하지 않는다. (오류는 화면의 '다시 시도' 버튼으로 처리)
      retry: (retryCount, error) => null,
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
        appInfoProvider.overrideWithValue(appInfo),
        featureModulesProvider.overrideWithValue(appFeatureModules),
        deadlineNotificationServiceProvider.overrideWithValue(deadlineNotifications),
      ],
      child: const EveryThingAboutYouthApp(),
    ),
  );
}
