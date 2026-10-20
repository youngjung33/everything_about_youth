import 'package:flutter/material.dart';

import 'app_colors.dart';
import 'app_fonts.dart';

/// 글꼴·굵기·색상을 한곳에서 정한다. 위젯은 `Theme.of(context).textTheme` 만 쓰면 된다.
///
/// 규칙: 제목/라벨은 bold(700), 본문은 regular(400). 글자색은 [AppColors.textPrimary].
class AppTextStyles {
  const AppTextStyles._();

  /// Material 기본 textTheme([base])에 글꼴, 굵기, 색상을 입힌다.
  static TextTheme textTheme(TextTheme base) {
    final themed = base.apply(
      fontFamily: AppFonts.family,
      fontFamilyFallback: AppFonts.fallback,
      displayColor: AppColors.textPrimary,
      bodyColor: AppColors.textPrimary,
    );

    TextStyle? bold(TextStyle? s) => s?.copyWith(fontWeight: AppFonts.bold);
    TextStyle? regular(TextStyle? s) => s?.copyWith(fontWeight: AppFonts.regular);

    return themed.copyWith(
      displayLarge: bold(themed.displayLarge),
      displayMedium: bold(themed.displayMedium),
      displaySmall: bold(themed.displaySmall),
      headlineLarge: bold(themed.headlineLarge),
      headlineMedium: bold(themed.headlineMedium),
      headlineSmall: bold(themed.headlineSmall),
      titleLarge: bold(themed.titleLarge),
      titleMedium: bold(themed.titleMedium),
      titleSmall: bold(themed.titleSmall),
      labelLarge: bold(themed.labelLarge),
      labelMedium: bold(themed.labelMedium),
      labelSmall: bold(themed.labelSmall),
      bodyLarge: regular(themed.bodyLarge),
      bodyMedium: regular(themed.bodyMedium),
      bodySmall: regular(themed.bodySmall),
    );
  }
}
