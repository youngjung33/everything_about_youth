import 'package:flutter/painting.dart';

/// 배경색과 글자색 한 쌍
typedef ColorPair = ({Color background, Color foreground});

/// 앱에서 쓰는 색상. 위젯에서 `Color(0xFF...)` 나 `Colors.white` 를 직접 쓰지 말고 여기에 정의해서 쓴다.
class AppColors {
  const AppColors._();

  // 브랜드
  static const primary = Color(0xFF2563EB);

  // 면
  static const background = Color(0xFFF6F7F9);
  static const surface = Color(0xFFFFFFFF);

  // 글자
  static const textPrimary = Color(0xFF111827);
  static const textSecondary = Color(0xFF4B5563);

  // 상태 (공고 상태, 자격 판정 배지)
  static const ColorPair success = (background: Color(0xFFDCFCE7), foreground: Color(0xFF166534));
  static const ColorPair info = (background: Color(0xFFDBEAFE), foreground: Color(0xFF1E40AF));
  static const ColorPair warning = (background: Color(0xFFFEF3C7), foreground: Color(0xFF92400E));
  static const ColorPair danger = (background: Color(0xFFFEE2E2), foreground: Color(0xFF991B1B));
  static const ColorPair neutral = (background: Color(0xFFE5E7EB), foreground: Color(0xFF4B5563));
}
