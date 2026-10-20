import 'package:flutter/material.dart';

import '../../core/feature/feature_module.dart';

/// 헤더 메뉴와 모바일 서랍 메뉴에 나오는 항목 하나
@immutable
class AppMenuItem {
  const AppMenuItem({required this.label, required this.icon, required this.path});

  final String label;
  final IconData icon;
  final String path;

  static const homePath = '/';

  /// [location](현재 주소의 path)이 이 항목에 속하는지. 홈은 정확히 `/` 일 때만, 서비스는 그 아래 모든 경로.
  bool matches(String location) {
    if (path == homePath) return location == homePath;
    return location == path || location.startsWith('$path/');
  }

  @override
  bool operator ==(Object other) =>
      other is AppMenuItem && other.label == label && other.icon == icon && other.path == path;

  @override
  int get hashCode => Object.hash(label, icon, path);
}

/// 메뉴는 "홈 + 켜져 있는 서비스"다. 서비스가 늘거나 서버에서 꺼지면 메뉴도 저절로 따라 바뀐다.
/// (어떤 서비스가 있는지는 모르고, 서비스가 알려 준 이름·아이콘·경로만 쓴다)
List<AppMenuItem> buildMenuItems(Iterable<FeatureModule> enabled) => [
  const AppMenuItem(label: '홈', icon: Icons.home_outlined, path: AppMenuItem.homePath),
  for (final f in enabled) AppMenuItem(label: f.entry.title, icon: f.entry.icon, path: f.basePath),
];
