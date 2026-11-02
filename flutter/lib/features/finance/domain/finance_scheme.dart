import 'package:meta/meta.dart';

import '../../../core/json.dart';

/// 접수 상태
enum SchemeStatus {
  upcoming,
  open,
  closed;

  static SchemeStatus fromCode(String? code) =>
      SchemeStatus.values.firstWhere((e) => e.name == code, orElse: () => SchemeStatus.open);
}

/// 자격 판정 결과
enum Verdict {
  eligible,
  check,
  ineligible;

  static Verdict fromCode(String? code) =>
      Verdict.values.firstWhere((e) => e.name == code, orElse: () => Verdict.check);
}

@immutable
class Region {
  const Region({required this.sido, this.sigungu});

  factory Region.fromJson(Map<String, dynamic> json) =>
      Region(sido: asString(json['sido']) ?? '', sigungu: asString(json['sigungu']));

  final String sido;
  final String? sigungu;
}

@immutable
class Eligibility {
  const Eligibility({required this.verdict, required this.verdictLabel, required this.reasons, required this.notes});

  factory Eligibility.fromJson(Map<String, dynamic> json) => Eligibility(
    verdict: Verdict.fromCode(asString(json['verdict'])),
    verdictLabel: asString(json['verdictLabel']) ?? '',
    reasons: asStringList(json['reasons']),
    notes: asStringList(json['notes']),
  );

  final Verdict verdict;
  final String verdictLabel;
  final List<String> reasons;
  final List<String> notes;
}

/// 정책 목록에 보여주는 요약 정보
@immutable
class SchemeSummary {
  const SchemeSummary({
    required this.id,
    required this.title,
    required this.organization,
    required this.productTypeId,
    required this.categoryLabel,
    required this.tags,
    required this.status,
    required this.statusLabel,
    required this.regionLabel,
    required this.regions,
    required this.sourceLabels,
    this.dday,
    this.applicationStart,
    this.applicationEnd,
    this.announcementDate,
    this.summary,
    this.url,
    this.eligibility,
  });

  factory SchemeSummary.fromJson(Map<String, dynamic> json) => SchemeSummary(
    id: asString(json['id']) ?? '',
    title: asString(json['title']) ?? '',
    organization: asString(json['organization']) ?? '',
    productTypeId: asString(json['productTypeId']) ?? 'other',
    categoryLabel: asString(json['categoryLabel']) ?? '',
    tags: asStringList(json['tags']),
    status: SchemeStatus.fromCode(asString(json['status'])),
    statusLabel: asString(json['statusLabel']) ?? '',
    dday: asString(json['dday']),
    regions: asList(json['regions'], Region.fromJson),
    regionLabel: asString(json['regionLabel']) ?? '지역 미상',
    applicationStart: asString(json['applicationStart']),
    applicationEnd: asString(json['applicationEnd']),
    announcementDate: asString(json['announcementDate']),
    summary: asString(json['summary']),
    url: asString(json['url']),
    sourceLabels: asStringList(json['sourceLabels']),
    eligibility: json['eligibility'] is Map<String, dynamic> ? Eligibility.fromJson(asMap(json['eligibility'])) : null,
  );

  final String id;
  final String title;
  final String organization;
  final String productTypeId;
  final String categoryLabel;
  final List<String> tags;
  final SchemeStatus status;
  final String statusLabel;
  final String? dday;
  final List<Region> regions;
  final String regionLabel;
  final String? applicationStart;
  final String? applicationEnd;
  final String? announcementDate;
  final String? summary;
  final String? url;
  final List<String> sourceLabels;
  final Eligibility? eligibility;
}

@immutable
class SchemeSource {
  const SchemeSource({
    required this.source,
    required this.sourceLabel,
    required this.externalId,
    required this.fetchedAt,
    this.url,
  });

  factory SchemeSource.fromJson(Map<String, dynamic> json) => SchemeSource(
    source: asString(json['source']) ?? '',
    sourceLabel: asString(json['sourceLabel']) ?? '',
    externalId: asString(json['externalId']) ?? '',
    url: asString(json['url']),
    fetchedAt: asString(json['fetchedAt']) ?? '',
  );

  final String source;
  final String sourceLabel;
  final String externalId;
  final String? url;
  final String fetchedAt;

  String? get fetchedDate => fetchedAt.length >= 10 ? fetchedAt.substring(0, 10) : null;
}

@immutable
class SchemeDetail {
  const SchemeDetail({
    required this.summary,
    required this.sources,
    this.googleCalendarUrl,
  });

  factory SchemeDetail.fromJson(Map<String, dynamic> json) => SchemeDetail(
    summary: SchemeSummary.fromJson(json),
    sources: asList(json['sources'], SchemeSource.fromJson),
    googleCalendarUrl: asString(json['googleCalendarUrl']),
  );

  final SchemeSummary summary;
  final List<SchemeSource> sources;
  final String? googleCalendarUrl;
}

@immutable
class SchemePage {
  const SchemePage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
    required this.today,
  });

  factory SchemePage.fromJson(Map<String, dynamic> json) => SchemePage(
    items: asList(json['items'], SchemeSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    page: asInt(json['page']) ?? 1,
    pageSize: asInt(json['pageSize']) ?? 20,
    totalPages: asInt(json['totalPages']) ?? 1,
    today: asString(json['today']) ?? '',
  );

  final List<SchemeSummary> items;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;
  final String today;
}

@immutable
class SavedSchemeList {
  const SavedSchemeList({required this.items, required this.total, required this.today});

  factory SavedSchemeList.fromJson(Map<String, dynamic> json) => SavedSchemeList(
    items: asList(json['items'], SchemeSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    today: asString(json['today']) ?? '',
  );

  final List<SchemeSummary> items;
  final int total;
  final String today;
}
