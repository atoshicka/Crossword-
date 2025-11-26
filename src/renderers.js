export function renderWordList(wordList) {
  const template = document.getElementById('word-list');
  const clone = template.content.cloneNode(true);
  const tbody = clone.querySelector('tbody');

  tbody.innerHTML = '';

  wordList.words.forEach(word => {
    const rowTemplate = document.getElementById('table-row');
    const rowClone = rowTemplate.content.cloneNode(true);
    const row = rowClone.querySelector('tr');
    
    row.innerHTML = row.innerHTML
      .replace('%word', word.word)
      .replace('%description', word.description);
    
    tbody.appendChild(row);
  });
  
  return clone.firstElementChild.outerHTML;
}
export const renderAddForm = () => {
  return template('add-form');
}