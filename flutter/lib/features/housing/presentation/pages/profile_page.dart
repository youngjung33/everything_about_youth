import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/format/format.dart';
import '../../../../core/layout/app_scaffold.dart';
import '../../../../core/layout/app_top_bar.dart';
import '../../../../core/theme/app_fonts.dart';
import '../providers.dart';
import '../../domain/applicant_profile.dart';

/// '내 조건' 입력. 이 기기에만 저장되며 서버에는 공고를 조회할 때 판정용으로만 전달된다.
class ProfilePage extends ConsumerStatefulWidget {
  const ProfilePage({super.key});

  @override
  ConsumerState<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends ConsumerState<ProfilePage> {
  late ApplicantProfile _draft;
  late final TextEditingController _age;
  late final TextEditingController _monthly;
  late final TextEditingController _asset;
  late final TextEditingController _car;

  @override
  void initState() {
    super.initState();
    _draft = ref.read(profileProvider);
    _age = TextEditingController(text: _draft.age?.toString() ?? '');
    _monthly = TextEditingController(text: _draft.monthlyIncomeMan?.toString() ?? '');
    _asset = TextEditingController(text: _draft.totalAssetMan?.toString() ?? '');
    _car = TextEditingController(text: _draft.carValueMan?.toString() ?? '');
  }

  @override
  void dispose() {
    _age.dispose();
    _monthly.dispose();
    _asset.dispose();
    _car.dispose();
    super.dispose();
  }

  /// 범위 안의 정수만 값으로 인정한다. 비었거나 범위를 벗어나면 null(입력 안 함).
  static int? _intIn(TextEditingController c, int max) {
    final n = int.tryParse(c.text.trim());
    return n != null && n >= 0 && n <= max ? n : null;
  }

  ApplicantProfile _current() {
    return _draft.copyWith(
      age: () => _intIn(_age, 120),
      monthlyIncomeMan: () => _intIn(_monthly, ApplicantProfile.maxMonthlyIncomeMan),
      totalAssetMan: () => _intIn(_asset, ApplicantProfile.maxAmountMan),
      carValueMan: () => _intIn(_car, ApplicantProfile.maxAmountMan),
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
      _monthly.clear();
      _asset.clear();
      _car.clear();
    });
  }

  void _update(ApplicantProfile Function(ApplicantProfile) change) => setState(() => _draft = change(_draft));

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final current = _current();
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
                '입력한 조건으로 공고별 신청 가능 여부를 판정합니다. 모든 항목은 선택이며, 입력하지 않은 항목은 "조건 확인 필요"로 표시됩니다.',
                style: TextStyle(color: scheme.onSurfaceVariant),
              ),
              const SizedBox(height: 8),
              Text('입력한 정보는 이 기기에만 저장됩니다.', style: TextStyle(fontSize: 12, color: scheme.outline)),
              const SizedBox(height: 20),

              const _SectionTitle('기본 정보'),
              _AmountField(
                controller: _age,
                label: '만 나이',
                hint: '예: 29',
                suffix: '세',
                onChanged: () => setState(() {}),
              ),
              const SizedBox(height: 20),
              _TriState(
                title: '주택 보유',
                yes: '무주택',
                no: '유주택',
                value: _draft.isHomeless,
                onChanged: (v) => _update((p) => p.copyWith(isHomeless: () => v)),
              ),
              _TriState(
                title: '혼인 여부',
                yes: '기혼',
                no: '미혼',
                value: _draft.isMarried,
                onChanged: (v) => _update((p) => p.copyWith(isMarried: () => v)),
              ),
              _TriState(
                title: '신혼부부 (혼인 7년 이내)',
                yes: '해당',
                no: '비해당',
                value: _draft.isNewlywed,
                onChanged: (v) => _update((p) => p.copyWith(isNewlywed: () => v)),
              ),
              _TriState(
                title: '대학생 · 취업준비생',
                yes: '해당',
                no: '비해당',
                value: _draft.isStudent,
                onChanged: (v) => _update((p) => p.copyWith(isStudent: () => v)),
              ),

              const SizedBox(height: 8),
              const _SectionTitle('소득'),
              Text('가구원수', style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: AppFonts.bold)),
              const SizedBox(height: 4),
              Text('배우자·자녀·부모 등 같이 사는 가족 수예요. 본인과 태아도 포함합니다.', style: TextStyle(fontSize: 12, color: scheme.outline)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (var n = ApplicantProfile.minHouseholdSize; n <= ApplicantProfile.maxHouseholdSize; n++)
                    ChoiceChip(
                      key: ValueKey('household-$n'),
                      label: Text('$n인'),
                      selected: _draft.householdSize == n,
                      // 선택된 칩을 다시 누르면 '입력 안 함'으로 돌아간다.
                      onSelected: (selected) => _update((p) => p.copyWith(householdSize: () => selected ? n : null)),
                    ),
                ],
              ),
              const SizedBox(height: 20),
              _AmountField(
                controller: _monthly,
                label: '가구 월 소득 (세전, 가구원 전체 합계)',
                hint: '예: 300',
                suffix: '만원',
                onChanged: () => setState(() {}),
              ),
              _IncomeHint(profile: current),
              if (_draft.isNewlywed == true) ...[
                const SizedBox(height: 16),
                _TriState(
                  title: '맞벌이 (본인과 배우자 모두 근로·사업소득이 있음)',
                  yes: '맞벌이',
                  no: '외벌이',
                  value: _draft.isDualIncome,
                  onChanged: (v) => _update((p) => p.copyWith(isDualIncome: () => v)),
                ),
              ],

              const SizedBox(height: 20),
              const _SectionTitle('자산'),
              _AmountField(
                controller: _asset,
                label: '총자산 (부채를 뺀 금액)',
                hint: '예: 5000',
                suffix: '만원',
                helper: '부동산, 예금·주식 등 금융자산, 자동차를 모두 더하고 대출 등 부채를 뺀 금액이에요.',
                onChanged: () => setState(() {}),
              ),
              const SizedBox(height: 16),
              _AmountField(
                controller: _car,
                label: '자동차 가액',
                hint: '없으면 0',
                suffix: '만원',
                helper: '보유한 자동차 중 가장 비싼 차의 가액이에요. 차가 없으면 0을 입력하세요.',
                onChanged: () => setState(() {}),
              ),

              const SizedBox(height: 20),
              const _SectionTitle('청약통장'),
              _TriState(
                title: '주택청약종합저축 가입',
                yes: '가입',
                no: '미가입',
                value: _draft.hasSubscriptionAccount,
                onChanged: (v) => _update((p) => p.copyWith(hasSubscriptionAccount: () => v)),
              ),

              const SizedBox(height: 8),
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

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(text, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: AppFonts.bold)),
    );
  }
}

/// 숫자만 입력하는 칸 (만원/세)
class _AmountField extends StatelessWidget {
  const _AmountField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.suffix,
    required this.onChanged,
    this.helper,
  });

  final TextEditingController controller;
  final String label;
  final String hint;
  final String suffix;
  final String? helper;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      onChanged: (_) => onChanged(),
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        suffixText: suffix,
        helperText: helper,
        helperMaxLines: 3,
      ),
    );
  }
}

/// 입력한 소득이 도시근로자 월평균소득의 몇 %인지 보여준다. 기준표는 서버가 준다.
class _IncomeHint extends ConsumerWidget {
  const _IncomeHint({required this.profile});

  final ApplicantProfile profile;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final standards = ref.watch(housingMetaProvider).value?.standards;
    final size = profile.householdSize;
    final income = profile.monthlyIncomeMan;
    if (standards == null || size == null || income == null) return const SizedBox.shrink();

    final base = standards.urbanWorkerIncomeFor(size);
    final ratio = standards.urbanWorkerRatioPercent(householdSize: size, monthlyIncomeMan: income);
    if (base == null || ratio == null) return const SizedBox.shrink();

    final scheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Text(
        '${standards.year}년 기준 $size인 가구 도시근로자 월평균소득(${formatWon(base)})의 약 $ratio%예요.',
        key: const ValueKey('income-hint'),
        style: TextStyle(fontSize: 12, color: scheme.primary),
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
