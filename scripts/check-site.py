"""Site validator: structure, links, anchors, assets, a11y + SEO basics."""
import json, os, re, sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path('/home/user/brickslawfiles')
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}
SVG = {'path', 'circle', 'rect', 'use', 'line', 'polyline', 'polygon', 'stop', 'text', 'g', 'defs',
       'lineargradient', 'pattern', 'filter', 'feturbulence', 'svg'}
OPTIONAL = {'p', 'li', 'td', 'tr', 'th', 'dt', 'dd', 'thead', 'tbody'}
problems = []


class C(HTMLParser):
    def __init__(self, name):
        super().__init__(convert_charrefs=True)
        self.name, self.stack = name, []
        self.ids, self.h1, self.title, self.desc = [], 0, '', None
        for a in (): pass

    def err(self, m):
        problems.append(f'{self.name}: {m}')

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'img':
            if 'alt' not in a:
                self.err(f'<img> missing alt ({a.get("src","?")})')
            if not a.get('width') and not a.get('src', '').endswith('.svg'):
                self.err(f'<img> missing width: {a.get("src")}')
            if 'loading' not in a and 'fetchpriority' not in a:
                self.err(f'<img> no loading hint: {a.get("src")}')
        if tag == 'h1':
            self.h1 += 1
        if tag == 'title':
            self.in_title = True

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if tag == 'title':
            self.in_title = False
            if self.stack and self.stack[-1][0] == 'title':
                self.stack.pop()
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for t, line in self.stack[i + 1:]:
                    if t not in OPTIONAL:
                        self.err(f'<{t}> at line {line} implicitly closed by </{tag}>')
                del self.stack[i:]
                return
        self.err(f'stray </{tag}> at line {self.getpos()[0]}')

    def handle_data(self, d):
        if getattr(self, 'in_title', False):
            self.title += d


pages = sorted(ROOT.glob('*.html'))
ids = {}
for page in pages:
    raw = page.read_text()
    c = C(page.name)
    c.feed(raw)
    for t, line in c.stack:
        if t not in ('html', 'body'):
            c.err(f'<{t}> at line {line} never closed')
    ids[page.name] = set(c.ids)
    if c.h1 != 1:
        c.err(f'{c.h1} <h1>s')
    dupes = [i for i, n in Counter(c.ids).items() if n > 1]
    if dupes:
        c.err(f'duplicate ids {dupes}')
    tl = len(c.title.strip())
    if not 25 < tl < 62:
        c.err(f'title {tl} chars: {c.title.strip()[:70]}')
    m = re.search(r'name="description" content="(.*?)"', raw)
    if not m or not (70 < len(m.group(1)) < 165):
        c.err(f'meta description {len(m.group(1)) if m else "missing"} chars')
    for pat, label in (('rel="canonical"', 'canonical'), ('property="og:image"', 'og:image'),
                       ('name="viewport"', 'viewport'), ('lang="en"', 'html lang'), ('rel="icon"', 'favicon')):
        if pat not in raw:
            c.err(f'missing {label}')
    # links + anchors (only for local .html targets; assets are checked below)
    for href in set(re.findall(r'href="([^"]+)"', raw)):
        if href.startswith(('http://', 'https://', 'mailto:', 'tel:', 'data:', 'javascript:')):
            continue
        path, sep, frag = href.partition('#')
        if path and not path.endswith('.html'):
            continue                      # css/svg/img: handled by the asset scan
        target = ROOT / (path or page.name)
        if not target.exists():
            problems.append(f'{page.name}: broken link -> {href}')
            continue
        if sep and frag and not re.search(r'id="%s"' % re.escape(frag), target.read_text()):
            problems.append(f'{page.name}: anchor missing -> {href}')
    for f in set(re.findall(r'(?:src|data-full)="(assets/[^"#]+)"', raw)) | set(
            re.findall(r'srcset="([^"]+)"', raw)):
        for part in f.split(','):
            file = part.strip().split(' ')[0]
            if file and not (ROOT / file).exists():
                problems.append(f'{page.name}: missing asset {file}')
    for ld in re.findall(r'<script type="application/ld\+json">(.*?)</script>', raw, re.S):
        try:
            json.loads(ld)
        except Exception as e:
            c.err(f'invalid JSON-LD: {e}')

sprite = (ROOT / 'assets/img/sprite.svg').read_text()
defined = set(re.findall(r'id="(i-[a-z-]+)"', sprite))
for page in pages:
    missing = set(re.findall(r'sprite\.svg#(i-[a-z-]+)', page.read_text())) - defined
    if missing:
        problems.append(f'{page.name}: sprite symbols missing {sorted(missing)}')

css = (ROOT / 'assets/css/style.css').read_text()
if css.count('{') != css.count('}'):
    problems.append(f'style.css unbalanced braces {css.count("{")}/{css.count("}")}')
used = set()
for page in pages:
    for m in re.findall(r'class="([^"]+)"', page.read_text()):
        used |= set(m.split())
styled = set(re.findall(r'\.([a-zA-Z][\w-]*)', css))
unstyled = sorted(c for c in used - styled if not c.startswith(('i-', 'is-', 'no-')))
if unstyled:
    problems.append(f'classes used but never styled: {unstyled[:10]}')

if os.system('node --check %s/assets/js/site.js >/dev/null 2>&1' % ROOT):
    problems.append('site.js: JS syntax error')

print(f'{len(pages)} pages · {sum(len(v) for v in ids.values())} ids')
uniq = sorted(set(p for p in problems if p))
print(('%d issue(s):' % len(uniq)) if uniq else '✅ no issues found')
for p in uniq:
    print('  -', p)
sys.exit(1 if uniq else 0)
