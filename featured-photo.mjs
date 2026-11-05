const topicKey = value => String(value || '').toLowerCase()
  .replace(/\band\b|&/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

export function rankPhotos(photos, vectors, topic) {
  const [story, ...candidates] = vectors;
  const ranked = photos.map((photo, index) => {
    const similarity = candidates[index].reduce((sum, n, i) => sum + n * story[i], 0);
    const sameTopic = photo.topics.some(label => topicKey(label) === topicKey(topic));
    return { photo, similarity, score: similarity + (sameTopic ? 0.05 : 0) };
  }).filter(item => item.similarity >= 0.30).sort((a, b) => b.score - a.score);
  return ranked[0]?.photo;
}

async function choosePhoto(photos, entry) {
  const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js');
  env.allowLocalModels = false;
  env.backends.onnx.wasm.numThreads = 1;
  const encode = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  const texts = [
    [entry.title, entry.summary, entry.topic].filter(Boolean).join('. '),
    ...photos.map(photo => [photo.alt, photo.description || photo.reason].join('. '))
  ];
  const embeddings = await encode(texts, { pooling: 'mean', normalize: true });
  return rankPhotos(photos, embeddings.tolist(), entry.topic);
}
export async function fillFeaturedPhoto(img, entry) {
  const box = img.parentElement;
  const response = await fetch(new URL('./featured-photos.json', import.meta.url));
  if (!response.ok) return;
  const match = await choosePhoto(await response.json(), entry);
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
