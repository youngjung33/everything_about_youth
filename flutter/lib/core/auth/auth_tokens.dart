import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../network/api_client.dart';
import '../network/api_error_code.dart';

/// 서버가 발급한 토큰 쌍과 만료 시각.
///
/// 만료 시각은 서버 시계가 아니라 **받은 시점의 기기 시계 + 남은 초**로 계산한다.
/// (기기 시계가 틀려 있어도 "받은 지 얼마나 됐나"는 맞는다)
@immutable
class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.accessExpiresAt,
    required this.refreshToken,
    required this.refreshExpiresAt,
  });

  final String accessToken;
  final DateTime accessExpiresAt;
  final String refreshToken;
  final DateTime refreshExpiresAt;

  /// 만료 직전에 보낸 요청이 서버에서 만료되지 않도록 여유를 둔다.
  static const skew = Duration(seconds: 30);

  bool accessUsable(DateTime now) => now.add(skew).isBefore(accessExpiresAt);
  bool refreshUsable(DateTime now) => now.add(skew).isBefore(refreshExpiresAt);

  /// `POST /api/v1/auth/session`, `/api/v1/auth/refresh` 의 응답
  factory AuthTokens.fromSessionJson(Map<String, dynamic> json, {required DateTime now}) {
    final access = json['accessToken'];
    final refresh = json['refreshToken'];
    final accessIn = json['accessExpiresIn'];
    final refreshIn = json['refreshExpiresIn'];
    if (access is! String ||
        access.isEmpty ||
        refresh is! String ||
        refresh.isEmpty ||
        accessIn is! num ||
        refreshIn is! num) {
      throw const ApiException('서버 응답 형식이 올바르지 않습니다.', code: ApiErrorCode.badResponse);
    }
    return AuthTokens(
      accessToken: access,
      accessExpiresAt: now.add(Duration(seconds: accessIn.toInt())),
      refreshToken: refresh,
      refreshExpiresAt: now.add(Duration(seconds: refreshIn.toInt())),
    );
  }

  String encode() => jsonEncode({
    'a': accessToken,
    'ax': accessExpiresAt.millisecondsSinceEpoch,
    'r': refreshToken,
    'rx': refreshExpiresAt.millisecondsSinceEpoch,
  });

  /// 저장된 문자열을 읽는다. 깨져 있으면 null (= 저장된 게 없는 것으로 보고 새로 발급받는다).
  static AuthTokens? decode(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      final map = jsonDecode(raw);
      if (map is! Map<String, dynamic>) return null;
      final a = map['a'], ax = map['ax'], r = map['r'], rx = map['rx'];
      if (a is! String || r is! String || ax is! int || rx is! int) return null;
      return AuthTokens(
        accessToken: a,
        accessExpiresAt: DateTime.fromMillisecondsSinceEpoch(ax),
        refreshToken: r,
        refreshExpiresAt: DateTime.fromMillisecondsSinceEpoch(rx),
      );
    } on FormatException {
      return null;
    }
  }
}
