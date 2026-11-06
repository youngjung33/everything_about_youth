import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/living/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/living/domain/living_filters.dart';
import 'package:everything_about_youth/features/living/domain/living_meta.dart';
import 'package:everything_about_youth/features/living/domain/living_repository.dart';
import 'package:everything_about_youth/features/living/domain/living_guide.dart';

Map<String, dynamic> schemeSummaryJson({
  String id = 'b1',
  String title = '청년 월세 지원',
  String status = 'open',
  Map<String, dynamic>? eligibility,
}) => {
  'id': id,
  'title': title,
  'organization': '서울시',
  'procedureTypeId': 'move_in',
  'categoryLabel': '전세·주택자금대출',
  'tags': ['월세', '청년'],
  'status': status,
  'statusLabel': status == 'open' ? '신청중' : '마감',
  'dday': 'D-8',
  'regions': [
    {'sido': '서울', 'sigungu': ''},
  ],
  'regionLabel': '서울',
  'applicationStart': '2026-10-01',
  'applicationEnd': '2026-10-20',
  'announcementDate': '2026-09-25',
  'summary': '만 19~39세 무주택 청년 월세 지원',
  'url': 'https://example.com/b1',
  'sourceLabels': ['데모 데이터'],
  'eligibility': eligibility,
};

Map<String, dynamic> schemeDetailJson({Map<String, dynamic>? eligibility}) => {
  ...schemeSummaryJson(eligibility: eligibility),
  'checklistSteps': [
    {'order': 1, 'title': '준비', 'summary': '서류 확인', 'url': null},
  ],
  'googleCalendarUrl': 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  'sources': [
    {
      'source': 'demo',
      'sourceLabel': '데모 데이터',
      'externalId': 'demo-1',
      'url': 'https://example.com/demo/1',
      'fetchedAt': '2026-10-11T00:00:00.000Z',
    },
  ],
};

Map<String, dynamic> schemePageJson({
  required List<Map<String, dynamic>> items,
  int total = 0,
  int page = 1,
  int totalPages = 1,
}) => {
  'items': items,
  'total': total == 0 ? items.length : total,
  'page': page,
  'pageSize': 20,
  'totalPages': totalPages,
  'today': '2026-10-13',
};

Map<String, dynamic> livingMetaJson() => {
  'dataUpdatedAt': '2026-10-12T01:00:00.000Z',
  'procedureTypes': [
    {'value': 'move_in', 'label': '전입·전출'},
    {'value': 'lease', 'label': '임대차·확정일자'},
  ],
  'statuses': [
    {'value': 'upcoming', 'label': '예정'},
    {'value': 'open', 'label': '진행중'},
    {'value': 'closed', 'label': '종료'},
  ],
  'sorts': [
    {'value': 'deadline', 'label': '마감 임박순'},
    {'value': 'latest', 'label': '최신 안내순'},
  ],
  'sidos': ['서울', '경기'],
};

GuideSummary sampleGuideSummary({String id = 'b1', String title = '청년 전세자금'}) =>
    GuideSummary.fromJson(schemeSummaryJson(id: id, title: title));

class FakeLivingRepository implements LivingRepository {
  FakeLivingRepository({
    List<GuidePage>? pages,
    this.meta,
    this.detail,
    this.searchError,
    this.fetchMetaError,
    this.getGuideError,
    this.fetchSavedError,
    this.saveError,
    this.unsaveError,
    this.mergeError,
    this.searchHook,
    List<String>? savedIds,
  }) : pages = pages ?? [],
       savedIds = savedIds ?? [];

  final List<GuidePage> pages;
  final LivingMeta? meta;
  final GuideDetail? detail;
  Object? searchError;
  Object? fetchMetaError;
  Object? getGuideError;
  Object? fetchSavedError;
  Object? saveError;
  Object? unsaveError;
  Object? mergeError;
  List<String> savedIds;

  Future<GuidePage> Function(LivingFilters filters, int page)? searchHook;

  final List<({LivingFilters filters, ApplicantProfile profile, int page})> searchCalls = [];
  final List<String> saveCalls = [];
  final List<String> unsaveCalls = [];
  final List<List<String>> mergeCalls = [];

  @override
  Future<LivingMeta> fetchMeta() async {
    if (fetchMetaError != null) throw fetchMetaError!;
    return meta ?? LivingMeta.fromJson(livingMetaJson());
  }

  @override
  Future<GuidePage> searchGuides({
    required LivingFilters filters,
    required ApplicantProfile profile,
    int page = 1,
    int pageSize = 20,
  }) async {
    searchCalls.add((filters: filters, profile: profile, page: page));
    if (searchError != null) throw searchError!;
    if (searchHook != null) return searchHook!(filters, page);
    return pages[page - 1];
  }

  @override
  Future<GuideDetail> getGuide(String id, {required ApplicantProfile profile}) async {
    if (getGuideError != null) throw getGuideError!;
    if (detail != null) return detail!;
    for (final page in pages) {
      for (final item in page.items) {
        if (item.id == id) {
          return GuideDetail(summary: item, checklistSteps: const [], sources: const []);
        }
      }
    }
    throw const ApiException('정책을 찾을 수 없습니다.', statusCode: 404);
  }

  @override
  Future<List<String>> fetchSavedIds() async => List.of(savedIds);

  @override
  Future<SavedGuideList> fetchSaved({required ApplicantProfile profile}) async {
    if (fetchSavedError != null) throw fetchSavedError!;
    final items = [
      for (final page in pages)
        for (final item in page.items)
          if (savedIds.contains(item.id)) item,
    ];
    return SavedGuideList(items: items, total: items.length, today: '2026-10-13');
  }

  @override
  Future<void> saveGuide(String id) async {
    if (saveError != null) throw saveError!;
    saveCalls.add(id);
    if (!savedIds.contains(id)) savedIds = [id, ...savedIds];
  }

  @override
  Future<void> unsaveGuide(String id) async {
    if (unsaveError != null) throw unsaveError!;
    unsaveCalls.add(id);
    savedIds = [
      for (final e in savedIds)
        if (e != id) e,
    ];
  }

  @override
  Future<List<String>> mergeSaved(List<String> ids) async {
    if (mergeError != null) throw mergeError!;
    mergeCalls.add(ids);
    for (final id in ids) {
      if (!savedIds.contains(id)) savedIds = [...savedIds, id];
    }
    return List.of(savedIds);
  }
}
