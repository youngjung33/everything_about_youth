import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../application/providers.dart';
import '../../domain/applicant_profile.dart';
import '../../../../core/theme/app_fonts.dart';

/// '내 조건' 입력. 이 기기에만 저장되며 서버에는 공고를 조회할 때 판정용으로만 전달된다.
class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  late ApplicantProfile _draft;
  late final TextEditingController _age;
  late final TextEditingController _income;

  @override
  void initState() {
    super.initState();
    _draft = ref.read(profileProvider);
    _age = TextEditingController(text: _draft.age?.toString() ?? '');
    _income = TextEditingController(text: _draft.incomeRatioPercent?.toString() ?? '');
  }

  @override
  void dispose() {
    _age.dispose();
    _income.dispose();
    super.dispose();
  }

  ApplicantProfile _current() {
    final age = int.tryParse(_age.text.trim());
    final income = int.tryParse(_income.text.trim());
    return _draft.copyWith(
      age: () => age != null && age >= 0 && age <= 120 ? age : null,
      incomeRatioPercent: () => income != null && income >= 0 && income <= 1000 ? income : null,
    );
  }

  Future<void> _save() async {
    await ref.read(profileProvider.notifier).save(_current());
    if (mounted) context.pop();
  }

  void _clear() {
    setState(() {
      _draft = ApplicantProfile.empty;
      _age.clear();
      _income.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return AppScaffold(
      appBar: AppTopBar(title: const Text('내 조건')),
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: ListView(
            // 입력 중 스크롤하면 키보드가 내려가서 아래 버튼이 가려지지 않는다.
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.all(16),
            children: [
              Text(
                '입력한 조건으로 공고별 신청 가능 여부를 판정합니다. 모든 항목은 선택이며, 입력하지 않으면 "조건 확인 필요"로 표시됩니다.',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 8),
              Text('입력한 정보는 이 기기에만 저장됩니다.', style: TextStyle(fontSize: 12, color: scheme.outline)),
              const SizedBox(height: 20),
              TextField(
                controller: _age,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: '만 나이', hintText: '예: 29', suffixText: '세'),
              ),
              const SizedBox(height: 20),
              _TriState(
                title: '주택 보유',
                yes: '무주택',
                no: '유주택',
                value: _draft.isHomeless,
                onChanged: (v) => setState(() => _draft = _draft.copyWith(isHomeless: () => v)),
              ),
              _TriState(
                title: '혼인 여부',
                yes: '기혼',
                no: '미혼',
                value: _draft.isMarried,
                onChanged: (v) => setState(() => _draft = _draft.copyWith(isMarried: () => v)),
              ),
              _TriState(
                title: '신혼부부 (혼인 7년 이내)',
                yes: '해당',
                no: '비해당',
                value: _draft.isNewlywed,
                onChanged: (v) => setState(() => _draft = _draft.copyWith(isNewlywed: () => v)),
              ),
              _TriState(
                title: '대학생 · 취업준비생',
                yes: '해당',
                no: '비해당',
                value: _draft.isStudent,
                onChanged: (v) => setState(() => _draft = _draft.copyWith(isStudent: () => v)),
              ),
              const SizedBox(height: 4),
              TextField(
                controller: _income,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: '가구 소득 (도시근로자 월평균소득 대비)',
                  hintText: '예: 80',
                  suffixText: '%',
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(onPressed: _save, child: const Text('저장')),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(onPressed: _clear, child: const Text('모두 지우기')),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 미입력 / 예 / 아니오 선택
class _TriState extends StatelessWidget {
  const _TriState({
    required this.title,
    required this.yes,
    required this.no,
    required this.value,
    required this.onChanged,
  });

  final String title;
  final String yes;
  final String no;
  final bool? value;
  final ValueChanged<bool?> onChanged;

  static const _unset = 'unset';

  @override
  Widget build(BuildContext context) {
    final selected = switch (value) {
      true => 'y',
      false => 'n',
      null => _unset,
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: AppFonts.bold)),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: SegmentedButton<String>(
              showSelectedIcon: false,
              segments: [
                const ButtonSegment(value: _unset, label: Text('입력 안 함')),
                ButtonSegment(value: 'y', label: Text(yes)),
                ButtonSegment(value: 'n', label: Text(no)),
              ],
              selected: {selected},
              onSelectionChanged: (s) => onChanged(switch (s.first) {
                'y' => true,
                'n' => false,
                _ => null,
              }),
            ),
          ),
        ],
      ),
    );
  }
}
