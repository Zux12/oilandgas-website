const pathFor = id => new URL('./featured-images/' + id + '.jpg', import.meta.url).href;
const cover = { id: 'desk', alt: 'Research papers on an editorial desk' };
const normalize = text => String(text || '').toLowerCase().replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, ' ').trim();
const forms = text => normalize(text).split(' ').map(word =>
  word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word).join(' ');

function tieBreaker(seed) {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export const photoCredit = photo => photo.credit || 'AI-generated editorial illustration';

export function photoChoices(photos, entry) {
  const title = ' ' + forms(entry.title) + ' ';
  const summary = ' ' + forms(entry.summary) + ' ';
  const topic = normalize(entry.topic);
  const tagged = photos.map(photo => {
    let score = 0;
    for (const tag of photo.tags) {
      const term = forms(tag);
      const weight = Math.min(3, term.split(' ').length);
      if (title.includes(' ' + term + ' ')) score += 4 * weight;
      else if (summary.includes(' ' + term + ' ')) score += weight;
    }
    if (score && photo.topics.some(t => normalize(t) === topic)) score += 1;
    return {photo, score, tie: tieBreaker((entry.reference || title) + '/' + photo.id)};
  });
  tagged.sort((a,b) => b.score - a.score || a.tie - b.tie);
  const matches = tagged.filter(row => row.score > 0).map(row => row.photo);
  const standard = photos.find(photo => photo.defaults.some(t => normalize(t) === topic));
  return [...new Map([...matches, standard, cover].filter(Boolean).map(p => [p.id,p])).values()];
}

export async function fillFeaturedPhoto(img, entry, suppliedImage = '') {
  const box = img.parentElement;
  const credit = box.nextElementSibling;
  if (credit?.hasAttribute('data-featured-photo-credit')) credit.remove();
  img.onerror = null;
  let choices = [];
  if (/^https:\/\//i.test(suppliedImage)) {
    choices.push({url:suppliedImage, alt:entry.title, supplied:true});
  }
  async function show(choice) {
    const candidate = new Image();
    candidate.src = choice.url || pathFor(choice.id);
    try { await candidate.decode(); } catch { return false; }
    img.src = candidate.src;
    img.alt = choice.alt;
    box.hidden = false;
    if (!choice.supplied) {
      const label = document.createElement('small');
      label.className = 'meta';
      label.dataset.featuredPhotoCredit = '';
      if (choice.source) {
        const link = document.createElement('a');
        link.textContent = photoCredit(choice);
        link.href = choice.source;
        label.append(link);
      } else {
        label.textContent = photoCredit(choice);
      }
      box.after(label);
    }
    return true;
  }
  if (choices.length && await show(choices[0])) return;
  try {
    const response = await fetch(new URL('./featured-photos.json', import.meta.url));
    if (!response.ok) throw new Error('Photo list unavailable');
    choices = photoChoices(await response.json(), entry);
  } catch { choices = [cover]; }
  for (const choice of choices) if (await show(choice)) return;
  box.hidden = true;
}
