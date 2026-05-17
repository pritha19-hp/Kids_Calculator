// ============================================================
// CLOUD-SYNC HISTORY via window.storage (persistent cross-device)
// ============================================================

let currentUser = null;
let currentTheme = 'light';

// ---- Calculator State ----
let displayValue = '0';
let expression = '';
let justCalculated = false;
let pendingPow = false;
let openParens = 0;

// ---- Encourage messages ----
const encourageMessages = [
  '🌟 Great job!', '🎉 Awesome!', '🚀 Math is fun!',
  '💫 You\'re a star!', '🎈 Fantastic!', '🌈 Brilliant!',
  '🦄 Magic!', '⚡ Super fast!', '🍀 Lucky answer!', '🏆 Champion!'
];

// ---- Math facts ----
const mathFacts = [
  '🧠 Did you know? Zero is the only number that can\'t be represented in Roman numerals!',
  '🌍 Pi (π) has been calculated to over 100 trillion digits!',
  '⭐ A "googol" is 1 followed by 100 zeros!',
  '🦋 Fibonacci numbers appear in sunflower seeds and pinecones!',
  '🔢 The word "hundred" comes from the Old Norse word meaning "120"!',
  '🌙 There are 86,400 seconds in a single day!',
  '🎲 The opposite faces of a dice always add up to 7!',
  '🐝 Honeybees use hexagons because it\'s the most efficient shape!',
];

// ============================================================
// INIT
// ============================================================
window.addEventListener('load', () => {
  const saved = localStorage.getItem('mmstar_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    applyUser();
    loadHistory();
  } else {
    document.getElementById('loginModal').style.display = 'flex';
  }

  const savedTheme = localStorage.getItem('mmstar_theme') || 'light';
  setTheme(savedTheme, false);

  document.addEventListener('keydown', handleKeyboard);

  setTimeout(showMathFact, 15000);
  setInterval(showMathFact, 60000);
});

// ============================================================
// LOGIN
// ============================================================
document.getElementById('loginBtn').addEventListener('click', () => {
  const name = document.getElementById('loginInput').value.trim();
  if (!name) {
    document.getElementById('loginInput').style.borderColor = 'var(--accent1)';
    return;
  }
  finishLogin(name);
});

document.getElementById('loginInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('loginBtn').click();
});

document.getElementById('loginSkip').addEventListener('click', () => {
  finishLogin(null);
});

function finishLogin(name) {
  if (name) {
    currentUser = {
      name,
      key: 'mmstar_hist_' + name.toLowerCase().replace(/\s+/g, '_')
    };
    localStorage.setItem('mmstar_user', JSON.stringify(currentUser));
  }
  document.getElementById('loginModal').style.display = 'none';
  applyUser();
  loadHistory();
}

function applyUser() {
  if (!currentUser) {
    document.getElementById('userNameDisplay').textContent = 'Guest';
    document.getElementById('userAvatar').textContent = '👤';
    document.getElementById('syncStatus').textContent = '⚠️ Not syncing';
    document.getElementById('syncBadgeText').textContent = 'Guest';
    document.getElementById('historySub').textContent = 'History saved locally only';
    return;
  }
  const emojis = ['🌟', '⭐', '🚀', '🦄', '🎈', '🎉', '🌈', '🏆', '🍀', '💫'];
  const idx = currentUser.name.charCodeAt(0) % emojis.length;
  document.getElementById('userAvatar').textContent = emojis[idx];
  document.getElementById('userNameDisplay').textContent = currentUser.name;
  document.getElementById('syncStatus').textContent = '✅ Syncing';
  document.getElementById('syncBadgeText').textContent = 'Cloud Synced';
  document.getElementById('historySub').textContent = `${currentUser.name}'s calculations`;
}

// ============================================================
// CLOUD HISTORY — window.storage (shared = true)
// ============================================================
async function loadHistory() {
  try {
    let data = null;
    if (currentUser && window.storage) {
      const result = await window.storage.get(currentUser.key, true);
      if (result) data = JSON.parse(result.value);
    }
    if (!data) {
      const local = localStorage.getItem('mmstar_history_local');
      data = local ? JSON.parse(local) : [];
    }
    renderHistory(data);
  } catch (e) {
    const local = localStorage.getItem('mmstar_history_local');
    renderHistory(local ? JSON.parse(local) : []);
  }
}

async function saveHistoryItem(expr, result) {
  const item = {
    expr,
    result,
    time: new Date().toISOString(),
    id: Date.now()
  };
  try {
    let history = [];
    if (currentUser && window.storage) {
      const res = await window.storage.get(currentUser.key, true);
      if (res) history = JSON.parse(res.value);
    } else {
      const local = localStorage.getItem('mmstar_history_local');
      history = local ? JSON.parse(local) : [];
    }
    history.unshift(item);
    if (history.length > 100) history = history.slice(0, 100);

    if (currentUser && window.storage) {
      await window.storage.set(currentUser.key, JSON.stringify(history), true);
    }
    localStorage.setItem('mmstar_history_local', JSON.stringify(history));
    renderHistory(history);
  } catch (e) {
    const local = localStorage.getItem('mmstar_history_local');
    const history = local ? JSON.parse(local) : [];
    history.unshift(item);
    localStorage.setItem('mmstar_history_local', JSON.stringify(history.slice(0, 100)));
    renderHistory(history);
  }
}

async function clearHistory() {
  try {
    if (currentUser && window.storage) {
      await window.storage.set(currentUser.key, JSON.stringify([]), true);
    }
    localStorage.setItem('mmstar_history_local', JSON.stringify([]));
    renderHistory([]);
  } catch(e) {
    localStorage.setItem('mmstar_history_local', JSON.stringify([]));
    renderHistory([]);
  }
}

function renderHistory(items) {
  const list = document.getElementById('historyList');
  if (!items || items.length === 0) {
    list.innerHTML = `<div class="history-empty">
      <span class="empty-emoji">🧮</span>
      Do some math and your<br>calculations will appear here!
    </div>`;
    return;
  }
  list.innerHTML = items.map(item => {
    const d = new Date(item.time);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' +
      d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `<div class="history-item" onclick="reuseHistory('${escapeAttr(item.result)}')">
      <div class="hi-expr">${escapeHTML(item.expr)}</div>
      <div class="hi-result">= ${escapeHTML(item.result)}</div>
      <div class="hi-time">🕐 ${timeStr}</div>
    </div>`;
  }).join('');
}

function reuseHistory(val) {
  displayValue = String(val);
  expression = '';
  justCalculated = true;
  updateDisplay();
  triggerRipple(document.querySelector('.calc-btn.btn-eq'));
}

// ============================================================
// THEME
// ============================================================
document.getElementById('themeToggle').addEventListener('click', () => {
  setTheme(currentTheme === 'light' ? 'dark' : 'light', true);
});

function setTheme(t, save) {
  currentTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  document.getElementById('themeToggle').textContent = t === 'dark' ? '☀️' : '🌙';
  if (save) localStorage.setItem('mmstar_theme', t);
}

// ============================================================
// MODE
// ============================================================
function setMode(mode) {
  document.getElementById('basicGrid').style.display = mode === 'basic' ? 'grid' : 'none';
  document.getElementById('sciGrid').style.display = mode === 'sci' ? 'grid' : 'none';
  document.getElementById('modeBasic').classList.toggle('active', mode === 'basic');
  document.getElementById('modeSci').classList.toggle('active', mode === 'sci');
}

// ============================================================
// CALCULATOR LOGIC
// ============================================================
document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', () => handleButton(btn));
});

function handleButton(btn) {
  triggerRipple(btn);
  const action = btn.dataset.action;
  const val = btn.dataset.val;

  if (action === 'num') inputNum(val);
  else if (action === 'op') inputOp(val);
  else if (action === 'equals') calculate();
  else if (action === 'clear') clearAll();
  else if (action === 'back') backspace();
  else if (action === 'sci') handleSci(val);
  else if (action === 'paren') inputParen(val);
}

function inputNum(v) {
  if (justCalculated && v !== '.') {
    displayValue = '';
    justCalculated = false;
  }
  if (v === '.' && displayValue.includes('.')) return;
  if (displayValue === '0' && v !== '.') displayValue = v;
  else displayValue += v;
  updateDisplay();
}

function inputOp(v) {
  justCalculated = false;
  if (v === '%') {
    const n = parseFloat(displayValue);
    if (!isNaN(n)) {
      displayValue = String(n / 100);
      expression += displayValue;
      updateDisplay();
    }
    return;
  }
  expression += displayValue + ' ' + v + ' ';
  displayValue = '0';
  updateDisplay();
}

function inputParen(v) {
  if (v === '(') openParens++;
  else if (v === ')' && openParens > 0) openParens--;
  expression += v;
  updateDisplay();
}

function handleSci(fn) {
  justCalculated = false;
  let n = parseFloat(displayValue);
  let result;
  const toRad = deg => deg * Math.PI / 180;

  switch(fn) {
    case 'sin':
      result = Math.sin(toRad(n));
      expression = `sin(${n})`;
      break;
    case 'cos':
      result = Math.cos(toRad(n));
      expression = `cos(${n})`;
      break;
    case 'tan':
      result = Math.tan(toRad(n));
      expression = `tan(${n})`;
      break;
    case 'log':
      result = Math.log10(n);
      expression = `log(${n})`;
      break;
    case 'ln':
      result = Math.log(n);
      expression = `ln(${n})`;
      break;
    case 'sqrt':
      result = Math.sqrt(n);
      expression = `√(${n})`;
      break;
    case 'pow2':
      result = Math.pow(n, 2);
      expression = `(${n})²`;
      break;
    case 'inv':
      result = 1 / n;
      expression = `1/(${n})`;
      break;
    case 'abs':
      result = Math.abs(n);
      expression = `|${n}|`;
      break;
    case 'floor':
      result = Math.floor(n);
      expression = `⌊${n}⌋`;
      break;
    case 'ceil':
      result = Math.ceil(n);
      expression = `⌈${n}⌉`;
      break;
    case 'round':
      result = Math.round(n);
      expression = `round(${n})`;
      break;
    case 'fact':
      result = factorial(n);
      expression = `${n}!`;
      break;
    case 'pi':
      displayValue = String(Math.PI);
      updateDisplay();
      return;
    case 'e':
      displayValue = String(Math.E);
      updateDisplay();
      return;
    case 'exp':
      expression += displayValue + ' × 10^';
      displayValue = '0';
      updateDisplay();
      return;
    case 'cbrt':
      result = Math.cbrt(n);
      expression = `³√(${n})`;
      break;
    case 'pow':
      expression += displayValue + ' ^ ';
      displayValue = '0';
      updateDisplay();
      return;
    default:
      return;
  }

  if (result === undefined || isNaN(result)) {
    displayValue = 'Error';
  } else {
    const exprStr = expression;
    const res = formatResult(result);
    displayValue = res;
    saveHistoryItem(exprStr, res);
    launchConfetti();
    showEncouragement();
  }
  expression = '';
  justCalculated = true;
  updateDisplay();
}

function factorial(n) {
  n = Math.floor(n);
  if (n < 0 || n > 170) return NaN;
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function clearAll() {
  displayValue = '0';
  expression = '';
  openParens = 0;
  justCalculated = false;
  updateDisplay();
  document.getElementById('encourageMsg').textContent = '';
}

function backspace() {
  if (justCalculated) {
    clearAll();
    return;
  }
  if (displayValue.length <= 1) displayValue = '0';
  else displayValue = displayValue.slice(0, -1);
  updateDisplay();
}

function calculate() {
  if (!expression && displayValue === '0') return;

  let fullExpr = expression + displayValue;
  for (let i = 0; i < openParens; i++) fullExpr += ')';
  openParens = 0;

  const displayExpr = fullExpr;

  let jsExpr = fullExpr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\^/g, '**')
    .replace(/π/g, String(Math.PI));

  let result;
  try {
    // eslint-disable-next-line no-new-func
    result = Function('"use strict"; return (' + jsExpr + ')')();
  } catch(e) {
    displayValue = 'Error';
    expression = '';
    updateDisplay();
    return;
  }

  if (!isFinite(result)) {
    displayValue = result === Infinity ? '∞' : 'Error';
  } else {
    displayValue = formatResult(result);
  }

  saveHistoryItem(displayExpr, displayValue);
  launchConfetti();
  showEncouragement();
  expression = '';
  justCalculated = true;
  updateDisplay();
}

function formatResult(n) {
  if (typeof n !== 'number' || isNaN(n)) return 'Error';
  const str = parseFloat(n.toPrecision(12)).toString();
  return str;
}

function updateDisplay() {
  const mainEl = document.getElementById('displayMain');
  mainEl.textContent = displayValue || '0';
  mainEl.classList.remove('pop');
  void mainEl.offsetWidth;
  mainEl.classList.add('pop');
  document.getElementById('displayExpr').textContent = expression || '\u00a0';
}

// ============================================================
// KEYBOARD SUPPORT
// ============================================================
function handleKeyboard(e) {
  const key = e.key;
  if (key >= '0' && key <= '9') inputNum(key);
  else if (key === '.') inputNum('.');
  else if (key === '+') inputOp('+');
  else if (key === '-') inputOp('−');
  else if (key === '*') inputOp('×');
  else if (key === '/') {
    e.preventDefault();
    inputOp('÷');
  }
  else if (key === '%') inputOp('%');
  else if (key === 'Enter' || key === '=') calculate();
  else if (key === 'Backspace') backspace();
  else if (key === 'Escape') clearAll();
  else if (key === '(') inputParen('(');
  else if (key === ')') inputParen(')');
}

// ============================================================
// VISUAL EFFECTS
// ============================================================
function triggerRipple(btn) {
  if (!btn) return;
  btn.classList.remove('ripple');
  void btn.offsetWidth;
  btn.classList.add('ripple');
  setTimeout(() => btn.classList.remove('ripple'), 400);
}

function launchConfetti() {
  const container = document.getElementById('confettiContainer');
  const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9a3c'];
  for (let i = 0; i < 40; i++) {
    setTimeout(() => {
      const c = document.createElement('div');
      c.className = 'confetto';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[Math.floor(Math.random() * colors.length)];
      c.style.animationDuration = (1 + Math.random()) + 's';
      c.style.animationDelay = (Math.random() * 0.5) + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      c.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(c);
      setTimeout(() => c.remove(), 2500);
    }, i * 20);
  }
}

function showEncouragement() {
  const el = document.getElementById('encourageMsg');
  el.textContent = encourageMessages[Math.floor(Math.random() * encourageMessages.length)];
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.opacity = '0';
  }, 2500);
}

function showMathFact() {
  const toast = document.getElementById('mathFactToast');
  toast.textContent = mathFacts[Math.floor(Math.random() * mathFacts.length)];
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}

// ============================================================
// CLEAR HISTORY MODAL
// ============================================================
function promptClearHistory() {
  document.getElementById('clearModal').classList.add('show');
}

document.getElementById('confirmClear').addEventListener('click', async () => {
  document.getElementById('clearModal').classList.remove('show');
  await clearHistory();
});

document.getElementById('cancelClear').addEventListener('click', () => {
  document.getElementById('clearModal').classList.remove('show');
});

document.getElementById('clearModal').addEventListener('click', e => {
  if (e.target === document.getElementById('clearModal'))
    document.getElementById('clearModal').classList.remove('show');
});

// ============================================================
// HELPERS
// ============================================================
function escapeHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return String(str).replace(/'/g, '&#39;').replace(/"/g, '&quot;');
}
