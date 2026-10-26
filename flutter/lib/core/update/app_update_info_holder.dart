import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'update_requirement.dart';

/// 마지막으로 받은 `GET /app-config` 결과. 강제 업데이트는 [updateGateProvider], 선택 업데이트 배너는 여기를 본다.
class AppUpdateInfoHolder extends Notifier<AppUpdateInfo?> {
  @override
  AppUpdateInfo? build() => null;

  void set(AppUpdateInfo? info) => state = info;
}

final appUpdateInfoProvider = NotifierProvider<AppUpdateInfoHolder, AppUpdateInfo?>(AppUpdateInfoHolder.new);
