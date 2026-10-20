import 'dart:async';

import 'package:everything_about_youth/core/update/update_requirement.dart';

/// 서버의 `GET /app-config` 를 대신하는 가짜. 기본은 업데이트 필요 없음.
class FakeAppUpdateRemote implements AppUpdateRemote {
  FakeAppUpdateRemote({this.info = const AppUpdateInfo(status: UpdateStatus.none), this.error, this.hang = false});

  AppUpdateInfo info;

  /// 설정하면 이 오류를 던진다. (서버 장애, 연결 실패 흉내)
  Object? error;

  /// true 면 영영 응답하지 않는다. (시간 초과 흉내)
  bool hang;

  int calls = 0;

  factory FakeAppUpdateRemote.required({String? storeUrl, String? message}) => FakeAppUpdateRemote(
    info: AppUpdateInfo(status: UpdateStatus.required, minVersion: '2.0.0', storeUrl: storeUrl, message: message),
  );

  @override
  Future<AppUpdateInfo> fetch() {
    calls++;
    if (hang) return Completer<AppUpdateInfo>().future;
    final failure = error;
    if (failure != null) return Future.error(failure);
    return Future.value(info);
  }
}
