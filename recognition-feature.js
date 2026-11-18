'use strict';
(async()=>{
 const root=document.getElementById('recognition-home-list');
 if(!root)return;
 const api='https://mterm2026-559f9bf571b5.herokuapp.com/api/oilandgas/recognition/current';
 const categories=[
  ['editors-pick',"Research Editor's Pick of the Week"],
  ['industry-impact','Industry Impact Spotlight'],
  ['emerging-research','Emerging Research Spotlight']
 ];
 const el=(name,value,cls)=>{const n=document.createElement(name);if(value)n.textContent=value;if(cls)n.className=cls;return n};
 try{
  const r=await fetch(api,{signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error('Unavailable');
  const json=await r.json(),rows=new Map((json.items||[]).map(row=>[row.category,row]));
  root.replaceChildren();
  for(const [key,label]of categories){
   const paper=rows.get(key),card=el('article',null,'recognition-card'+(key==='editors-pick'?' recognition-main':''));
   card.append(el('p',label.toUpperCase(),'recognition-category'));
   if(paper){
    card.append(el('h3',paper.title),el('p',paper.byline||'Published research'));
    if(paper.summary)card.append(el('p',paper.summary.slice(0,320)));
    const a=el('a','View research recognition ↗','recognition-link');
    a.href='recognition-detail.html?id='+encodeURIComponent(paper.id);
    card.append(a);
   }else{
    card.append(el('h3','No recognition awarded this week'));
    card.append(el('p','This category remains unfilled until a publication meets the research assessment criteria.'));
   }
   root.append(card);
  }
 }catch{
  // Keep truthful, usable controlled-testing placeholders if the API is unavailable.
 }
})();
