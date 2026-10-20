import 'package:meta/meta.dart';

import '../../../core/json.dart';

/// 접수 상태
enum NoticeStatus {
  upcoming,
  open,
  closed;

  static NoticeStatus fromCode(String? code) =>
      NoticeStatus.values.firstWhere((e) => e.name == code, orElse: () => NoticeStatus.open);
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

  /// 판정 사유 (불가/확인 필요 이유)
  final List<String> reasons;

  /// 항상 참고해야 하는 안내
  final List<String> notes;
}

/// 공고 목록에 보여주는 요약 정보
@immutable
class NoticeSummary {
  const NoticeSummary({
    required this.id,
    required this.title,
    required this.organization,
    required this.supplyType,
    required this.supplyTypeLabel,
    required this.housingTypeLabels,
    required this.status,
    required this.statusLabel,
    required this.regionLabel,
    required this.regions,
    required this.sourceLabels,
    this.dday,
    this.applicationStart,
    this.applicationEnd,
    this.announcementDate,
    this.totalHouseholds,
    this.minDeposit,
    this.minMonthlyRent,
    this.minAreaM2,
    this.maxAreaM2,
    this.url,
    this.eligibility,
  });

  factory NoticeSummary.fromJson(Map<String, dynamic> json) => NoticeSummary(
    id: asString(json['id']) ?? '',
    title: asString(json['title']) ?? '',
    organization: asString(json['organization']) ?? '',
    supplyType: asString(json['supplyType']) ?? 'other',
    supplyTypeLabel: asString(json['supplyTypeLabel']) ?? '',
    housingTypeLabels: asStringList(json['housingTypeLabels']),
    status: NoticeStatus.fromCode(asString(json['status'])),
    statusLabel: asString(json['statusLabel']) ?? '',
    dday: asString(json['dday']),
    regions: asList(json['regions'], Region.fromJson),
    regionLabel: asString(json['regionLabel']) ?? '지역 미상',
    applicationStart: asString(json['applicationStart']),
    applicationEnd: asString(json['applicationEnd']),
    announcementDate: asString(json['announcementDate']),
    totalHouseholds: asInt(json['totalHouseholds']),
    minDeposit: asInt(json['minDeposit']),
    minMonthlyRent: asInt(json['minMonthlyRent']),
    minAreaM2: asDouble(json['minAreaM2']),
    maxAreaM2: asDouble(json['maxAreaM2']),
    url: asString(json['url']),
    sourceLabels: asStringList(json['sourceLabels']),
    eligibility: json['eligibility'] is Map<String, dynamic> ? Eligibility.fromJson(asMap(json['eligibility'])) : null,
  );

  final String id;
  final String title;
  final String organization;
  final String supplyType;
  final String supplyTypeLabel;
  final List<String> housingTypeLabels;
  final NoticeStatus status;
  final String statusLabel;

  /// "D-3", "오늘 마감", "D-5 시작", "마감" 등
  final String? dday;
  final List<Region> regions;
  final String regionLabel;
  final String? applicationStart;
  final String? applicationEnd;
  final String? announcementDate;
  final int? totalHouseholds;
  final int? minDeposit;
  final int? minMonthlyRent;
  final double? minAreaM2;
  final double? maxAreaM2;
  final String? url;
  final List<String> sourceLabels;

  /// '내 조건'을 보냈을 때만 값이 있다.
  final Eligibility? eligibility;
}

@immutable
class UnitType {
  const UnitType({this.name, this.exclusiveAreaM2, this.households, this.deposit, this.monthlyRent});

  factory UnitType.fromJson(Map<String, dynamic> json) => UnitType(
    name: asString(json['name']),
    exclusiveAreaM2: asDouble(json['exclusiveAreaM2']),
    households: asInt(json['households']),
    deposit: asInt(json['deposit']),
    monthlyRent: asInt(json['monthlyRent']),
  );

  final String? name;
  final double? exclusiveAreaM2;
  final int? households;

  /// 임대보증금 또는 분양가(원)
  final int? deposit;
  final int? monthlyRent;
}

@immutable
class Complex {
  const Complex({
    required this.housingTypeLabel,
    required this.units,
    this.name,
    this.address,
    this.region,
    this.households,
  });

  factory Complex.fromJson(Map<String, dynamic> json) => Complex(
    name: asString(json['name']),
    address: asString(json['address']),
    region: json['region'] is Map<String, dynamic> ? Region.fromJson(asMap(json['region'])) : null,
    housingTypeLabel: asString(json['housingTypeLabel']) ?? '',
    households: asInt(json['households']),
    units: asList(json['units'], UnitType.fromJson),
  );

  final String? name;
  final String? address;
  final Region? region;
  final String housingTypeLabel;
  final int? households;
  final List<UnitType> units;
}

@immutable
class NoticeSource {
  const NoticeSource({required this.sourceLabel, required this.externalId, required this.fetchedAt, this.url});

  factory NoticeSource.fromJson(Map<String, dynamic> json) => NoticeSource(
    sourceLabel: asString(json['sourceLabel']) ?? '',
    externalId: asString(json['externalId']) ?? '',
    url: asString(json['url']),
    fetchedAt: asString(json['fetchedAt']) ?? '',
  );

  final String sourceLabel;
  final String externalId;
  final String? url;

  /// ISO 8601 시각
  final String fetchedAt;

  /// 수집일 (YYYY-MM-DD)
  String? get fetchedDate => fetchedAt.length >= 10 ? fetchedAt.substring(0, 10) : null;
}

/// 공고 상세 = 요약 + 단지/세대유형/출처
@immutable
class NoticeDetail {
  const NoticeDetail({
    required this.summary,
    required this.complexes,
    required this.sources,
    this.winnerAnnouncementDate,
    this.eligibilityText,
  });

  factory NoticeDetail.fromJson(Map<String, dynamic> json) => NoticeDetail(
    summary: NoticeSummary.fromJson(json),
    winnerAnnouncementDate: asString(json['winnerAnnouncementDate']),
    eligibilityText: asString(json['eligibilityText']),
    complexes: asList(json['complexes'], Complex.fromJson),
    sources: asList(json['sources'], NoticeSource.fromJson),
  );

  final NoticeSummary summary;
  final String? winnerAnnouncementDate;

  /// 공고 발췌 (문의처 등)
  final String? eligibilityText;
  final List<Complex> complexes;
  final List<NoticeSource> sources;
}

/// 목록 한 페이지
@immutable
class NoticePage {
  const NoticePage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
    required this.today,
  });

  factory NoticePage.fromJson(Map<String, dynamic> json) => NoticePage(
    items: asList(json['items'], NoticeSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    page: asInt(json['page']) ?? 1,
    pageSize: asInt(json['pageSize']) ?? 20,
    totalPages: asInt(json['totalPages']) ?? 1,
    today: asString(json['today']) ?? '',
  );

  final List<NoticeSummary> items;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;

  /// 서버(KST) 기준 오늘
  final String today;
}
