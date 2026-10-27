import 'package:go_router/go_router.dart';

GoRouter? _router;
String Function(String noticeId)? _noticeLocation;

/// 알림 탭 시 공고 상세로 이동한다. [EveryThingAboutYouthApp] 에서 한 번 연결한다.
void bindNotificationNavigation({
  required GoRouter router,
  required String Function(String noticeId) noticeLocation,
}) {
  _router = router;
  _noticeLocation = noticeLocation;
}

void openNoticeFromNotification(String noticeId) {
  final location = _noticeLocation?.call(noticeId);
  if (location != null) _router?.push(location);
}
