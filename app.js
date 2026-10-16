'use strict';
const people = ['林晓', '阿澈', '米粒', '可可'];
const drinks = ['柠檬茶', '咖啡', '热可可', '牛奶'];
const clueText = [
  '林晓喝柠檬茶', '林晓和阿澈紧挨着，阿澈在右边', '2 号座位喝咖啡',
  '咖啡和热可可紧挨着，热可可在右边', '4 号座位喝牛奶', '可可坐在 4 号座位'
];
const clueArt = [
  relation(token('林晓'), '♡', token('柠檬茶'), '喝的是'),
  relation(token('林晓'), '→', token('阿澈'), '紧挨右边'),
  relation(seatToken(2), '=', token('咖啡'), '这里喝'),
  relation(token('咖啡'), '→', token('热可可'), '紧挨右边'),
  relation(seatToken(4), '=', token('牛奶'), '这里喝'),
  relation(token('可可'), '→', seatToken(4), '坐这里')
];
const key = 'leisure-case-001-v1';
const emptyState = () => ({ answers: Array(8).fill(''), used: [], hints: 0 });
let state = emptyState();
let storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && Array.isArray(saved.answers) && saved.answers.length === 8 &&
      saved.answers.every((x, i) => x === '' || (i % 2 ? drinks : people).includes(x)) &&
      Array.isArray(saved.used)) {
    state = {
      answers: saved.answers,
      used: saved.used.filter(i => Number.isInteger(i) && i >= 0 && i < 6),
      hints: Number.isInteger(saved.hints) && saved.hints >= 0 ? Math.min(saved.hints, 3) : 0
    };
  }
} catch { storageAvailable = false; }
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); }
  catch { storageAvailable = false; }
  updateStorageStatus();
}
function updateStorageStatus() {
  document.querySelector('#save-status').textContent = storageAvailable
    ? '进度自动保存在本机' : '本次进度未保存，关闭页面会丢失';
}
function message(text, success = false) {
  const el = document.querySelector('#message');
  el.textContent = text;
  el.className = success ? 'success' : '';
}
clueArt.forEach((html, i) => {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.className = 'clue-card';
  button.setAttribute('aria-label', `线索 ${i + 1}：${clueText[i]}`);
  button.innerHTML = `<span class="clue-top"><span>线索 ${i + 1}</span><span class="used-mark" aria-hidden="true">✓</span></span>${html}`;
  button.onclick = () => {
    state.used = state.used.includes(i) ? state.used.filter(n => n !== i) : [...state.used, i];
    updateClues(); save();
  };
  li.append(button);
  document.querySelector('#clues').append(li);
});
function updateClues() {
  document.querySelectorAll('.clue-card').forEach((el, i) => {
    el.classList.toggle('used', state.used.includes(i));
    el.setAttribute('aria-pressed', String(state.used.includes(i)));
  });
}
const picker = document.querySelector('#picker');
let activeIndex = null;
function openPicker(index) {
  activeIndex = index;
  const type = index % 2;
  document.querySelector('#picker-title').textContent = `${Math.floor(index / 2) + 1} 号 · 选择${type ? '饮品' : '客人'}`;
  document.querySelector('#picker-note').textContent = '点图放入座位，已使用的也可以重新选择。';
  const options = document.querySelector('#picker-options');
  options.replaceChildren();
  (type ? drinks : people).forEach(name => {
    const button = document.createElement('button');
    button.className = 'choice';
    const elsewhere = state.answers.findIndex((x, i) => i !== index && x === name);
    button.setAttribute('aria-label', name);
    button.setAttribute('aria-pressed', String(state.answers[index] === name));
    button.innerHTML = `${token(name)}<small>${state.answers[index] === name ? '✓ 当前选择' : elsewhere >= 0 ? `已在 ${Math.floor(elsewhere / 2) + 1} 号` : '点击选择'}</small>`;
    button.onclick = () => setAnswer(name);
    options.append(button);
  });
  document.querySelector('#clear-choice').disabled = !state.answers[index];
  picker.showModal();
}
function setAnswer(value) {
  state.answers[activeIndex] = value;
  save(); renderBoard();
  message('');
  document.querySelector('#explanation').hidden = true;
  document.querySelectorAll('.clue-card').forEach(el => el.classList.remove('conflict'));
  picker.close();
}
function renderBoard() {
  const board = document.querySelector('#board');
  if (!board.children.length) {
    for (let seat = 0; seat < 4; seat++) {
      const card = document.createElement('div');
      card.className = 'seat';
      card.innerHTML = `<h3>${seat + 1} <span>号</span></h3>`;
      for (let type = 0; type < 2; type++) {
        const index = seat * 2 + type;
        const button = document.createElement('button');
        button.id = `answer-${index}`;
        button.className = 'slot';
        button.setAttribute('aria-haspopup', 'dialog');
        button.onclick = () => openPicker(index);
        card.append(button);
      }
      board.append(card);
    }
  }
  state.answers.forEach((value, i) => {
    const button = document.querySelector(`#answer-${i}`);
    const type = i % 2 ? '饮品' : '客人';
    button.innerHTML = value ? `${icon(value)}<span>${value}</span>`
      : `<span class="empty-art" aria-hidden="true">${i % 2 ? '♧' : '♙'}</span><span>＋ ${type}</span>`;
    button.classList.toggle('filled', Boolean(value));
    button.setAttribute('aria-label', `${Math.floor(i / 2) + 1} 号${type}：${value || '未选择'}，点击更换`);
  });
  document.querySelector('#progress').textContent = `已放置 ${state.answers.filter(Boolean).length} / 8`;
}
document.querySelector('#close-picker').onclick = () => picker.close();
picker.addEventListener('click', e => { if (e.target === picker) {
  const box = picker.getBoundingClientRect();
  if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) picker.close();
} });
document.querySelector('#clear-choice').onclick = () => setAnswer('');
function matchingClues() {
  const p = people.map(name => state.answers.findIndex(x => x === name) / 2);
  const d = drinks.map(name => (state.answers.findIndex(x => x === name) - 1) / 2);
  return [p[0] === d[0], p[1] === p[0] + 1, d[1] === 1,
    d[2] === d[1] + 1, d[3] === 3, p[3] === 3];
}
document.querySelector('#check').onclick = () => {
  document.querySelectorAll('.clue-card').forEach(el => el.classList.remove('conflict'));
  if (state.answers.some(x => !x)) {
    const index = state.answers.findIndex(x => !x);
    message('还有空位，点「＋」放入客人和饮品。');
    document.querySelector(`#answer-${index}`).focus();
    return;
  }
  for (let type = 0; type < 2; type++) {
    if (new Set(state.answers.filter((_, i) => i % 2 === type)).size !== 4) {
      message(`${type ? '饮品' : '客人'}重复了，每种只能用一次。点座位更换。`);
      return;
    }
  }
  const matches = matchingClues();
  if (matches.every(Boolean)) {
    message('🎉 全部吻合！你还原了咖啡馆的午后。', true);
    document.querySelector('#explanation').hidden = false;
  } else {
    document.querySelectorAll('.clue-card').forEach((el, i) => el.classList.toggle('conflict', !matches[i]));
    message('还差一点！下方橙色线索卡与当前摆放不符。');
  }
};
const hints = [
  { art: relation(seatToken(2), '=', token('咖啡'), '已知') + relation(seatToken(3), '=', token('热可可'), '所以'), text: '咖啡在 2 号，右边紧挨的热可可就在 3 号。' },
  { art: relation(token('林晓'), '→', seatToken(1), '坐这里') + relation(seatToken(1), '=', token('柠檬茶'), '剩下的'), text: '2、3、4 号饮品已确定，柠檬茶和林晓只能在 1 号。' },
  { art: relation(seatToken(2), '=', token('阿澈'), '右边邻座') + relation(seatToken(3), '=', token('米粒'), '剩下的'), text: '阿澈紧挨林晓坐 2 号；可可在 4 号，米粒就坐 3 号。' }
];
document.querySelector('#hint').onclick = () => {
  const hint = hints[Math.min(state.hints, 2)];
  const panel = document.querySelector('#hint-panel');
  panel.hidden = false;
  panel.innerHTML = `<div class="hint-title">✦ 图解提示 ${Math.min(state.hints + 1, 3)} / 3</div><div class="hint-art">${hint.art}</div><p>${hint.text}</p>`;
  message(''); state.hints = Math.min(state.hints + 1, 3); save();
};
document.querySelector('#reset').onclick = () => {
  if ((state.answers.some(Boolean) || state.used.length || state.hints) && !confirm('清空本案的选择和线索标记，重新开始？')) return;
  state = emptyState(); save(); renderBoard(); updateClues();
  document.querySelector('#explanation').hidden = true;
  document.querySelector('#hint-panel').hidden = true;
  document.querySelectorAll('.clue-card').forEach(el => el.classList.remove('conflict'));
  message('已重新开始，点空位试试看。');
};
document.querySelector('#legend').innerHTML = `<div>${people.map(token).join('')}</div><div>${drinks.map(token).join('')}</div>`;
document.querySelector('#solution-steps').innerHTML = hints.map((hint, i) => `<div class="solution-step"><b>0${i + 1}</b><div class="hint-art">${hint.art}</div><p>${hint.text}</p></div>`).join('');
renderBoard(); updateClues(); updateStorageStatus();
