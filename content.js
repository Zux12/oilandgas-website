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
  return 'read.html?' + new URLSearchParams({kind: item.kind, ref: item.reference});
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
  }
  for (const entryKind of ['articles', 'publications']) {
    document.getElementById('all-' + entryKind).href = 'browse.html?' +
      new URLSearchParams({kind: entryKind, topic: selectedTopic, q: search.value});
  }
  const filtered = selectedTopic !== 'All' || Boolean(search.value.trim());
  document.querySelector('#latest h2').textContent = filtered
    ? (selectedTopic === 'All' ? 'Search results' : selectedTopic + ' insights') : 'Latest contributions';
  let papersLink = document.getElementById('topic-publications');
  if (!papersLink) {
    papersLink = document.getElementById('all-publications').cloneNode(true);
    papersLink.id = 'topic-publications';
    document.getElementById('all-articles').after(' ', papersLink);
  }
  papersLink.hidden = false;
  papersLink.href = document.getElementById('all-publications').href;
  return Promise.all([
    loadSection('insights', 6, 'article-cards', 'article-status', version),
    loadSection('publications', 3, 'publication-cards', 'publication-status', version)
  ]);
}
search.maxLength = 120;
search.addEventListener('input', () => {
  clearTimeout(debounce);
  ++generation;
  page = 0;
  debounce = setTimeout(refresh, 250);
});
if (browseMode) {
  search.value = initial.get('q') || '';
  const select = document.getElementById('topic');
  if (![...select.options].some(option => option.value === selectedTopic)) selectedTopic = 'All';
  select.value = selectedTopic;
  document.getElementById('browse-title').textContent = kind === 'articles' ? 'Articles' : 'Publications';
  select.onchange = () => {
    clearTimeout(debounce);
    selectedTopic = select.value;
    page = 0;
    refresh();
  };
  for (const [id, delta] of [['previous', -1], ['next', 1]]) {
    document.getElementById(id).onclick = () => {
      page += delta;
      refresh();
      document.getElementById('browse-title').scrollIntoView();
    };
  }
} else {
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.onclick = () => {
      clearTimeout(debounce);
      selectedTopic = button.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach(other => {
        other.classList.toggle('active', other === button);
        other.setAttribute('aria-pressed', String(other === button));
      });
      refresh();
    };
  });
  loadHighlights();
}
async function loadHighlights() {
  try {
    const response = await fetch(contentApi + 'highlights');
    if (!response.ok) return;
    const highlights = await response.json();
    const targets = {
      lead: document.querySelector('.lead'),
      story1: document.querySelectorAll('.side-story')[0],
      story2: document.querySelectorAll('.side-story')[1]
    };
    Object.values(targets).forEach(target => {target.hidden=true;});
    for (const {slot, image, entry} of highlights) {
      const target = targets[slot];
      if (!target) continue;
      target.hidden=false;
      const heading = target.querySelector('h1,h2');
      const link = node('a', entry.title);
      link.href = entry.kind==='external' ? entry.source : readingLink(entry);
      heading.replaceChildren(link);
      target.querySelector('p').textContent = excerpt(entry.summary);
      target.querySelector('.tag,.eyebrow').textContent = entry.topic;
      target.querySelector('.meta').textContent = entry.kind==='external' ? entry.byline+' · '+new Date(entry.publishedAt).toLocaleDateString('en-GB') : entry.byline;
      const photo = target.querySelector('img');
      if (photo && image) {
        photo.src = image;
        photo.alt = entry.title;
      }
      target.onclick = event => {
        if (!event.target.closest('a')) location.href = link.href;
      };
      target.onkeydown = event => {
        if (event.key === 'Enter' && event.target === target) location.href = link.href;
      };
    }
    document.querySelector('.featured').hidden=!highlights.length;
    document.querySelector('.intro').hidden=!highlights.length;
  } catch {
    // Display the other homepage sections if highlights cannot be loaded.
  }
}
refresh();
