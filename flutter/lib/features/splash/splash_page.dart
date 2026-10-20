import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/bootstrap/bootstrap_controller.dart';
import '../../core/layout/app_scaffold.dart';
import '../../core/theme/app_colors.dart';
import '../../core/widgets/state_views.dart';
import 'splash_brand.dart';

/// 시작 작업이 끝날 때까지 보이는 화면.
///
/// 스스로 다른 화면으로 넘어가지 않는다. 작업이 끝나면 라우터 가드(`app/router.dart`)가
/// 원래 가려던 화면으로 보낸다. 이 화면은 진행 중(로딩)과 실패(다시 시도)만 보여준다.
///
/// 배경을 흰색으로 둔 이유: 네이티브 런치 화면(흰색)과 웹 로딩 화면에서 끊김 없이 이어지게 하려는 것.
class SplashPage extends ConsumerWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final boot = ref.watch(bootstrapProvider);
    final failed = boot.hasError && !boot.isLoading;

    // 안전 영역(노치, 홈 인디케이터, 내비게이션바)은 AppScaffold 가 처리한다.
    return AppScaffold(
      backgroundColor: AppColors.surface,
      body: failed
          ? ErrorView(message: '앱을 시작하지 못했습니다.\n잠시 후 다시 시도해 주세요.', onRetry: () => ref.invalidate(bootstrapProvider))
          : const Column(
              children: [
                Expanded(child: Center(child: SplashBrand())),
                InlineLoading(padding: EdgeInsets.only(bottom: 56)),
              ],
            ),
    );
  }
}
