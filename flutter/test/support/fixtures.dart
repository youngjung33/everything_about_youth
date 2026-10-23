import 'package:everything_about_youth/core/network/api_client.dart';
import 'package:everything_about_youth/features/housing/domain/applicant_profile.dart';
import 'package:everything_about_youth/features/housing/domain/housing_filters.dart';
import 'package:everything_about_youth/features/housing/domain/housing_meta.dart';
import 'package:everything_about_youth/features/housing/domain/housing_repository.dart';
import 'package:everything_about_youth/features/housing/domain/notice.dart';

Map<String, dynamic> summaryJson({
  String id = 'n1',
  String title = '청년 행복주택 입주자 모집',
  String status = 'open',
  Map<String, dynamic>? eligibility,
}) => {
  'id': id,
  'title': title,
  'organization': 'LH 한국토지주택공사',
  'supplyType': 'happy',
  'supplyTypeLabel': '행복주택',
  'housingTypes': ['apartment'],
  'housingTypeLabels': ['아파트'],
  'status': status,
  'statusLabel': status == 'open' ? '접수중' : '마감',
  'dday': 'D-3',
  'regions': [
    {'sido': '서울특별시', 'sigungu': '강남구'},
  ],
  'regionLabel': '서울특별시 강남구',
  'applicationStart': '2026-10-01',
  'applicationEnd': '2026-10-16',
  'announcementDate': '2026-09-28',
  'totalHouseholds': 120,
  'minDeposit': 50000000,
  'minMonthlyRent': 250000,
  'minAreaM2': 16.5,
  'maxAreaM2': 26.0,
  'url': 'https://example.com/notice/1',
  'sourceLabels': ['LH청약플러스'],
  'eligibility': eligibility,
};

Map<String, dynamic> detailJson({Map<String, dynamic>? eligibility}) => {
  ...summaryJson(eligibility: eligibility),
  'winnerAnnouncementDate': '2026-11-05',
  'eligibilityText': '문의: 1600-1004',
  'googleCalendarUrl': 'https://calendar.google.com/calendar/render?action=TEMPLATE&dates=20261016%2F20261017',
  'complexes': [
    {
      'name': '강남 A단지',
      'address': '서울특별시 강남구 어딘가 1',
      'region': {'sido': '서울특별시', 'sigungu': '강남구'},
      'housingType': 'apartment',
      'housingTypeLabel': '아파트',
      'households': 120,
      'units': [
        {'name': '16A', 'exclusiveAreaM2': 16.5, 'households': 60, 'deposit': 50000000, 'monthlyRent': 250000},
        {'name': '26B', 'exclusiveAreaM2': 26.0, 'households': 60, 'deposit': null, 'monthlyRent': null},
      ],
    },
  ],
  'sources': [
    {
      'source': 'lh',
      'sourceLabel': 'LH청약플러스',
      'externalId': '123',
      'url': 'https://example.com/notice/1',
      'fetchedAt': '2026-10-12T03:00:00.000Z',
    },
  ],
};

Map<String, dynamic> pageJson({
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

Map<String, dynamic> metaJson() => {
  'dataUpdatedAt': '2026-10-12T01:00:00.000Z',
  'supplyTypes': [
    {'value': 'happy', 'label': '행복주택'},
    {'value': 'national_rental', 'label': '국민임대'},
  ],
  'housingTypes': [
    {'value': 'apartment', 'label': '아파트'},
  ],
  'statuses': [
    {'value': 'upcoming', 'label': '접수예정'},
    {'value': 'open', 'label': '접수중'},
    {'value': 'closed', 'label': '마감'},
  ],
  'verdicts': [
    {'value': 'eligible', 'label': '신청 가능'},
    {'value': 'check', 'label': '조건 확인 필요'},
    {'value': 'ineligible', 'label': '신청 불가'},
  ],
  'sorts': [
    {'value': 'deadline', 'label': '마감 임박순'},
    {'value': 'latest', 'label': '최신 공고순'},
  ],
  'sidos': ['서울특별시', '경기도'],
  'standards': {
    'year': 2026,
    'maxHouseholdSize': 8,
    'urbanWorkerIncome': [3813363, 5866270, 8168429, 8802202, 9326985, 9906263, 10485541, 11064819],
    'medianIncome': [2564238, 4199292, 5359036, 6494738, 7556719, 8555952, 9515150, 10474348],
  },
};

NoticeSummary sampleSummary({String id = 'n1', String title = '청년 행복주택 입주자 모집'}) =>
    NoticeSummary.fromJson(summaryJson(id: id, title: title));

/// 호출을 기록하고 정해진 응답을 돌려주는 가짜 저장소
class FakeHousingRepository implements HousingRepository {
  FakeHousingRepository({
    List<NoticePage>? pages,
    this.meta,
    this.detail,
    this.searchError,
    this.searchHook,
    List<String>? savedIds,
  }) : pages = pages ?? [],
       savedIds = savedIds ?? [];

  /// 1페이지부터 순서대로 돌려줄 페이지
  final List<NoticePage> pages;
  final HousingMeta? meta;
  final NoticeDetail? detail;
  Object? searchError;
  List<String> savedIds;

  /// 검색 응답을 지연시키거나 가로채야 할 때 사용한다.
  Future<NoticePage> Function(HousingFilters filters, int page)? searchHook;

  final List<({HousingFilters filters, ApplicantProfile profile, int page})> searchCalls = [];
  final List<String> saveCalls = [];
  final List<String> unsaveCalls = [];
  final List<List<String>> mergeCalls = [];

  @override
  Future<HousingMeta> fetchMeta() async => meta ?? HousingMeta.fromJson(metaJson());

  @override
  Future<NoticePage> searchNotices({
    required HousingFilters filters,
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
  Future<NoticeDetail> getNotice(String id, {required ApplicantProfile profile}) async {
    if (detail != null) return detail!;
    for (final page in pages) {
      for (final item in page.items) {
        if (item.id == id) {
          return NoticeDetail(summary: item, complexes: const [], sources: const []);
        }
      }
    }
    throw const ApiException('공고를 찾을 수 없습니다.', statusCode: 404);
  }

  @override
  Future<List<String>> fetchSavedIds() async => List.of(savedIds);

  @override
  Future<SavedNoticeList> fetchSaved({required ApplicantProfile profile}) async {
    final items = [
      for (final page in pages)
        for (final item in page.items)
          if (savedIds.contains(item.id)) item,
    ];
    return SavedNoticeList(items: items, total: items.length, today: '2026-10-13');
  }

  @override
  Future<void> saveNotice(String id) async {
    saveCalls.add(id);
    if (!savedIds.contains(id)) savedIds = [id, ...savedIds];
  }

  @override
  Future<void> unsaveNotice(String id) async {
    unsaveCalls.add(id);
    savedIds = [
      for (final e in savedIds)
        if (e != id) e,
    ];
  }

  @override
  Future<List<String>> mergeSaved(List<String> ids) async {
    mergeCalls.add(ids);
    for (final id in ids) {
      if (!savedIds.contains(id)) savedIds = [...savedIds, id];
    }
    return List.of(savedIds);
  }
}
