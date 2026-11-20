import 'package:meta/meta.dart';

import '../../../core/json.dart';

/// 접수 상태
enum ProgramStatus {
  upcoming,
  open,
  closed;

  static ProgramStatus fromCode(String? code) =>
      ProgramStatus.values.firstWhere((e) => e.name == code, orElse: () => ProgramStatus.open);
}

/// 자격 판정 결과
enum Verdict {
  eligible,
  check,
  ineligible;

  static Verdict fromCode(String? code) =>
      Verdict.values.firstWhere((e) => e.name == code, orElse: () => Verdict.check);
}

/// 지역(시·도·시군구) 표시 단위.
@immutable
class Region {
  const Region({required this.sido, this.sigungu});

  factory Region.fromJson(Map<String, dynamic> json) =>
      Region(sido: asString(json['sido']) ?? '', sigungu: asString(json['sigungu']));

  final String sido; // 시·도 필터
  final String? sigungu; // JSON·도메인
}

/// 프로필·항목 기준 자격 판정 결과와 사유.
@immutable
class Eligibility {
  const Eligibility({required this.verdict, required this.verdictLabel, required this.reasons, required this.notes});

  factory Eligibility.fromJson(Map<String, dynamic> json) => Eligibility(
    verdict: Verdict.fromCode(asString(json['verdict'])),
    verdictLabel: asString(json['verdictLabel']) ?? '',
    reasons: asStringList(json['reasons']),
    notes: asStringList(json['notes']),
  );

  final Verdict verdict; // JSON·도메인
  final String verdictLabel; // JSON·도메인
  final List<String> reasons; // JSON·도메인
  final List<String> notes; // JSON·도메인
}

/// 정책 목록에 보여주는 요약 정보
@immutable
class ProgramSummary {
  const ProgramSummary({
    required this.id,
    required this.title,
    required this.organization,
    required this.categoryId,
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

  factory ProgramSummary.fromJson(Map<String, dynamic> json) => ProgramSummary(
    id: asString(json['id']) ?? '',
    title: asString(json['title']) ?? '',
    organization: asString(json['organization']) ?? '',
    categoryId: asString(json['categoryId']) ?? 'other',
    categoryLabel: asString(json['categoryLabel']) ?? '',
    tags: asStringList(json['tags']),
    status: ProgramStatus.fromCode(asString(json['status'])),
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

  final String id; // 항목 식별자
  final String title; // JSON·도메인
  final String organization; // JSON·도메인
  final String categoryId; // JSON·도메인
  final String categoryLabel; // JSON·도메인
  final List<String> tags; // JSON·도메인
  final ProgramStatus status; // JSON·도메인
  final String statusLabel; // JSON·도메인
  final String? dday; // JSON·도메인
  final List<Region> regions; // JSON·도메인
  final String regionLabel; // JSON·도메인
  final String? applicationStart; // JSON·도메인
  final String? applicationEnd; // JSON·도메인
  final String? announcementDate; // JSON·도메인
  final String? summary; // JSON·도메인
  final String? url; // JSON·도메인
  final List<String> sourceLabels; // JSON·도메인
  final Eligibility? eligibility; // JSON·도메인
}

/// 원문·출처 기관 정보.
@immutable
class ProgramSource {
  const ProgramSource({
    required this.source,
    required this.sourceLabel,
    required this.externalId,
    required this.fetchedAt,
    this.url,
  });

  factory ProgramSource.fromJson(Map<String, dynamic> json) => ProgramSource(
    source: asString(json['source']) ?? '',
    sourceLabel: asString(json['sourceLabel']) ?? '',
    externalId: asString(json['externalId']) ?? '',
    url: asString(json['url']),
    fetchedAt: asString(json['fetchedAt']) ?? '',
  );

  final String source; // JSON·도메인
  final String sourceLabel; // JSON·도메인
  final String externalId; // JSON·도메인
  final String? url; // JSON·도메인
  final String fetchedAt; // JSON·도메인
  String? get fetchedDate => fetchedAt.length >= 10 ? fetchedAt.substring(0, 10) : null;
}

/// 상세 화면에 필요한 전체 필드.
@immutable
class ProgramDetail {
  const ProgramDetail({
    required this.summary,
    required this.sources,
    this.googleCalendarUrl,
  });

  factory ProgramDetail.fromJson(Map<String, dynamic> json) => ProgramDetail(
    summary: ProgramSummary.fromJson(json),
    sources: asList(json['sources'], ProgramSource.fromJson),
    googleCalendarUrl: asString(json['googleCalendarUrl']),
  );

  final ProgramSummary summary; // JSON·도메인
  final List<ProgramSource> sources; // JSON·도메인
  final String? googleCalendarUrl; // JSON·도메인
}

/// API 페이지네이션 응답 한 페이지.
@immutable
class ProgramPage {
  const ProgramPage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
    required this.today,
  });

  factory ProgramPage.fromJson(Map<String, dynamic> json) => ProgramPage(
    items: asList(json['items'], ProgramSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    page: asInt(json['page']) ?? 1,
    pageSize: asInt(json['pageSize']) ?? 20,
    totalPages: asInt(json['totalPages']) ?? 1,
    today: asString(json['today']) ?? '',
  );

  final List<ProgramSummary> items; // JSON·도메인
  final int total; // JSON·도메인
  final int page; // JSON·도메인
  final int pageSize; // JSON·도메인
  final int totalPages; // JSON·도메인
  final String today; // JSON·도메인
}

/// 관심 저장 목록 API 응답.
@immutable
class SavedProgramList {
  const SavedProgramList({required this.items, required this.total, required this.today});

  factory SavedProgramList.fromJson(Map<String, dynamic> json) => SavedProgramList(
    items: asList(json['items'], ProgramSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    today: asString(json['today']) ?? '',
  );

  final List<ProgramSummary> items; // JSON·도메인
  final int total; // JSON·도메인
  final String today; // JSON·도메인
}
