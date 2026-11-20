import 'package:flutter/material.dart';

import '../../../../core/design/service_accent.dart';

import '../../domain/living_filters.dart';
import '../../domain/living_meta.dart';
import '../../../../core/theme/app_fonts.dart';

/// 검색 조건 입력. 편집 중인 값은 이 위젯 안에만 있고 [onApply] 를 눌러야 목록에 반영된다.
/// (이사·생활: 넓은 화면 사이드바·좁은 화면 바텀시트에서 공용)
class FilterPanel extends StatefulWidget {
  const FilterPanel({super.key, required this.meta, required this.initial, required this.onApply, this.onReset});

  final LivingMeta meta; // 필터·라벨 메타
  final LivingFilters initial; // 적용 전 필터 초기값
  final ValueChanged<LivingFilters> onApply; // 확인 시 부모에 필터 반영
  final VoidCallback? onReset; // 필터 초기화 콜백

  @override
  State<FilterPanel> createState() => _FilterPanelState();
}

/// 위젯의 편집·로딩 등 내부 상태.
class _FilterPanelState extends State<FilterPanel> {
  late Set<String> _sidos;
  late Set<String> _procedureTypeIds;
  late Set<String> _tags;
  late Set<String> _statuses;

  late final TextEditingController _sigungu;
  late final TextEditingController _keyword;
  late final TextEditingController _tagInput;

  @override
  void initState() {
    super.initState();
    _loadFrom(widget.initial);
  }

  void _loadFrom(LivingFilters f) {
    _sidos = {...f.sidos};
    _procedureTypeIds = {...f.procedureTypeIds};
    _tags = {...f.tags};
    _statuses = {...f.statuses};
    _sigungu = TextEditingController(text: f.sigungu);
    _keyword = TextEditingController(text: f.keyword);
    _tagInput = TextEditingController();
  }

  @override
  void dispose() {
    for (final c in [_sigungu, _keyword, _tagInput]) {
      c.dispose();
    }
    super.dispose();
  }

  void _toggle(Set<String> set, String value, bool selected) {
    setState(() => selected ? set.add(value) : set.remove(value));
  }

  void _addTag() {
    final t = _tagInput.text.trim();
    if (t.isEmpty) return;
    setState(() {
      _tags.add(t);
      _tagInput.clear();
    });
  }

  LivingFilters _build() {
    return widget.initial.copyWith(
      sidos: _sidos,
      sigungu: _sigungu.text.trim(),
      procedureTypeIds: _procedureTypeIds,
      tags: _tags,
      statuses: _statuses,
      keyword: _keyword.text.trim(),
    );
  }

  void _reset() {
    setState(() {
      _sidos.clear();
      _procedureTypeIds.clear();
      _tags.clear();
      _statuses = {...LivingFilters.defaultStatuses};
      for (final c in [_sigungu, _keyword, _tagInput]) {
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
                _Field(controller: _sigungu, label: '시군구 (선택한 시도 안에서)', hint: '예: 강남구'),
              ],
            ],
          ),
        ),
        _Group(
          title: '분야',
          child: _Chips(
            options: meta.procedureTypes,
            selected: _procedureTypeIds,
            onChanged: (v, on) => _toggle(_procedureTypeIds, v, on),
          ),
        ),
        _Group(
          title: '태그',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_tags.isNotEmpty)
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final t in _tags)
                      InputChip(
                        label: Text(t),
                        onDeleted: () => setState(() => _tags.remove(t)),
                      ),
                  ],
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Expanded(child: _Field(controller: _tagInput, label: '태그 추가', hint: '예: 월세')),
                  const SizedBox(width: 8),
                  FilledButton(onPressed: _addTag, child: const Text('추가')),
                ],
              ),
            ],
          ),
        ),
        _Group(
          title: '접수 상태',
          child: _Chips(options: meta.statuses, selected: _statuses, onChanged: (v, on) => _toggle(_statuses, v, on)),
        ),
        _Group(
          title: '검색',
          child: _Field(controller: _keyword, label: ServiceAccent.living.searchFieldLabel),
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

/// 필터 패널 섹션(제목+내용).
class _Group extends StatelessWidget {
  const _Group({required this.title, required this.child});

  final String title; // 섹션 제목
  final Widget child; // 섹션 내용

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

/// 다중 선택 칩 한 줄.
class _Chips extends StatelessWidget {
  const _Chips({required this.options, required this.selected, required this.onChanged});

  final List<Option> options; // 선택지 목록
  final Set<String> selected; // 현재 선택값 집합
  final void Function(String value, bool selected) onChanged; // 칩 선택 변경 콜백

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
          ),
      ],
    );
  }
}

/// 숫자·텍스트 입력 필드 한 줄.
class _Field extends StatelessWidget {
  const _Field({required this.controller, required this.label, this.hint});

  final TextEditingController controller; // 텍스트 입력 컨트롤러
  final String label; // 화면에 보이는 한글 라벨
  final String? hint; // 입력 힌트

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.text,
      decoration: InputDecoration(labelText: label, hintText: hint, border: const OutlineInputBorder()),
    );
  }
}
