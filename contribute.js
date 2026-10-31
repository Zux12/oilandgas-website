const form = document.querySelector('#article');
const authors = document.querySelector('#authors');
const result = document.querySelector('#result');
function addAuthor() {
  const row = document.createElement('fieldset');
  row.innerHTML = '<legend></legend><label>Byline name<input required maxlength="160"></label><label>Private email<input required type="email" maxlength="180"></label>';
  row.querySelector('legend').textContent = authors.children.length ? 'Co-author' : 'Submitting author';
  if (authors.children.length) {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'chip';
    remove.textContent = 'Remove co-author';
    remove.onclick = () => row.remove();
    row.append(remove);
  }
  authors.append(row);
}
addAuthor();
document.querySelector('#add').onclick = addAuthor;
form.elements.mode.onchange = () => {
  const word = form.elements.mode.value === 'word';
  for (const [id,enabled] of [['wordArea',word],['textArea',!word]]) {
    const label = document.getElementById(id);
    label.hidden = !enabled;
    const input = label.querySelector('textarea,input');
    input.disabled = !enabled;
    input.required = enabled;
  }
};
function readFile(file) {
  return new Promise((resolve,reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(Error('Could not read the selected file.'));
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.readAsDataURL(file);
  });
}
const submitButton = document.querySelector('#submit');
submitButton.disabled = false;
form.onsubmit = async event => {
  event.preventDefault();
  if (submitButton.disabled) return;
  submitButton.disabled = true;
  result.textContent = 'Submitting your article…';
  try {
    const fields = form.elements;
    const payload = {
      title:fields.namedItem('title').value,summary:fields.summary.value,topic:fields.topic.value,
      mode:fields.mode.value,policy:'article-v1',
      authors:[...authors.children].map(row => {
        const [name,email] = row.querySelectorAll('input');
        return {name:name.value,email:email.value};
      })
    };
    if (payload.mode === 'word') {
      const file = fields.namedItem('document').files[0];
      if (!file || !/\.docx$/i.test(file.name) || file.size > 10*1024*1024) throw Error('Choose a .docx file up to 10 MB.');
      payload.file = await readFile(file);
    } else payload.text = fields.text.value;
    const response = await fetch('https://mterm2026-559f9bf571b5.herokuapp.com/api/oilandgas/articles',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)
    });
    if (response.status === 429) throw Error('Too many attempts. Please retry in 15 minutes.');
    const data = await response.json();
    if (!response.ok || !data.reference) throw Error(data.error || 'Please retry the same submission.');
    form.hidden = true;
    form.style.display = 'none';
    result.textContent = 'Your article has been received for editorial review. Your reference is '+data.reference+'. Please keep it for correspondence.';
    result.focus();
  } catch (err) {
    result.textContent = 'Submission could not be confirmed. '+err.message;
    submitButton.disabled = false;
  }
};
