/**
 * audio.js - Звуковой движок на основе реалистичных аудиофайлов
 * Воспроизводит настоящие физические звуки залпа, свиста снаряда, взрыва и всплеска
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('battleship_muted') === 'true';
    this.soundBuffers = new Map();
    this.loadingPromise = null;
    this.preloadSounds();
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.loadingPromise) {
      this.preloadSounds();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('battleship_muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  async preloadSounds() {
    const soundFiles = {
      shot: '/sounds/shot.wav',
      whistle: '/sounds/whistle.wav',
      hit: '/sounds/hit.wav',
      miss: '/sounds/miss.wav',
      sunk: '/sounds/sunk.wav',
      sonar: '/sounds/sonar.wav'
    };

    const promises = Object.entries(soundFiles).map(async ([key, url]) => {
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx) {
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.soundBuffers.set(key, audioBuffer);
        }
      } catch (err) {
        console.warn(`Could not preload ${key}:`, err);
      }
    });

    this.loadingPromise = Promise.all(promises);
  }

  playSound(name, volume = 1.0) {
    if (this.muted) return;
    this.init();

    const buffer = this.soundBuffers.get(name);
    if (buffer && this.ctx) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);

      source.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(0);
    } else {
      // Fallback через обычный Audio элемент
      const audio = new Audio(`/sounds/${name}.wav`);
      audio.volume = Math.min(1.0, Math.max(0, volume));
      audio.play().catch(() => {});
    }
  }

  // Реалистичный артиллерийский залп
  playShot() {
    this.playSound('shot', 0.95);
  }

  // Реалистичный свист летящего по дуге снаряда (эффект Доплера)
  playShellWhistle() {
    this.playSound('whistle', 0.85);
  }

  // Реалистичный взрыв при попадании и пробитии брони
  playHit() {
    this.playSound('hit', 1.0);
  }

  // Реалистичный тяжелый всплеск воды при падении снаряда в океан
  playMiss() {
    this.playSound('miss', 0.9);
  }

  // Реалистичное катастрофическое потопление судна
  playSunk() {
    this.playSound('sunk', 1.0);
  }

  // Подлинный подводный импульс сонара (ASDIC ping)
  playSonar() {
    this.playSound('sonar', 0.6);
  }

  // Легкий росчерк ручки по тетрадному листу
  playPencilScratch() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.12;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2600, t);
    filter.Q.value = 4.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
    noise.stop(t + dur);
  }

  playVictory() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [
      { f: 523, d: 0.15 },
      { f: 659, d: 0.15 },
      { f: 784, d: 0.18 },
      { f: 1046, d: 0.55 }
    ];

    let cur = t;
    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, cur);
      g.gain.setValueAtTime(0.28, cur);
      g.gain.exponentialRampToValueAtTime(0.001, cur + n.d);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(cur);
      osc.stop(cur + n.d);
      cur += n.d * 0.85;
    });
  }

  playDefeat() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [392, 349, 311, 261];
    let cur = t;
    notes.forEach(f => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, cur);
      g.gain.setValueAtTime(0.2, cur);
      g.gain.exponentialRampToValueAtTime(0.001, cur + 0.45);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(cur);
      osc.stop(cur + 0.45);
      cur += 0.26;
    });
  }
}

window.soundEngine = new SoundEngine();