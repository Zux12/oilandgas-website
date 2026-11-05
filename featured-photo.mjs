const normalize = text => ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';

export function choosePhoto(photos, entry) {
  const title = normalize(entry.title);
  const summary = normalize(entry.summary);
  let best;
  let highest = 0;
  for (const photo of photos) {
    let score = 0;
    for (const keyword of photo.keywords) {
      const phrase = normalize(keyword);
      const weight = keyword.split(' ').length;
      if (title.includes(phrase)) score += 10 * weight;
      else if (summary.includes(phrase)) score += weight;
    }
    if (score > highest) {
      best = photo;
      highest = score;
    }
  }
  return best;
}

export async function fillFeaturedPhoto(img, entry) {
  const box = img.parentElement;
  const response = await fetch(new URL('./featured-photos.json', import.meta.url));
  if (!response.ok) return;
  const match = choosePhoto(await response.json(), entry);
  if (!match) return;
  const candidate = new Image();
  candidate.src = match.image;
  await candidate.decode();
  const credit = document.createElement('small');
  credit.className = 'meta';
  const source = document.createElement('a');
  source.href = match.source;
  source.textContent = match.photographer + ' / Unsplash';
  credit.append('Illustrative photo · ', source);
  img.onerror = () => {
    box.hidden = true;
    credit.remove();
  };
  img.alt = match.alt;
  img.src = match.image;
  box.hidden = false;
  box.after(credit);
}
