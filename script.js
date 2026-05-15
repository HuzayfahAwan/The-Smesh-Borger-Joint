/* =============================================================
   The Smesh Borger Joint — script.js
   Features: drag&drop, keyboard shortcuts, burger name generator,
   confetti, IntersectionObserver, localStorage, Web Audio API,
   nutrition facts, discount codes, Smash Mode
============================================================= */

// ── DOM refs ────────────────────────────────────────────────
const ingredientButtons  = document.querySelectorAll('.ingredient-btn');
const burgerContent      = document.getElementById('burger-content');
const totalPriceEl       = document.getElementById('price');
const addToBasketBtn     = document.getElementById('add-to-basket-btn');
const clearBurgerBtn     = document.getElementById('clear-burger-btn');
const khabibSpecialBtn   = document.getElementById('khabib-special-btn');
const generateNameBtn    = document.getElementById('generate-name-btn');
const burgerNameInput    = document.getElementById('burger-name');
const checkoutBtn        = document.getElementById('checkout-btn');
const basketItemsEl      = document.getElementById('basket-items');
const totalCostEl        = document.getElementById('total-cost');
const orderCountEl       = document.getElementById('order-count');
const toastEl            = document.getElementById('toast');
const burgerMenuBtn      = document.getElementById('burger-menu');
const navLinks           = document.querySelector('.nav-links');
const orderArea          = document.getElementById('order-area');
const discountInput      = document.getElementById('discount-input');
const applyDiscountBtn   = document.getElementById('apply-discount-btn');
const smashBtn           = document.getElementById('smash-btn');
const confettiCanvas     = document.getElementById('confetti-canvas');
const menuCards          = document.querySelectorAll('.card[data-ingredient]');

// ── Constants ────────────────────────────────────────────────
const EMOJIS = { tomato:'🍅', onion:'🧅', lettuce:'🥬', cheese:'🧀', patty:'🥩' };
const PRICES = { tomato:0.30, onion:0.40, lettuce:0.00, cheese:0.75, patty:1.25 };
const MAX_PER = 3;

const NUTRITION = {
  base:    { cal:120, fat:2.0,  carbs:22, protein:4.0,  sodium:200 },
  tomato:  { cal:18,  fat:0.0,  carbs:4,  protein:1.0,  sodium:5   },
  onion:   { cal:22,  fat:0.0,  carbs:5,  protein:0.5,  sodium:2   },
  lettuce: { cal:5,   fat:0.0,  carbs:1,  protein:0.5,  sodium:4   },
  cheese:  { cal:113, fat:9.0,  carbs:0,  protein:7.0,  sodium:174 },
  patty:   { cal:287, fat:23.0, carbs:0,  protein:19.0, sodium:79  },
};

const DISCOUNT_CODES = {
  UFC229:    0.10,
  SMESH:     0.15,
  KHABIB:    0.20,
  HASBULLAH: 0.05,
  SUBMIT:    0.25,
};

const NAME_PARTS = {
  prefixes: ['The', "Khabib's", 'Dagestani', 'UFC', 'No Mercy', "Eagle's", 'The Undefeated'],
  pattyNouns: ['Destroyer', 'Annihilator', 'Submission', 'Smesh', 'Champion', 'Warrior', 'Grappler', 'Takedown'],
  cheeseAdj: ['Golden', 'Melty', 'Supreme', 'Victory', 'Championship'],
  tomatoAdj: ['Bloody', 'Crimson', 'Juicy', 'Deadly', 'Savage'],
  onionAdj:  ['Layered', 'Fierce', 'Punchy', 'Relentless'],
  lettuceAdj:['Green Machine', 'Tactical', 'Lightweight', 'Disciplined'],
  noPatty:   ['The Coward\'s Bun', 'McGregor\'s Special (nothing)', 'The Tap-Out', 'The Plant-Based Warrior', 'The Veggie Submission'],
};

// ── State ────────────────────────────────────────────────────
let currentIngredients = []; // { ingredient, price, element }
let orders = [];              // { ingredients[], total, name, discountedTotal }
let totalPrice    = 0;
let basketTotal   = 0;
let activeDiscount = 0;
let toastTimer    = null;
let smashCooldown = false;
let audioCtx      = null;

// ── Load persisted state ─────────────────────────────────────
function loadStorage() {
  try {
    const saved = JSON.parse(localStorage.getItem('smeshBorger') || '{}');
    orders        = saved.orders        || [];
    basketTotal   = saved.basketTotal   || 0;
    activeDiscount= saved.activeDiscount|| 0;
    if (activeDiscount > 0) discountInput.value = saved.usedCode || '';
  } catch { /* ignore corrupt storage */ }
}

function saveStorage(usedCode) {
  localStorage.setItem('smeshBorger', JSON.stringify({
    orders, basketTotal, activeDiscount,
    usedCode: usedCode || discountInput.value.toUpperCase(),
  }));
}

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// ── Web Audio API ────────────────────────────────────────────
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, type = 'sine', dur = 0.15, vol = 0.22, delay = 0) {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + dur + 0.01);
  } catch { /* AudioContext not available */ }
}

const INGREDIENT_SOUNDS = {
  tomato:  () => playTone(330, 'sine',     0.12, 0.28),
  onion:   () => playTone(250, 'triangle', 0.18, 0.24),
  lettuce: () => playTone(600, 'sine',     0.08, 0.18),
  cheese:  () => { playTone(200, 'sine', 0.25, 0.28); playTone(400, 'sine', 0.2, 0.1); },
  patty:   () => { playTone(100, 'sawtooth', 0.2, 0.28); playTone(150, 'sawtooth', 0.14, 0.14); },
};

function playRemoveSound() {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function playBasketSound() {
  [261, 329, 392].forEach((f, i) => playTone(f, 'sine', 0.2, 0.22, i * 0.09));
}

function playFanfare() {
  [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.3, 0.28, i * 0.13));
}

function playClearSound() {
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.31);
  } catch {}
}

function playSmashSound() {
  [80, 100, 120, 90, 110].forEach((f, i) => playTone(f, 'sawtooth', 0.4, 0.38, i * 0.06));
  playTone(200, 'square', 0.5, 0.45);
}

function playDiscountSound() {
  [523, 659, 784, 659, 1047].forEach((f, i) => playTone(f, 'sine', 0.18, 0.22, i * 0.08));
}

// ── Burger builder helpers ────────────────────────────────────
function countOf(ingredient) {
  return currentIngredients.filter(i => i.ingredient === ingredient).length;
}

function syncButtons() {
  ingredientButtons.forEach(btn => {
    const ing   = btn.dataset.ingredient;
    const count = countOf(ing);
    const badge = btn.querySelector('.ing-count');
    badge.textContent = count > 0 ? `×${count}` : '';
    badge.classList.toggle('active', count > 0);
    btn.disabled = count >= MAX_PER;
  });
}

function updatePriceDisplay() {
  totalPriceEl.textContent = totalPrice.toFixed(2);
}

function addIngredient(ingredient) {
  if (countOf(ingredient) >= MAX_PER) {
    showToast(`Max ${MAX_PER} ${EMOJIS[ingredient]} allowed! 🥊`);
    return;
  }
  const price = PRICES[ingredient];
  const el = document.createElement('span');
  el.classList.add('ingredient');
  el.textContent = EMOJIS[ingredient];
  el.title = 'Click to remove';
  burgerContent.appendChild(el);
  totalPrice += price;
  currentIngredients.push({ ingredient, price, element: el });
  updatePriceDisplay();
  syncButtons();
  updateNutrition();
  if (INGREDIENT_SOUNDS[ingredient]) INGREDIENT_SOUNDS[ingredient]();
}

function removeIngredient(el) {
  const idx = currentIngredients.findIndex(i => i.element === el);
  if (idx === -1) return;
  const { price } = currentIngredients[idx];
  currentIngredients.splice(idx, 1);
  totalPrice -= price;
  burgerContent.removeChild(el);
  updatePriceDisplay();
  syncButtons();
  updateNutrition();
  playRemoveSound();
}

function clearBurger() {
  currentIngredients = [];
  totalPrice = 0;
  burgerContent.innerHTML = '';
  updatePriceDisplay();
  syncButtons();
  updateNutrition();
}

// ── Nutrition Facts (live update) ───────────────────────────
function flashRow(el) {
  el.classList.remove('updated');
  void el.offsetWidth;
  el.classList.add('updated');
  setTimeout(() => el.classList.remove('updated'), 400);
}

function updateNutrition() {
  let t = { ...NUTRITION.base };
  currentIngredients.forEach(({ ingredient }) => {
    const n = NUTRITION[ingredient];
    t.cal     += n.cal;
    t.fat     += n.fat;
    t.carbs   += n.carbs;
    t.protein += n.protein;
    t.sodium  += n.sodium;
  });

  const set = (id, val, suffix = '') => {
    const el = document.getElementById(id);
    if (el && el.textContent !== String(val) + suffix) {
      el.textContent = val + suffix;
      // flash the parent row
      const row = el.closest('.nf-row') || el.closest('.nf-calories-block');
      if (row) flashRow(row);
    }
  };

  set('nf-calories', Math.round(t.cal));
  set('nf-fat',      t.fat.toFixed(1));
  set('nf-fat-pct',  Math.round(t.fat / 78 * 100) + '%');
  set('nf-carbs',    Math.round(t.carbs));
  set('nf-carbs-pct',Math.round(t.carbs / 275 * 100) + '%');
  set('nf-protein',  Math.round(t.protein));
  set('nf-sodium',   Math.round(t.sodium));
  set('nf-sodium-pct',Math.round(t.sodium / 2300 * 100) + '%');
}

// ── Burger Name Generator ────────────────────────────────────
function generateBurgerName() {
  const unique = [...new Set(currentIngredients.map(i => i.ingredient))];
  if (unique.length === 0) return NAME_PARTS.noPatty[Math.floor(Math.random() * NAME_PARTS.noPatty.length)];

  const hasPatty = unique.includes('patty');
  if (!hasPatty) return NAME_PARTS.noPatty[Math.floor(Math.random() * NAME_PARTS.noPatty.length)];

  const adjs = [];
  if (unique.includes('tomato'))  adjs.push(...NAME_PARTS.tomatoAdj);
  if (unique.includes('onion'))   adjs.push(...NAME_PARTS.onionAdj);
  if (unique.includes('cheese'))  adjs.push(...NAME_PARTS.cheeseAdj);
  if (unique.includes('lettuce')) adjs.push(...NAME_PARTS.lettuceAdj);

  const prefix = NAME_PARTS.prefixes[Math.floor(Math.random() * NAME_PARTS.prefixes.length)];
  const noun   = NAME_PARTS.pattyNouns[Math.floor(Math.random() * NAME_PARTS.pattyNouns.length)];
  const adj    = adjs.length > 0 ? adjs[Math.floor(Math.random() * adjs.length)] + ' ' : '';
  return `${prefix} ${adj}${noun}`;
}

// ── Basket rendering ─────────────────────────────────────────
function renderBasket() {
  if (orders.length === 0) {
    basketItemsEl.innerHTML = '<p class="empty-basket">No items yet! Build a burger above.</p>';
    totalCostEl.innerHTML   = 'Total: $0.00';
    return;
  }

  basketItemsEl.innerHTML = orders.map((order, i) => {
    const emojis = order.ingredients.map(ing => EMOJIS[ing]).join('');
    const nameSpan = order.name
      ? `<span class="order-name">"${order.name}"</span>`
      : '';
    return `
      <div class="order-row">
        <span class="order-num">Order #${i + 1}</span>
        ${nameSpan}
        <span class="order-ingredients">${emojis || '🥯'}</span>
        <span class="order-price">$${order.total.toFixed(2)}</span>
      </div>`;
  }).join('');

  if (activeDiscount > 0) {
    const savings  = basketTotal * activeDiscount;
    const final    = basketTotal - savings;
    totalCostEl.innerHTML = `
      <div style="font-size:0.85em; color: var(--text-muted); text-decoration: line-through;">$${basketTotal.toFixed(2)}</div>
      <div class="discount-line">- $${savings.toFixed(2)} (${Math.round(activeDiscount * 100)}% off)</div>
      Total: $${final.toFixed(2)}`;
  } else {
    totalCostEl.textContent = `Total: $${basketTotal.toFixed(2)}`;
  }
}

// ── Discount codes ───────────────────────────────────────────
function applyDiscount() {
  const code     = discountInput.value.trim().toUpperCase();
  const discount = DISCOUNT_CODES[code];
  if (discount) {
    activeDiscount = discount;
    saveStorage(code);
    renderBasket();
    playDiscountSound();
    showToast(`Code ${code} applied — ${Math.round(discount * 100)}% off! 🎉`);
  } else {
    showToast('Invalid code. Try harder! 🥊 (hint: SMESH)');
  }
}

// ── Confetti ─────────────────────────────────────────────────
function launchConfetti() {
  const ctx = confettiCanvas.getContext('2d');
  confettiCanvas.width  = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCanvas.style.display = 'block';

  const COLORS = ['#e81c23','#f5c842','#39FF14','#fff','#ff6b6b','#00cfff'];
  const pieces = Array.from({ length: 160 }, () => ({
    x:     Math.random() * confettiCanvas.width,
    y:     Math.random() * -confettiCanvas.height * 0.5,
    w:     Math.random() * 11 + 5,
    h:     Math.random() * 5  + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    speed: Math.random() * 3.5 + 1.5,
    angle: Math.random() * 360,
    spin:  (Math.random() - 0.5) * 6,
    drift: (Math.random() - 0.5) * 1.5,
  }));

  let raf;
  function draw() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let alive = false;
    pieces.forEach(p => {
      p.y     += p.speed;
      p.x     += p.drift;
      p.angle += p.spin;
      if (p.y < confettiCanvas.height + 20) alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (alive) { raf = requestAnimationFrame(draw); }
    else        { confettiCanvas.style.display = 'none'; }
  }
  draw();
  setTimeout(() => { cancelAnimationFrame(raf); confettiCanvas.style.display = 'none'; }, 5000);
}

// ── Smash Mode ───────────────────────────────────────────────
function activateSmashMode() {
  if (smashCooldown) return;
  smashCooldown = true;
  playSmashSound();
  showToast('🥊 SMASH MODE ACTIVATED! 🥊');
  document.body.classList.add('smash-mode');
  setTimeout(() => {
    document.body.classList.remove('smash-mode');
    smashCooldown = false;
  }, 3000);
}

// ── IntersectionObserver — reveal cards on scroll ────────────
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const idx = parseInt(entry.target.style.getPropertyValue('--card-index')) || 1;
    setTimeout(() => entry.target.classList.add('visible'), idx * 100);
    cardObserver.unobserve(entry.target);
  });
}, { threshold: 0.12 });

document.querySelectorAll('.card').forEach(card => cardObserver.observe(card));

// ── Drag & Drop ───────────────────────────────────────────────
// Source: ingredient buttons
ingredientButtons.forEach(btn => {
  btn.addEventListener('dragstart', e => {
    e.dataTransfer.setData('ingredient', btn.dataset.ingredient);
    e.dataTransfer.effectAllowed = 'copy';
    btn.classList.add('dragging');
  });
  btn.addEventListener('dragend', () => btn.classList.remove('dragging'));
});

// Source: menu cards
menuCards.forEach(card => {
  card.addEventListener('dragstart', e => {
    e.dataTransfer.setData('ingredient', card.dataset.ingredient);
    e.dataTransfer.effectAllowed = 'copy';
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
});

// Drop zone: burger order area
orderArea.addEventListener('dragover', e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
  orderArea.classList.add('drag-over');
});
orderArea.addEventListener('dragleave', e => {
  if (!orderArea.contains(e.relatedTarget)) orderArea.classList.remove('drag-over');
});
orderArea.addEventListener('drop', e => {
  e.preventDefault();
  orderArea.classList.remove('drag-over');
  const ingredient = e.dataTransfer.getData('ingredient');
  if (ingredient && EMOJIS[ingredient]) addIngredient(ingredient);
});

// ── Keyboard shortcuts ────────────────────────────────────────
const SHORTCUTS = { t:'tomato', o:'onion', l:'lettuce', c:'cheese', p:'patty' };

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'Escape') { clearBurger(); playClearSound(); showToast('Burger cleared ✕'); return; }
  const ing = SHORTCUTS[e.key.toLowerCase()];
  if (ing) addIngredient(ing);
});

// ── Event: ingredient buttons (click) ────────────────────────
ingredientButtons.forEach(btn => {
  btn.addEventListener('click', () => addIngredient(btn.dataset.ingredient));
});

// ── Event: click ingredient in burger to remove ──────────────
burgerContent.addEventListener('click', e => {
  if (e.target.classList.contains('ingredient')) removeIngredient(e.target);
});

// ── Event: clear burger ───────────────────────────────────────
clearBurgerBtn.addEventListener('click', () => {
  clearBurger();
  playClearSound();
  showToast('Burger cleared! Start fresh 🍔');
});

// ── Event: Khabib's Special ───────────────────────────────────
khabibSpecialBtn.addEventListener('click', () => {
  clearBurger();
  ['patty', 'cheese', 'tomato', 'lettuce'].forEach(addIngredient);
  burgerNameInput.value = "Khabib's Special";
  showToast("Khabib's Special loaded! 🏆 The undefeated combo.");
});

// ── Event: generate name ──────────────────────────────────────
generateNameBtn.addEventListener('click', () => {
  const name = generateBurgerName();
  burgerNameInput.value = name;
  showToast(`Name generated: "${name}" 🎲`);
  playTone(660, 'sine', 0.12, 0.2);
});

// ── Event: add to basket ──────────────────────────────────────
addToBasketBtn.addEventListener('click', () => {
  if (currentIngredients.length === 0) {
    showToast('Add some ingredients first! 🍔');
    return;
  }
  const name  = burgerNameInput.value.trim();
  const order = {
    ingredients: currentIngredients.map(i => i.ingredient),
    total:       totalPrice,
    name:        name || null,
  };
  orders.push(order);
  basketTotal += totalPrice;

  // Nav counter
  orderCountEl.textContent = `🍔 ×${orders.length}`;
  orderCountEl.classList.remove('pop');
  void orderCountEl.offsetWidth;
  orderCountEl.classList.add('pop');

  playBasketSound();
  renderBasket();
  saveStorage();
  clearBurger();
  burgerNameInput.value = '';
  document.getElementById('basket').scrollIntoView({ behavior: 'smooth' });
  showToast('Burger added to basket! 🛒');
});

// ── Event: discount code ──────────────────────────────────────
applyDiscountBtn.addEventListener('click', applyDiscount);
discountInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyDiscount(); });

// ── Event: checkout ───────────────────────────────────────────
checkoutBtn.addEventListener('click', () => {
  if (orders.length === 0) { showToast('Your basket is empty! 🍔'); return; }
  const n = orders.length;
  launchConfetti();
  playFanfare();
  showToast(`Enjoy your ${n} burger${n > 1 ? 's' : ''}! Come back soon 🥊`);
  orders        = [];
  basketTotal   = 0;
  activeDiscount = 0;
  orderCountEl.textContent = '';
  discountInput.value = '';
  clearBurger();
  renderBasket();
  saveStorage('');
});

// ── Event: Smash Mode ─────────────────────────────────────────
smashBtn.addEventListener('click', activateSmashMode);

// ── Event: mobile nav ─────────────────────────────────────────
burgerMenuBtn.addEventListener('click', () => navLinks.classList.toggle('active'));
navLinks.addEventListener('click', e => { if (e.target.tagName === 'A') navLinks.classList.remove('active'); });

// ── Init ──────────────────────────────────────────────────────
loadStorage();
renderBasket();
syncButtons();
updateNutrition();

// Update order count badge if basket was restored
if (orders.length > 0) orderCountEl.textContent = `🍔 ×${orders.length}`;
