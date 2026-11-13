'use strict';
(() => {
  const input = document.getElementById('author-search');
  const directory = document.getElementById('author-directory');
  const count = document.getElementById('author-count');
  const empty = document.getElementById('author-empty');
  if (!input || !directory || !count || !empty) return;

  const entries = [...directory.querySelectorAll('li')];
  const normalize = value => String(value || '').normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  const people = entries.map(element => ({
    element,
    name: normalize(element.textContent)
  }));
  const update = () => {
    const query = normalize(input.value);
    let shown = 0;
    for (const person of people) {
      const matches = !query || person.name.includes(query);
      person.element.hidden = !matches;
      if (matches) shown++;
    }
    count.textContent = shown + ' of ' + people.length + ' authors and contributors';
    empty.hidden = shown !== 0;
  };
  input.addEventListener('input', update);
  update();
})();
