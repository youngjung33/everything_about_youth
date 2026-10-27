import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest.dart' as tz_data;
import 'package:timezone/timezone.dart' as tz;

/// 관심 공고 접수·마감을 기기 로컬 알림으로 예약한다. (서버 푸시는 2차)
abstract interface class DeadlineNotificationService {
  Future<void> initialize({void Function(String noticeId)? onOpenNotice});

  Future<bool> requestPermission();

  Future<void> cancelAll();

  Future<void> syncSavedNotices(Iterable<SavedNoticeReminderTarget> targets);
}

@immutable
class SavedNoticeReminderTarget {
  const SavedNoticeReminderTarget({required this.id, required this.title, this.applicationStart, this.applicationEnd});

  final String id;
  final String title;
  final String? applicationStart;
  final String? applicationEnd;
}

/// 모바일·데스크톱. 웹은 [NoopDeadlineNotificationService].
class LocalDeadlineNotificationService implements DeadlineNotificationService {
  LocalDeadlineNotificationService({FlutterLocalNotificationsPlugin? plugin})
    : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  final FlutterLocalNotificationsPlugin _plugin;
  void Function(String noticeId)? _onOpenNotice;
  var _initialized = false;

  static const _androidChannelId = 'housing_deadlines';
  static const _androidChannelName = '임대주택 접수·마감';

  @override
  Future<void> initialize({void Function(String noticeId)? onOpenNotice}) async {
    if (_initialized) return;
    _onOpenNotice = onOpenNotice;
    tz_data.initializeTimeZones();
    tz.setLocalLocation(tz.getLocation('Asia/Seoul'));

    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const darwin = DarwinInitializationSettings();
    const settings = InitializationSettings(android: android, iOS: darwin, macOS: darwin);
    await _plugin.initialize(settings: settings, onDidReceiveNotificationResponse: _onResponse);

    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    await androidPlugin?.createNotificationChannel(
      const AndroidNotificationChannel(
        _androidChannelId,
        _androidChannelName,
        description: '관심 공고의 접수 시작·마감을 알려 줍니다.',
        importance: Importance.defaultImportance,
      ),
    );
    _initialized = true;
  }

  void _onResponse(NotificationResponse response) {
    final id = response.payload;
    if (id != null && id.isNotEmpty) _onOpenNotice?.call(id);
  }

  @override
  Future<bool> requestPermission() async {
    if (defaultTargetPlatform == TargetPlatform.android) {
      final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      return await android?.requestNotificationsPermission() ?? false;
    }
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      final ios = _plugin.resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
      return await ios?.requestPermissions(alert: true, badge: false, sound: true) ?? false;
    }
    if (defaultTargetPlatform == TargetPlatform.macOS) {
      final mac = _plugin.resolvePlatformSpecificImplementation<MacOSFlutterLocalNotificationsPlugin>();
      return await mac?.requestPermissions(alert: true, badge: false, sound: true) ?? false;
    }
    return true;
  }

  @override
  Future<void> cancelAll() async {
    await _plugin.cancelAll();
  }

  @override
  Future<void> syncSavedNotices(Iterable<SavedNoticeReminderTarget> targets) async {
    if (!_initialized) return;
    await _plugin.cancelAll();
    final now = tz.TZDateTime.now(tz.local);
    for (final notice in targets) {
      await _scheduleStart(notice, now);
      await _scheduleDeadline(notice, now);
    }
  }

  Future<void> _scheduleStart(SavedNoticeReminderTarget notice, tz.TZDateTime now) async {
    final start = _parseDate(notice.applicationStart);
    if (start == null) return;
    final at = _morningKst(start);
    if (!at.isAfter(now)) return;
    await _schedule(
      id: _id(notice.id, 0),
      at: at,
      title: '접수가 시작됩니다',
      body: notice.title,
      payload: notice.id,
    );
  }

  Future<void> _scheduleDeadline(SavedNoticeReminderTarget notice, tz.TZDateTime now) async {
    final end = _parseDate(notice.applicationEnd);
    if (end == null) return;
    final endMorning = _morningKst(end);
    final dayBefore = endMorning.subtract(const Duration(days: 1));

    if (dayBefore.isAfter(now)) {
      await _schedule(
        id: _id(notice.id, 1),
        at: dayBefore,
        title: '접수 마감이 하루 남았습니다',
        body: notice.title,
        payload: notice.id,
      );
    }
    if (endMorning.isAfter(now)) {
      await _schedule(
        id: _id(notice.id, 2),
        at: endMorning,
        title: '오늘 접수가 마감됩니다',
        body: notice.title,
        payload: notice.id,
      );
    }
  }

  tz.TZDateTime? _parseDate(String? isoDate) {
    if (isoDate == null || isoDate.length < 10) return null;
    final y = int.tryParse(isoDate.substring(0, 4));
    final m = int.tryParse(isoDate.substring(5, 7));
    final d = int.tryParse(isoDate.substring(8, 10));
    if (y == null || m == null || d == null) return null;
    return tz.TZDateTime(tz.local, y, m, d);
  }

  tz.TZDateTime _morningKst(tz.TZDateTime day) => tz.TZDateTime(tz.local, day.year, day.month, day.day, 9);

  int _id(String noticeId, int slot) => ((noticeId.hashCode & 0x3fffffff) * 4 + slot) & 0x7fffffff;

  Future<void> _schedule({
    required int id,
    required tz.TZDateTime at,
    required String title,
    required String body,
    required String payload,
  }) async {
    await _plugin.zonedSchedule(
      id: id,
      title: title,
      body: body,
      scheduledDate: at,
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(_androidChannelId, _androidChannelName),
        iOS: const DarwinNotificationDetails(),
        macOS: const DarwinNotificationDetails(),
      ),
      payload: payload,
    );
  }
}

class NoopDeadlineNotificationService implements DeadlineNotificationService {
  @override
  Future<void> initialize({void Function(String noticeId)? onOpenNotice}) async {}

  @override
  Future<bool> requestPermission() async => false;

  @override
  Future<void> cancelAll() async {}

  @override
  Future<void> syncSavedNotices(Iterable<SavedNoticeReminderTarget> targets) async {}
}
