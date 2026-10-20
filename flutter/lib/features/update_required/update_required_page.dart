import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/launch.dart';
import '../../core/layout/app_scaffold.dart';
import '../../core/layout/centered_scroll_view.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_fonts.dart';
import '../../core/update/update_gate.dart';
import '../../core/widgets/app_logo.dart';

/// 앱을 업데이트해야만 쓸 수 있을 때 앱 전체를 대신하는 화면. (헤더·메뉴 없음, 뒤로 가기로 나갈 수 없다)
///
/// 서버가 최소 버전을 올렸거나(`APP_UPDATE_REQUIRED`) 이 앱이 쓰는 API 버전을 닫았을 때(`API_VERSION_UNSUPPORTED`)
/// [UpdateGate] 가 켜지고 라우터가 이 화면으로 보낸다.
class UpdateRequiredPage extends ConsumerWidget {
  const UpdateRequiredPage({super.key});

  static const buttonKey = ValueKey('update-button');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requirement = ref.watch(updateGateProvider);
    final textTheme = Theme.of(context).textTheme;
    final storeUrl = requirement?.storeUrl;

    return PopScope(
      canPop: false,
      child: AppScaffold(
        backgroundColor: AppColors.surface,
        body: CenteredScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const AppLogo(),
              const SizedBox(height: 32),
              Icon(Icons.system_update_outlined, size: 48, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 16),
              Text(
                '업데이트가 필요합니다',
                textAlign: TextAlign.center,
                style: textTheme.titleLarge?.copyWith(fontWeight: AppFonts.bold),
              ),
              const SizedBox(height: 8),
              Text(
                requirement?.message ?? '앱을 최신 버전으로 업데이트해야 사용할 수 있습니다.',
                textAlign: TextAlign.center,
                style: textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 24),
              if (storeUrl != null)
                FilledButton.icon(
                  key: buttonKey,
                  onPressed: () => openExternal(context, storeUrl),
                  icon: const Icon(Icons.open_in_new),
                  label: const Text('업데이트하기'),
                )
              else
                Text(
                  // 웹은 서버와 같이 배포되므로 새로고침하면 최신이 된다. 모바일은 스토어 주소를 모를 때의 안내.
                  kIsWeb ? '페이지를 새로고침해 주세요.' : '앱 스토어에서 최신 버전으로 업데이트해 주세요.',
                  textAlign: TextAlign.center,
                  style: textTheme.bodyMedium,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
