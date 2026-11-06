import 'package:meta/meta.dart';

import '../../../core/json.dart';

enum GuideStatus {
  upcoming,
  open,
  closed;

  static GuideStatus fromCode(String? code) =>
      GuideStatus.values.firstWhere((e) => e.name == code, orElse: () => GuideStatus.open);
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
class ChecklistStep {
  const ChecklistStep({required this.order, required this.title, required this.summary, this.url});

  factory ChecklistStep.fromJson(Map<String, dynamic> json) => ChecklistStep(
    order: asInt(json['order']) ?? 0,
    title: asString(json['title']) ?? '',
    summary: asString(json['summary']) ?? '',
    url: asString(json['url']),
  );

  final int order;
  final String title;
  final String summary;
  final String? url;
}

@immutable
class GuideSummary {
  const GuideSummary({
    required this.id,
    required this.title,
    required this.organization,
    required this.procedureTypeId,
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
  });

  factory GuideSummary.fromJson(Map<String, dynamic> json) => GuideSummary(
    id: asString(json['id']) ?? '',
    title: asString(json['title']) ?? '',
    organization: asString(json['organization']) ?? '',
    procedureTypeId: asString(json['procedureTypeId']) ?? 'other',
    categoryLabel: asString(json['categoryLabel']) ?? '',
    tags: asStringList(json['tags']),
    status: GuideStatus.fromCode(asString(json['status'])),
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
  );

  final String id;
  final String title;
  final String organization;
  final String procedureTypeId;
  final String categoryLabel;
  final List<String> tags;
  final GuideStatus status;
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
}

@immutable
class GuideSource {
  const GuideSource({
    required this.source,
    required this.sourceLabel,
    required this.externalId,
    required this.fetchedAt,
    this.url,
  });

  factory GuideSource.fromJson(Map<String, dynamic> json) => GuideSource(
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
class GuideDetail {
  const GuideDetail({
    required this.summary,
    required this.checklistSteps,
    required this.sources,
    this.googleCalendarUrl,
  });

  factory GuideDetail.fromJson(Map<String, dynamic> json) => GuideDetail(
    summary: GuideSummary.fromJson(json),
    checklistSteps: asList(json['checklistSteps'], ChecklistStep.fromJson),
    sources: asList(json['sources'], GuideSource.fromJson),
    googleCalendarUrl: asString(json['googleCalendarUrl']),
  );

  final GuideSummary summary;
  final List<ChecklistStep> checklistSteps;
  final List<GuideSource> sources;
  final String? googleCalendarUrl;
}

@immutable
class GuidePage {
  const GuidePage({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.totalPages,
    required this.today,
  });

  factory GuidePage.fromJson(Map<String, dynamic> json) => GuidePage(
    items: asList(json['items'], GuideSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    page: asInt(json['page']) ?? 1,
    pageSize: asInt(json['pageSize']) ?? 20,
    totalPages: asInt(json['totalPages']) ?? 1,
    today: asString(json['today']) ?? '',
  );

  final List<GuideSummary> items;
  final int total;
  final int page;
  final int pageSize;
  final int totalPages;
  final String today;
}

@immutable
class SavedGuideList {
  const SavedGuideList({required this.items, required this.total, required this.today});

  factory SavedGuideList.fromJson(Map<String, dynamic> json) => SavedGuideList(
    items: asList(json['items'], GuideSummary.fromJson),
    total: asInt(json['total']) ?? 0,
    today: asString(json['today']) ?? '',
  );

  final List<GuideSummary> items;
  final int total;
  final String today;
}
