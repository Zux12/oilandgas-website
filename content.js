1
2
3
4
5
6
7
8
9
10
11
12
13
14
15
16
17
18
19
20
21
22
23
24
25
26
27
28
29
30
31
32
33
34
35
36
37
38
39
40
41
42
43
44
45
46
47
48
49
50
51
52
53
54
55
56
57
58
59
60
61
62
63
64
65
66
67
68
69
70
71
72
73
74
75
76
77
78
79
80
81
82
83
84
85
86
87
88
89
90
91
92
93
94
95
96
'use strict';
const contentApi = 'https://mterm2026-559f9bf571b5.herokuapp.com/api/oilandgas/editor/';
const browseMode = document.body.hasAttribute('data-browse');
const search = document.getElementById('search');
const initial = new URLSearchParams(location.search);
const kind = initial.get('kind') === 'publications' ? 'publications' : 'articles';
let selectedTopic = browseMode ? initial.get('topic') || 'All' : 'All';
let page = browseMode ? Math.max(0, Number(initial.get('page')) || 0) : 0;
let generation = 0;
let debounce;

function excerpt(value, length = 210) {
  const text = String(value || '').trim();
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  return cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : length) + '…';
}
function readingLink(item) {
  return contentApi + 'read.html?' + new URLSearchParams({kind: item.kind, ref: item.reference});
}
function node(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text || '';
  if (className) element.className = className;
  return element;
}
function card(item, paperLayout, showKind = false) {
  const article = document.createElement('article');
  article.className = paperLayout ? 'paper' : 'card';
  const content = document.createElement('div');
  const heading = document.createElement('h3');
  const link = node('a', item.title);
  link.href = readingLink(item);
  heading.append(link);
  const label = showKind ? item.topic + ' · ' + (item.kind === 'publications' ? 'Shared paper' : 'Article') : item.topic;
  content.append(node('span', label, 'eyebrow'), heading,
    node('p', excerpt(item.summary)), node('small', item.byline, 'meta'));
  if (paperLayout) article.append(node('span', '▤', 'paper-icon'));
  article.append(content);
  if (paperLayout) {
    const arrow = node('a', '↗', 'arrow');
    arrow.href = link.href;
    arrow.setAttribute('aria-label', 'Read ' + item.title);
    article.append(arrow);
  }
  return article;
}
async function fetchEntries(entryKind, limit) {
  const params = new URLSearchParams({
    kind: entryKind, page: String(browseMode ? page : 0), limit: String(limit),
    topic: selectedTopic, q: search.value.trim()
  });
  const response = await fetch(contentApi + 'browse?' + params);
  if (!response.ok) throw new Error('Could not load entries.');
  return response.json();
}
async function loadSection(entryKind, limit, targetId, statusId, version) {
  const target = document.getElementById(targetId);
  const status = document.getElementById(statusId);
  target.replaceChildren();
  status.textContent = 'Loading…';
  try {
    const mixed = entryKind === 'insights';
    let data;
    if (mixed) {
      const [articles, papers] = await Promise.all([
        fetchEntries('articles', limit), fetchEntries('publications', limit)
      ]);
      const items = articles.items.concat(papers.items);
      items.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt) || a.reference.localeCompare(b.reference));
      data = {items: items.slice(0, limit)};
    } else {
      data = await fetchEntries(entryKind, limit);
    }
    if (version !== generation) return;
    target.replaceChildren(...data.items.map(item => card(item, !browseMode && entryKind === 'publications', mixed)));
    status.textContent = data.items.length ? '' : 'No published ' + entryKind + ' match this selection.';
    if (browseMode) {
      document.getElementById('previous').disabled = page === 0;
      document.getElementById('next').disabled = !data.more;
      document.getElementById('page-number').textContent = 'Page ' + (page + 1);
    }
  } catch {
    if (version !== generation) return;
    status.textContent = 'Entries are temporarily unavailable. Please refresh to try again.';
  }
}
function refresh() {
  const version = ++generation;
  if (browseMode) {
    document.getElementById('previous').disabled = true;
    document.getElementById('next').disabled = true;
    history.replaceState(null, '', '?' + new URLSearchParams({
      kind, topic: selectedTopic, q: search.value, page: String(page)
    }));
    return loadSection(kind, 12, 'browse-cards', 'browse-status', version);
