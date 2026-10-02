// Lightweight 8-bit style sound effects synthesized with the Web Audio API.
// No external audio files needed — fits the retro pixel-art theme and keeps bundle size tiny.

let ctx = null;
let muted = false;
const activeNodes = new Set();

try {
  muted = localStorage.getItem('rps-card-game-muted') === '1';
} catch {
  // ignore
}

function getContext() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  muted = value;
  try {
    localStorage.setItem('rps-card-game-muted', value ? '1' : '0');
  } catch {
    // ignore
  }
  // Silence anything already scheduled (Web Audio timings are locked in the
  // moment .start() is called, so notes queued a beat ahead — e.g. by the music
  // lookahead scheduler — would otherwise keep playing out even after muting).
  if (value && ctx) {
    const now = ctx.currentTime;
    activeNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(0, now);
        osc.stop(now);
      } catch {
        // already stopped/ended — ignore
      }
    });
    activeNodes.clear();
  }
}

// Plays a single tone with a short attack/release envelope so it doesn't click.
// `at` (absolute AudioContext time) is used by the music scheduler; one-shot sfx
// calls omit it and fall back to "now" via `startAt` (seconds from now).
function tone({ freq, duration = 0.12, type = 'square', volume = 0.18, startAt = 0, glideTo = null, at = null }) {
  const audio = getContext();
  if (!audio || muted) return;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;

  const t0 = at !== null ? at : audio.currentTime + startAt;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(glideTo, 1), t0 + duration);

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);

  const node = { osc, gain };
  activeNodes.add(node);
  osc.onended = () => activeNodes.delete(node);
}

function sequence(notes, startAt = 0) {
  let t = startAt;
  notes.forEach(([freq, duration, type]) => {
    tone({ freq, duration, type: type || 'square', startAt: t });
    t += duration * 0.9;
  });
}

// Filtered white-noise burst (snips, rips, thuds) — one shared noise buffer.
let noiseBuffer = null;
function noise({ duration = 0.12, volume = 0.15, startAt = 0, filter = 'bandpass', freq = 2000, q = 1, sweepTo = null }) {
  const audio = getContext();
  if (!audio || muted) return;
  if (!noiseBuffer) {
    noiseBuffer = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const src = audio.createBufferSource();
  src.buffer = noiseBuffer;
  const bq = audio.createBiquadFilter();
  bq.type = filter;
  bq.Q.value = q;
  const gain = audio.createGain();
  const t0 = audio.currentTime + startAt;
  bq.frequency.setValueAtTime(freq, t0);
  if (sweepTo) bq.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(bq);
  bq.connect(gain);
  gain.connect(audio.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
  const node = { osc: src, gain }; // same shape as tone() so mute can cut it
  activeNodes.add(node);
  src.onended = () => activeNodes.delete(node);
}

// Picking a card: each type has its own voice.
const CARD_SOUNDS = {
  keo: () => {
    // scissors: two quick metallic snips
    noise({ duration: 0.05, volume: 0.16, filter: 'highpass', freq: 4000 });
    tone({ freq: 1800, duration: 0.04, type: 'square', volume: 0.06, glideTo: 1200 });
    noise({ duration: 0.05, volume: 0.16, filter: 'highpass', freq: 4500, startAt: 0.07 });
  },
  bua: () => {
    // hammer: heavy wooden knock
    tone({ freq: 140, duration: 0.12, type: 'triangle', volume: 0.22, glideTo: 70 });
    noise({ duration: 0.06, volume: 0.12, filter: 'lowpass', freq: 900 });
  },
  bao: () => {
    // sack: soft burlap rustle
    noise({ duration: 0.18, volume: 0.12, filter: 'bandpass', freq: 1200, q: 0.7, sweepTo: 600 });
  },
};

// The clash itself at reveal (BR-3D-06), one per matchup.
const CLASH_SOUNDS = {
  // Búa đập vỡ Kéo: thud + metal ring + shards
  'bua-keo': (t) => {
    tone({ freq: 110, duration: 0.25, type: 'triangle', volume: 0.25, glideTo: 50, startAt: t });
    tone({ freq: 1320, duration: 0.35, type: 'square', volume: 0.05, glideTo: 880, startAt: t });
    noise({ duration: 0.3, volume: 0.18, filter: 'highpass', freq: 3000, startAt: t + 0.02 });
  },
  // Kéo cắt đôi Bao: snip-snip then a cloth rip
  'keo-bao': (t) => {
    noise({ duration: 0.04, volume: 0.18, filter: 'highpass', freq: 5000, startAt: t });
    noise({ duration: 0.04, volume: 0.18, filter: 'highpass', freq: 5000, startAt: t + 0.08 });
    noise({ duration: 0.3, volume: 0.16, filter: 'bandpass', freq: 3000, q: 0.8, sweepTo: 800, startAt: t + 0.14 });
  },
  // Bao trùm gói Búa: muffled whoomp as the sack closes
  'bao-bua': (t) => {
    tone({ freq: 300, duration: 0.3, type: 'sine', volume: 0.22, glideTo: 70, startAt: t });
    noise({ duration: 0.25, volume: 0.14, filter: 'lowpass', freq: 600, sweepTo: 150, startAt: t });
  },
  // Hòa: two cards clash and bounce
  draw: (t) => {
    tone({ freq: 660, duration: 0.12, type: 'square', volume: 0.08, startAt: t });
    tone({ freq: 698, duration: 0.12, type: 'square', volume: 0.08, startAt: t });
    noise({ duration: 0.08, volume: 0.14, filter: 'bandpass', freq: 2500, startAt: t });
  },
};

// ── Background music: one looping 4-bar chiptune per stage (BR-3D-04) ──────
// Notes are written as names ('A4', '.' = rest); each theme is 4 bass notes
// (one per bar) and 16 lead steps.
const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function noteFreq(name) {
  if (name === '.') return null;
  const [, letter, octave] = name.match(/^([A-G][#b]?)(\d)$/);
  const midi = (Number(octave) + 1) * 12 + NOTE_INDEX[letter];
  return 440 * 2 ** ((midi - 69) / 12);
}
const theme = (step, bass, lead, leadWave = 'square') => ({
  step,
  bass: bass.split(' ').map(noteFreq),
  lead: lead.split(' ').map(noteFreq),
  leadWave,
});

export const MUSIC_THEMES = {
  // Castle / menu: A minor, Am-F-C-G
  'chien-binh': theme(0.28, 'A2 F2 C3 G2', 'A3 C4 E4 C4 F3 A3 C4 A3 C4 E4 G4 E4 G3 B3 D4 B3'),
  // Thunder Peak: fast D minor arpeggios
  'loi-long': theme(0.2, 'D2 D2 Bb1 C2', 'D4 F4 A4 D5 D4 F4 A4 D5 Bb3 D4 F4 Bb4 C4 E4 G4 C5'),
  // Blood Arena: driving E phrygian on a saw lead
  'huyet-vu': theme(0.22, 'E2 F2 E2 D2', 'E4 E4 G4 F4 F4 A4 G4 F4 E4 G4 B4 G4 D4 F4 A4 F4', 'sawtooth'),
  // Misty Graveyard: slow, sparse C minor
  'am-anh': theme(0.4, 'C2 Ab1 Eb2 G1', 'C5 . Eb5 D5 Ab4 . C5 B4 Eb5 D5 C5 G4 G4 B4 D5 .', 'triangle'),
  // Sunset Temple: pentatonic
  'bao-loan': theme(0.26, 'A2 E2 D2 E2', 'A4 C5 D5 E5 G5 E5 D5 C5 D5 E5 G5 A5 G5 E5 D5 E5'),
  // Star Observatory: dreamy major sevenths
  'thien-nhan': theme(0.34, 'F2 A2 D2 C2', 'F4 A4 C5 E5 A4 C5 E5 G5 D4 F4 A4 C5 C4 E4 G4 B4', 'triangle'),
  // Mage Tower: harmonic minor
  'phap-su': theme(0.3, 'A2 D2 E2 A2', 'A4 C5 E5 G#5 D5 F5 A5 F5 E5 G#5 B4 G#4 A4 E5 C5 A4'),
  // Crystal Cave: low, echoing
  'thach-linh': theme(0.36, 'E2 G2 D2 E2', 'E4 . G4 . B4 . A4 G4 D4 . F#4 . A4 G4 F#4 D4', 'triangle'),
};
const DEFAULT_THEME = 'chien-binh';
let currentTheme = MUSIC_THEMES[DEFAULT_THEME];

// Switches the loop; takes effect from the next step, restarting at bar 1.
export function setMusicTheme(id) {
  const next = MUSIC_THEMES[id] || MUSIC_THEMES[DEFAULT_THEME];
  if (next === currentTheme) return;
  currentTheme = next;
  musicStep = 0;
}

let musicOn = false;
let musicStep = 0;
let nextStepTime = 0;
let musicTimer = null;

function scheduleMusicStep() {
  const audio = getContext();
  if (!audio || !musicOn) return;

  while (nextStepTime < audio.currentTime + 0.2) {
    const { step, bass, lead, leadWave } = currentTheme;
    if (musicStep % 4 === 0) {
      tone({ freq: bass[(musicStep / 4) % bass.length], duration: step * 3.6, type: 'triangle', volume: 0.05, at: nextStepTime });
    }
    const leadFreq = lead[musicStep % lead.length];
    if (leadFreq) tone({ freq: leadFreq, duration: step * 0.8, type: leadWave, volume: 0.035, at: nextStepTime });
    nextStepTime += step;
    musicStep += 1;
  }
  musicTimer = setTimeout(scheduleMusicStep, 100);
}

export function startMusic() {
  const audio = getContext();
  if (!audio || musicOn) return;
  musicOn = true;
  musicStep = 0;
  nextStepTime = audio.currentTime + 0.1;
  scheduleMusicStep();
}

export function stopMusic() {
  musicOn = false;
  if (musicTimer) clearTimeout(musicTimer);
}

export function isMusicOn() {
  return musicOn;
}

export const sfx = {
  click: () => tone({ freq: 320, duration: 0.05, type: 'square', volume: 0.12 }),
  select: () => tone({ freq: 520, duration: 0.06, type: 'square', volume: 0.14 }),
  draw: () => tone({ freq: 300, duration: 0.14, type: 'triangle', volume: 0.14, glideTo: 620 }),
  skill: () => tone({ freq: 200, duration: 0.22, type: 'sawtooth', volume: 0.16, glideTo: 900 }),
  ready: () => tone({ freq: 440, duration: 0.09, type: 'square', volume: 0.14, glideTo: 660 }),
  winRound: () => sequence([[520, 0.09], [700, 0.14]]),
  loseRound: () => sequence([[300, 0.1], [180, 0.18]]),
  drawRound: () => tone({ freq: 260, duration: 0.16, type: 'triangle', volume: 0.13 }),
  card: (type) => CARD_SOUNDS[type]?.(),
  // Reveal: the matchup's own sound at the moment of impact (≈ the 3D hit),
  // then the win/lose/draw sting for the viewer. `kind` = 'bua-keo' |
  // 'keo-bao' | 'bao-bua' | 'draw'; `outcome` = 'win' | 'lose' | 'draw'.
  roundResult: (kind, outcome) => {
    CLASH_SOUNDS[kind]?.(0.35);
    if (outcome === 'win') sequence([[520, 0.09], [700, 0.14]], 0.9);
    else if (outcome === 'lose') sequence([[300, 0.1], [180, 0.18]], 0.9);
    else tone({ freq: 260, duration: 0.16, type: 'triangle', volume: 0.13, startAt: 0.9 });
  },
  matchWin: () => sequence([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.24]]),
  matchLose: () => sequence([[392, 0.14], [330, 0.14], [262, 0.28]]),
};
