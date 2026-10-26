import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/core_providers.dart';
import 'app_update_info_holder.dart';
import 'update_requirement.dart';

const _dismissPrefix = 'optional_update_dismissed_';

/// 서버가 `optional` 업데이트를 알려 주면 상단에 배너를 띄운다. 닫으면 해당 `latestVersion` 은 다시 보지 않는다.
class OptionalUpdateBanner extends ConsumerStatefulWidget {
  const OptionalUpdateBanner({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<OptionalUpdateBanner> createState() => _OptionalUpdateBannerState();
}

class _OptionalUpdateBannerState extends ConsumerState<OptionalUpdateBanner> {
  String? _dismissedKey;

  String? _versionKey(AppUpdateInfo info) => info.latestVersion ?? info.minVersion;

  bool _shouldShow(AppUpdateInfo info) {
    final key = '$_dismissPrefix${_versionKey(info) ?? 'unknown'}';
    if (_dismissedKey == key) return false;
    return ref.read(sharedPreferencesProvider).getBool(key) != true;
  }

  Future<void> _dismiss(AppUpdateInfo info) async {
    final key = '$_dismissPrefix${_versionKey(info) ?? 'unknown'}';
    await ref.read(sharedPreferencesProvider).setBool(key, true);
    setState(() => _dismissedKey = key);
  }

  Future<void> _openStore(String? url) async {
    if (url == null || url.isEmpty) return;
    final uri = Uri.tryParse(url);
    if (uri != null) await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final info = ref.watch(appUpdateInfoProvider);
    if (info == null || info.status != UpdateStatus.optional || !_shouldShow(info)) {
      return widget.child;
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        MaterialBanner(
          content: Text(info.message ?? '새 버전이 있습니다. 업데이트를 권장합니다.'),
          actions: [
            TextButton(onPressed: () => _dismiss(info), child: const Text('나중에')),
            if (info.storeUrl != null)
              TextButton(onPressed: () => _openStore(info.storeUrl), child: const Text('업데이트')),
          ],
        ),
        Expanded(child: widget.child),
      ],
    );
  }
}
