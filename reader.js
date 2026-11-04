function renderEntry(target,entry){
  target.replaceChildren();
  function line(tag,value){
    const node=document.createElement(tag);node.textContent=value;target.append(node);
  }
  line('small',entry.kind==='articles'?'ARTICLE':'RESEARCH PUBLICATION');
  document.title = entry.title + ' | Oil & Gas';line('h1',entry.title);line('p',entry.byline);line('small',entry.topic);line('p',entry.summary);
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
