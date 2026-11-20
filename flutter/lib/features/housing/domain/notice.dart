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
  /// 판정 사유 (불가/확인 필요 이유)
  final List<String> reasons; // JSON·도메인
  /// 항상 참고해야 하는 안내
  final List<String> notes; // JSON·도메인
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
    this.eligibilityText,
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
    eligibilityText: asString(json['eligibilityText']),
    eligibility: json['eligibility'] is Map<String, dynamic> ? Eligibility.fromJson(asMap(json['eligibility'])) : null,
  );

  final String id; // 항목 식별자
  final String title; // JSON·도메인
  final String organization; // JSON·도메인
  final String supplyType; // JSON·도메인
  final String supplyTypeLabel; // JSON·도메인
  final List<String> housingTypeLabels; // JSON·도메인
  final NoticeStatus status; // JSON·도메인
  final String statusLabel; // JSON·도메인
  /// "D-3", "오늘 마감", "D-5 시작", "마감" 등
  final String? dday; // JSON·도메인
  final List<Region> regions; // JSON·도메인
  final String regionLabel; // JSON·도메인
  final String? applicationStart; // JSON·도메인
  final String? applicationEnd; // JSON·도메인
  final String? announcementDate; // JSON·도메인
  final int? totalHouseholds; // JSON·도메인
  final int? minDeposit; // JSON·도메인
  final int? minMonthlyRent; // JSON·도메인
  final double? minAreaM2; // JSON·도메인
  final double? maxAreaM2; // JSON·도메인
  final String? url; // JSON·도메인
  final List<String> sourceLabels; // JSON·도메인
  /// 수집 발췌 본문 (benefits `summary` 와 동형)
  final String? eligibilityText; // JSON·도메인
  /// '내 조건'을 보냈을 때만 값이 있다.
  final Eligibility? eligibility; // JSON·도메인
}

/// 단지별 주택형·면적·임대조건 한 줄.
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

  final String? name; // JSON·도메인
  final double? exclusiveAreaM2; // JSON·도메인
  final int? households; // JSON·도메인
  /// 임대보증금 또는 분양가(원)
  final int? deposit; // JSON·도메인
  final int? monthlyRent; // JSON·도메인
}

/// 단지(아파트·단지) 묶음과 세대형 목록.
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

  final String? name; // JSON·도메인
  final String? address; // JSON·도메인
  final Region? region; // JSON·도메인
  final String housingTypeLabel; // JSON·도메인
  final int? households; // JSON·도메인
  final List<UnitType> units; // JSON·도메인
}

/// 원문·출처 기관 정보.
@immutable
class NoticeSource {
  const NoticeSource({required this.sourceLabel, required this.externalId, required this.fetchedAt, this.url});

  factory NoticeSource.fromJson(Map<String, dynamic> json) => NoticeSource(
    sourceLabel: asString(json['sourceLabel']) ?? '',
    externalId: asString(json['externalId']) ?? '',
    url: asString(json['url']),
    fetchedAt: asString(json['fetchedAt']) ?? '',
  );

  final String sourceLabel; // JSON·도메인
  final String externalId; // JSON·도메인
  final String? url; // JSON·도메인
  /// ISO 8601 시각
  final String fetchedAt; // JSON·도메인
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
    this.googleCalendarUrl,
  });

  factory NoticeDetail.fromJson(Map<String, dynamic> json) => NoticeDetail(
    summary: NoticeSummary.fromJson(json),
    winnerAnnouncementDate: asString(json['winnerAnnouncementDate']),
    eligibilityText: asString(json['eligibilityText']),
    complexes: asList(json['complexes'], Complex.fromJson),
    sources: asList(json['sources'], NoticeSource.fromJson),
    googleCalendarUrl: asString(json['googleCalendarUrl']),
  );

  final NoticeSummary summary; // JSON·도메인
  final String? winnerAnnouncementDate; // JSON·도메인
  /// 공고 발췌 (문의처 등)
  final String? eligibilityText; // JSON·도메인
  final List<Complex> complexes; // JSON·도메인
  final List<NoticeSource> sources; // JSON·도메인
  /// 접수 마감일을 Google 캘린더에 넣는 주소. 마감일이 없으면 null
  final String? googleCalendarUrl; // JSON·도메인
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

  final List<NoticeSummary> items; // JSON·도메인
  final int total; // JSON·도메인
  final int page; // JSON·도메인
  final int pageSize; // JSON·도메인
  final int totalPages; // JSON·도메인
  /// 서버(KST) 기준 오늘
  final String today; // JSON·도메인
}

/// 관심 공고 목록. 페이지 없이 최근 저장 순 전체.
@immutable
class SavedNoticeList {
  const SavedNoticeList({required this.items, required this.total, required this.today});

  factory SavedNoticeList.fromJson(Map<String, dynamic> json) => SavedNoticeList(
    items: asList(json['items'], NoticeSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    today: asString(json['today']) ?? '',
  );

  final List<NoticeSummary> items; // JSON·도메인
  final int total; // JSON·도메인
  final String today; // JSON·도메인
}
