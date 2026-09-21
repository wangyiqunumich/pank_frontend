#!/usr/bin/env python3
"""Fail if a design stylesheet hardcodes a value that should come from design-tokens.css.

Checks every styles/*.css that is NOT a captured build sheet (captured sheets have 20-hex names)
and is not design-tokens.css itself. Flags literal px/rem/em lengths, colors, and font sizes
outside var(--md-*) references. Allowed literals: 0, 1px hairlines, 100%, -1px optical nudges.
"""
import re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
sheets = [p for p in (ROOT/'styles').glob('*.css')
          if p.name != 'design-tokens.css' and not re.fullmatch(r'[0-9a-f]{20}\.css', p.name)]
bad = []
for p in sheets:
    css = re.sub(r'/\*.*?\*/', '', p.read_text(), flags=re.S)
    for ln, line in enumerate(css.splitlines(), 1):
        body = line.split('{', 1)[-1] if '{' in line else line
        if ':' not in body: continue
        decl = re.sub(r'var\(--[\w-]+\)', 'VAR', body)
        for lit in re.findall(r'(?<![\w-])-?\d*\.?\d+(?:px|rem|em|pt)\b', decl):
            if lit in ('0px', '-1px', '1px'): continue
            bad.append((p.name, ln, lit, line.strip()))
        for col in re.findall(r'#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)', decl):
            bad.append((p.name, ln, col, line.strip()))
for name, ln, lit, src in bad:
    print(f'{name}:{ln}: literal {lit!r} — use a design token: {src[:100]}')
print(f'{"FAIL" if bad else "PASS"}: {len(sheets)} design stylesheet(s) checked, {len(bad)} hardcoded value(s).')
sys.exit(1 if bad else 0)
