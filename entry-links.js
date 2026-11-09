// The live feed can show today's approvals before their static pages are published.
const entryPathsReady = (async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch('/entry-paths.json', {signal: controller.signal});
    if (response.ok) return await response.json();
  } catch {
    // The original live reader can open entries when the directory is unavailable.
  } finally {
    clearTimeout(timeout);
  }
  return {};
})();

function permanentEntryPath(paths, kind, reference) {
  const path = paths?.[reference];
  const folder = {publications: '/papers/', articles: '/articles/'}[kind];
  if (typeof path !== 'string' || !folder || !path.startsWith(folder)) return null;
  return /^\/[a-z]+\/[a-z0-9-]+\.html$/.test(path) ? path : null;
}
