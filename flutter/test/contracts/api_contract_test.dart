import 'dart:convert';
import 'dart:io';

import 'package:everything_about_youth/core/auth/auth_tokens.dart';
import 'package:everything_about_youth/core/feature/feature_config.dart';
import 'package:everything_about_youth/core/update/update_requirement.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_meta.dart';
import 'package:everything_about_youth/features/benefits/domain/benefit_program.dart';
import 'package:everything_about_youth/features/finance/domain/finance_meta.dart';
import 'package:everything_about_youth/features/finance/domain/finance_scheme.dart';
import 'package:everything_about_youth/features/jobs/domain/jobs_meta.dart';
import 'package:everything_about_youth/features/jobs/domain/job_posting.dart';
import 'package:everything_about_youth/features/living/domain/living_meta.dart';
import 'package:everything_about_youth/features/living/domain/living_guide.dart';
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

  test('benefits-program-list.json 을 ProgramPage 로 파싱한다', () {
    final json = _readContract('benefits-program-list.json');
    final page = ProgramPage.fromJson(json);
    expect(page.items, isNotEmpty);
    expect(page.today, isNotEmpty);
  });

  test('benefits-program-detail.json 을 ProgramDetail 로 파싱한다', () {
    final json = _readContract('benefits-program-detail.json');
    final detail = ProgramDetail.fromJson(json);
    expect(detail.summary.id, isNotEmpty);
    expect(detail.sources, isNotEmpty);
  });

  test('benefits-meta.json 을 BenefitMeta 로 파싱한다', () {
    final json = _readContract('benefits-meta.json');
    final meta = BenefitMeta.fromJson(json);
    expect(meta.categories, isNotEmpty);
    expect(meta.sidos, isNotEmpty);
  });

  test('finance-scheme-list.json 을 SchemePage 로 파싱한다', () {
    final json = _readContract('finance-scheme-list.json');
    final page = SchemePage.fromJson(json);
    expect(page.items, isNotEmpty);
    expect(page.today, isNotEmpty);
  });

  test('finance-scheme-detail.json 을 SchemeDetail 로 파싱한다', () {
    final json = _readContract('finance-scheme-detail.json');
    final detail = SchemeDetail.fromJson(json);
    expect(detail.summary.id, isNotEmpty);
    expect(detail.sources, isNotEmpty);
  });

  test('finance-meta.json 을 FinanceMeta 로 파싱한다', () {
    final json = _readContract('finance-meta.json');
    final meta = FinanceMeta.fromJson(json);
    expect(meta.categories, isNotEmpty);
    expect(meta.sidos, isNotEmpty);
  });

  test('jobs-posting-list.json 을 PostingPage 로 파싱한다', () {
    final json = _readContract('jobs-posting-list.json');
    final page = PostingPage.fromJson(json);
    expect(page.items, isNotEmpty);
    expect(page.today, isNotEmpty);
  });

  test('jobs-posting-detail.json 을 PostingDetail 로 파싱한다', () {
    final json = _readContract('jobs-posting-detail.json');
    final detail = PostingDetail.fromJson(json);
    expect(detail.summary.id, isNotEmpty);
    expect(detail.sources, isNotEmpty);
  });

  test('jobs-meta.json 을 JobsMeta 로 파싱한다', () {
    final json = _readContract('jobs-meta.json');
    final meta = JobsMeta.fromJson(json);
    expect(meta.categories, isNotEmpty);
    expect(meta.sidos, isNotEmpty);
  });

  test('living-guide-list.json 을 GuidePage 로 파싱한다', () {
    final json = _readContract('living-guide-list.json');
    final page = GuidePage.fromJson(json);
    expect(page.items, isNotEmpty);
    expect(page.today, isNotEmpty);
  });

  test('living-guide-detail.json 을 GuideDetail 로 파싱한다', () {
    final json = _readContract('living-guide-detail.json');
    final detail = GuideDetail.fromJson(json);
    expect(detail.summary.id, isNotEmpty);
    expect(detail.checklistSteps, isNotEmpty);
  });

  test('living-meta.json 을 LivingMeta 로 파싱한다', () {
    final json = _readContract('living-meta.json');
    final meta = LivingMeta.fromJson(json);
    expect(meta.procedureTypes, isNotEmpty);
    expect(meta.sidos, isNotEmpty);
  });

  test('auth-session.json 을 AuthTokens.fromSessionJson 으로 파싱한다', () {
    final json = _readContract('auth-session.json');
    final tokens = AuthTokens.fromSessionJson(json, now: DateTime.utc(2026, 10, 12));
    expect(tokens.accessToken, json['accessToken']);
    expect(tokens.member, false);
  });

  test('app-config.json 을 AppUpdateInfo.fromJson 으로 파싱한다', () {
    final json = _readContract('app-config.json');
    final info = AppUpdateInfo.fromJson(json);
    expect(info.status, isA<UpdateStatus>());
  });

  test('features.json 을 parseFeatureConfig 으로 파싱한다', () {
    final json = _readContract('features.json');
    final flags = parseFeatureConfig(json);
    expect(flags, isNotEmpty);
  });
}
