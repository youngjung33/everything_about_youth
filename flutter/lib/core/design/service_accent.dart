import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// 서비스별 시각·문구 토큰. 홈·목록·카드에서 같은 인지(색·아이콘·명사)를 쓴다.
enum ServiceAccent {
  housing(
    id: 'housing',
    title: '임대주택',
    itemNoun: '공고',
    tagline: 'LH·SH·마이홈 등 임대·분양 공고를 한곳에서',
    accent: AppColors.primary,
    icon: Icons.apartment_outlined,
  ),
  benefits(
    id: 'benefits',
    title: '청년 혜택',
    itemNoun: '정책',
    tagline: '주거·일자리·생활 지원 정책과 마감 일정',
    accent: Color(0xFF0D9488),
    icon: Icons.volunteer_activism_outlined,
  );

  const ServiceAccent({
    required this.id,
    required this.title,
    required this.itemNoun,
    required this.tagline,
    required this.accent,
    required this.icon,
  });

  final String id;
  final String title;
  final String itemNoun;
  final String tagline;
  final Color accent;
  final IconData icon;

  Color containerColor(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Color.alphaBlend(accent.withValues(alpha: 0.12), scheme.surface);
  }

  Color onContainerColor(BuildContext context) {
    return accent;
  }
}
