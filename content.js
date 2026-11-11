'use strict';
const contentApi = 'https://mterm2026-559f9bf571b5.herokuapp.com/api/oilandgas/editor/';
const browseMode = document.body.hasAttribute('data-browse');
const search = document.getElementById('search');
const initial = new URLSearchParams(location.search);
const kind = initial.get('kind') === 'publications' ? 'publications' : 'articles';
let selectedTopic = browseMode ? initial.get('topic') || 'All' : 'All';
let page = browseMode ? Math.min(100000, Math.max(0, Math.floor(Number(initial.get('page')) || 0))) : 0;
const collectionName = 'Technology Across Industries';
const collectionIntro = 'Explore how other industries approach engineering problems familiar to oil and gas professionals.';
let generation = 0;
let debounce;
let publishedPaths = {};

function excerpt(value, length = 210) {
  const text = String(value || '').trim();
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  return cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : length) + '…';
}
function readingLink(item) {
  return permanentEntryPath(publishedPaths, item.kind, item.reference) || 'read.html?' + new URLSearchParams({kind: item.kind, ref: item.reference});
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
  content.append(node('span', item.crossIndustry ? label + ' · ' + collectionName : label, 'eyebrow'), heading,
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
async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try { return await fetch(url, {signal:controller.signal}); }
  finally { clearTimeout(timer); }
}
async function fetchEntries(entryKind, limit, pageIndex = browseMode ? page : 0) {
  const params = new URLSearchParams({
    kind: entryKind, page: String(pageIndex), limit: String(limit),
    topic: selectedTopic, q: search.value.trim()
  });
  if (browseMode) params.set('includeTotal', 'true');
  const response = await fetchWithTimeout(contentApi + 'browse?' + params);
  if (!response.ok) throw new Error('Could not load entries.');
  return response.json();
}
async function browseResultCount(entryKind, limit, data, version) {
  if (Number.isSafeInteger(data.total)) return data.total;
  // Older API releases expose only "more". Use the index as a starting guess,
  // then find the last page in the live, filtered results.
  const folder = entryKind === 'publications' ? '/papers/' : '/articles/';
  const indexed = Object.values(publishedPaths).filter(path => path.startsWith(folder)).length;
  let low = 0;
  let high = null;
  let probe = page;
  while (version === generation) {
    if (data.more) low = probe + 1;
    else if (data.items.length) return probe * limit + data.items.length;
    else if (probe === 0) return 0;
    else high = probe - 1;
    if (high !== null && low > high) return null;
    probe = high === null
      ? Math.max(low, Math.ceil(indexed / limit) - 1, probe * 2 + 1)
      : Math.floor((low + high) / 2);
    data = await fetchEntries(entryKind, limit, probe);
  }
  return null;
}
function resultSummary(kind, offset, shown, total) {
  if (!shown) return 'Showing 0 ' + kind;
  const noun = (total ?? shown) === 1 ? kind.slice(0, -1) : kind;
  if (total == null) return 'Showing ' + shown + ' ' + noun;
  const range = shown === 1 ? String(offset + 1) : (offset + 1) + '–' + (offset + shown);
  return 'Showing ' + range + ' of ' + total + ' ' + noun;
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
    publishedPaths = await entryPathsReady;
    if (version !== generation) return;
    target.replaceChildren(...data.items.map(item => card(item, !browseMode && entryKind === 'publications', mixed)));
    if (browseMode) {
      const number = document.getElementById('page-number');
      const current = 'Page ' + (page + 1);
      const offset = page * limit;
      const shown = data.items.length;
      status.textContent = resultSummary(entryKind, offset, shown, data.total);
      number.textContent = current;
      document.getElementById('previous').disabled = page === 0;
      document.getElementById('next').disabled = !data.more;
      try {
        const total = await browseResultCount(entryKind, limit, data, version);
        if (version !== generation || total === null) return;
        const pageCount = Math.ceil(total / limit);
        const lastPage = Math.max(0, pageCount - 1);
        if (page > lastPage) {
          page = lastPage;
          return refresh();
        }
        status.textContent = resultSummary(entryKind, offset, shown, total);
        number.textContent = pageCount ? current + ' of ' + pageCount : '0 pages';
      } catch {
        // The loaded page and its navigation still work if a count request fails.
      }
    } else {
      status.textContent = data.items.length ? '' : 'No published ' + entryKind + ' match this selection.';
    }
  } catch {
    if (version !== generation) return;
    status.textContent = 'Entries are temporarily unavailable. ';
    const retry = node('button', 'Try again', 'chip');
    retry.type = 'button';
    retry.onclick = refresh;
    status.append(retry);
  }
}
function refresh() {
  const version = ++generation;
  if (browseMode) {
    document.getElementById('previous').disabled = true;
    document.getElementById('next').disabled = true;
    document.getElementById('page-number').textContent = '';
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
  const collectionNote = document.getElementById('collection-note');
  if (collectionNote) collectionNote.hidden = selectedTopic !== collectionName;
  if (selectedTopic === collectionName) document.querySelector('#latest h2').textContent = collectionName;
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
  debounce = setTimeout(() => {
  refresh();

  const results = document.getElementById(
    browseMode ? 'browse-title' : 'latest'
  );

  results?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}, 500);
});
if (browseMode) {
  search.value = initial.get('q') || '';
  const select = document.getElementById('topic');
  for (const topic of ['Sensors', collectionName]) {
    if (![...select.options].some(option => option.value === topic)) select.add(new Option(topic, topic));
  }
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
      clearTimeout(debounce);
      page = Math.max(0, page + delta);
      refresh();
      document.getElementById('browse-title').scrollIntoView();
    };
  }
} else {
  const lastTopic = Array.from(document.querySelectorAll('[data-filter]')).pop();
  if (lastTopic) {
    const button = node('button', collectionName, 'chip');
    button.type = 'button';
    button.dataset.filter = collectionName;
    button.setAttribute('aria-pressed','false');
    lastTopic.after(button);
    const note = node('p', collectionIntro);
    note.id = 'collection-note';
    note.hidden = true;
    document.querySelector('#latest .section-head').after(note);
  }
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.filter === selectedTopic));
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
  loadWeeklyPicks();
}
async function loadWeeklyPicks() {
  try {
    const response = await fetchWithTimeout(contentApi + 'weekly-picks');
    if (!response.ok) return;
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length !== 2) return;
    publishedPaths = await entryPathsReady;
    const cards = [];
    for (const slot of ['field', 'research']) {
      const row = rows.find(item => item.slot === slot);
      if (!row) return;
      if (!row.entry) continue;
      const article = node('article', '', 'weekly-pick');
      const heading = document.createElement('h3');
      const link = node('a', row.headline);
      link.href = readingLink(row.entry);
      heading.append(link);
      article.append(node('p', row.label, 'eyebrow'), heading,
        node('p', row.teaser), node('p', row.entry.byline, 'weekly-byline'));
      cards.push(article);
    }
    const grid = document.querySelector('#weekly-brief .weekly-grid');
    if (!grid) return;
    let sidebar = grid.querySelector('.weekly-picks');
    if (!sidebar) {
      sidebar = node('div', '', 'weekly-picks');
      grid.append(sidebar);
    }
    sidebar.replaceChildren(...cards);
    sidebar.hidden = !cards.length;
    grid.classList.toggle('news-only', !cards.length);
  } catch {
    // Keep the published weekly edition visible while its saved choices are unavailable.
  }
}
async function loadHighlights() {
  try {
    const response = await fetchWithTimeout(contentApi + 'highlights');
    if (!response.ok) return;
    const highlights = await response.json();
    publishedPaths = await entryPathsReady;
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
      target.querySelector('.tag,.eyebrow').textContent = entry.crossIndustry ? entry.topic + ' · ' + collectionName : entry.topic;
      target.querySelector('.meta').textContent = entry.kind==='external' ? entry.byline+' · '+new Date(entry.publishedAt).toLocaleDateString('en-GB') : entry.byline;
      const photo = target.querySelector('img');
      if (photo) {
        const hasImage = typeof image === 'string' && /^https:\/\//i.test(image);
        photo.parentElement.hidden = !hasImage;
        if (hasImage) {
          photo.src = image;
          photo.alt = entry.title;
        }
        import('./featured-photo.mjs')
          .then(module => module.fillFeaturedPhoto(photo, entry, hasImage ? image : ''))
          .catch(() => { /* Keep an available editor image or the text layout. */ });
      }

      target.onclick = event => {
        if (!event.target.closest('a')) location.href = link.href;
      };
      target.onkeydown = event => {
        if (event.key === 'Enter' && event.target === target) location.href = link.href;
      };
    }
    const featured = document.querySelector('.featured');
    featured.classList.toggle('without-lead', targets.lead.hidden);
    document.querySelector('.sides').hidden = targets.story1.hidden && targets.story2.hidden;
    featured.hidden=!highlights.length;
    document.querySelector('.intro').hidden=!highlights.length;
  } catch {
    // Display the other homepage sections if highlights cannot be loaded.
  }
}
refresh();
