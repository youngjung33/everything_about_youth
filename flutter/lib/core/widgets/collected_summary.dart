import 'package:flutter/material.dart';

import '../copy/service_copy.dart';

/// 수집된 요약 본문. 없을 때도 안내 문구로 빈 화면을 피한다.
class CollectedSummary extends StatelessWidget {
  const CollectedSummary({super.key, required this.summary, this.style, this.maxLines, this.missingText});

  final String? summary;
  final TextStyle? style;
  final int? maxLines;
  final String? missingText;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final text = summary?.trim();
    if (text != null && text.isNotEmpty) {
      return Text(text, style: style ?? textTheme.bodyLarge, maxLines: maxLines, overflow: maxLines != null ? TextOverflow.ellipsis : null);
    }
    return Text(
      missingText ?? ServiceCopy.missingSummaryBody,
      style: (style ?? textTheme.bodyMedium)?.copyWith(color: Theme.of(context).colorScheme.outline, height: 1.45),
      maxLines: maxLines,
      overflow: maxLines != null ? TextOverflow.ellipsis : null,
    );
  }
}
