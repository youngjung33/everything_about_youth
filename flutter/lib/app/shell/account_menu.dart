import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_mode.dart';
import '../../core/auth/auth_providers.dart';
import '../../core/network/api_client.dart';
import '../../core/providers/core_providers.dart';
import '../../core/theme/app_colors.dart';
import '../paths.dart';

/// 헤더 오른쪽의 계정 메뉴.
///
/// - 비회원: "로그인" (누르면 로그인 화면. 로그인하고 나면 지금 보던 화면으로 돌아온다)
/// - 회원: 계정 아이콘 → 로그아웃, 회원 탈퇴
///
/// [compact] 이면 좁은 화면이라 글자 없이 아이콘만 둔다.
class AccountMenu extends ConsumerWidget {
  const AccountMenu({super.key, required this.location, required this.compact});

  /// 지금 보고 있는 주소. 로그인하고 돌아올 곳이다.
  final String location;
  final bool compact;

  static const loginKey = ValueKey('account:login');
  static const menuKey = ValueKey('account:menu');
  static const logoutKey = ValueKey('account:logout');
  static const deleteKey = ValueKey('account:delete');

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(authModeProvider);

    if (mode == AuthMode.none) return const SizedBox.shrink();

    if (mode == AuthMode.guest) {
      void toLogin() => context.go(loginLocation(from: location));
      return Padding(
        padding: const EdgeInsets.only(right: 8),
        child: compact
            ? IconButton(key: loginKey, tooltip: '로그인', icon: const Icon(Icons.login), onPressed: toLogin)
            : TextButton.icon(
                key: loginKey,
                onPressed: toLogin,
                icon: const Icon(Icons.login, size: 20),
                label: const Text('로그인'),
              ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: PopupMenuButton<_AccountAction>(
        key: menuKey,
        tooltip: '계정',
        icon: const Icon(Icons.account_circle_outlined),
        onSelected: (action) => switch (action) {
          _AccountAction.logout => _logout(context, ref),
          _AccountAction.delete => _confirmDelete(context, ref),
        },
        itemBuilder: (context) => const [
          PopupMenuItem(key: logoutKey, value: _AccountAction.logout, child: Text('로그아웃')),
          PopupMenuItem(key: deleteKey, value: _AccountAction.delete, child: Text('회원 탈퇴')),
        ],
      ),
    );
  }

  Future<void> _logout(BuildContext context, WidgetRef ref) async {
    await ref.read(authActionsProvider).signOut();
    // 라우터 가드가 로그인 화면으로 보낸다.
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('회원 탈퇴'),
        content: const Text('탈퇴하면 로그인 정보가 서버에서 삭제되고 되돌릴 수 없어요.\n정말 탈퇴할까요?'),
        actions: [
          TextButton(
            key: const ValueKey('account:delete-cancel'),
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('취소'),
          ),
          TextButton(
            key: const ValueKey('account:delete-confirm'),
            style: TextButton.styleFrom(foregroundColor: AppColors.danger.foreground),
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('탈퇴'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      await ref.read(authActionsProvider).deleteAccount();
    } on ApiException catch (e) {
      // 서버에서 지우지 못했다면 로그인 상태가 그대로이므로, 이유를 알리고 다시 시도할 수 있게 둔다.
      messenger?.showSnackBar(SnackBar(content: Text('탈퇴하지 못했습니다. ${e.message}')));
    }
  }
}

enum _AccountAction { logout, delete }
