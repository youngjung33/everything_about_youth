import 'package:flutter/material.dart';

import '../theme/app_fonts.dart';

/// 아이콘만 두면 기능을 찾기 어려워서, **라벨이 보이는** 빠른 이동 줄.
class ServiceQuickAction {
  const ServiceQuickAction({
    required this.label,
    required this.icon,
    required this.onPressed,
    this.badge,
  });

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;
  final String? badge;
}

class ServiceQuickActions extends StatelessWidget {
  const ServiceQuickActions({super.key, required this.actions, this.accent});

  final List<ServiceQuickAction> actions;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final highlight = accent ?? scheme.primary;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: [
          for (final action in actions) ...[
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Material(
                color: scheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(999),
                child: InkWell(
                  onTap: action.onPressed,
                  borderRadius: BorderRadius.circular(999),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(action.icon, size: 18, color: action.onPressed == null ? scheme.outline : highlight),
                        const SizedBox(width: 6),
                        Text(
                          action.label,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: AppFonts.bold,
                            color: action.onPressed == null ? scheme.outline : scheme.onSurface,
                          ),
                        ),
                        if (action.badge != null) ...[
                          const SizedBox(width: 6),
                          Badge(label: Text(action.badge!), backgroundColor: highlight),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
