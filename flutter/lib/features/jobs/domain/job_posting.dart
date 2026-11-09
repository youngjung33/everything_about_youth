import 'package:meta/meta.dart';

import '../../../core/json.dart';

/// 접수 상태
enum PostingStatus {
  upcoming,
  open,
  closed;

  static PostingStatus fromCode(String? code) =>
      PostingStatus.values.firstWhere((e) => e.name == code, orElse: () => PostingStatus.open);
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

/// 공고 목록에 보여주는 요약 정보
@immutable
class PostingSummary {
  const PostingSummary({
    required this.id,
    required this.title,
    required this.organization,
    required this.hireTypeId,
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

  factory PostingSummary.fromJson(Map<String, dynamic> json) => PostingSummary(
    id: asString(json['id']) ?? '',
    title: asString(json['title']) ?? '',
    organization: asString(json['organization']) ?? '',
    hireTypeId: asString(json['hireTypeId']) ?? 'other',
    categoryLabel: asString(json['categoryLabel']) ?? '',
    tags: asStringList(json['tags']),
    status: PostingStatus.fromCode(asString(json['status'])),
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
  final String hireTypeId;
  final String categoryLabel;
  final List<String> tags;
  final PostingStatus status;
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
class PostingSource {
  const PostingSource({
    required this.source,
    required this.sourceLabel,
    required this.externalId,
    required this.fetchedAt,
    this.url,
  });

  factory PostingSource.fromJson(Map<String, dynamic> json) => PostingSource(
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
class PostingDetail {
  const PostingDetail({
    required this.summary,
    required this.sources,
    this.googleCalendarUrl,
  });

  factory PostingDetail.fromJson(Map<String, dynamic> json) => PostingDetail(
    summary: PostingSummary.fromJson(json),
    sources: asList(json['sources'], PostingSource.fromJson),
    googleCalendarUrl: asString(json['googleCalendarUrl']),
  );

  final PostingSummary summary;
  final List<PostingSource> sources;
  final String? googleCalendarUrl;
}

@immutable
class PostingPage {
  const PostingPage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
    required this.today,
  });

  factory PostingPage.fromJson(Map<String, dynamic> json) => PostingPage(
    items: asList(json['items'], PostingSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    page: asInt(json['page']) ?? 1,
    pageSize: asInt(json['pageSize']) ?? 20,
    totalPages: asInt(json['totalPages']) ?? 1,
    today: asString(json['today']) ?? '',
  );

  final List<PostingSummary> items;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;
  final String today;
}

@immutable
class SavedPostingList {
  const SavedPostingList({required this.items, required this.total, required this.today});

  factory SavedPostingList.fromJson(Map<String, dynamic> json) => SavedPostingList(
    items: asList(json['items'], PostingSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    today: asString(json['today']) ?? '',
  );

  final List<PostingSummary> items;
  final int total;
  final String today;
}
