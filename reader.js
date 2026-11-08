function appendByline(target, entry) {
  const paragraph = document.createElement('p');
  const names = (entry.byline || '').split(/(,\s*|;\s*|\s+(?:and|&)\s+)/i);
  for (const part of names) {
    const name = part.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
    const knownName = ['m zurix mohamed', 'mohd zurix mohamed', 'mohd zurix bin mohamed'].includes(name);
    const creditedByInitials = entry.reference === 'OG-P-D755771CD5EE21AE' && name === 'm z mohamed';
    if (knownName || creditedByInitials) {
      const link = document.createElement('a');
      link.href = 'm-zurix-mohamed.html';
      link.textContent = part;
      paragraph.append(link);
    } else {
      paragraph.append(part);
    }
  }
  target.append(paragraph);
}

function renderEntry(target,entry){
  target.replaceChildren();
  function line(tag,value){
    const node=document.createElement(tag);node.textContent=value;target.append(node);
  }
  line('small',entry.kind==='articles'?'ARTICLE':'RESEARCH PUBLICATION');
  document.title = entry.title + ' | Oil & Gas';if (entry.crossIndustry) line('small','Technology Across Industries');
  line('h1',entry.title);
  appendByline(target, entry);
  line('small',entry.topic);line('p',entry.summary);
  if(entry.kind==='articles'){
    line('h3','Full article');
    if(entry.body){
      for(const paragraph of entry.body.split(/\r?\n[ \t]*\r?\n/)){
        if(paragraph.trim())line('p',paragraph);
      }
    }else line('p','The full text is unavailable for this article.');
  }
  if(entry.sharedBy)line('p','Shared by '+entry.sharedBy);
  if(entry.source && /^https?:\/\//i.test(entry.source)){
    const a=document.createElement('a');a.textContent='Read original paper ↗';a.href=entry.source;a.rel='noopener noreferrer';target.append(a);
  }
}
const publicReader=document.querySelector('#public-reader');
if(publicReader){
  const params=new URLSearchParams(location.search);
  fetch('https://mterm2026-559f9bf571b5.herokuapp.com/api/oilandgas/editor/published/'+encodeURIComponent(params.get('kind'))+'/'+encodeURIComponent(params.get('ref')))
    .then(async r=>{if(!r.ok)throw Error();renderEntry(publicReader,await r.json());})
    .catch(()=>{publicReader.textContent='This entry is unavailable.';});
}
