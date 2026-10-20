import 'package:everything_about_youth/core/theme/app_colors.dart';
import 'package:everything_about_youth/core/theme/app_fonts.dart';
import 'package:everything_about_youth/core/theme/app_theme.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AppFonts.familyFor', () {
    test('Android 글꼴을 정하지 않았으면 모든 플랫폼이 Pretendard', () {
      expect(AppFonts.android, isNull, reason: '글꼴을 등록하면 이 테스트도 같이 고친다');
      for (final platform in TargetPlatform.values) {
        expect(AppFonts.familyFor(platform, isWeb: false), 'Pretendard');
        expect(AppFonts.familyFor(platform, isWeb: true), 'Pretendard');
      }
    });

    test('Android 글꼴이 있으면 Android 앱만 그 글꼴을 쓴다 (iOS, 웹은 Pretendard)', () {
      String family(TargetPlatform p, {bool web = false}) => AppFonts.familyFor(p, isWeb: web, androidFamily: 'Roboto');

      expect(family(TargetPlatform.android), 'Roboto');
      expect(family(TargetPlatform.iOS), 'Pretendard');
      expect(family(TargetPlatform.android, web: true), 'Pretendard');
    });

    test('굵기는 400/700 두 가지뿐', () {
      expect(AppFonts.regular, FontWeight.w400);
      expect(AppFonts.bold, FontWeight.w700);
    });
  });

  group('AppTheme', () {
    final text = AppTheme.light().textTheme;

    test('모든 글자 스타일에 글꼴, 대체 글꼴, 글자색이 적용된다', () {
      final styles = [
        text.displayLarge,
        text.headlineMedium,
        text.titleLarge,
        text.titleSmall,
        text.bodyLarge,
        text.bodyMedium,
        text.bodySmall,
        text.labelLarge,
        text.labelSmall,
      ];
      for (final s in styles) {
        expect(s?.fontFamily, 'Pretendard');
        expect(s?.fontFamilyFallback, AppFonts.fallback);
        expect(s?.color, AppColors.textPrimary);
      }
    });

    test('제목/라벨은 bold, 본문은 regular 만 쓴다', () {
      for (final s in [text.headlineSmall, text.titleLarge, text.titleMedium, text.labelLarge]) {
        expect(s?.fontWeight, AppFonts.bold);
      }
      for (final s in [text.bodyLarge, text.bodyMedium, text.bodySmall]) {
        expect(s?.fontWeight, AppFonts.regular);
      }
    });

    test('배경과 카드 색은 AppColors 를 따른다', () {
      final theme = AppTheme.light();
      expect(theme.scaffoldBackgroundColor, AppColors.background);
      expect(theme.cardTheme.color, AppColors.surface);
    });
  });
}
