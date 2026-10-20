import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_fonts.dart';

/// 앱 로고. 헤더, 메뉴 서랍 등 로고가 필요한 곳은 모두 이 위젯을 쓴다.
///
/// 지금은 임시 마크(아이콘)와 앱 이름이다. 실제 로고 이미지가 생기면 이 위젯의 [_Mark] 만 바꾸면 된다.
class AppLogo extends StatelessWidget {
  const AppLogo({super.key, this.size = 32});

  /// 마크의 한 변 길이
  final double size;

  static const name = '청년의 모든 것';

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: name,
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _Mark(size: size),
          const SizedBox(width: 10),
          Text(
            name,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold, color: AppColors.textPrimary),
          ),
        ],
      ),
    );
  }
}

class _Mark extends StatelessWidget {
  const _Mark({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(size / 4)),
      child: Icon(Icons.diversity_3, size: size * 0.62, color: AppColors.surface),
    );
  }
}
