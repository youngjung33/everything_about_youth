import 'package:flutter/material.dart';

import '../../domain/housing_filters.dart';
import '../../domain/housing_meta.dart';
import '../../../../core/theme/app_fonts.dart';

/// 검색 조건 입력. 편집 중인 값은 이 위젯 안에만 있고 [onApply] 를 눌러야 목록에 반영된다.
/// (넓은 화면: 사이드바, 좁은 화면: 바텀시트에서 공용으로 쓴다.)
class FilterPanel extends StatefulWidget {
  const FilterPanel({super.key, required this.meta, required this.initial, required this.onApply, this.onReset});

  final HousingMeta meta;
  final HousingFilters initial;
  final ValueChanged<HousingFilters> onApply;
  final VoidCallback? onReset;

  @override
  State<FilterPanel> createState() => _FilterPanelState();
}

class _FilterPanelState extends State<FilterPanel> {
  late Set<String> _sidos;
  late Set<String> _supplyTypes;
  late Set<String> _housingTypes;
  late Set<String> _statuses;

  late final TextEditingController _sigungu;
  late final TextEditingController _keyword;
  late final TextEditingController _maxDeposit;
  late final TextEditingController _maxRent;
  late final TextEditingController _minArea;
  late final TextEditingController _maxArea;

  @override
  void initState() {
    super.initState();
    _loadFrom(widget.initial);
  }

  void _loadFrom(HousingFilters f) {
    _sidos = {...f.sidos};
    _supplyTypes = {...f.supplyTypes};
    _housingTypes = {...f.housingTypes};
    _statuses = {...f.statuses};
    _sigungu = TextEditingController(text: f.sigungu);
    _keyword = TextEditingController(text: f.keyword);
    _maxDeposit = TextEditingController(text: f.maxDepositMan?.toString() ?? '');
    _maxRent = TextEditingController(text: f.maxRentMan?.toString() ?? '');
    _minArea = TextEditingController(text: _plain(f.minArea));
    _maxArea = TextEditingController(text: _plain(f.maxArea));
  }

  static String _plain(double? v) {
    if (v == null) return '';
    return v == v.roundToDouble() ? '${v.toInt()}' : '$v';
  }

  @override
  void dispose() {
    for (final c in [_sigungu, _keyword, _maxDeposit, _maxRent, _minArea, _maxArea]) {
      c.dispose();
    }
    super.dispose();
  }

  void _toggle(Set<String> set, String value, bool selected) {
    setState(() => selected ? set.add(value) : set.remove(value));
  }

  int? _int(TextEditingController c) {
    final n = int.tryParse(c.text.trim());
    return n != null && n >= 0 ? n : null;
  }

  double? _double(TextEditingController c) {
    final n = double.tryParse(c.text.trim());
    return n != null && n >= 0 ? n : null;
  }

  HousingFilters _build() {
    final deposit = _int(_maxDeposit);
    final rent = _int(_maxRent);
    final minArea = _double(_minArea);
    final maxArea = _double(_maxArea);
    return widget.initial.copyWith(
      sidos: _sidos,
      sigungu: _sigungu.text.trim(),
      supplyTypes: _supplyTypes,
      housingTypes: _housingTypes,
      statuses: _statuses,
      keyword: _keyword.text.trim(),
      maxDepositMan: () => deposit,
      maxRentMan: () => rent,
      minArea: () => minArea,
      maxArea: () => maxArea,
    );
  }

  void _reset() {
    setState(() {
      _sidos.clear();
      _supplyTypes.clear();
      _housingTypes.clear();
      _statuses = {...HousingFilters.defaultStatuses};
      for (final c in [_sigungu, _keyword, _maxDeposit, _maxRent, _minArea, _maxArea]) {
        c.clear();
      }
    });
    widget.onReset?.call();
  }

  @override
  Widget build(BuildContext context) {
    final meta = widget.meta;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        _Group(
          title: '지역',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _Chips(
                options: [for (final s in meta.sidos) Option(value: s, label: s)],
                selected: _sidos,
                onChanged: (v, on) => _toggle(_sidos, v, on),
              ),
              if (_sidos.isNotEmpty) ...[
                const SizedBox(height: 8),
                _Field(controller: _sigungu, label: '시군구 (선택한 시도 안에서)', hint: '예: 강남구, 수원시'),
              ],
            ],
          ),
        ),
        _Group(
          title: '공급유형',
          child: _Chips(
            options: meta.supplyTypes,
            selected: _supplyTypes,
            onChanged: (v, on) => _toggle(_supplyTypes, v, on),
          ),
        ),
        _Group(
          title: '주택유형',
          child: _Chips(
            options: meta.housingTypes,
            selected: _housingTypes,
            onChanged: (v, on) => _toggle(_housingTypes, v, on),
          ),
        ),
        _Group(
          title: '접수 상태',
          child: _Chips(options: meta.statuses, selected: _statuses, onChanged: (v, on) => _toggle(_statuses, v, on)),
        ),
        _Group(
          title: '금액 · 면적',
          child: Column(
            children: [
              _Field(controller: _maxDeposit, label: '보증금/분양가 상한 (만원)', hint: '예: 5000', number: true),
              const SizedBox(height: 8),
              _Field(controller: _maxRent, label: '월 임대료 상한 (만원)', hint: '예: 30', number: true),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(
                    child: _Field(controller: _minArea, label: '전용면적 최소(㎡)', number: true),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _Field(controller: _maxArea, label: '전용면적 최대(㎡)', number: true),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              _Field(controller: _keyword, label: '검색어 (공고명/기관/단지/주소)'),
            ],
          ),
        ),
        const SizedBox(height: 4),
        Row(
          children: [
            Expanded(
              child: FilledButton(onPressed: () => widget.onApply(_build()), child: const Text('검색')),
            ),
            const SizedBox(width: 8),
            OutlinedButton(onPressed: _reset, child: const Text('초기화')),
          ],
        ),
      ],
    );
  }
}

class _Group extends StatelessWidget {
  const _Group({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: AppFonts.bold)),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _Chips extends StatelessWidget {
  const _Chips({required this.options, required this.selected, required this.onChanged});

  final List<Option> options;
  final Set<String> selected;
  final void Function(String value, bool selected) onChanged;

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 6,
      runSpacing: 6,
      children: [
        for (final o in options)
          FilterChip(
            label: Text(o.label),
            selected: selected.contains(o.value),
            onSelected: (on) => onChanged(o.value, on),
            visualDensity: VisualDensity.compact,
          ),
      ],
    );
  }
}

class _Field extends StatelessWidget {
  const _Field({required this.controller, required this.label, this.hint, this.number = false});

  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool number;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: number ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      decoration: InputDecoration(labelText: label, hintText: hint),
    );
  }
}
