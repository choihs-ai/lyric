#!/usr/bin/env python3
"""Build: src/js/*.js (in filename order) + src/template.html -> index.html (single self-contained page)."""
import glob, os, re
ROOT = os.path.dirname(os.path.abspath(__file__))
js = '\n'.join(open(f, encoding='utf-8').read() for f in sorted(glob.glob(os.path.join(ROOT, 'src/js/*.js'))))
font = re.search(r"const FONT_CSS='([^']+)'", js).group(1)
html = open(os.path.join(ROOT, 'src/template.html'), encoding='utf-8').read().replace('/*FONT_CSS*/', font).replace('/*BUNDLE*/', js)
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(html)
print(f'built index.html ({len(html):,} bytes)')
