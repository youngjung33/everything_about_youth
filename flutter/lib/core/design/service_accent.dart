import 'package:flutter/material.dart';

import '../copy/service_copy.dart';
import '../theme/app_colors.dart';

/// 서비스(Microservice)별 시각·문구 토큰. 홈·목록·카드에서 같은 인지(색·아이콘·명사)를 쓴다.
enum ServiceAccent {
  housing(
    id: 'housing',
    title: '임대주택',
    navTitle: '임대주택',
    itemNoun: '공고',
    itemAccusative: '공고를',
    itemSubjectJosa: '가',
    tagline: 'LH·SH·마이홈 등 임대·분양 공고를 한곳에서',
    accent: AppColors.primary,
    icon: Icons.apartment_outlined,
  ),
  benefits(
    id: 'benefits',
    title: '청년 혜택',
    navTitle: '청년 혜택',
    itemNoun: '정책',
    itemAccusative: '정책을',
    itemSubjectJosa: '이',
    tagline: '주거·일자리·생활 지원 정책과 마감 일정',
    accent: Color(0xFF0D9488),
    icon: Icons.volunteer_activism_outlined,
  ),
  finance(
    id: 'finance',
    title: '청년 주거·자금',
    navTitle: '주거·자금',
    itemNoun: '제도',
    itemAccusative: '제도를',
    itemSubjectJosa: '가',
    tagline: '전세·보증금·청약저축 등 주거 자금 제도',
    accent: Color(0xFF2563EB),
    icon: Icons.account_balance_outlined,
  ),
  jobs(
    id: 'jobs',
    title: '청년·공공 일자리',
    navTitle: '일자리',
    itemNoun: '공고',
    itemAccusative: '공고를',
    itemSubjectJosa: '가',
    tagline: '청년·신입·공공 채용 공고를 모아 보고, 내 조건으로 지원 가능 여부를 참고합니다',
    accent: Color(0xFF7C3AED),
    icon: Icons.work_outline,
  ),
  living(
    id: 'living',
    title: '이사·생활',
    navTitle: '이사·생활',
    itemNoun: '안내',
    itemAccusative: '안내를',
    itemSubjectJosa: '가',
    tagline: '전입·임대차·이사 등 생활 절차 안내를 한곳에서',
    accent: Color(0xFFEA580C),
    icon: Icons.home_work_outlined,
  );

  const ServiceAccent({
    required this.id,
    required this.title,
    required this.navTitle,
    required this.itemNoun,
    required this.itemAccusative,
    required this.itemSubjectJosa,
    required this.tagline,
    required this.accent,
    required this.icon,
  });

  final String id;
  final String title;
  /// 헤더 가로 메뉴용 짧은 이름(잘림 방지). 홈 카드 등에는 [title] 을 쓴다.
  final String navTitle;
  final String itemNoun;
  /// 목록·저장 화면 로딩 문구용 (예: 공고를, 정책을).
  final String itemAccusative;
  /// 주어 조사 (이/가). 빈 목록·저장 목록 안내 문구에 쓴다.
  final String itemSubjectJosa;
  final String tagline;
  final Color accent;
  final IconData icon;

  String get listLoadingMessage => '$itemAccusative 불러오는 중…';

  String listHeaderTitle({required bool onlyEligible}) =>
      onlyEligible ? '신청·지원 가능한 $itemNoun' : '$itemNoun 목록';

  String get emptyListMessage => '조건에 맞는 $itemNoun$itemSubjectJosa 없습니다.';

  String get detailAppBarTitle => '$itemNoun 상세';

  String get detailLoadingMessage => '$itemNoun 상세를 불러오는 중…';

  String get detailOverviewSectionTitle => '$itemNoun 개요';

  String get savedAppBarTitle => '관심 $itemNoun';

  String get savedLoadingMessage => '관심 $itemAccusative 불러오는 중…';

  String get savedReminderSubtitle => '관심 $itemNoun의 접수 시작·마감 하루 전·당일 오전 9시(한국 시간)에 알려 줍니다.';

  String get savedEmptyMessage => '저장한 관심 $itemNoun$itemSubjectJosa 없습니다.';

  String get savedEmptyHint => '$itemNoun 카드의 북마크를 눌러 저장하세요.';

  String get savedQuickActionLabel => '관심 $itemNoun';

  String savedBookmarkTooltip({required bool saved}) =>
      saved ? '관심 $itemNoun에서 빼기' : '관심 $itemNoun으로 저장';

  String get searchFieldLabel => '검색어 ($itemNoun명/기관/요약)';

  String get bootstrapSavedTaskName => '관심 $itemNoun 불러오기';

  String get bootstrapListPrefetchName => '$itemNoun 목록 미리 불러오기';

  String get officialLinkButtonLabel =>
      id == 'housing' || id == 'jobs' ? ServiceCopy.officialNoticeButtonLabel : ServiceCopy.officialPolicyButtonLabel;

  Color containerColor(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Color.alphaBlend(accent.withValues(alpha: 0.12), scheme.surface);
  }

  Color onContainerColor(BuildContext context) {
    return accent;
  }
}
