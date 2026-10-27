import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/widgets/app_logo.dart';
import '../../core/legal/legal_paths.dart';

/// 모든 화면 아래에 붙는 푸터. 서비스가 늘어도 문구가 맞도록 특정 서비스를 언급하지 않는다.
///
/// 배경 색칠과 하단 안전 영역(홈 인디케이터, 내비게이션바)은 [AppScaffold] 의 `bottomBar` 가 처리한다.
/// 여기서는 내용과 안쪽 여백만 정한다.
class AppFooter extends StatelessWidget {
  const AppFooter({super.key, required this.wide, this.year});

  /// 한 줄로 펼칠지(넓은 화면), 두 줄로 쌓을지(좁은 화면)
  final bool wide;

  /// 저작권 연도. 테스트에서 고정할 때만 넘기고, 보통은 올해.
  final int? year;

  static const disclaimer = '제공하는 정보는 참고용입니다. 신청 전에 반드시 각 기관의 원문 공고를 확인하세요.';

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final small = Theme.of(context).textTheme.bodySmall?.copyWith(color: AppColors.textSecondary);
    final copyright = Text('© ${year ?? DateTime.now().year} ${AppLogo.name}', style: small);
    final notice = Text(disclaimer, style: small);
    final legal = Wrap(
      spacing: 8,
      runSpacing: 4,
      children: [
        TextButton(onPressed: () => context.push(LegalPaths.privacy), child: const Text('개인정보 처리방침')),
        TextButton(onPressed: () => context.push(LegalPaths.terms), child: const Text('이용약관')),
        TextButton(onPressed: () => context.push(LegalPaths.licenses), child: const Text('오픈소스')),
      ],
    );

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: scheme.outlineVariant)),
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: wide ? 24 : 16, vertical: wide ? 14 : 10),
        child: wide
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      copyright,
                      const SizedBox(width: 24),
                      Expanded(child: notice),
                    ],
                  ),
                  legal,
                ],
              )
            : Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [notice, const SizedBox(height: 2), copyright, legal],
              ),
      ),
    );
  }
}
