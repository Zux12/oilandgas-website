function linkedCredit(label, path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return document.createTextNode(label);
  const link = document.createElement('a');
  link.href = path;
  link.textContent = label;
  return link;
}

function existingProfile(label, reference) {
  const name = label.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const ownName = ['m zurix mohamed', 'mohd zurix mohamed', 'mohd zurix bin mohamed'].includes(name);
  const ownInitials = name === 'm z mohamed' && reference === 'OG-P-D755771CD5EE21AE';
  return ownName || ownInitials ? '/m-zurix-mohamed.html' : null;
}

function setByline(paragraph, entry, credits) {
  paragraph.replaceChildren();
  for (const part of (entry.byline || '').split(/(,\s*|;\s*|\s+(?:and|&)\s+)/i)) {
    const name = part.trim();
    const path = credits ? credits.authors[name] : existingProfile(name, entry.reference);
    paragraph.append(linkedCredit(part, path));
  }
}

function renderEntry(target,entry){
  target.replaceChildren();
  function line(tag,value){
    const node=document.createElement(tag);node.textContent=value;target.append(node);
  }
  line('small',entry.kind==='articles'?'ARTICLE':'RESEARCH PUBLICATION');
  document.title = entry.title + ' | Oil & Gas';if (entry.crossIndustry) line('small','Technology Across Industries');
  line('h1',entry.title);
  const byline = document.createElement('p');
  byline.dataset.byline = '';
  setByline(byline, entry);
  target.append(byline);
  line('small',entry.topic);line('p',entry.summary);
  if(entry.kind==='articles'){
    line('h3','Full article');
    if(entry.body){
      for(const paragraph of entry.body.split(/\r?\n[ \t]*\r?\n/)){
        if(paragraph.trim())line('p',paragraph);
      }
    }else line('p','The full text is unavailable for this article.');
  }
  if (entry.sharedBy) {
    const paragraph = document.createElement('p');
    paragraph.dataset.shared = '';
    paragraph.textContent = 'Shared by ' + entry.sharedBy;
    target.append(paragraph);
  }
  if(entry.source && /^https?:\/\//i.test(entry.source)){
    const a=document.createElement('a');a.textContent='Read original paper ↗';a.href=entry.source;a.rel='noopener noreferrer';target.append(a);
  }
}
const publicReader=document.querySelector('#public-reader');
if(publicReader){
  const params=new URLSearchParams(location.search);
  const directory = fetch('/authors/credits.json')
    .then(r => r.ok ? r.json() : {}).catch(() => ({}));
  fetch('https://mterm2026-559f9bf571b5.herokuapp.com/api/oilandgas/editor/published/'+encodeURIComponent(params.get('kind'))+'/'+encodeURIComponent(params.get('ref')))
    .then(async r => {
      if (!r.ok) throw Error();
      const entry = await r.json();
      renderEntry(publicReader, entry);
      directory.then(map => {
        const credits = map[entry.reference];
        if (!credits) return;
        const byline = publicReader.querySelector('[data-byline]');
        if (byline) setByline(byline, entry, credits);
        const shared = publicReader.querySelector('[data-shared]');
        if (shared && Object.hasOwn(credits.shared, entry.sharedBy)) {
          shared.replaceChildren('Shared by ', linkedCredit(entry.sharedBy, credits.shared[entry.sharedBy]));
        }
      });
    })
    .catch(()=>{publicReader.textContent='This entry is unavailable.';});
}
