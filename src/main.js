import './style.css'

// Вот эту часть, если нет желания реализовывать, можно убрать
import { elementMethods } from './baseline.js';

// Этот код не меняем
import { renderWordList } from './renderers.js';
import { WordList } from './wordlist.js';

const loadHtml2Pdf = () => {
  return new Promise((resolve, reject) => {
    if (window.html2pdf) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};


// Эту часть можно делать через обычные querySelector-ы
const { first } = elementMethods();
const root = first("#root");

root.innerHTML =`
  <div id="app">
    <div class="words"></div>
    <div class="add-form"></div>
     <div class="crossword-container">
      <div class="grid-container" id="grid-pdf"></div>
      <div class="words-list" id="crossword-words-list"></div>
    </div>
    <button id="download-pdf-btn">Скачать как PDF</button>
    <!-- Модальное окно -->
    <div id="modal" class="modal">
      <div class="modal-content">
        <h3>Добавить слово в сетку</h3>
        <div class="word-input-wrapper">
          <input type="text" id="grid-word" placeholder="Введите слово" />
          <span class="dropdown-arrow">></span>
          <div id="word-dropdown" class="word-dropdown">
            <div class="dropdown-item" data-word="повар">повар</div>
            <div class="dropdown-item" data-word="чай">чай</div>
            <div class="dropdown-item" data-word="яблоки">яблоки</div>
            <div class="dropdown-item" data-word="сосисочки">сосисочки</div>
          </div>
        </div>
        <div class="direction-select">
          <label>
            <input type="radio" name="direction" value="horizontal" checked />
            По горизонтали
          </label>
          <label>
            <input type="radio" name="direction" value="vertical" />
            По вертикали
          </label>
        </div>
        <div class="modal-buttons">
          <button id="modal-ok">OK</button>
          <button id="modal-cancel">Отмена</button>
        </div>
      </div>
    </div>
    <div id="delete-modal" class="modal">
    <div class="modal-content">
      <h3>Удалить слово?</h3>
      <p id="delete-word-info"></p>
      <div class="modal-buttons">
          <button id="delete-confirm">Да</button>
          <button id="delete-cancel">Отмена</button>
        </div>
      </div>
    </div>
  </div>
`;

const app = root.first("#app");

// Код, начиная с этого места НЕ меняем
const wl = new WordList();

const onChangeWordList = () => {
  root.first('#app .words').innerHTML = renderWordList(wl);
  const wlEl = document.querySelector(".word-list");
  wlEl.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('remove')) {
      const row = target.closest('tr');
      const word = row.querySelector('.word');
      if (word) {
        wl.removeWord(word.innerText);
      }
    }
  });
}

wl.onChange = onChangeWordList;

wl.addWord("повар", "такая профессия");
wl.addWord("чай", "вкусный, делает меня человеком");
wl.addWord("яблоки", "с ананасами");
wl.addWord("сосисочки", "я — Никита Литвинков!");

root.first('#app .add-form').innerHTML =`
  <form class="add-word">
    <input type="text" name="word" />
    <input type="text" name="description"/>
    <input type="button" value="+" />
  </form>
`;

const formEl = document.querySelector('.add-form');
formEl.addEventListener('click', (e) => {
  const target = e.target;
  if (target.type === 'button') {
    const form = target.closest('form');
    const wordEl = form.querySelector('input[name="word"]');
    const descEl = form.querySelector('input[name="description"]');
    const word = wordEl.value;
    const description = descEl.value;
    wl.addWord(word, description);
    wordEl.value = descEl.value = "";
  }
});

// Создание сетки
root.first('#app .grid-container').innerHTML = `
  <div class="tight-grid">
    ${Array.from({length: 100}, (_, i) => 
      `<div class="grid-item" data-index="${i}"></div>`
    ).join('')}
  </div>
`;

let selectedCellIndex = null;
const modal = document.getElementById('modal');
const gridWordInput = document.getElementById('grid-word');
const modalOk = document.getElementById('modal-ok');
const modalCancel = document.getElementById('modal-cancel');
const deleteConfirm = document.getElementById('delete-confirm');
const deleteCancel = document.getElementById('delete-cancel');
const deleteWordInfo = document.getElementById('delete-word-info');
const deleteModal = document.getElementById('delete-modal');
const crosswordWordsList = document.getElementById('crossword-words-list');

const gridWords = [];

// Обновление списка слов кроссворда
function updateCrosswordWordsList() {
  if (gridWords.length === 0) {
    crosswordWordsList.innerHTML = '';
    return;
  }

  let html = '<h3>Слова в кроссворде:</h3><ul>';
  gridWords.forEach(wordData => {
    html += `<li>${wordData.word}</li>`;
  });
  html += '</ul>';
  
  crosswordWordsList.innerHTML = html;
}


function canPlaceWord(word, direction, startIndex) {
  const gridItems = document.querySelectorAll('.grid-item');
  const row = Math.floor(startIndex / 10);
  const col = startIndex % 10;

  // Проверка, чтобы слово вмещалось в сетку

  if (direction === 'horizontal') {
    if (col + word.length > 10) {
      return false;
    }
  } else {
    if (row + word.length > 10) {
      return false;
    }
  }

  for (let i = 0; i < word.length; i++) {
    let cellIndex;
    
    if (direction === 'horizontal') {
      cellIndex = row * 10 + (col + i);
    } else {
      cellIndex = (row + i) * 10 + col;
    }
  }
  
  return true;
}

// Функция обновления состояния кнопки OK
function updateOkButtonState() {
  const word = gridWordInput.value.trim();
  const direction = document.querySelector('input[name="direction"]:checked').value;
  
  if (word && selectedCellIndex !== null && canPlaceWord(word, direction, selectedCellIndex)) {
    modalOk.disabled = false;
    modalOk.style.opacity = '1';
    modalOk.style.cursor = 'pointer';
  } else {
    modalOk.disabled = true;
    modalOk.style.opacity = '0.5';
    modalOk.style.cursor = 'not-allowed';
  }
}

function findWordByCell(cellIndex) {
  for (const wordData of gridWords) {
    const { word, direction, startIndex } = wordData;
    const row = Math.floor(startIndex / 10);
    const col = startIndex % 10;

    for (let i = 0; i < word.length; i++) {
      let currentCellIndex;
      
      if (direction === 'horizontal') {
        currentCellIndex = row * 10 + (col + i);
      } else {
        currentCellIndex = (row + i) * 10 + col;
      }
      
      if (currentCellIndex === cellIndex) {
        return wordData;
      }
    }
  }
  return null;
}

// Удаление слова из сетки

function removeWordFromGrid(wordData) {
  const { word, direction, startIndex } = wordData;
  const gridItems = document.querySelectorAll('.grid-item');
  const row = Math.floor(startIndex / 10);
  const col = startIndex % 10;

  // Удаление букв слова в сетке

  for (let i = 0; i < word.length; i++) {
    let cellIndex;
    
    if (direction === 'horizontal') {
      cellIndex = row * 10 + (col + i);
    } else {
      cellIndex = (row + i) * 10 + col;
    }
    
    if (cellIndex < 100 && gridItems[cellIndex]) {
      gridItems[cellIndex].textContent = '';
    }
    
  }

// Удаление слова из хранилища

  const wordIndex = gridWords.indexOf(wordData);
  if (wordIndex !== -1) {
    gridWords.splice(wordIndex, 1);
  }
  updateCrosswordWordsList();
}

// Окно удаления слова

function showDeleteModal(wordData) {
  deleteWordInfo.textContent = `Слово: "${wordData.word}" (${wordData.direction === 'horizontal' ? 'по горизонтали' : 'по вертикали'})`;
  deleteModal.style.display = 'block';
  
  deleteModal.currentWordData = wordData;
}

// Скрытие окна удаления

function hideDeleteModal() {
  deleteModal.style.display = 'none';
  deleteModal.currentWordData = null;
}

document.addEventListener('DOMContentLoaded', function() {
  const dropdownArrow = document.querySelector('.dropdown-arrow');
  const wordDropdown = document.getElementById('word-dropdown');

  function toggleDropdown() {
    wordDropdown.classList.toggle('show');
  }
  if (dropdownArrow) {
    dropdownArrow.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleDropdown();
    });
  }
  if (wordDropdown) {
    wordDropdown.addEventListener('click', function(e) {
      const target = e.target;
      if (target.classList.contains('dropdown-item')) {
        const word = target.getAttribute('data-word');
        console.log('Word selected:', word);
        gridWordInput.value = word;
        wordDropdown.classList.remove('show');
        gridWordInput.focus();
        updateOkButtonState();
      }
    });
  }
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.word-input-wrapper')) {
      if (wordDropdown) {
        wordDropdown.classList.remove('show');
      }
    }
  });
  if (gridWordInput) {
    gridWordInput.addEventListener('click', function(e) {
      e.stopPropagation();
      if (wordDropdown) {
        wordDropdown.classList.add('show');
      }
    });
     gridWordInput.addEventListener('input', updateOkButtonState);
  }
   const directionInputs = document.querySelectorAll('input[name="direction"]');
  directionInputs.forEach(input => {
    input.addEventListener('change', updateOkButtonState);
  });
  updateCrosswordWordsList();
});

function showModal(cellIndex) {
  selectedCellIndex = cellIndex;
  modal.style.display = 'block';
  gridWordInput.value = '';
  gridWordInput.focus();
  const wordDropdown = document.getElementById('word-dropdown');
  if (wordDropdown) {
    wordDropdown.classList.remove('show');
  }
  updateOkButtonState();
}

function hideModal() {
  modal.style.display = 'none';
  selectedCellIndex = null;
}

const gridContainer = document.querySelector('.tight-grid');
if (gridContainer) {
  gridContainer.addEventListener('click', (e) => {
    const target = e.target;
    if (target.classList.contains('grid-item')) {
      const index = parseInt(target.getAttribute('data-index'));
      const existingWord = findWordByCell(index);
      if (existingWord) {
        showDeleteModal(existingWord);
      } else {
        showModal(index);
      }
    }
  });
}

modalOk.addEventListener('click', () => {
  const word = gridWordInput.value.trim();
  const direction = document.querySelector('input[name="direction"]:checked').value;
  
  if (word && selectedCellIndex !== null) {
    addWordToGrid(word, direction, selectedCellIndex);
    hideModal();
  }
});

modalCancel.addEventListener('click', hideModal);

// Обработчики для окна удаления

deleteConfirm.addEventListener('click', () => {
  if (deleteModal.currentWordData) {
    removeWordFromGrid(deleteModal.currentWordData);
    hideDeleteModal();
  }
});

deleteCancel.addEventListener('click', hideDeleteModal);

function addWordToGrid(word, direction, startIndex) {
  const gridItems = document.querySelectorAll('.grid-item');
  const row = Math.floor(startIndex / 10);
  const col = startIndex % 10;

// Информация о слове

  gridWords.push({
    word,
    direction,
    startIndex
  });

  for (let i = 0; i < word.length; i++) {
    let cellIndex;
    
    if (direction === 'horizontal') {
      cellIndex = row * 10 + (col + i);
    } else {
      cellIndex = (row + i) * 10 + col;
    }
    
    if (cellIndex < 100 && gridItems[cellIndex]) {
      gridItems[cellIndex].textContent = word[i];
    }
  }
  updateCrosswordWordsList();
}

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    hideModal();
  }
  if (e.target === deleteModal) {
    hideDeleteModal();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideModal();
    hideDeleteModal();
  }
});

async function downloadPDF() {
  try {
    await loadHtml2Pdf();
    
    const element = document.getElementById('grid-pdf');
    
    if (!element) {
      console.error('Элемент grid-pdf не найден');
      return;
    }
    const options = {
      margin: 10,
      filename: 'crossword.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(element).set(options).save();
    
  } catch (error) {
    alert('ошибка');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-pdf-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadPDF);
  }
});
