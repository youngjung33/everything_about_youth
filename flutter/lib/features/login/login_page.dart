import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_providers.dart';
import '../../core/auth/sso.dart';
import '../../core/layout/app_scaffold.dart';
import '../../core/layout/centered_scroll_view.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_error_code.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_fonts.dart';
import '../../core/widgets/app_logo.dart';
import '../../core/legal/legal_paths.dart';

/// 로그인 화면. 자체 회원가입/로그인은 없고, 소셜 로그인과 "비회원으로 시작하기"만 있다.
///
/// - Google, Apple, 네이버, 카카오 **네 개를 항상 보여준다.**
///   서버에 설정이 있어서 지금 쓸 수 있는 것만 누를 수 있고, 나머지는 "준비 중"으로 비활성이다.
/// - 비회원으로 시작해도 조회는 모두 된다.
/// - 로그인에 성공하면 라우터 가드가 [afterLogin](원래 가려던 화면, 없으면 홈)으로 보낸다.
class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key, this.afterLogin = '/'});

  /// 로그인(또는 비회원 시작) 뒤에 갈 앱 안의 주소
  final String afterLogin;

  static const guestKey = ValueKey('login:guest');
  static ValueKey<String> buttonKey(SsoProvider provider) => ValueKey('login:${provider.id}');

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  /// 지금 로그인 창을 열어 둔 업체. null 이면 아무것도 진행 중이 아니다.
  SsoProvider? _busy;
  String? _error;

  Future<void> _signIn(SsoProvider provider) async {
    setState(() {
      _busy = provider;
      _error = null;
    });
    String? error;
    try {
      // 성공하면 회원이 되고, 라우터 가드가 이 화면에서 내보낸다.
      await ref.read(authActionsProvider).signIn(provider);
    } on SsoCancelledException {
      // 사용자가 직접 닫았으므로 아무 말 없이 돌아온다.
    } on SsoFailedException catch (e) {
      error = e.message;
    } on ApiException catch (e) {
      error = e.message;
      // 서버 설정이 그 사이에 바뀌었다면 목록을 다시 받아 버튼 상태를 맞춘다.
      if (e.code == ApiErrorCode.ssoProviderUnavailable) ref.invalidate(enabledSsoProvidersProvider);
    } on Exception {
      error = '로그인하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }
    if (mounted) {
      setState(() {
        _busy = null;
        _error = error;
      });
    }
  }

  Future<void> _continueAsGuest() async {
    await ref.read(authActionsProvider).continueAsGuest();
    if (mounted) context.go(widget.afterLogin);
  }

  @override
  Widget build(BuildContext context) {
    final enabled = ref.watch(enabledSsoProvidersProvider);
    final theme = Theme.of(context);
    final busy = _busy != null;

    return AppScaffold(
      body: CenteredScrollView(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Center(child: AppLogo(size: 40)),
              const SizedBox(height: 32),
              Text('시작하기', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: AppFonts.bold)),
              const SizedBox(height: 8),
              Text(
                '로그인하지 않아도 모든 공고를 조회할 수 있어요.',
                style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 24),
              for (final provider in SsoProvider.values) ...[
                _SsoButton(
                  provider: provider,
                  // 목록을 받기 전이나 받지 못했을 때는 누를 수 없고, "준비 중"이라고 말하지도 않는다. (모르기 때문)
                  state: switch (enabled) {
                    AsyncData(:final value) =>
                      value.contains(provider.id) ? _Availability.ready : _Availability.preparing,
                    _ => _Availability.unknown,
                  },
                  loading: _busy == provider,
                  locked: busy,
                  onPressed: () => _signIn(provider),
                ),
                const SizedBox(height: 10),
              ],
              if (enabled.hasError) ...[
                Text(
                  '로그인 방법을 불러오지 못했습니다.',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(color: AppColors.danger.foreground),
                ),
                TextButton(
                  key: const ValueKey('login:retry'),
                  onPressed: () => ref.invalidate(enabledSsoProvidersProvider),
                  child: const Text('다시 시도'),
                ),
              ],
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Semantics(
                    liveRegion: true,
                    child: Text(
                      _error!,
                      key: const ValueKey('login:error'),
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodySmall?.copyWith(color: AppColors.danger.foreground),
                    ),
                  ),
                ),
              const SizedBox(height: 6),
              OutlinedButton(
                key: LoginPage.guestKey,
                onPressed: busy ? null : _continueAsGuest,
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                child: const Text('비회원으로 시작하기'),
              ),
              const SizedBox(height: 20),
              Text(
                '로그인해도 이메일이나 이름은 받지 않아요. 로그인 업체가 알려 주는 고유 번호만 저장합니다.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 12),
              Wrap(
                alignment: WrapAlignment.center,
                spacing: 8,
                children: [
                  TextButton(onPressed: () => context.push(LegalPaths.privacy), child: const Text('개인정보 처리방침')),
                  TextButton(onPressed: () => context.push(LegalPaths.terms), child: const Text('이용약관')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 서버에서 이 로그인 방법을 쓸 수 있는지
enum _Availability { ready, preparing, unknown }

class _SsoButton extends StatelessWidget {
  const _SsoButton({
    required this.provider,
    required this.state,
    required this.loading,
    required this.locked,
    required this.onPressed,
  });

  final SsoProvider provider;
  final _Availability state;
  final bool loading;

  /// 다른 로그인이 진행 중이라 모두 누를 수 없다.
  final bool locked;
  final VoidCallback onPressed;

  ColorPair get _brand => switch (provider) {
    SsoProvider.google => AppColors.brandGoogle,
    SsoProvider.apple => AppColors.brandApple,
    SsoProvider.naver => AppColors.brandNaver,
    SsoProvider.kakao => AppColors.brandKakao,
  };

  Widget get _mark => switch (provider) {
    SsoProvider.google => const Text('G', style: TextStyle(fontWeight: AppFonts.bold, fontSize: 18)),
    SsoProvider.apple => const Icon(Icons.apple, size: 22),
    SsoProvider.naver => const Text('N', style: TextStyle(fontWeight: AppFonts.bold, fontSize: 18)),
    SsoProvider.kakao => const Icon(Icons.chat_bubble, size: 18),
  };

  @override
  Widget build(BuildContext context) {
    final ready = state == _Availability.ready;
    final active = ready && !locked;

    return FilledButton(
      key: LoginPage.buttonKey(provider),
      onPressed: active ? onPressed : null,
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(48),
        backgroundColor: _brand.background,
        foregroundColor: _brand.foreground,
        // 쓸 수 없을 때는 브랜드 색을 빼서 한눈에 비활성임을 알게 한다. (진행 중인 버튼은 색을 유지한다)
        disabledBackgroundColor: loading ? _brand.background : AppColors.neutral.background,
        disabledForegroundColor: loading ? _brand.foreground : AppColors.neutral.foreground.withValues(alpha: 0.7),
        side: provider == SsoProvider.google && ready ? const BorderSide(color: AppColors.brandGoogleBorder) : null,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 24,
            child: loading
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5))
                : Center(child: _mark),
          ),
          const SizedBox(width: 10),
          Flexible(child: Text('${provider.label}로 계속하기', overflow: TextOverflow.ellipsis)),
          if (state == _Availability.preparing) ...[
            const SizedBox(width: 8),
            const Text('준비 중', style: TextStyle(fontSize: 12)),
          ],
        ],
      ),
    );
  }
}
