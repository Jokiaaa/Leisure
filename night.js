'use strict';
const rabbitArt = `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false"><path d="M22 39Q8-4 26 3Q36 9 36 35M44 35Q46-5 61 4Q73 10 59 40" fill="#f1e8ce" stroke="#d7ccb4" stroke-width="2"/><path d="M26 30Q19 9 25 10Q30 12 30 30M51 30Q55 9 60 11Q64 13 57 32" fill="#d9a5a3"/><ellipse cx="41" cy="51" rx="29" ry="26" fill="#f1e8ce"/><circle cx="29" cy="48" r="3" fill="#364849"/><circle cx="54" cy="48" r="3" fill="#364849"/><path d="M37 56q5-4 9 0l-5 5Z" fill="#c68884"/><path d="M34 64q7 5 14 0" fill="none" stroke="#ae9d87" stroke-width="2" stroke-linecap="round"/><circle cx="23" cy="57" r="4" fill="#e6bdb1"/><circle cx="60" cy="57" r="4" fill="#e6bdb1"/></svg>`;
const foxArt = `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false"><path d="M13 36L7 5Q25 7 31 22M49 22Q61 5 73 5l-6 34" fill="#da8c50" stroke="#bb703e" stroke-width="2"/><path d="M15 25L12 12l15 13M54 25l13-13-4 15" fill="#68483c"/><path d="M9 39Q12 16 40 19Q69 16 72 39Q73 61 41 76Q9 62 9 39" fill="#da8c50"/><path d="M10 40Q23 35 40 56Q57 35 71 40Q68 62 41 76Q14 62 10 40" fill="#f3dfba"/><path d="M26 41l6 3M49 44l6-3" stroke="#493b33" stroke-width="3" stroke-linecap="round"/><path d="M35 60q6-6 12 0q-6 10-12 0" fill="#493b33"/></svg>`;
const ids = ['兔兔 1', '兔兔 2', '兔兔 3', '狐狸 1', '狐狸 2', '狐狸 3'];
const art = id => id < 3 ? rabbitArt : foxArt;
const fresh = () => ({ positions: [0,0,0,0,0,0], boat: 0, selected: [], history: [] });
const storageKey = 'leisure-moon-river-v1';
let state = fresh();
let best = null;
let busy = false;
let canSave = true;
const validPositions = p => Array.isArray(p) && p.length === 6 && p.every(x => x === 0 || x === 1);
function safe(p) {
  return [0,1].every(side => {
    const rabbits = p.slice(0,3).filter(x => x === side).length;
    const foxes = p.slice(3).filter(x => x === side).length;
    return rabbits === 0 || rabbits >= foxes;
  });
}
function validSnapshot(s) { return s && validPositions(s.positions) && safe(s.positions) && (s.boat === 0 || s.boat === 1); }
try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (stored && validSnapshot(stored.state) && Array.isArray(stored.state.history) && stored.state.history.every(validSnapshot)) {
    // Verify saved history rather than trusting inconsistent or edited move counts.
    const snapshots = [...stored.state.history, stored.state];
    const first = snapshots[0];
    const validHistory = first.boat === 0 && first.positions.every(x => x === 0) && snapshots.every((s,i) => {
      if (!i) return true;
      const prev = snapshots[i-1];
      const moved = s.positions.map((x,j) => x !== prev.positions[j] ? j : -1).filter(j => j >= 0);
      return s.boat !== prev.boat && moved.length >= 1 && moved.length <= 2 && moved.every(j => prev.positions[j] === prev.boat && s.positions[j] === s.boat);
    });
    if (validHistory) {
      state = stored.state;
      const selection = state.selected;
      state.selected = Array.isArray(selection) && selection.length <= 2 && new Set(selection).size === selection.length && selection.every(i => Number.isInteger(i) && i >= 0 && i < 6 && state.positions[i] === state.boat) ? selection : [];
    }
  }
  if (Number.isInteger(stored?.best) && stored.best >= 11) best = stored.best;
} catch { canSave = false; }
const won = () => state.positions.every(x => x === 1);
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify({state,best})); }
  catch { canSave = false; }
  document.querySelector('#save-status').textContent = canSave ? '自动保存' : '当前浏览器无法保存进度';
}
function message(text, success = false) {
  const el = document.querySelector('#message');
  el.textContent = text; el.className = success ? 'success' : '';
}
function clearHint() { document.querySelector('#hint-panel').hidden = true; }
function toggle(id) {
  if (busy || won()) return;
  if (state.positions[id] !== state.boat) return message('船在另一岸，先把船开过来。');
  if (state.selected.includes(id)) state.selected = state.selected.filter(i => i !== id);
  else if (state.selected.length === 2) return message('小船坐满啦！点船上的动物，可以让它下船。');
  else state.selected.push(id);
  message(''); clearHint(); save(); render();
}
function render() {
  [0,1].forEach(side => {
    const bank = document.querySelector(side ? '#right-animals' : '#left-animals');
    // Keep all six places stable so animals never jump around while boarding.
    bank.replaceChildren();
    ids.forEach((name,id) => {
      const present = state.positions[id] === side;
      const selected = present && state.selected.includes(id);
      const button = document.createElement('button');
      button.className = `animal${!present ? ' empty' : selected ? ' selected' : ''}`;
      button.disabled = !present || busy || won() || state.boat !== side;
      button.setAttribute('aria-label', `${side ? '右' : '左'}岸${name}${selected ? '，已上船，点击下船' : present ? '，点击上船' : '，不在此岸'}`);
      button.setAttribute('aria-pressed', String(selected));
      if (!present) { button.textContent = '·'; button.setAttribute('aria-hidden','true'); button.tabIndex = -1; }
      else if (selected) button.innerHTML = '<span aria-hidden="true">⛵</span><small>已上船</small>';
      else button.innerHTML = `${art(id)}<small>${name}</small>`;
      button.onclick = () => toggle(id);
      bank.append(button);
    });
    const remaining = ids.map((_,i)=>i).filter(i => state.positions[i] === side && !state.selected.includes(i));
    document.querySelector(side ? '#right-count' : '#left-count').textContent = `🐰 ${remaining.filter(i=>i<3).length}　🦊 ${remaining.filter(i=>i>=3).length}`;
  });
  const passengers = document.querySelector('#passengers');
  passengers.replaceChildren();
  for (let slot = 0; slot < 2; slot++) {
    const id = state.selected[slot];
    const button = document.createElement('button');
    button.className = `passenger${id !== undefined ? ' filled' : ''}`;
    button.disabled = id === undefined || busy;
    button.innerHTML = id !== undefined ? art(id) : '+';
    button.setAttribute('aria-label', id !== undefined ? `${ids[id]}下船` : '空船位');
    button.onclick = () => toggle(id);
    passengers.append(button);
  }
  document.querySelector('#boat-wrap').classList.toggle('right', state.boat === 1);
  document.querySelector('#boat-label').textContent = `小船停在${state.boat ? '右' : '左'}岸 · ${state.selected.length}/2`;
  document.querySelector('#moves').textContent = `第 ${state.history.length} 次渡河`;
  document.querySelector('#best').textContent = best ? `你的最佳 ${best} 次 · 最优 11 次` : '最少需要 11 次';
  document.querySelector('#sail').textContent = state.boat ? '← 驶向左岸' : '驶向右岸 →';
  document.querySelector('#sail').disabled = busy || won();
  document.querySelector('#undo').disabled = busy || !state.history.length;
  document.querySelector('#reset').disabled = busy;
  document.querySelector('#hint').disabled = busy || won();
  document.querySelector('.game').classList.toggle('sailing',busy);
  document.querySelector('#instruction').textContent = won() ? '所有旅客安全抵达，干得漂亮！' : `① 点${state.boat ? '右' : '左'}岸动物上船　② 出发时检查两岸安全`;
  document.querySelector('#victory').hidden = !won();
  if (won()) document.querySelector('#victory-text').textContent = state.history.length === 11 ? '11 次渡河，最优解！你是今晚的航行大师。' : `用了 ${state.history.length} 次渡河。挑战一下 11 次最优解？`;
}
async function sail() {
  if (busy || won()) return;
  if (!state.selected.length) return message('船不能空着走，先点一只或两只动物上船。');
  const next = [...state.positions];
  state.selected.forEach(id => next[id] = 1 - state.boat);
  if (!safe(next)) {
    const side = [0,1].find(s => {const r=next.slice(0,3).filter(x=>x===s).length;const f=next.slice(3).filter(x=>x===s).length;return r>0&&f>r;});
    return message(`⚠ ${side ? '右' : '左'}岸狐狸会比兔子多。换一组乘客试试！`);
  }
  clearHint(); message('');
  state.history.push({positions:[...state.positions],boat:state.boat});
  state.positions = next; state.boat = 1-state.boat;
  busy = true;
  // Retain the passengers during the crossing, then disembark them together.
  render();
  await new Promise(resolve => setTimeout(resolve, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620));
  state.selected = []; busy = false;
  if (won()) {best = Math.min(best || Infinity,state.history.length);message('✦ 六位旅客全部安全抵达！',true);}
  save(); render();
}
document.querySelector('#sail').onclick = sail;
document.querySelector('#undo').onclick = () => {
  if (busy || !state.history.length) return;
  const prev = state.history.pop();state.positions=prev.positions;state.boat=prev.boat;state.selected=[];
  message('已撤销上一次渡河。');clearHint();save();render();
};
function reset() {
  if (busy) return;
  if ((state.history.length || state.selected.length) && !confirm('重新开始渡河？最佳纪录会保留。')) return;
  state=fresh();clearHint();message('新一轮航行，开始吧。');save();render();
}
document.querySelector('#reset').onclick=reset;
document.querySelector('#again').onclick=reset;
// Breadth-first search finds a shortest legal route from the current position.
// It powers a single-step hint rather than revealing the whole solution.
function route(positions, boat) {
  const encode=(p,b)=>p.join('')+b;
  const queue=[{p:positions,b:boat,path:[]}];
  const visited=new Set([encode(positions,boat)]);
  for(let head=0;head<queue.length;head++) {
    const current=queue[head];
    if(current.p.every(x=>x===1)) return current.path;
    const available=ids.map((_,i)=>i).filter(i=>current.p[i]===current.b);
    const groups=available.map(i=>[i]);
    for(let i=0;i<available.length;i++)for(let j=i+1;j<available.length;j++)groups.push([available[i],available[j]]);
    for(const group of groups) {
      const next=[...current.p];group.forEach(i=>next[i]=1-current.b);
      const code=encode(next,1-current.b);
      if(!safe(next)||visited.has(code))continue;
      visited.add(code);queue.push({p:next,b:1-current.b,path:[...current.path,group]});
    }
  }
  return null;
}
document.querySelector('#hint').onclick=()=>{
  if(busy||won())return;
  const path=route(state.positions,state.boat);
  if(!path?.length)return message('这里暂时走不通，试试撤销上一步。');
  const panel=document.querySelector('#hint-panel');
  panel.hidden=false;
  panel.innerHTML=`<div class="hint-title">只看下一步</div><div class="hint-icons">${path[0].map(art).join('')}<strong>${state.boat?'←':'→'}</strong><span>${state.boat?'左岸':'右岸'}</span></div><p>让${path[0].map(i=>ids[i]).join('和')}上船，驶向${state.boat?'左':'右'}岸。</p>`;
};
save();render();
