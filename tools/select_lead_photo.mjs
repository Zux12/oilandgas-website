// Select the weekly lead at build time so the first HTML response contains the image.
import { readFileSync, existsSync } from 'node:fs';
import { photoChoices, photoCredit } from '../featured-photo.mjs';

const issue = JSON.parse(readFileSync(0, 'utf8'));
const catalog = JSON.parse(readFileSync(new URL('../featured-photos.json', import.meta.url), 'utf8'));
const entry = { title: issue.headline, summary: issue.news, topic: 'Industry news' };
const photo = photoChoices(catalog, entry).find(item =>
  existsSync(new URL('../featured-images/' + item.id + '.jpg', import.meta.url)));
if (!photo) throw new Error('No local lead image is available');
console.log(JSON.stringify({ id: photo.id, alt: photo.alt, credit: photoCredit(photo), source: photo.source }));
