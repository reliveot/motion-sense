(() => {
  'use strict';

  let audioCtx = null;
  let bgmMasterGain = null;
  let sfxMasterGain = null;
  let bgmTimerId = null;
  let chordStep = 0;

  const state = {
    bgmOn: true,
    bgmVolume: 0.35,
    soundOn: true,
    sfxVolume: 0.80,
    voiceOn: true
  };

  // 柔和宇宙和弦（Cmaj9 -> Fmaj7 -> Am9 -> G6）與五聲音階點綴
  const COSMIC_CHORDS = [
    [130.81, 196.00, 246.94, 293.66], // Cmaj9
    [174.61, 220.00, 261.63, 329.63], // Fmaj7
    [110.00, 164.81, 246.94, 261.63], // Am9
    [196.00, 246.94, 293.66, 329.63]  // G6
  ];
  const STARLIGHT_NOTES = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];

  function ensureNodes() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (!bgmMasterGain) {
      bgmMasterGain = audioCtx.createGain();
      bgmMasterGain.gain.value = state.bgmOn ? state.bgmVolume * 0.22 : 0;
      bgmMasterGain.connect(audioCtx.destination);
    }
    if (!sfxMasterGain) {
      sfxMasterGain = audioCtx.createGain();
      sfxMasterGain.gain.value = state.soundOn ? state.sfxVolume : 0;
      sfxMasterGain.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  function syncGains() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    if (bgmMasterGain) {
      const targetBgm = state.bgmOn && !document.hidden ? state.bgmVolume * 0.22 : 0;
      bgmMasterGain.gain.setTargetAtTime(targetBgm, now, 0.12);
    }
    if (sfxMasterGain) {
      const targetSfx = state.soundOn ? state.sfxVolume : 0;
      sfxMasterGain.gain.setTargetAtTime(targetSfx, now, 0.04);
    }
  }

  function scheduleCosmicPad() {
    if (!audioCtx || audioCtx.state !== 'running' || !state.bgmOn || document.hidden) return;
    const now = audioCtx.currentTime;
    const chord = COSMIC_CHORDS[chordStep % COSMIC_CHORDS.length];
    chordStep++;

    chord.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(680, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.22 : 0.11, now + 1.4);
      gain.gain.linearRampToValueAtTime(0.08, now + 3.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bgmMasterGain);

      osc.start(now);
      osc.stop(now + 5.3);
    });

    // 輕柔星光風鈴點綴
    if (Math.random() < 0.75) {
      const bellFreq = STARLIGHT_NOTES[Math.floor(Math.random() * STARLIGHT_NOTES.length)];
      const bellStart = now + 0.9 + Math.random() * 1.8;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(bellFreq, bellStart);
      gain.gain.setValueAtTime(0.0001, bellStart);
      gain.gain.linearRampToValueAtTime(0.07, bellStart + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, bellStart + 1.8);
      osc.connect(gain);
      gain.connect(bgmMasterGain);
      osc.start(bellStart);
      osc.stop(bellStart + 1.9);
    }
  }

  function startBgmLoop() {
    if (bgmTimerId) return;
    scheduleCosmicPad();
    bgmTimerId = setInterval(scheduleCosmicPad, 4600);
  }

  function unlockAudio() {
    try {
      const ctx = ensureNodes();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          syncGains();
          if (state.bgmOn) startBgmLoop();
        }).catch(() => {});
      } else if (ctx) {
        syncGains();
        if (state.bgmOn) startBgmLoop();
      }
    } catch {}
    if (state.voiceOn && 'speechSynthesis' in window) {
      try { window.speechSynthesis.getVoices(); } catch {}
    }
  }

  function setConfig(patch) {
    Object.assign(state, patch);
    syncGains();
    if (state.bgmOn && audioCtx && audioCtx.state === 'running') {
      startBgmLoop();
    }
  }

  function playGameSound(kind = 'normal', stepIndex = 0) {
    if (!state.soundOn || state.sfxVolume <= 0) return;
    try {
      unlockAudio();
      if (!audioCtx || !sfxMasterGain) return;
      const now = audioCtx.currentTime;
      let notes = [587.33, 880.0];
      let stepSec = 0.08;
      let wave = 'sine';

      if (kind === 'connect_node') {
        const scaleNotes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77];
        const baseFreq = scaleNotes[stepIndex % scaleNotes.length];
        notes = [baseFreq, baseFreq * 1.25];
        stepSec = 0.05;
      } else if (kind === 'bonus') {
        notes = [587.33, 783.99, 987.77, 1174.66];
        stepSec = 0.065;
        wave = 'triangle';
      } else if (kind === 'charge_done') {
        notes = [523.25, 659.25, 1046.5];
        stepSec = 0.075;
      } else if (kind === 'set_complete') {
        notes = [523.25, 659.25, 783.99, 1046.5];
        stepSec = 0.07;
        wave = 'triangle';
      } else if (kind === 'final') {
        notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        stepSec = 0.085;
      } else if (kind === 'hint') {
        notes = [440, 392.0];
        stepSec = 0.095;
      } else if (kind === 'blackhole') {
        notes = [293.66, 220.0];
        stepSec = 0.11;
        wave = 'sawtooth';
      } else if (kind === 'free_trap') {
        notes = [523.25, 783.99];
        stepSec = 0.06;
      }

      notes.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, now + idx * stepSec);
        gain.gain.setValueAtTime(0.001, now + idx * stepSec);
        gain.gain.exponentialRampToValueAtTime(0.16, now + idx * stepSec + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * stepSec + 0.24);
        osc.connect(gain);
        gain.connect(sfxMasterGain);
        osc.start(now + idx * stepSec);
        osc.stop(now + idx * stepSec + 0.25);
      });
    } catch {}
  }

  function numberToChineseSpeech(n) {
    const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (n <= 0) return '零';
    if (n < 10) return digits[n];
    if (n === 10) return '十';
    if (n < 20) return '十' + digits[n % 10];
    if (n < 100) {
      const tens = Math.floor(n / 10);
      const ones = n % 10;
      return digits[tens] + '十' + (ones > 0 ? digits[ones] : '');
    }
    return String(n);
  }

  function speakText(phrase) {
    if (!state.voiceOn || !('speechSynthesis' in window) || !phrase) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(phrase);
      utter.lang = 'zh-TW';
      utter.rate = 1.0;
      utter.pitch = 1.08;
      const voices = window.speechSynthesis.getVoices();
      const twVoice =
        voices.find(v => /zh[-_]?TW/i.test(v.lang)) ||
        voices.find(v => /^zh/i.test(v.lang));
      if (twVoice) utter.voice = twVoice;
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  function speakCompletionCount(count, isRoundEnd = false, followUpPrompt = '') {
    if (!state.voiceOn || !('speechSynthesis' in window)) return;
    let phrase = count > 0 ? numberToChineseSpeech(count) : '完成';
    if (isRoundEnd) {
      phrase = count > 0 ? `${numberToChineseSpeech(count)}，太棒了` : '太棒了，任務完成';
    } else if (followUpPrompt) {
      phrase = `${phrase}，${followUpPrompt}`;
    }
    speakText(phrase);
  }

  document.addEventListener('visibilitychange', () => {
    syncGains();
  });

  window.StarMotionSound = {
    unlockAudio,
    setConfig,
    playGameSound,
    speakText,
    speakCompletionCount,
    numberToChineseSpeech
  };
})();
