import { InputTracker } from './tracker.js';

/********************************************************************
 * 1. 外部美術圖檔資源載入管理器
 ********************************************************************/
const imageCache = {};
function getExternalAsset(filename) {
  if (!filename) return null;
  const cached = imageCache[filename];
  if (cached) return cached.loaded ? cached.img : null;
  const entry = { img: new Image(), loaded: false };
  entry.img.onload = () => { entry.loaded = true; };
  entry.img.src = `./images/${filename}`;
  imageCache[filename] = entry;
  return null;
}
['bowl-empty.png', 'basin-pot.png', 'spoon.png', 'bowl-garnish.png'].forEach(getExternalAsset);

/********************************************************************
 * 2. 螢幕防休眠恆亮引擎 (Screen Wake Lock API)
 ********************************************************************/
let wakeLockSentinel = null;
async function requestScreenWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    if (!wakeLockSentinel) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => { wakeLockSentinel = null; });
    }
  } catch {}
}

/********************************************************************
 * 3. 18 種原名食材 & 28 款在地特色經典 + 無限動態組合菜單引擎
 ********************************************************************/
const INGREDIENTS = {
  red_bean:       { id: 'red_bean',       name: '紅豆',     imgFile: 'ing-red_bean.png',       color: '#8B1E28', badgeColor: '#E63946', type: 'beans',       pitch: 440, role: 'topping' },
  mung_bean:      { id: 'mung_bean',      name: '綠豆',     imgFile: 'ing-mung_bean.png',      color: '#7E8F35', badgeColor: '#84CC16', type: 'beans',       pitch: 466, role: 'topping' },
  mango:          { id: 'mango',          name: '芒果',     imgFile: 'ing-mango.png',          color: '#FFA800', badgeColor: '#F59E0B', type: 'chunks',      pitch: 523, role: 'topping' },
  taro_ball:      { id: 'taro_ball',      name: '芋圓',     imgFile: 'ing-taro_ball.png',      color: '#9B7EDE', badgeColor: '#A855F7', type: 'balls',       pitch: 493, secondaryColor: '#F59E0B', role: 'topping' },
  boba:           { id: 'boba',           name: '粉圓',     imgFile: 'ing-boba.png',           color: '#2B1810', badgeColor: '#D97706', type: 'boba',        pitch: 392, role: 'topping' },
  grass_jelly:    { id: 'grass_jelly',    name: '仙草',     imgFile: 'ing-grass_jelly.png',    color: '#231F20', badgeColor: '#64748B', type: 'jelly_cubes', pitch: 415, role: 'topping' },
  fengkuei:       { id: 'fengkuei',       name: '粉粿',     imgFile: 'ing-fengkuei.png',       color: '#FFD60A', badgeColor: '#EAB308', type: 'jelly_cubes', pitch: 554, role: 'topping' },
  aiyu:           { id: 'aiyu',           name: '愛玉',     imgFile: 'ing-aiyu.png',           color: '#F59E0B', badgeColor: '#FB923C', type: 'jelly_cubes', pitch: 587, role: 'topping' },
  peanut:         { id: 'peanut',         name: '花生',     imgFile: 'ing-peanut.png',         color: '#D4A373', badgeColor: '#D97706', type: 'beans',       pitch: 440, role: 'topping' },
  strawberry:     { id: 'strawberry',     name: '草莓',     imgFile: 'ing-strawberry.png',     color: '#E63946', badgeColor: '#F43F5E', type: 'strawberry',  pitch: 659, role: 'topping' },
  pineapple:      { id: 'pineapple',      name: '鳳梨',     imgFile: 'ing-pineapple.png',      color: '#FACC15', badgeColor: '#EAB308', type: 'chunks',      pitch: 587, role: 'topping' },
  tangyuan:       { id: 'tangyuan',       name: '湯圓',     imgFile: 'ing-tangyuan.png',       color: '#FF758F', badgeColor: '#EC4899', type: 'balls',       pitch: 523, secondaryColor: '#FFF8F0', role: 'topping' },
  miancha_powder: { id: 'miancha_powder', name: '麵茶粉',   imgFile: 'ing-miancha_powder.png', color: '#C68B59', badgeColor: '#D97706', type: 'powder',      pitch: 523, role: 'topping' },
  condensed_milk: { id: 'condensed_milk', name: '煉乳',     imgFile: 'ing-condensed_milk.png', color: '#FFFDF7', badgeColor: '#FDE047', type: 'syrup',       pitch: 698, role: 'sauce', sauceTitle: '煉乳' },
  brown_sugar:    { id: 'brown_sugar',    name: '黑糖',     imgFile: 'ing-brown_sugar.png',    color: '#5C2C16', badgeColor: '#B45309', type: 'syrup',       pitch: 622, role: 'sauce', sauceTitle: '黑糖' },
  strawberry_jam: { id: 'strawberry_jam', name: '草莓醬',   imgFile: 'ing-strawberry_jam.png', color: '#D90429', badgeColor: '#FB7185', type: 'syrup',       pitch: 740, role: 'sauce', sauceTitle: '草莓醬' },
  matcha_syrup:   { id: 'matcha_syrup',   name: '抹茶',     imgFile: 'ing-matcha_syrup.png',   color: '#386641', badgeColor: '#22C55E', type: 'syrup',       pitch: 659, role: 'sauce', sauceTitle: '抹茶' },
  passion_sauce:  { id: 'passion_sauce',  name: '百香果醬', imgFile: 'ing-passion_sauce.png',  color: '#F77F00', badgeColor: '#F97316', type: 'syrup',       pitch: 784, role: 'sauce', sauceTitle: '百香果醬', hasSeeds: true }
};
const ALL_INGREDIENT_IDS = Object.keys(INGREDIENTS);
const TOPPING_IDS = ALL_INGREDIENT_IDS.filter(id => INGREDIENTS[id].role === 'topping');
const SAUCE_IDS = ALL_INGREDIENT_IDS.filter(id => INGREDIENTS[id].role === 'sauce');
ALL_INGREDIENT_IDS.forEach(id => getExternalAsset(INGREDIENTS[id].imgFile));

const SIGNATURE_RECIPES = [
  { id: 'sig1',  name: '相思紅豆湯圓煉乳冰',       steps: ['red_bean', 'tangyuan', 'condensed_milk'] },
  { id: 'sig2',  name: '九份芋圓紅豆黑糖冰',       steps: ['taro_ball', 'red_bean', 'brown_sugar'] },
  { id: 'sig3',  name: '夏日芒果愛玉煉乳冰',       steps: ['mango', 'aiyu', 'condensed_milk'] },
  { id: 'sig4',  name: '古早味綠豆花生黑糖冰',     steps: ['mung_bean', 'peanut', 'brown_sugar'] },
  { id: 'sig5',  name: '關西仙草芋圓煉乳冰',       steps: ['grass_jelly', 'taro_ball', 'condensed_milk'] },
  { id: 'sig6',  name: '懷舊粉粿粉圓黑糖冰',       steps: ['fengkuei', 'boba', 'brown_sugar'] },
  { id: 'sig7',  name: '大湖草莓煉乳冰',           steps: ['strawberry', 'strawberry_jam', 'condensed_milk'] },
  { id: 'sig8',  name: '北港花生湯圓煉乳冰',       steps: ['peanut', 'tangyuan', 'condensed_milk'] },
  { id: 'sig9',  name: '阿里山鳳梨愛玉百香果冰',   steps: ['pineapple', 'aiyu', 'passion_sauce'] },
  { id: 'sig10', name: '黑糖珍奶粉圓粉粿煉乳冰',   steps: ['boba', 'fengkuei', 'condensed_milk'] },
  { id: 'sig11', name: '宇治金時紅豆湯圓抹茶冰',   steps: ['red_bean', 'tangyuan', 'matcha_syrup'] },
  { id: 'sig12', name: '鹿港麵茶粉湯圓黑糖冰',     steps: ['tangyuan', 'miancha_powder', 'brown_sugar'] },
  { id: 'sig13', name: '百香雙響粉圓愛玉百香果冰', steps: ['boba', 'aiyu', 'passion_sauce'] },
  { id: 'sig14', name: '彰化綠豆粉粿煉乳冰',       steps: ['mung_bean', 'fengkuei', 'condensed_milk'] },
  { id: 'sig15', name: '寶島芒果草莓煉乳冰',       steps: ['mango', 'strawberry', 'condensed_milk'] },
  { id: 'sig16', name: '燒仙草風味仙草粉圓黑糖冰', steps: ['grass_jelly', 'boba', 'brown_sugar'] },
  { id: 'sig17', name: '雙豆經典紅豆綠豆煉乳冰',   steps: ['red_bean', 'mung_bean', 'condensed_milk'] },
  { id: 'sig18', name: '京都風芋圓湯圓抹茶冰',     steps: ['taro_ball', 'tangyuan', 'matcha_syrup'] },
  { id: 'sig19', name: '熱帶風情芒果鳳梨百香果冰', steps: ['mango', 'pineapple', 'passion_sauce'] },
  { id: 'sig20', name: '懷舊古早花生麵茶粉黑糖冰', steps: ['peanut', 'miancha_powder', 'brown_sugar'] },
  { id: 'sig21', name: '粉嫩草莓芋圓煉乳冰',       steps: ['strawberry', 'taro_ball', 'condensed_milk'] },
  { id: 'sig22', name: '清涼退火仙草愛玉黑糖冰',   steps: ['grass_jelly', 'aiyu', 'brown_sugar'] },
  { id: 'sig23', name: '抹茶控紅豆粉粿抹茶冰',     steps: ['red_bean', 'fengkuei', 'matcha_syrup'] },
  { id: 'sig24', name: '酸甜滋味鳳梨粉圓百香果冰', steps: ['pineapple', 'boba', 'passion_sauce'] },
  { id: 'sig25', name: '團圓好運湯圓粉圓黑糖冰',   steps: ['tangyuan', 'boba', 'brown_sugar'] },
  { id: 'sig26', name: '香濃花生芋圓煉乳冰',       steps: ['peanut', 'taro_ball', 'condensed_milk'] },
  { id: 'sig27', name: '黃金芒果粉粿煉乳冰',       steps: ['mango', 'fengkuei', 'condensed_milk'] },
  { id: 'sig28', name: '莓果派對草莓粉圓草莓醬冰', steps: ['strawberry', 'boba', 'strawberry_jam'] }
];

const DYNAMIC_PREFIXES = [
  '冰果室招牌', '古早味', '阿嬤手路', '夜市人氣', '巷口老店',
  '懷舊限定', '夏日特調', '老闆推薦', '職人手作', '經典人氣',
  '在地好味', '沁涼特選', '復古風味', '台灣味'
];

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateDynamicRecipe(usedKeys) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const t1 = TOPPING_IDS[Math.floor(Math.random() * TOPPING_IDS.length)];
    let t2 = TOPPING_IDS[Math.floor(Math.random() * TOPPING_IDS.length)];
    if (t2 === t1) continue;
    const sauce = SAUCE_IDS[Math.floor(Math.random() * SAUCE_IDS.length)];
    const key = `${[t1, t2].sort().join('+')}+${sauce}`;
    if (usedKeys.has(key)) continue;

    usedKeys.add(key);
    const prefix = DYNAMIC_PREFIXES[Math.floor(Math.random() * DYNAMIC_PREFIXES.length)];
    const name = `${prefix}・${INGREDIENTS[t1].name}${INGREDIENTS[t2].name}${INGREDIENTS[sauce].sauceTitle}冰`;
    return {
      id: `dyn_${key}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      steps: [t1, t2, sauce]
    };
  }
  return SIGNATURE_RECIPES[Math.floor(Math.random() * SIGNATURE_RECIPES.length)];
}

function buildSessionMenu(count) {
  const usedKeys = new Set();
  const sigShuffled = shuffleArray(SIGNATURE_RECIPES);
  const menu = [];

  let sigIdx = 0;
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0 && sigIdx < sigShuffled.length) {
      const r = sigShuffled[sigIdx++];
      const key = `${[r.steps[0], r.steps[1]].sort().join('+')}+${r.steps[2]}`;
      usedKeys.add(key);
      menu.push({ ...r });
    } else {
      menu.push(generateDynamicRecipe(usedKeys));
    }
  }
  return shuffleArray(menu);
}

/********************************************************************
 * 4. Web Audio API 音效與台灣中文語音播報 (TTS)
 ********************************************************************/
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmEnabled = true;
    this.bgmVolume = 0.45;
    this.bgmGain = null;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmEnabled ? this.bgmVolume * 0.24 : 0, this.ctx.currentTime);
        this.bgmGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    if (this.bgmEnabled && !this.bgmTimer) this.startBGM();
  }
  setBgmEnabled(on) {
    this.bgmEnabled = on;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(on ? this.bgmVolume * 0.24 : 0, this.ctx.currentTime, 0.05);
    }
    if (on) {
      this.init();
      this.startBGM();
    } else {
      this.stopBGM();
    }
  }
  setBgmVolume(val01) {
    this.bgmVolume = Math.max(0, Math.min(1, val01));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.bgmEnabled ? this.bgmVolume * 0.24 : 0, this.ctx.currentTime, 0.04);
    }
  }
  _playPluckNote(freq, dur = 0.26, isBass = false) {
    if (!this.ctx || !this.bgmGain || !this.bgmEnabled || this.bgmVolume <= 0) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = isBass ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, t0);
    env.gain.setValueAtTime(0.001, t0);
    env.gain.linearRampToValueAtTime(isBass ? 0.42 : 0.34, t0 + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(env);
    env.connect(this.bgmGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  startBGM() {
    if (this.bgmTimer || !this.bgmEnabled) return;
    // 原創無版權台灣五聲音階「古早味冰果室」輕快小調循環 (C5=523.25, D5=587.33, E5=659.25, G5=783.99, A5=880)
    const melody = [
      523.25, 659.25, 783.99, 659.25, 880.00, 783.99, 659.25, 587.33,
      523.25, 587.33, 659.25, 783.99, 659.25, 0,      587.33, 0,
      783.99, 880.00, 1046.5, 880.00, 783.99, 659.25, 587.33, 659.25,
      523.25, 659.25, 587.33, 440.00, 523.25, 0,      523.25, 0
    ];
    const bass = [
      261.63, 0, 392.00, 0, 220.00, 0, 329.63, 0,
      174.61, 0, 261.63, 0, 196.00, 0, 293.66, 0,
      261.63, 0, 392.00, 0, 220.00, 0, 329.63, 0,
      174.61, 0, 196.00, 0, 261.63, 0, 261.63, 0
    ];
    this.bgmTimer = setInterval(() => {
      if (!this.bgmEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const idx = this.bgmStep % melody.length;
      if (melody[idx] > 0) this._playPluckNote(melody[idx], 0.28, false);
      if (bass[idx] > 0) this._playPluckNote(bass[idx], 0.34, true);
      this.bgmStep++;
    }, 310);
  }
  stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }
  tone(freq, type, dur, vol, delay = 0, slideTo = null) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur * 0.88);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  }
  playScoop() { this.tone(340, 'sine', 0.16, 0.22, 0, 700); }
  playDwellTick(p) { this.tone(420 + p * 400, 'triangle', 0.06, 0.08); }
  playStepSuccess(pitch = 523) {
    [pitch, pitch * 1.25, pitch * 1.5].forEach((f, i) => this.tone(f, 'triangle', 0.22, 0.22, i * 0.055));
  }
  playWrongHint() { this.tone(300, 'sine', 0.24, 0.16, 0, 220); }
  playBowlGrandFanfare() {
    [[523.25, 0, 0.18], [659.25, 0.12, 0.18], [783.99, 0.24, 0.18], [1046.5, 0.36, 0.55], [783.99, 0.58, 0.18], [1046.5, 0.74, 0.75]]
      .forEach(([f, t, d]) => this.tone(f, 'triangle', d, 0.28, t));
  }
}
const sound = new SoundEngine();

function speakText(text) {
  if (!config.ttsEnabled || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-TW';
    utter.rate = 1.0;
    utter.pitch = 1.04;
    const twVoice = window.speechSynthesis.getVoices().find(v => v.lang && (v.lang.includes('zh-TW') || v.lang.includes('zh_TW')));
    if (twVoice) utter.voice = twVoice;
    window.speechSynthesis.speak(utter);
  } catch {}
}

/********************************************************************
 * 5. 全域設定、遊戲狀態與 InputTracker 整合
 ********************************************************************/
const config = {
  gameMode: 'ACTION',      // 'ACTION' | 'FIND' | 'MEMORY_ORDER' | 'MEMORY_QUIZ'
  trackMode: 'HAND',       // 'HAND' | 'COLOR' | 'TOUCH'
  spaceLevel: 1,
  level1Dir: 'L2R',
  seqMode: 'ALT',
  memorizeSeconds: 6,
  dwellSeconds: 0.6,
  requireReturn: true,
  ttsEnabled: true,
  zoneSizeScale: 1.15,
  targetBowls: 5,
};

const state = {
  paused: true,
  inSummary: false,
  cameraActive: false,
  awaitingColorPick: false,

  menuQueue: [],
  currentBowlIndex: 0,
  completedStepsSet: new Set(),
  activeTargetIngId: null,
  completedBowlsList: [],
  totalActionsDone: 0,
  sessionStartTime: performance.now(),

  phase: 'GO_SCOOP',       // 'ORDER_MEMORIZE' | 'GO_SCOOP' | 'GO_POUR' | 'BOWL_QUIZ' | 'BOWL_CELEBRATE'
  memorizeTimer: 0,
  peekTimer: 0,
  quizCooldownTimer: 0,
  carryingIngredient: null,
  quizOptions: [],
  quizDwellId: null,
  quizDwellElapsed: 0,
  activeBasinZoneId: 'right',
  basinMap: {},
  altCounter: 0,

  dwellElapsed: 0,
  dwellBasinId: null,
  lastDwellTickSound: 0,
  lockedZoneId: null,
  celebrateTimer: 0,
  celebrateTotal: 2.5,

  currentBowlLayers: [],
  bowlBounceScale: 1,
  fallingDrops: [],
  burstParticles: [],
  confettiParticles: [],
  floatingTexts: [],
  spoonTrail: [],

  cursorX: 0.5,
  cursorY: 0.55,
  targetCursorX: 0.5,
  targetCursorY: 0.55,
  lastTrackValidTime: 0,
};

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('video');

const isMultiBasinFindMode = () => ['FIND', 'MEMORY_ORDER', 'MEMORY_QUIZ'].includes(config.gameMode);
const isColorPickingCleanScreen = () => (config.trackMode === 'COLOR' && state.cameraActive && (state.awaitingColorPick || !tracker.hasColorTarget()));

function hasFreshTracking(now = performance.now()) {
  if (!state.cameraActive || config.trackMode === 'TOUCH') return true;
  return (now - state.lastTrackValidTime) <= 350;
}

function setTrackingStatusUI(dotClass, text) {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('tracking-text');
  if (dot) dot.className = `status-dot ${dotClass}`;
  if (txt) txt.textContent = text;
}

function updateDiagnosticsUI(d) {
  document.getElementById('diag-engine').textContent = d.engine;
  document.getElementById('diag-sent').textContent = d.sentCount;
  document.getElementById('diag-res').textContent = d.resultCount;
  document.getElementById('diag-found').textContent = d.foundCount;
  document.getElementById('diag-cursor').textContent = d.cursorUpdates;
  document.getElementById('diag-err').textContent = d.errorCount;
  document.getElementById('diag-coord').textContent = d.lastCoord;
  document.getElementById('diag-last-ts').textContent = d.lastReturnTime;

  const errEl = document.getElementById('diag-err-msg');
  if (errEl) {
    errEl.textContent = d.lastError === '無' ? '狀態正常' : `最近訊息：${d.lastError}`;
    errEl.classList.toggle('has-error', d.lastError !== '無');
  }
}

const tracker = new InputTracker(video, canvas, {
  onPoint(nx, ny, ts) {
    state.targetCursorX = nx;
    state.targetCursorY = ny;
    state.lastTrackValidTime = ts;
    if (state.cameraActive) {
      if (config.trackMode === 'HAND') {
        setTrackingStatusUI('cam-on', '✋ 已偵測到手部');
      } else if (config.trackMode === 'COLOR') {
        setTrackingStatusUI('cam-on', '🎨 顏色追蹤中');
      }
    }
  },
  onLost() {
    if (!state.cameraActive) return;
    if (config.trackMode === 'HAND') {
      setTrackingStatusUI('cam-warn', '📷 未偵測到手部（暫停判定）');
    } else if (config.trackMode === 'COLOR' && tracker.hasColorTarget()) {
      setTrackingStatusUI('cam-warn', '🔍 找不到選定顏色（暫停判定）');
    }
  },
  onModelLoading() {
    setTrackingStatusUI('cam-warn', '⏳ 載入手部 AI 模型中…');
  },
  onModelReady() {
    setTrackingStatusUI('cam-warn', '📷 模型就緒，請將手舉起進入畫面');
  },
  onModelError(msg) {
    setTrackingStatusUI('cam-warn', `⚠️ 模型載入失敗：${msg}`);
  },
  onModelFallback() {
    setTrackingStatusUI('cam-warn', '⚠️ 無法載入手部模型，可改用顏色或觸控');
  },
  onDiagnostics(d) {
    updateDiagnosticsUI(d);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !state.paused) requestScreenWakeLock();
});

async function startCameraMode(mode) {
  config.trackMode = mode;
  syncTrackModeButtons();
  requestScreenWakeLock();

  try {
    if (mode === 'COLOR' && !tracker.hasColorTarget()) {
      state.awaitingColorPick = true;
    }
    await tracker.start(mode);
    state.cameraActive = true;
    state.paused = false;
    state.lastTrackValidTime = 0;

    document.getElementById('repick-color-btn').classList.toggle('visible', mode === 'COLOR');
    if (mode === 'COLOR') {
      setTrackingStatusUI(tracker.hasColorTarget() ? 'cam-on' : 'cam-warn', tracker.hasColorTarget() ? '🎨 顏色追蹤中' : '👆 請點擊畫面上的彩色物品取色');
    } else {
      setTrackingStatusUI('cam-warn', '📷 鏡頭已啟動，請將手舉起');
    }
    updateHUD();
  } catch (err) {
    state.cameraActive = false;
    config.trackMode = 'TOUCH';
    syncTrackModeButtons();
    setTrackingStatusUI('', `⚠️ 無法開啟鏡頭（${err?.message || '權限不足'}）`);
    updateHUD();
  }
}

function stopCameraMode() {
  tracker.stop();
  state.cameraActive = false;
  state.awaitingColorPick = false;
  config.trackMode = 'TOUCH';
  syncTrackModeButtons();
  document.getElementById('repick-color-btn').classList.remove('visible');
  setTrackingStatusUI('', '👆 觸控／滑鼠模式');
  updateHUD();
}

function toggleCamera() {
  if (state.cameraActive) {
    stopCameraMode();
  } else {
    startCameraMode('HAND');
  }
}

/********************************************************************
 * 6. 空間大區塊配置與 4 種遊戲模式邏輯
 ********************************************************************/
function getPlayAreaBounds(w, h) {
  const isLandscapeSidebar = (w > h && w >= 680);
  const hudEl = document.getElementById('top-hud');
  const hudRect = hudEl ? hudEl.getBoundingClientRect() : null;

  if (isLandscapeSidebar) {
    const sidebarRight = (hudRect && hudRect.width > 0) ? hudRect.right : Math.min(265, w * 0.25);
    const rawLeft = sidebarRight + 14;
    const availW = w - rawLeft - 14;
    const maxPlayW = Math.min(availW, 980);
    const playLeft = rawLeft + (availW - maxPlayW) * 0.5;
    return { left: playLeft, top: 12, width: maxPlayW, height: h - 24, centerX: playLeft + maxPlayW * 0.5, centerY: h * 0.52 };
  }
  const hudBottom = (hudRect && hudRect.height > 0) ? hudRect.bottom : ((w < 650) ? 126 : 118);
  const topSafe = hudBottom + 10;
  const bottomSafe = h - 78;
  const playH = Math.max(210, bottomSafe - topSafe);
  return { left: 8, top: topSafe, width: w - 16, height: playH, centerX: w * 0.5, centerY: topSafe + playH * 0.5 };
}

function getZoneRects(w, h) {
  const area = getPlayAreaBounds(w, h);
  const { left: L, top: T, width: PW, height: PH } = area;
  const pad = Math.max(5, (1.25 - config.zoneSizeScale) * 28);
  const zones = [];
  const effLevel = isMultiBasinFindMode() ? Math.max(2, config.spaceLevel) : config.spaceLevel;

  if (effLevel === 1) {
    if (config.level1Dir === 'L2R') {
      zones.push({ id: 'bowl', role: 'bowl', x: L + pad, y: T + pad, w: PW * 0.48 - pad * 1.5, h: PH - pad * 2 });
      zones.push({ id: 'right', role: 'basin', x: L + PW * 0.52 + pad * 0.5, y: T + pad, w: PW * 0.48 - pad * 1.5, h: PH - pad * 2 });
    } else if (config.level1Dir === 'R2L') {
      zones.push({ id: 'bowl', role: 'bowl', x: L + PW * 0.52 + pad * 0.5, y: T + pad, w: PW * 0.48 - pad * 1.5, h: PH - pad * 2 });
      zones.push({ id: 'left', role: 'basin', x: L + pad, y: T + pad, w: PW * 0.48 - pad * 1.5, h: PH - pad * 2 });
    } else {
      zones.push({ id: 'bowl', role: 'bowl', x: L + pad * 1.5, y: T + PH * 0.52, w: PW - pad * 3, h: PH * 0.48 - pad });
      zones.push({ id: 'top', role: 'basin', x: L + pad * 1.5, y: T + pad, w: PW - pad * 3, h: PH * 0.48 - pad });
    }
  } else if (effLevel === 2) {
    const colW = PW / 3;
    zones.push({ id: 'left', role: 'basin', x: L + pad, y: T + pad, w: colW - pad * 1.4, h: PH - pad * 2 });
    zones.push({ id: 'bowl', role: 'bowl', x: L + colW + pad * 0.4, y: T + pad, w: colW - pad * 0.8, h: PH - pad * 2 });
    zones.push({ id: 'right', role: 'basin', x: L + colW * 2 + pad * 0.4, y: T + pad, w: colW - pad * 1.4, h: PH - pad * 2 });
  } else if (effLevel === 3) {
    const topH = PH * 0.38;
    const botY = T + topH + pad;
    const botH = PH - topH - pad * 2;
    const colW = PW / 3;
    zones.push({ id: 'top', role: 'basin', x: L + PW * 0.16, y: T + pad, w: PW * 0.68, h: topH - pad });
    zones.push({ id: 'left', role: 'basin', x: L + pad, y: botY, w: colW - pad * 1.4, h: botH });
    zones.push({ id: 'bowl', role: 'bowl', x: L + colW + pad * 0.4, y: botY, w: colW - pad * 0.8, h: botH });
    zones.push({ id: 'right', role: 'basin', x: L + colW * 2 + pad * 0.4, y: botY, w: colW - pad * 1.4, h: botH });
  } else {
    const rowH = PH / 3;
    const colW = PW / 3;
    zones.push({ id: 'top', role: 'basin', x: L + colW * 0.22, y: T + pad * 0.6, w: colW * 2.56, h: rowH - pad });
    zones.push({ id: 'bottom', role: 'basin', x: L + colW * 0.22, y: T + rowH * 2 + pad * 0.4, w: colW * 2.56, h: rowH - pad });
    zones.push({ id: 'left', role: 'basin', x: L + pad, y: T + rowH + pad * 0.2, w: colW - pad * 1.2, h: rowH - pad * 0.4 });
    zones.push({ id: 'bowl', role: 'bowl', x: L + colW + pad * 0.4, y: T + rowH + pad * 0.2, w: colW - pad * 0.8, h: rowH - pad * 0.4 });
    zones.push({ id: 'right', role: 'basin', x: L + colW * 2 + pad * 0.2, y: T + rowH + pad * 0.2, w: colW - pad * 1.2, h: rowH - pad * 0.4 });
  }
  return zones;
}

const isPointInZone = (px, py, zone, expandPx = 0) => px >= zone.x - expandPx && px <= zone.x + zone.w + expandPx && py >= zone.y - expandPx && py <= zone.y + zone.h + expandPx;

function initSession() {
  state.inSummary = false;
  document.getElementById('summary-modal').classList.remove('open');

  state.menuQueue = buildSessionMenu(config.targetBowls);
  state.currentBowlIndex = 0;
  state.completedBowlsList = [];
  state.totalActionsDone = 0;
  state.sessionStartTime = performance.now();
  state.currentBowlLayers = [];
  state.fallingDrops = [];
  state.burstParticles = [];
  state.confettiParticles = [];
  state.floatingTexts = [];

  startNewBowl();
}

const getCurrentRecipe = () => state.menuQueue[state.currentBowlIndex] || SIGNATURE_RECIPES[0];
const getRemainingIngIds = () => getCurrentRecipe().steps.filter(id => !state.completedStepsSet.has(id));
const getActiveIngredient = () => {
  const rem = getRemainingIngIds();
  const targetId = (state.activeTargetIngId && rem.includes(state.activeTargetIngId)) ? state.activeTargetIngId : (rem[0] || getCurrentRecipe().steps[0]);
  return INGREDIENTS[targetId];
};

function startNewBowl() {
  state.currentBowlLayers = [];
  state.completedStepsSet = new Set();
  state.activeTargetIngId = getCurrentRecipe().steps[0];
  state.peekTimer = 0;

  if (config.gameMode === 'MEMORY_ORDER') {
    state.phase = 'ORDER_MEMORIZE';
    state.memorizeTimer = config.memorizeSeconds;
    updateHUD();
    if (!state.paused) {
      const names = getCurrentRecipe().steps.map(id => INGREDIENTS[id].name).join('、');
      speakText(`請記住：${names}`);
    }
  } else {
    setupNextStep(true);
  }
}

function getAvailableBasinZoneIds() {
  const effLevel = isMultiBasinFindMode() ? Math.max(2, config.spaceLevel) : config.spaceLevel;
  if (effLevel === 1) {
    if (config.level1Dir === 'L2R') return ['right'];
    if (config.level1Dir === 'R2L') return ['left'];
    return ['top'];
  }
  const ids = ['left', 'right'];
  if (effLevel >= 3) ids.push('top');
  if (effLevel >= 4) ids.push('bottom');
  return ids;
}

function assignBasinsForCurrentStep() {
  const basinIds = getAvailableBasinZoneIds();
  const remIds = getRemainingIngIds();
  const primaryTargetId = remIds[0] || getCurrentRecipe().steps[0];
  state.activeTargetIngId = primaryTargetId;
  const targetIng = INGREDIENTS[primaryTargetId];

  let chosenId = basinIds[0];
  if (basinIds.length > 1) {
    if (isMultiBasinFindMode()) {
      const otherBasins = basinIds.filter(id => id !== state.activeBasinZoneId);
      const pool = otherBasins.length > 0 ? otherBasins : basinIds;
      chosenId = pool[Math.floor(Math.random() * pool.length)];
    } else if (config.seqMode === 'FIXED_L' && basinIds.includes('left')) {
      chosenId = 'left';
    } else if (config.seqMode === 'FIXED_R' && basinIds.includes('right')) {
      chosenId = 'right';
    } else if (config.seqMode === 'RANDOM') {
      chosenId = basinIds[Math.floor(Math.random() * basinIds.length)];
    } else {
      chosenId = basinIds[state.altCounter % basinIds.length];
      state.altCounter++;
    }
  }

  const prevMap = { ...state.basinMap };
  state.activeBasinZoneId = chosenId;
  state.basinMap = { [chosenId]: targetIng };

  if (isMultiBasinFindMode()) {
    const otherRemIds = (config.gameMode === 'MEMORY_ORDER')
      ? shuffleArray(remIds.filter(id => id !== primaryTargetId)).slice(0, Math.max(0, basinIds.length - 2))
      : [];
    const distractors = shuffleArray(ALL_INGREDIENT_IDS.filter(id => !remIds.includes(id) && !state.completedStepsSet.has(id)));
    const fillPool = [...otherRemIds, ...distractors];

    let dIdx = 0;
    basinIds.forEach(id => {
      if (id !== chosenId) {
        let pickId = fillPool[dIdx % fillPool.length];
        if (prevMap[id] && prevMap[id].id === pickId && fillPool.length > basinIds.length) {
          dIdx++;
          pickId = fillPool[dIdx % fillPool.length];
        }
        state.basinMap[id] = INGREDIENTS[pickId];
        dIdx++;
      }
    });
  }
}

function setupNextStep(clearBowl = false) {
  if (clearBowl) state.currentBowlLayers = [];
  assignBasinsForCurrentStep();
  state.phase = 'GO_SCOOP';
  state.carryingIngredient = null;
  state.dwellElapsed = 0;
  state.dwellBasinId = null;
  updateHUD();
  if (!state.paused && config.gameMode !== 'MEMORY_ORDER') {
    speakText(getActiveIngredient().name);
  }
}

function updateHUD() {
  const topHudEl = document.getElementById('top-hud');
  if (topHudEl) topHudEl.style.visibility = isColorPickingCleanScreen() ? 'hidden' : 'visible';

  const recipe = getCurrentRecipe();
  const steps = recipe.steps;
  const isMemOrder = (config.gameMode === 'MEMORY_ORDER');
  const isMemQuiz = (config.gameMode === 'MEMORY_QUIZ');
  const isPeeking = state.peekTimer > 0;

  const hideTitle = (isMemQuiz && state.phase !== 'BOWL_CELEBRATE') || (isMemOrder && state.phase !== 'ORDER_MEMORIZE' && state.phase !== 'BOWL_CELEBRATE' && !isPeeking);
  document.getElementById('hud-recipe-name').textContent = hideTitle ? '🥣 記憶特調剉冰' : `🥣 ${recipe.name}`;
  document.getElementById('hud-bowl-text').textContent = `第 ${Math.min(state.currentBowlIndex + 1, config.targetBowls)} / ${config.targetBowls} 碗`;

  document.getElementById('peek-order-btn').classList.toggle('visible', isMemOrder && (state.phase === 'GO_SCOOP' || state.phase === 'GO_POUR') && !isColorPickingCleanScreen());

  const actionLine = document.getElementById('hud-action-line');
  const currentIng = getActiveIngredient();
  if (state.phase === 'BOWL_CELEBRATE') {
    actionLine.innerHTML = `<img class="hud-mini-icon" src="./images/bowl-empty.png" onerror="this.style.display='none'" alt=""><span>${recipe.name}完成</span>`;
  } else if (state.phase === 'BOWL_QUIZ') {
    actionLine.innerHTML = `<img class="hud-mini-icon" src="./images/bowl-empty.png" onerror="this.style.display='none'" alt=""><span>想一想，剛剛做的是哪一碗冰？</span>`;
  } else if (state.phase === 'ORDER_MEMORIZE') {
    actionLine.innerHTML = `<img class="hud-mini-icon" src="./images/bowl-empty.png" onerror="this.style.display='none'" alt=""><span>記住這 3 樣（${Math.ceil(state.memorizeTimer)} 秒後開始）</span>`;
  } else if (state.phase === 'GO_POUR') {
    actionLine.innerHTML = `<img class="hud-mini-icon" src="./images/bowl-empty.png" onerror="this.style.display='none'" alt=""><span>放回冰碗</span>`;
  } else if (isMemOrder && !isPeeking) {
    const doneCount = state.completedStepsSet.size;
    actionLine.innerHTML = `<img class="hud-mini-icon" src="./images/spoon.png" onerror="this.style.display='none'" alt=""><span>憑記憶找料（已完成 ${doneCount} / ${steps.length} 樣）</span>`;
  } else {
    actionLine.innerHTML = `<img class="hud-mini-icon" src="./images/${currentIng.imgFile}" onerror="this.style.display='none'" alt=""><span>${currentIng.name}</span>`;
  }

  const pillsContainer = document.getElementById('hud-step-pills');
  pillsContainer.innerHTML = '';
  steps.forEach((ingId) => {
    const ing = INGREDIENTS[ingId];
    const pill = document.createElement('div');
    const isDone = state.completedStepsSet.has(ingId) || state.phase === 'BOWL_CELEBRATE' || state.phase === 'BOWL_QUIZ';
    const isActive = !isDone && !isMemOrder && (ingId === state.activeTargetIngId) && !['BOWL_CELEBRATE', 'BOWL_QUIZ', 'ORDER_MEMORIZE'].includes(state.phase);
    const maskFuture = isMemOrder && state.phase !== 'ORDER_MEMORIZE' && state.phase !== 'BOWL_CELEBRATE' && !isDone && !isPeeking;

    pill.className = 'ing-step-pill' + (isDone ? ' done' : (isActive ? ' active' : ''));
    if (isDone) pill.textContent = `✓ ${ing.name}`;
    else if (maskFuture) pill.textContent = `?`;
    else pill.textContent = isActive ? `● ${ing.name}` : ing.name;
    pillsContainer.appendChild(pill);
  });
}

function addIngredientToMainBowl(bowlZone, fromX, fromY, ing) {
  const bowlX = bowlZone.x + bowlZone.w * 0.5;
  const bowlY = bowlZone.y + bowlZone.h * 0.54;
  const bowlR = getZoneBowlRadius(bowlZone);

  const toppingIndex = state.currentBowlLayers.filter(l => l.ing.role === 'topping').length;
  const sideOffset = (ing.role === 'topping') ? (toppingIndex === 0 ? -0.36 : 0.36) : 0;

  const dropCount = ing.type === 'syrup' ? 12 : 15;
  for (let i = 0; i < dropCount; i++) {
    const spreadX = (sideOffset + (Math.random() - 0.5) * 0.55) * bowlR;
    state.fallingDrops.push({
      ing,
      x: fromX + (Math.random() - 0.5) * 40,
      y: fromY + (Math.random() - 0.5) * 40,
      targetX: bowlX + spreadX,
      targetY: bowlY - bowlR * 0.22 + (Math.random() - 0.5) * 16,
      progress: 0,
      speed: 2.5 + Math.random(),
      size: ['chunks', 'jelly_cubes', 'strawberry'].includes(ing.type) ? 15 + Math.random() * 4 : 10 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2
    });
  }

  const count = ing.type === 'syrup' ? 8 : (ing.type === 'powder' ? 22 : 12);
  const layerItems = Array.from({ length: count }, (_, i) => {
    const localRx = (Math.random() - 0.5) * 0.72;
    const rx = ing.role === 'topping' ? (sideOffset * 1.45 + localRx) : (Math.random() - 0.5) * 1.3;
    return {
      rx,
      ry: -0.16 - (1 - Math.min(1, rx * rx * 0.45)) * (0.18 + Math.random() * 0.42),
      size: ['beans', 'boba'].includes(ing.type) ? 0.095 + Math.random() * 0.025 : 0.145 + Math.random() * 0.035,
      rot: (Math.random() - 0.5) * 0.85,
      variant: i % 2
    };
  });

  state.currentBowlLayers.push({ ing, items: layerItems, animProgress: 0 });
  state.bowlBounceScale = 1.2;
}

function spawnSuccessParticles(x, y, color, count = 18) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
    const speed = 120 + Math.random() * 210;
    state.burstParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60,
      color: i % 2 === 0 ? '#FFD166' : color,
      size: 5 + Math.random() * 5,
      alpha: 1,
      life: 0.6 + Math.random() * 0.3
    });
  }
}

function spawnGrandConfetti(cx, cy, w) {
  const colors = ['#C8372D', '#E09126', '#A95E35', '#7B5942', '#F5B041'];
  for (let i = 0; i < 22; i++) {
    state.confettiParticles.push({
      x: cx + (Math.random() - 0.5) * Math.min(w * 0.55, 420),
      y: cy - 40 + (Math.random() - 0.5) * 110,
      vx: (Math.random() - 0.5) * 300,
      vy: -170 - Math.random() * 230,
      w: 9 + Math.random() * 6,
      h: 5 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 8,
      color: colors[i % colors.length],
      life: 2.2 + Math.random() * 0.5
    });
  }
}

function spawnFloatingText(x, y, text, color = '#FFE28A', scale = 1) {
  state.floatingTexts.push({ x, y, text, color, scale, alpha: 1, vy: -52 });
}

function updateGameLogic(dt, w, h) {
  if (state.paused || state.inSummary || isColorPickingCleanScreen()) return;

  const now = performance.now();
  const trackingFresh = hasFreshTracking(now);

  if (trackingFresh) {
    const smooth = Math.min(1, dt * 16);
    state.cursorX += (state.targetCursorX - state.cursorX) * smooth;
    state.cursorY += (state.targetCursorY - state.cursorY) * smooth;
  }

  const px = state.cursorX * w;
  const py = state.cursorY * h;

  if (state.bowlBounceScale > 1) state.bowlBounceScale = Math.max(1, state.bowlBounceScale - dt * 1.2);

  if (state.peekTimer > 0) {
    state.peekTimer = Math.max(0, state.peekTimer - dt);
    if (state.peekTimer === 0) updateHUD();
  }

  if (trackingFresh) {
    state.spoonTrail.push({ x: px, y: py, alpha: 1 });
    if (state.spoonTrail.length > 10) state.spoonTrail.shift();
  }
  state.spoonTrail.forEach(pt => { pt.alpha -= dt * 3.8; });
  state.spoonTrail = state.spoonTrail.filter(pt => pt.alpha > 0);

  state.fallingDrops.forEach(d => { d.progress = Math.min(1, d.progress + dt * d.speed); });
  state.fallingDrops = state.fallingDrops.filter(d => d.progress < 1);

  state.currentBowlLayers.forEach(layer => {
    if (layer.animProgress < 1) layer.animProgress = Math.min(1, layer.animProgress + dt * 2.4);
  });

  state.burstParticles.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 320 * dt;
    p.life -= dt; p.alpha = Math.max(0, p.life);
  });
  state.burstParticles = state.burstParticles.filter(p => p.life > 0);

  state.confettiParticles.forEach(c => {
    c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt;
    c.rot += c.vRot * dt; c.life -= dt;
  });
  state.confettiParticles = state.confettiParticles.filter(c => c.life > 0);

  state.floatingTexts.forEach(ft => { ft.y += ft.vy * dt; ft.alpha -= dt * 0.85; });
  state.floatingTexts = state.floatingTexts.filter(ft => ft.alpha > 0);

  if (state.phase === 'ORDER_MEMORIZE') {
    const prevCeil = Math.ceil(state.memorizeTimer);
    state.memorizeTimer -= dt;
    if (Math.ceil(state.memorizeTimer) !== prevCeil) updateHUD();
    if (state.memorizeTimer <= 0) {
      setupNextStep(true);
    }
    return;
  }

  if (state.phase === 'BOWL_CELEBRATE') {
    state.celebrateTimer -= dt;
    if (state.celebrateTimer <= 0) {
      state.currentBowlIndex++;
      if (state.currentBowlIndex >= config.targetBowls) triggerSessionSummary();
      else startNewBowl();
    }
    return;
  }

  if (!trackingFresh) {
    state.dwellElapsed = Math.max(0, state.dwellElapsed - dt * 1.2);
    state.quizDwellElapsed = Math.max(0, state.quizDwellElapsed - dt * 1.2);
    return;
  }

  if (state.phase === 'BOWL_QUIZ') {
    if (state.quizCooldownTimer > 0) {
      state.quizCooldownTimer = Math.max(0, state.quizCooldownTimer - dt);
      return;
    }

    const cards = getQuizCardRects(getPlayAreaBounds(w, h));
    const hovered = cards.find(c => isPointInZone(px, py, c, 4));
    const holdNeed = Math.max(1.2, config.dwellSeconds);

    if (hovered && state.lockedZoneId !== hovered.recipe.id) {
      if (state.quizDwellId !== hovered.recipe.id) {
        state.quizDwellId = hovered.recipe.id;
        state.quizDwellElapsed = 0;
      }
      state.quizDwellElapsed += dt;
      if (state.quizDwellElapsed >= holdNeed) {
        const targetRecipe = getCurrentRecipe();
        state.lockedZoneId = hovered.recipe.id;
        state.quizDwellElapsed = 0;
        if (hovered.recipe.id === targetRecipe.id) {
          triggerBowlCelebrate(targetRecipe, w, h);
        } else {
          sound.playWrongHint();
          const ingNames = targetRecipe.steps.map(id => INGREDIENTS[id].name).join('、');
          speakText(ingNames);
          spawnFloatingText(hovered.x + hovered.w * 0.5, hovered.y + hovered.h * 0.4, `提示：${ingNames}`, '#FFE49E', 0.95);
        }
      }
    } else if (!hovered) {
      state.quizDwellId = null;
      state.quizDwellElapsed = 0;
      state.lockedZoneId = null;
    }
    return;
  }

  const zones = getZoneRects(w, h);
  const bowlZone = zones.find(z => z.role === 'bowl');

  if (state.lockedZoneId) {
    const lockedZone = zones.find(z => z.id === state.lockedZoneId);
    if (!lockedZone || !isPointInZone(px, py, lockedZone, 16)) state.lockedZoneId = null;
  }

  if (state.phase === 'GO_SCOOP') {
    const remIds = getRemainingIngIds();
    const validZones = zones.filter(z => {
      if (z.role !== 'basin' || !state.basinMap[z.id]) return false;
      if (config.gameMode === 'MEMORY_ORDER') return remIds.includes(state.basinMap[z.id].id);
      return z.id === state.activeBasinZoneId;
    });

    const expandMargin = state.dwellElapsed > 0 ? 28 : 8;
    const hitValidZone = validZones.find(z => isPointInZone(px, py, z, expandMargin) && state.lockedZoneId !== z.id);

    if (hitValidZone) {
      const pickedIng = state.basinMap[hitValidZone.id];
      state.activeTargetIngId = pickedIng.id;

      if (config.dwellSeconds <= 0) {
        onScoopCompleted(hitValidZone, pickedIng, bowlZone, px, py, w, h);
      } else {
        if (state.dwellBasinId !== hitValidZone.id) {
          state.dwellBasinId = hitValidZone.id;
          state.dwellElapsed = 0;
        }
        state.dwellElapsed += dt;
        if (state.dwellElapsed - state.lastDwellTickSound >= 0.2) {
          state.lastDwellTickSound = state.dwellElapsed;
          sound.playDwellTick(Math.min(1, state.dwellElapsed / config.dwellSeconds));
        }
        if (state.dwellElapsed >= config.dwellSeconds) {
          onScoopCompleted(hitValidZone, pickedIng, bowlZone, px, py, w, h);
        }
      }
    } else {
      if (isMultiBasinFindMode()) {
        const wrongZone = zones.find(z => {
          if (z.role !== 'basin' || !state.basinMap[z.id]) return false;
          const isValid = validZones.some(vz => vz.id === z.id);
          return !isValid && isPointInZone(px, py, z, -8);
        });
        if (wrongZone && state.lockedZoneId !== wrongZone.id) {
          state.lockedZoneId = wrongZone.id;
          const wrongIng = state.basinMap[wrongZone.id];
          const rightIng = getActiveIngredient();
          sound.playWrongHint();
          const msg = config.gameMode === 'MEMORY_ORDER' ? `這碗沒有${wrongIng.name}喔，再想一想` : `這是${wrongIng.name}，要找${rightIng.name}`;
          spawnFloatingText(wrongZone.x + wrongZone.w * 0.5, wrongZone.y + wrongZone.h * 0.45, msg, '#FFE49E', 0.95);
        }
      }
      state.dwellElapsed = Math.max(0, state.dwellElapsed - dt * 1.6);
      if (state.dwellElapsed === 0) state.dwellBasinId = null;
    }
  } else if (state.phase === 'GO_POUR' && bowlZone && state.lockedZoneId !== 'bowl') {
    if (isPointInZone(px, py, bowlZone, 14)) completePourIntoBowl(bowlZone, px, py, w, h);
  }
}

function onScoopCompleted(basinZone, pickedIng, bowlZone, px, py, w, h) {
  state.lockedZoneId = basinZone.id;
  state.dwellElapsed = 0;
  state.dwellBasinId = null;
  sound.playScoop();
  spawnSuccessParticles(px, py, pickedIng.badgeColor, 16);

  if (config.requireReturn) {
    state.carryingIngredient = pickedIng;
    state.phase = 'GO_POUR';
    speakText('放回冰碗');
    updateHUD();
  } else {
    state.carryingIngredient = pickedIng;
    completePourIntoBowl(bowlZone, basinZone.x + basinZone.w * 0.5, basinZone.y + basinZone.h * 0.5, w, h);
  }
}

function completePourIntoBowl(bowlZone, fromX, fromY, w, h) {
  const ing = state.carryingIngredient || getActiveIngredient();
  state.lockedZoneId = 'bowl';
  state.carryingIngredient = null;
  state.totalActionsDone++;
  state.completedStepsSet.add(ing.id);

  addIngredientToMainBowl(bowlZone, fromX, fromY, ing);

  const recipe = getCurrentRecipe();
  const rem = getRemainingIngIds();

  if (rem.length === 0) {
    if (config.gameMode === 'MEMORY_QUIZ') startBowlMemoryQuiz(recipe);
    else triggerBowlCelebrate(recipe, w, h);
  } else {
    const bx = bowlZone.x + bowlZone.w * 0.5;
    const by = bowlZone.y + bowlZone.h * 0.36;
    sound.playStepSuccess(ing.pitch);
    spawnSuccessParticles(bx, by, ing.badgeColor, 18);
    spawnFloatingText(bx, by, ing.name, '#FFE49E', 1.05);
    setupNextStep(false);
  }
}

function triggerBowlCelebrate(recipe, w, h) {
  state.phase = 'BOWL_CELEBRATE';
  state.celebrateTimer = 2.5;
  state.completedBowlsList.push(recipe.name);
  sound.playBowlGrandFanfare();
  speakText(`${recipe.name}完成`);
  const area = getPlayAreaBounds(w, h);
  spawnGrandConfetti(area.centerX, area.centerY, w);
  spawnSuccessParticles(area.centerX, area.centerY, '#FFD166', 24);
  updateHUD();
}

function startBowlMemoryQuiz(targetRecipe) {
  state.phase = 'BOWL_QUIZ';
  state.quizDwellId = null;
  state.quizDwellElapsed = 0;
  state.quizCooldownTimer = 1.5;
  state.lockedZoneId = null;

  const usedKeys = new Set([`${[targetRecipe.steps[0], targetRecipe.steps[1]].sort().join('+')}+${targetRecipe.steps[2]}`]);
  const distractors = [];
  const diffSaucePool = shuffleArray(SIGNATURE_RECIPES.filter(r => r.steps[2] !== targetRecipe.steps[2] && r.steps[0] !== targetRecipe.steps[0]));
  for (const cand of diffSaucePool) {
    if (distractors.length >= 2) break;
    const k = `${[cand.steps[0], cand.steps[1]].sort().join('+')}+${cand.steps[2]}`;
    if (!usedKeys.has(k)) { usedKeys.add(k); distractors.push(cand); }
  }
  while (distractors.length < 2) {
    distractors.push(generateDynamicRecipe(usedKeys));
  }

  state.quizOptions = shuffleArray([targetRecipe, ...distractors]);
  sound.playStepSuccess(659);
  speakText('剛剛做的是哪一碗冰？');
  updateHUD();
}

function getQuizCardRects(area) {
  const count = state.quizOptions.length || 3;
  const isWide = area.width >= 560;
  if (isWide) {
    const gap = 14;
    const cardW = Math.min(235, (area.width - gap * (count + 1)) / count);
    const cardH = Math.min(255, area.height * 0.56);
    const startX = area.centerX - (cardW * count + gap * (count - 1)) * 0.5;
    const cardY = area.centerY - cardH * 0.35;
    return state.quizOptions.map((recipe, i) => ({ recipe, x: startX + i * (cardW + gap), y: cardY, w: cardW, h: cardH }));
  }
  const gap = 10;
  const cardW = Math.min(350, area.width - 24);
  const cardH = Math.min(94, (area.height * 0.64 - gap * (count - 1)) / count);
  const startY = area.centerY - (cardH * count + gap * (count - 1)) * 0.32;
  const cardX = area.centerX - cardW * 0.5;
  return state.quizOptions.map((recipe, i) => ({ recipe, x: cardX, y: startY + i * (cardH + gap), w: cardW, h: cardH }));
}

function triggerSessionSummary() {
  state.inSummary = true;
  const elapsedSec = Math.max(1, Math.round((performance.now() - state.sessionStartTime) / 1000));
  document.getElementById('sum-bowls').textContent = `${state.completedBowlsList.length} 碗`;
  document.getElementById('sum-actions').textContent = `${state.totalActionsDone} 次`;
  document.getElementById('sum-time').textContent = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;

  const showcase = document.getElementById('sum-showcase');
  showcase.innerHTML = '';
  state.completedBowlsList.forEach((name, idx) => {
    const tag = document.createElement('span');
    tag.className = 'showcase-tag';
    tag.textContent = `🥣 第 ${idx + 1} 碗：${name}`;
    showcase.appendChild(tag);
  });
  document.getElementById('summary-modal').classList.add('open');
}

/********************************************************************
 * 7. 畫布視覺渲染引擎
 ********************************************************************/
const getZoneBowlRadius = (zone) => Math.max(44, Math.min(126, Math.min(zone.w, zone.h) * 0.38));

function drawRetroTouchBackdrop(w, h) {
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, '#F7F1E3');
  bgGrad.addColorStop(0.55, '#EFE5D3');
  bgGrad.addColorStop(1, '#E2D2BA');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  const tileStartY = h * 0.44;
  const tileEndY = h * 0.72;
  ctx.fillStyle = '#EAE0CE';
  ctx.fillRect(0, tileStartY, w, tileEndY - tileStartY);

  ctx.strokeStyle = 'rgba(139, 108, 78, 0.14)';
  ctx.lineWidth = 1;
  const tileSz = 28;
  for (let x = 0; x < w; x += tileSz) {
    ctx.beginPath(); ctx.moveTo(x, tileStartY); ctx.lineTo(x, tileEndY); ctx.stroke();
  }
  for (let y = tileStartY; y <= tileEndY; y += tileSz) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const stripeW = 36;
  const cols = Math.ceil(w / stripeW) + 1;
  for (let i = 0; i < cols; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(173, 77, 55, 0.22)' : 'rgba(255, 250, 240, 0.45)';
    ctx.beginPath();
    ctx.arc(i * stripeW + stripeW * 0.5, 0, stripeW * 0.52, 0, Math.PI, false);
    ctx.fill();
  }

  const deskY = h * 0.72;
  const woodGrad = ctx.createLinearGradient(0, deskY, 0, h);
  woodGrad.addColorStop(0, '#A87C58');
  woodGrad.addColorStop(0.06, '#8B6242');
  woodGrad.addColorStop(0.5, '#734E34');
  woodGrad.addColorStop(1, '#583A25');
  ctx.fillStyle = woodGrad;
  ctx.fillRect(0, deskY, w, h - deskY);

  ctx.fillStyle = 'rgba(255, 244, 224, 0.28)';
  ctx.fillRect(0, deskY, w, 4);
  ctx.strokeStyle = 'rgba(58, 36, 20, 0.22)';
  ctx.lineWidth = 1.5;
  for (let wy = deskY + 26; wy < h; wy += 32) {
    ctx.beginPath();
    ctx.moveTo(0, wy);
    ctx.bezierCurveTo(w * 0.33, wy - 4, w * 0.66, wy + 4, w, wy);
    ctx.stroke();
  }
}

function drawCleanColorPickOverlay(w, h) {
  const cx = w * 0.5;
  const boxY = Math.max(138, h * 0.22);
  const boxW = Math.min(w - 28, 430);
  const boxH = 74;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 249, 237, 0.94)';
  roundRect(ctx, cx - boxW * 0.5, boxY, boxW, boxH, 18);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#A95E35';
  ctx.stroke();

  ctx.font = '900 18px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#4A3222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎨 請直接點擊畫面上的彩色物品／握把', cx, boxY + 26, boxW - 24);

  ctx.font = '700 13.5px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#7F7163';
  ctx.fillText('取色完成後，配料盆與冰碗就會自動出現', cx, boxY + 52, boxW - 24);
  ctx.restore();
}

function drawScene(w, h) {
  ctx.clearRect(0, 0, w, h);

  if (isColorPickingCleanScreen()) {
    drawCleanColorPickOverlay(w, h);
    return;
  }

  if (state.cameraActive) {
    ctx.fillStyle = 'rgba(67, 45, 28, 0.32)';
    ctx.fillRect(0, 0, w, h);
  } else {
    drawRetroTouchBackdrop(w, h);
  }

  const area = getPlayAreaBounds(w, h);
  const zones = getZoneRects(w, h);

  if (state.phase === 'ORDER_MEMORIZE') {
    drawOrderMemorizeCard(area);
  } else if (state.phase === 'BOWL_QUIZ') {
    drawMemoryQuizShowcase(area);
  } else if (state.phase !== 'BOWL_CELEBRATE') {
    zones.forEach(z => (z.role === 'bowl' ? drawMainBowlZone(z) : drawPeripheralBasinZone(z)));
    if (!isMultiBasinFindMode()) {
      const bowlZone = zones.find(z => z.role === 'bowl');
      const activeBasinZone = zones.find(z => z.id === state.activeBasinZoneId);
      if (bowlZone && activeBasinZone) drawGuidedArrowBridge(bowlZone, activeBasinZone);
    }
  } else {
    drawCelebrationShowcase(area);
  }

  state.fallingDrops.forEach(drop => {
    const curX = drop.x + (drop.targetX - drop.x) * drop.progress;
    const curY = drop.y + (drop.targetY - drop.y) * drop.progress - Math.sin(drop.progress * Math.PI) * 55;
    drawSingleIngredientPiece(drop.ing, curX, curY, drop.size, drop.rot, 0);
  });

  state.burstParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  state.confettiParticles.forEach(c => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.restore();
  });

  state.floatingTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = `900 ${Math.round(23 * ft.scale)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(42, 24, 12, 0.92)';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });

  if (state.phase !== 'ORDER_MEMORIZE') {
    drawSpoonCursor(w, h);
  }
}

function drawOrderMemorizeCard(area) {
  const recipe = getCurrentRecipe();
  const steps = recipe.steps;
  const cardW = Math.min(area.width - 20, 460);
  const cardH = Math.min(area.height - 20, 310);
  const x = area.centerX - cardW * 0.5;
  const y = area.centerY - cardH * 0.5;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 251, 242, 0.98)';
  roundRect(ctx, x, y, cardW, cardH, 24);
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#A95E35';
  ctx.stroke();

  ctx.font = '900 18px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#A34E34';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`客人點餐：${recipe.name}`, area.centerX, y + 32, cardW - 24);

  const ratio = Math.max(0, Math.min(1, state.memorizeTimer / config.memorizeSeconds));
  const barW = cardW - 60;
  ctx.fillStyle = '#EADCCB';
  roundRect(ctx, x + 30, y + 54, barW, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#A95E35';
  roundRect(ctx, x + 30, y + 54, barW * ratio, 8, 4);
  ctx.fill();

  const itemW = (cardW - 44) / 3;
  const iconSz = Math.min(62, itemW * 0.72);
  const rowY = y + cardH * 0.54;

  steps.forEach((ingId, idx) => {
    const ing = INGREDIENTS[ingId];
    const ix = x + 22 + itemW * (idx + 0.5);

    ctx.fillStyle = '#F3E7D4';
    roundRect(ctx, ix - itemW * 0.44, rowY - 56, itemW * 0.88, 118, 14);
    ctx.fill();

    const extImg = getExternalAsset(ing.imgFile);
    if (extImg) ctx.drawImage(extImg, ix - iconSz * 0.5, rowY - 40, iconSz, iconSz);

    ctx.font = '900 19px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#4A3222';
    ctx.fillText(ing.name, ix, rowY + 38, itemW - 8);
  });

  ctx.font = '800 14px "Noto Sans TC", sans-serif';
  ctx.fillStyle = '#7F7163';
  ctx.fillText(`請記住這 3 樣材料（${Math.ceil(state.memorizeTimer)} 秒後開始，順序不限）`, area.centerX, y + cardH - 22);
  ctx.restore();
}

function drawMainBowlZone(zone) {
  const isPourTarget = (state.phase === 'GO_POUR');
  const pulseAlpha = isPourTarget ? 0.34 + Math.sin(performance.now() * 0.008) * 0.08 : 0.28;

  ctx.save();
  ctx.fillStyle = isPourTarget ? `rgba(105, 118, 85, ${pulseAlpha})` : 'rgba(255, 254, 251, 0.58)';
  roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 24);
  ctx.fill();

  ctx.lineWidth = isPourTarget ? 5 : 2.5;
  if (isPourTarget) {
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -performance.now() * 0.045;
  }
  ctx.strokeStyle = isPourTarget ? '#4E5A3D' : '#7B5942';
  roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 24);
  ctx.stroke();
  ctx.setLineDash([]);

  drawIceBowlAt(zone.x + zone.w * 0.5, zone.y + zone.h * 0.54, getZoneBowlRadius(zone), isPourTarget);
  ctx.restore();
}

function drawPeripheralBasinZone(zone) {
  const basinIng = state.basinMap[zone.id];
  if (!basinIng) {
    ctx.save();
    ctx.fillStyle = 'rgba(123, 89, 66, 0.08)';
    roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(123, 89, 66, 0.2)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 24);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const isTargetBasin = (zone.id === state.activeBasinZoneId);
  const isScoopPhase = (state.phase === 'GO_SCOOP');
  const highlightGuided = isScoopPhase && isTargetBasin && !isMultiBasinFindMode();

  ctx.save();
  let fillStyle = 'rgba(255, 254, 251, 0.55)';
  let strokeStyle = 'rgba(122, 86, 57, 0.62)';
  let lineW = 3;

  if (highlightGuided) {
    const pulse = 0.34 + Math.sin(performance.now() * 0.007) * 0.08;
    fillStyle = `rgba(211, 155, 85, ${pulse * 0.52})`;
    strokeStyle = '#B66D35';
    lineW = 3;
  } else if (isMultiBasinFindMode() && isScoopPhase) {
    fillStyle = 'rgba(255, 254, 251, 0.68)';
    lineW = 2;
  }

  ctx.fillStyle = fillStyle;
  roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 24);
  ctx.fill();

  const isDwellingThis = isScoopPhase && state.dwellElapsed > 0 && config.dwellSeconds > 0 && (state.dwellBasinId === zone.id);
  if (isDwellingThis) {
    const ratio = Math.min(1, state.dwellElapsed / config.dwellSeconds);
    ctx.save();
    roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 24);
    ctx.clip();
    ctx.fillStyle = 'rgba(245, 166, 35, 0.42)';
    const fillH = zone.h * ratio;
    ctx.fillRect(zone.x, zone.y + zone.h - fillH, zone.w, fillH);
    ctx.restore();
  }

  ctx.lineWidth = lineW;
  if (highlightGuided) {
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -performance.now() * 0.045;
  }
  ctx.strokeStyle = strokeStyle;
  roundRect(ctx, zone.x, zone.y, zone.w, zone.h, 24);
  ctx.stroke();
  ctx.setLineDash([]);

  const zx = zone.x + zone.w * 0.5;
  const zy = zone.y + zone.h * 0.50;
  drawLargeIngredientBasin(zx, zy, getZoneBowlRadius(zone) * 0.96, basinIng, highlightGuided);

  const labelW = Math.min(zone.w - 10, 184);
  const labelH = 38;
  const labelY = zone.y + zone.h - 24;
  ctx.fillStyle = 'rgba(255, 249, 237, 0.98)';
  roundRect(ctx, zx - labelW / 2, labelY - labelH / 2, labelW, labelH, 12);
  ctx.fill();
  ctx.strokeStyle = '#8C623E';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = `900 ${Math.min(22, Math.max(15, labelW * 0.135))}px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#3F2718';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(basinIng.name, zx, labelY, labelW - 12);
  ctx.restore();
}

function drawGuidedArrowBridge(bowlZone, basinZone) {
  const bx = bowlZone.x + bowlZone.w * 0.5;
  const by = bowlZone.y + bowlZone.h * 0.545;
  const px = basinZone.x + basinZone.w * 0.5;
  const py = basinZone.y + basinZone.h * 0.545;

  const isScoop = (state.phase === 'GO_SCOOP');
  const [fullFromX, fullFromY] = isScoop ? [bx, by] : [px, py];
  const [fullToX, fullToY]     = isScoop ? [px, py] : [bx, by];

  const dx = fullToX - fullFromX;
  const dy = fullToY - fullFromY;
  const dist = Math.hypot(dx, dy);
  if (dist < 40) return;

  const ux = dx / dist;
  const uy = dy / dist;
  const angle = Math.atan2(dy, dx);
  const trimStart = Math.min(dist * 0.24, getZoneBowlRadius(isScoop ? bowlZone : basinZone) * 0.88);
  const trimEnd   = Math.min(dist * 0.24, getZoneBowlRadius(isScoop ? basinZone : bowlZone) * 0.88);
  const sx = fullFromX + ux * trimStart;
  const sy = fullFromY + uy * trimStart;
  const ex = fullToX - ux * trimEnd;
  const ey = fullToY - uy * trimEnd;
  if (Math.hypot(ex - sx, ey - sy) < 18) return;

  const mainColor = isScoop ? '#D97706' : '#586A45';
  const glowColor = isScoop ? 'rgba(245, 158, 11, 0.22)' : 'rgba(105, 118, 85, 0.24)';

  ctx.save();
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  const now = performance.now() * 0.0013;
  for (let i = 0; i < 3; i++) {
    const t = (now + i / 3) % 1;
    const ax = sx + (ex - sx) * t;
    const ay = sy + (ey - sy) * t;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.25 + Math.sin(t * Math.PI) * 0.75;
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-9, -10);
    ctx.lineTo(5, 0);
    ctx.lineTo(-9, 10);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawLargeIngredientBasin(x, y, r, ing, isHighlighted) {
  ctx.save();
  ctx.translate(x, y);
  const scale = isHighlighted ? 1.05 + Math.sin(performance.now() * 0.008) * 0.04 : 0.96;
  ctx.scale(scale, scale);

  const basinImg = getExternalAsset('basin-pot.png');
  if (basinImg) {
    ctx.drawImage(basinImg, -r, -r, r * 2, r * 2);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = isHighlighted ? '#D97706' : '#7B5942';
    ctx.stroke();
  }

  const extIngImg = getExternalAsset(ing.imgFile);
  if (extIngImg) {
    const iconR = r * 0.68;
    ctx.drawImage(extIngImg, -iconR, -iconR, iconR * 2, iconR * 2);
  } else {
    [[0, 0], [-0.32, -0.22], [0.32, -0.22], [-0.34, 0.22], [0.34, 0.22]]
      .forEach(([nx, ny], idx) => drawSingleIngredientPiece(ing, nx * r, ny * r, r * 0.27, idx * 0.6, idx % 2));
  }
  ctx.restore();
}

function drawIceBowlAt(cx, cy, baseR, isPourTarget = false, customLayers = null) {
  const pulse = isPourTarget ? (1.05 + Math.sin(performance.now() * 0.008) * 0.03) : 1;
  const scale = (customLayers ? 1 : state.bowlBounceScale) * pulse;
  const layersToDraw = customLayers || state.currentBowlLayers;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const bowlImg = getExternalAsset('bowl-empty.png');
  if (bowlImg) {
    ctx.drawImage(bowlImg, -baseR, -baseR, baseR * 2, baseR * 2);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, baseR * 0.85, Math.PI, 0, false);
    ctx.fillStyle = '#F2F9FF';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, baseR * 0.05, baseR * 0.88, 0, Math.PI, false);
    ctx.fillStyle = '#FFFDF7';
    ctx.fill();
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#7B5942';
    ctx.stroke();
  }

  layersToDraw.forEach((layer, layerIdx) => {
    const ing = layer.ing;
    const prog = layer.animProgress;
    if (ing.type === 'syrup') drawSyrupDrizzleOnIce(baseR, ing, prog, layerIdx);
    layer.items.forEach(item => {
      if (ing.type === 'syrup' && !ing.hasSeeds) return;
      drawSingleIngredientPiece(ing, item.rx * baseR * 0.6, item.ry * baseR * 0.88, item.size * baseR * prog, item.rot, item.variant);
    });
  });

  ctx.restore();
}

function drawRecipePreviewAt(recipe, cx, cy, r) {
  const mockLayers = recipe.steps.map((ingId, sIdx) => {
    const ing = INGREDIENTS[ingId];
    const sideOffset = (ing.role === 'topping') ? (sIdx === 0 ? -0.38 : 0.38) : 0;
    const pts = [[-0.22, -0.35], [0.18, -0.46], [-0.14, -0.22], [0.22, -0.24], [0, -0.40]];
    return {
      ing,
      animProgress: 1,
      items: pts.map(([lx, ry], idx) => ({
        rx: sideOffset * 1.4 + lx,
        ry,
        size: 0.145,
        rot: idx * 0.5,
        variant: idx % 2
      }))
    };
  });
  drawIceBowlAt(cx, cy, r, false, mockLayers);
  const garnishImg = getExternalAsset('bowl-garnish.png');
  if (garnishImg) ctx.drawImage(garnishImg, cx - r * 0.92, cy - r * 1.18, r * 1.84, r * 1.18);
}

function drawMemoryQuizShowcase(area) {
  const cx = area.centerX;
  const topY = area.top + 36;

  ctx.save();
  const bannerW = Math.min(area.width - 20, 440);
  const bannerH = 44;
  ctx.fillStyle = 'rgba(255, 249, 237, 0.96)';
  roundRect(ctx, cx - bannerW / 2, topY - bannerH / 2, bannerW, bannerH, 22);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#A34E34';
  ctx.stroke();

  ctx.font = `900 ${Math.round(Math.max(15, Math.min(20, area.width * 0.042)))}px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#4A3222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const headerTxt = state.quizCooldownTimer > 0
    ? `先想一想…（${state.quizCooldownTimer.toFixed(1)} 秒後可選）`
    : '剛剛做的是哪一碗冰？';
  ctx.fillText(headerTxt, cx, topY);

  const cards = getQuizCardRects(area);
  const holdNeed = Math.max(1.2, config.dwellSeconds);

  cards.forEach(card => {
    const isHovered = (state.quizDwellId === card.recipe.id) && state.quizCooldownTimer <= 0;
    const ratio = isHovered ? Math.min(1, state.quizDwellElapsed / holdNeed) : 0;

    ctx.save();
    ctx.fillStyle = isHovered ? 'rgba(255, 244, 224, 0.98)' : 'rgba(255, 254, 251, 0.95)';
    roundRect(ctx, card.x, card.y, card.w, card.h, 18);
    ctx.fill();

    if (ratio > 0) {
      ctx.save();
      roundRect(ctx, card.x, card.y, card.w, card.h, 18);
      ctx.clip();
      ctx.fillStyle = 'rgba(217, 119, 6, 0.25)';
      ctx.fillRect(card.x, card.y, card.w * ratio, card.h);
      ctx.restore();
    }

    ctx.lineWidth = isHovered ? 4 : 2;
    ctx.strokeStyle = isHovered ? '#A34E34' : '#8C6849';
    roundRect(ctx, card.x, card.y, card.w, card.h, 18);
    ctx.stroke();

    if (card.w > card.h * 1.4) {
      const imgSz = Math.min(card.h - 14, 74);
      drawRecipePreviewAt(card.recipe, card.x + 14 + imgSz * 0.5, card.y + card.h * 0.54, imgSz * 0.48);
      ctx.font = `900 ${Math.min(18, Math.max(14, card.w * 0.052))}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = '#4A3222';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.recipe.name, card.x + imgSz + 24, card.y + card.h * 0.5, card.w - imgSz - 32);
    } else {
      const imgSz = Math.min(card.w * 0.66, card.h * 0.58);
      drawRecipePreviewAt(card.recipe, card.x + card.w * 0.5, card.y + 18 + imgSz * 0.5, imgSz * 0.48);
      ctx.font = `900 ${Math.min(17, Math.max(13, card.w * 0.082))}px "Noto Sans TC", sans-serif`;
      ctx.fillStyle = '#4A3222';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(card.recipe.name, card.x + card.w * 0.5, card.y + card.h - 24, card.w - 14);
    }
    ctx.restore();
  });
  ctx.restore();
}

function drawCelebrationShowcase(area) {
  const recipe = getCurrentRecipe();
  const cx = area.centerX;
  const cy = area.centerY + Math.min(22, area.height * 0.04);
  const minDim = Math.min(area.width, area.height);
  const heroR = Math.max(78, Math.min(150, minDim * 0.30));

  const elapsed = state.celebrateTotal - state.celebrateTimer;
  const popBounce = elapsed < 0.35
    ? 0.85 + Math.sin((elapsed / 0.35) * (Math.PI * 0.65)) * 0.28
    : 1.06 + Math.sin(performance.now() * 0.008) * 0.025;

  const rayR = heroR * 1.65;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(performance.now() * 0.001);
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const a1 = (i * 2 * Math.PI) / 12;
    ctx.arc(0, 0, rayR, a1, a1 + Math.PI / 12);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(232, 182, 106, 0.22)' : 'rgba(255, 249, 237, 0.10)';
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(popBounce, popBounce);
  drawRecipePreviewAt(recipe, 0, 0, heroR);
  ctx.restore();

  const titleY = Math.max(area.top + 28, cy - heroR * 1.24);
  const subY = Math.min(area.top + area.height - 22, cy + heroR * 1.12);

  ctx.save();
  const titleText = `${recipe.name}完成！`;
  ctx.font = `900 ${Math.round(Math.max(18, Math.min(29, minDim * 0.06)))}px "Noto Sans TC", sans-serif`;
  const pillW = Math.min(area.width - 20, ctx.measureText(titleText).width + 44);
  const pillH = Math.max(42, Math.min(54, minDim * 0.11));

  ctx.fillStyle = 'rgba(255, 249, 237, 0.96)';
  roundRect(ctx, cx - pillW / 2, titleY - pillH / 2, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#A34E34';
  ctx.stroke();

  ctx.fillStyle = '#4A3222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(titleText, cx, titleY, pillW - 20);

  ctx.fillStyle = '#A34E34';
  roundRect(ctx, cx - 84, subY - 18, 168, 36, 18);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFF8EA';
  ctx.stroke();

  ctx.font = `900 ${Math.round(Math.max(15, Math.min(20, minDim * 0.045)))}px "Noto Sans TC", sans-serif`;
  ctx.fillStyle = '#FFF8EA';
  ctx.fillText('成功上菜！', cx, subY);
  ctx.restore();
}

function drawSyrupDrizzleOnIce(r, ing, prog, layerIdx) {
  ctx.save();
  ctx.fillStyle = ing.color;
  ctx.globalAlpha = 0.94;
  const topY = -r * 0.84;
  const spreadW = r * 0.72 * prog;
  const dripDepth = r * (0.38 + 0.3 * prog);

  ctx.beginPath();
  ctx.moveTo(-spreadW, topY + r * 0.34);
  ctx.quadraticCurveTo(0, topY - r * 0.14, spreadW, topY + r * 0.34);

  const stepW = (spreadW * 2) / 5;
  for (let i = 5; i >= 1; i--) {
    const xEnd = -spreadW + (i - 1) * stepW;
    const extraDrop = ((i + layerIdx) % 2 === 0 ? 1.25 : 0.75) * dripDepth;
    ctx.quadraticCurveTo(xEnd + stepW * 0.5, topY + r * 0.26 + extraDrop, xEnd, topY + r * 0.34);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSingleIngredientPiece(ing, x, y, size, rot, variant = 0) {
  if (size <= 0.5) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);

  const extImg = getExternalAsset(ing.imgFile);
  if (extImg) {
    ctx.drawImage(extImg, -size * 1.15, -size * 1.15, size * 2.3, size * 2.3);
    ctx.restore();
    return;
  }

  ctx.fillStyle = (variant === 1 && ing.secondaryColor) ? ing.secondaryColor : ing.color;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpoonCursor(w, h) {
  const px = state.cursorX * w;
  const py = state.cursorY * h;
  const ing = getActiveIngredient();
  const hasFood = Boolean(state.carryingIngredient);
  const isMemHidden = (config.gameMode === 'MEMORY_ORDER') && !hasFood && state.peekTimer <= 0 && state.phase === 'GO_SCOOP';
  const isDormant = !hasFreshTracking();

  if (state.spoonTrail.length > 1) {
    const trailColor = hasFood ? ing.badgeColor : 'rgba(123, 89, 66, 0.45)';
    for (let i = 1; i < state.spoonTrail.length; i++) {
      const pt = state.spoonTrail[i];
      const prev = state.spoonTrail[i - 1];
      ctx.save();
      ctx.strokeStyle = trailColor;
      ctx.globalAlpha = Math.max(0, pt.alpha * (hasFood ? 0.65 : 0.3));
      ctx.lineWidth = (i / state.spoonTrail.length) * (hasFood ? 20 : 10);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.save();
  ctx.translate(px, py);
  if (isDormant) ctx.globalAlpha = 0.42;

  ctx.beginPath();
  ctx.arc(0, 0, hasFood ? 48 : 40, 0, Math.PI * 2);
  ctx.fillStyle = hasFood ? 'rgba(105, 118, 85, 0.28)' : 'rgba(245, 166, 35, 0.2)';
  ctx.fill();
  if (!hasFood) ctx.setLineDash([8, 6]);
  ctx.lineWidth = hasFood ? 4 : 2.5;
  ctx.strokeStyle = hasFood ? '#697655' : '#D97706';
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.rotate(state.dwellElapsed > 0 ? 0.25 : 0.55);
  const spoonImg = getExternalAsset('spoon.png');
  if (spoonImg) {
    ctx.drawImage(spoonImg, -36, -30, 120, 60);
  } else {
    ctx.fillStyle = '#B87B4B';
    roundRect(ctx, 18, -9, 68, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 27, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (hasFood) {
    const carryIng = state.carryingIngredient;
    ctx.beginPath();
    ctx.arc(0, -3, 25, 0, Math.PI * 2);
    ctx.fillStyle = carryIng.color;
    ctx.fill();
    [[-10, -6], [10, -6], [0, -12], [-8, 5], [8, 5], [0, 3]]
      .forEach(([ox, oy], idx) => drawSingleIngredientPiece(carryIng, ox, oy, 11.5, idx * 0.7, idx % 2));
  }
  ctx.restore();

  if (state.phase !== 'BOWL_CELEBRATE') {
    const isQuiz = (state.phase === 'BOWL_QUIZ');
    const label = isDormant
      ? '等待感測訊號…'
      : (isQuiz ? (state.quizCooldownTimer > 0 ? '先想一想…' : '停留在正確冰品上') : (hasFood ? '放回冰碗' : (isMemHidden ? '憑記憶選料' : ing.name)));
    ctx.fillStyle = isQuiz ? '#744B32' : (hasFood ? '#784127' : '#A95E35');
    roundRect(ctx, -82, -72, 164, 32, 16);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFF9ED';
    ctx.stroke();

    ctx.font = '900 14px "Noto Sans TC", sans-serif';
    ctx.fillStyle = '#FFF9ED';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, -56);
  }

  ctx.restore();
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

/********************************************************************
 * 8. 觸控／取色、診斷面板展開收合與 UI 事件綁定
 ********************************************************************/
canvas.addEventListener('pointerdown', (e) => {
  sound.init();
  requestScreenWakeLock();
  if (state.paused || state.inSummary) return;

  if (config.trackMode === 'COLOR' && state.cameraActive && state.awaitingColorPick) {
    const sampled = tracker.sampleColorAtScreenPoint(e.clientX, e.clientY);
    if (sampled) {
      state.awaitingColorPick = false;
      state.lastTrackValidTime = performance.now();
      document.getElementById('color-swatch').style.background = sampled.hex;
      setTrackingStatusUI('cam-on', '🎨 已鎖定物品顏色！移動物品即可操作');
      updateHUD();
      spawnSuccessParticles(e.clientX, e.clientY, sampled.hex, 16);
      sound.playScoop();
    }
  }
});

function bindOptionGroup(groupId, onSelect) {
  const container = document.getElementById(groupId);
  if (!container) return;
  const buttons = container.querySelectorAll('.opt-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn.dataset.val);
    });
  });
}

function syncGameModeUI(scrollIntoView = false) {
  document.querySelectorAll('#grp-game-mode .mode-card').forEach(card => {
    const isAct = card.dataset.mode === config.gameMode;
    card.classList.toggle('active', isAct);
    if (isAct && scrollIntoView) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
  document.getElementById('sub-memorize-row').style.display = config.gameMode === 'MEMORY_ORDER' ? 'flex' : 'none';
  syncSpaceLevelUI();
}

function syncSpaceLevelUI() {
  const subL1 = document.getElementById('sub-level1-dir');
  const subMulti = document.getElementById('sub-multi-seq');
  const levelBtns = document.querySelectorAll('#grp-space-level .opt-btn');
  const needMulti = isMultiBasinFindMode();

  if (needMulti && config.spaceLevel < 2) config.spaceLevel = 2;

  levelBtns.forEach(btn => {
    const lv = parseInt(btn.dataset.val, 10);
    btn.classList.toggle('active', lv === config.spaceLevel);
    btn.classList.toggle('disabled-opt', needMulti && lv === 1);
  });

  subL1.style.display = config.spaceLevel === 1 ? 'block' : 'none';
  subMulti.style.display = (config.spaceLevel >= 2 && !needMulti) ? 'block' : 'none';
}

function syncTrackModeButtons() {
  document.querySelectorAll('#grp-track-mode .opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === config.trackMode);
  });
  document.getElementById('sub-color-tools').style.display = config.trackMode === 'COLOR' ? 'flex' : 'none';
  document.getElementById('repick-color-btn').classList.toggle('visible', state.cameraActive && config.trackMode === 'COLOR');
}

function initDiagnosticsWidget() {
  const toggleBtn = document.getElementById('diag-toggle-btn');
  const closeBtn = document.getElementById('diag-close-btn');
  const card = document.getElementById('diag-card');
  if (!toggleBtn || !card) return;

  const setOpen = (open) => {
    card.hidden = !open;
    toggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggleBtn.textContent = open ? '🩺 收合診斷' : '🩺 診斷';
  };

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(card.hidden);
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setOpen(false);
    });
  }
}

function initUIEvents() {
  initDiagnosticsWidget();

  const welcomeModal = document.getElementById('welcome-modal');
  const settingsModal = document.getElementById('settings-modal');

  document.getElementById('btn-welcome-hand').addEventListener('click', () => {
    sound.init();
    welcomeModal.classList.remove('open');
    startCameraMode('HAND');
  });

  document.getElementById('btn-welcome-color').addEventListener('click', () => {
    sound.init();
    welcomeModal.classList.remove('open');
    startCameraMode('COLOR');
  });

  document.getElementById('btn-welcome-touch').addEventListener('click', () => {
    sound.init();
    requestScreenWakeLock();
    welcomeModal.classList.remove('open');
    state.paused = false;
    stopCameraMode();
  });

  document.getElementById('btn-welcome-settings').addEventListener('click', () => {
    sound.init();
    requestScreenWakeLock();
    welcomeModal.classList.remove('open');
    settingsModal.classList.add('open');
  });

  document.getElementById('peek-order-btn').addEventListener('click', () => {
    state.peekTimer = 3.0;
    updateHUD();
    const remNames = getRemainingIngIds().map(id => INGREDIENTS[id].name).join('、');
    speakText(remNames);
  });

  document.getElementById('repick-color-btn').addEventListener('click', () => {
    state.awaitingColorPick = true;
    tracker.clearColorTarget();
    setTrackingStatusUI('cam-warn', '👆 請點擊畫面上的彩色物品取色');
    updateHUD();
  });

  document.getElementById('btn-repick-in-panel').addEventListener('click', () => {
    settingsModal.classList.remove('open');
    state.paused = false;
    state.awaitingColorPick = true;
    tracker.clearColorTarget();
    startCameraMode('COLOR');
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    state.paused = true;
    settingsModal.classList.add('open');
  });

  const closeSettings = async () => {
    settingsModal.classList.remove('open');
    state.paused = false;
    requestScreenWakeLock();

    if (config.trackMode === 'TOUCH') {
      if (state.cameraActive) stopCameraMode();
    } else if (!state.cameraActive || tracker.mode !== config.trackMode) {
      await startCameraMode(config.trackMode);
    }

    startNewBowl();
    syncTrackModeButtons();
    updateHUD();
  };
  document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
  document.getElementById('btn-apply-settings').addEventListener('click', closeSettings);

  document.getElementById('btn-restart-session').addEventListener('click', () => {
    settingsModal.classList.remove('open');
    state.paused = false;
    requestScreenWakeLock();
    initSession();
  });

  document.querySelectorAll('#grp-game-mode .mode-card').forEach(card => {
    card.addEventListener('click', () => {
      config.gameMode = card.dataset.mode;
      syncGameModeUI(true);
    });
  });

  bindOptionGroup('grp-track-mode', (val) => {
    config.trackMode = val;
    if (val === 'COLOR' && !tracker.hasColorTarget()) state.awaitingColorPick = true;
    syncTrackModeButtons();
  });
  bindOptionGroup('grp-space-level', (val) => { config.spaceLevel = parseInt(val, 10); syncSpaceLevelUI(); });
  bindOptionGroup('grp-l1-dir', (val) => { config.level1Dir = val; });
  bindOptionGroup('grp-seq-mode', (val) => { config.seqMode = val; });
  bindOptionGroup('grp-memorize-sec', (val) => { config.memorizeSeconds = parseFloat(val); });
  bindOptionGroup('grp-dwell-time', (val) => { config.dwellSeconds = parseFloat(val); });
  bindOptionGroup('grp-require-return', (val) => { config.requireReturn = (val === 'true'); });
  bindOptionGroup('grp-zone-size', (val) => { config.zoneSizeScale = parseFloat(val); });
  bindOptionGroup('grp-target-bowls', (val) => { config.targetBowls = parseInt(val, 10); initSession(); });

  const btnBgm = document.getElementById('btn-toggle-bgm');
  const bgmSlider = document.getElementById('bgm-volume-slider');
  const bgmVal = document.getElementById('bgm-volume-val');
  if (btnBgm) {
    btnBgm.addEventListener('click', () => {
      sound.setBgmEnabled(!sound.bgmEnabled);
      btnBgm.classList.toggle('active', sound.bgmEnabled);
      btnBgm.textContent = sound.bgmEnabled ? '🎵 古早味配樂開' : '🔇 古早味配樂關';
    });
  }
  if (bgmSlider && bgmVal) {
    bgmSlider.addEventListener('input', () => {
      const pct = parseInt(bgmSlider.value, 10);
      bgmVal.textContent = `${pct}%`;
      sound.setBgmVolume(pct / 100);
    });
  }

  const btnSound = document.getElementById('btn-toggle-sound');
  btnSound.addEventListener('click', () => {
    sound.enabled = !sound.enabled;
    btnSound.classList.toggle('active', sound.enabled);
    btnSound.textContent = sound.enabled ? '🔊 音效開' : '🔇 音效關';
  });

  const btnTts = document.getElementById('btn-toggle-tts');
  btnTts.addEventListener('click', () => {
    config.ttsEnabled = !config.ttsEnabled;
    btnTts.classList.toggle('active', config.ttsEnabled);
    btnTts.textContent = config.ttsEnabled ? '🗣️ 語音報料開' : '🤐 語音報料關';
    if (!config.ttsEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    else if (config.ttsEnabled) speakText('語音報料開啟');
  });

  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  });

  document.getElementById('btn-sum-again').addEventListener('click', () => { requestScreenWakeLock(); initSession(); });
  document.getElementById('btn-sum-settings').addEventListener('click', () => {
    document.getElementById('summary-modal').classList.remove('open');
    state.inSummary = false;
    state.paused = true;
    settingsModal.classList.add('open');
  });

  syncGameModeUI();
  syncTrackModeButtons();
}

function resizeCanvas() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);

let lastFrameTime = performance.now();
function mainLoop(now) {
  const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
  lastFrameTime = now;
  updateGameLogic(dt, window.innerWidth, window.innerHeight);
  drawScene(window.innerWidth, window.innerHeight);
  requestAnimationFrame(mainLoop);
}

resizeCanvas();
initUIEvents();
initSession();
requestAnimationFrame(mainLoop);
