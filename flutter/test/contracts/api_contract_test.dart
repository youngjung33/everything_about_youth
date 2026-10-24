import 'dart:convert';
import 'dart:io';

import 'package:everything_about_youth/core/auth/auth_tokens.dart';
import 'package:everything_about_youth/features/housing/domain/housing_meta.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';
import 'package:flutter_test/flutter_test.dart';

/// 저장소 루트의 `contracts/api/*.json` (서버 `npm run contracts:sync` 와 동일 출처)
final _contractsDir = Directory('${Directory.current.path}${Platform.pathSeparator}..${Platform.pathSeparator}contracts${Platform.pathSeparator}api');

Map<String, dynamic> _readContract(String name) {
  final file = File('${_contractsDir.path}${Platform.pathSeparator}$name');
  return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
}

void main() {
  test('housing-notice-list.json 을 NoticePage 로 파싱한다', () {
    final json = _readContract('housing-notice-list.json');
    final page = NoticePage.fromJson(json);
    expect(page.items, isNotEmpty);
    expect(page.today, isNotEmpty);
  });

  test('housing-notice-detail.json 을 NoticeDetail 로 파싱한다', () {
    final json = _readContract('housing-notice-detail.json');
    final detail = NoticeDetail.fromJson(json);
    expect(detail.summary.id, isNotEmpty);
    expect(detail.complexes, isNotEmpty);
  });

  test('housing-meta.json 을 HousingMeta 로 파싱한다', () {
    final json = _readContract('housing-meta.json');
    final meta = HousingMeta.fromJson(json);
    expect(meta.supplyTypes, isNotEmpty);
    expect(meta.sidos, isNotEmpty);
  });

  test('auth-session.json 을 AuthTokens.fromSessionJson 으로 파싱한다', () {
    final json = _readContract('auth-session.json');
    final tokens = AuthTokens.fromSessionJson(json, now: DateTime.utc(2026, 10, 12));
    expect(tokens.accessToken, json['accessToken']);
    expect(tokens.member, false);
  });
}
