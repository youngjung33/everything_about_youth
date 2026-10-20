import 'package:flutter/material.dart';

import '../layout/system_ui.dart';
import 'app_colors.dart';
import 'app_fonts.dart';
import 'app_text_styles.dart';

/// 앱 테마. 색상은 [AppColors], 글꼴·글자 스타일은 [AppFonts]/[AppTextStyles] 에서 정한 것을 모아 만든다.
class AppTheme {
  const AppTheme._();

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: AppColors.primary, surface: AppColors.surface);
    final base = ThemeData(useMaterial3: true, fontFamily: AppFonts.family, colorScheme: scheme);

    return base.copyWith(
      textTheme: AppTextStyles.textTheme(base.textTheme),
      scaffoldBackgroundColor: AppColors.background,
      // 모든 상단바의 모양. 평평하고 아래 구분선만 둔다. (그림자 대신 선이라 상단바가 겹쳐도 지저분하지 않다)
      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        shape: Border(bottom: BorderSide(color: scheme.outlineVariant)),
        systemOverlayStyle: AppSystemUi.style,
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: AppColors.surface,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: scheme.outlineVariant),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        isDense: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
