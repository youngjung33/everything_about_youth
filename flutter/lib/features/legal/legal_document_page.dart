import 'package:flutter/material.dart';

import '../../core/layout/app_scaffold.dart';
import '../../core/layout/app_top_bar.dart';
import '../../core/layout/centered_scroll_view.dart';

/// 개인정보 처리방침·이용약관 등 긴 문서를 보여주는 공통 화면
class LegalDocumentPage extends StatelessWidget {
  const LegalDocumentPage({super.key, required this.title, required this.sections});

  final String title;
  final List<LegalSection> sections;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppScaffold(
      appBar: AppTopBar(title: Text(title)),
      body: CenteredScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final section in sections) ...[
              Text(section.heading, style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(section.body, style: theme.textTheme.bodyMedium),
              const SizedBox(height: 24),
            ],
          ],
        ),
      ),
    );
  }
}

class LegalSection {
  const LegalSection({required this.heading, required this.body});

  final String heading;
  final String body;
}
