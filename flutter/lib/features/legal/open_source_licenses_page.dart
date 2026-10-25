import 'package:flutter/material.dart';

import '../../core/layout/app_scaffold.dart';
import '../../core/layout/app_top_bar.dart';

/// 오픈소스 라이선스 (Flutter 기본 화면)
class OpenSourceLicensesPage extends StatelessWidget {
  const OpenSourceLicensesPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      appBar: AppTopBar(title: const Text('오픈소스 라이선스')),
      body: const LicensePage(),
    );
  }
}
