const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

// Функция создания WAV файла (16-bit PCM, Mono)
function writeWavFile(filename, samples) {
  const buffer = Buffer.alloc(44 + samples.length * 2);

  // RIFF identifier
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  buffer.writeUInt32LE(SAMPLE_RATE, 24); // SampleRate
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // ByteRate (SampleRate * NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(2, 32);  // BlockAlign (NumChannels * BitsPerSample/8)
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  // Peak normalization to -1.0 dB
  let maxAmp = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > maxAmp) maxAmp = a;
  }

  const targetPeak = 0.88;
  const gain = maxAmp > 0 ? targetPeak / maxAmp : 1.0;

  for (let i = 0; i < samples.length; i++) {
    let s = samples[i] * gain;
    // Hard clip safety
    if (s > 1.0) s = 1.0;
    if (s < -1.0) s = -1.0;
    const intSample = Math.floor(s < 0 ? s * 32768 : s * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
  console.log(`✓ Generated: ${path.basename(filename)} (${(samples.length / SAMPLE_RATE).toFixed(2)}s)`);
}

// Biquad фильтр (RBJ Audio EQ Cookbook)
class BiquadFilter {
  constructor(type, freq, q = 1.0) {
    this.type = type;
    this.freq = freq;
    this.q = q;
    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
    this.updateCoeffs();
  }

  setFreq(freq) {
    this.freq = Math.max(10, Math.min(SAMPLE_RATE * 0.49, freq));
    this.updateCoeffs();
  }

  updateCoeffs() {
    const omega = 2 * Math.PI * (this.freq / SAMPLE_RATE);
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * this.q);

    if (this.type === 'lowpass') {
      const b0 = (1 - cs) / 2;
      const b1 = 1 - cs;
      const b2 = (1 - cs) / 2;
      const a0 = 1 + alpha;
      const a1 = -2 * cs;
      const a2 = 1 - alpha;
      this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
      this.a1 = a1 / a0; this.a2 = a2 / a0;
    } else if (this.type === 'highpass') {
      const b0 = (1 + cs) / 2;
      const b1 = -(1 + cs);
      const b2 = (1 + cs) / 2;
      const a0 = 1 + alpha;
      const a1 = -2 * cs;
      const a2 = 1 - alpha;
      this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
      this.a1 = a1 / a0; this.a2 = a2 / a0;
    } else if (this.type === 'bandpass') {
      const b0 = alpha;
      const b1 = 0;
      const b2 = -alpha;
      const a0 = 1 + alpha;
      const a1 = -2 * cs;
      const a2 = 1 - alpha;
      this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
      this.a1 = a1 / a0; this.a2 = a2 / a0;
    }
  }

  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

// ----------------------------------------------------------------------------
// 1. SHOT.WAV - Мощный реалистичный артиллерийский залп
// ----------------------------------------------------------------------------
function generateShotSound() {
  const duration = 1.35;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(totalSamples);

  const lp = new BiquadFilter('lowpass', 120, 1.2);
  let brownState = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;

    // 1. Ударная волна детонации пороха: резкий скачок с сатурацией
    const initialCrackEnv = Math.exp(-t * 90);
    const whiteNoise = (Math.random() * 2 - 1);
    const crack = whiteNoise * initialCrackEnv * 1.6;

    // 2. Сверхнизкий басовый удар (Sub-bass thump 110Hz -> 30Hz)
    const subFreq = 30 + 80 * Math.exp(-t * 22);
    const subPhase = 2 * Math.PI * subFreq * t;
    const subEnv = Math.exp(-t * 7.5);
    const subBass = Math.sin(subPhase) * subEnv * 1.4;

    // 3. Катящийся рокот орудия (Brown noise + resonance)
    brownState = (brownState + (Math.random() * 2 - 1) * 0.15) * 0.95;
    const rumbleEnv = Math.exp(-t * 3.2);
    const rumble = lp.process(brownState) * rumbleEnv * 2.5;

    // 4. Металлический лязг казенной части
    const metalEnv = Math.exp(-t * 40);
    const metal = Math.sin(2 * Math.PI * 480 * t) * metalEnv * 0.3;

    // Нелинейная аналоговая сатурация (эффект перегрузки реального микрофона)
    const raw = crack + subBass + rumble + metal;
    out[i] = Math.tanh(raw * 2.2);
  }

  return out;
}

// ----------------------------------------------------------------------------
// 2. WHISTLE.WAV - Реалистичный свист летящего по дуге снаряда (Доплер)
// ----------------------------------------------------------------------------
function generateWhistleSound() {
  const duration = 0.85;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(totalSamples);

  const bp = new BiquadFilter('bandpass', 1100, 4.0);
  let phase1 = 0;
  let phase2 = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;

    // Эффект Доплера: частота падает по экспоненте (1500 Гц -> 400 Гц)
    const freq1 = 400 + 1100 * Math.pow(1 - progress, 1.6);
    const freq2 = freq1 * 1.503; // Вторая обертоновая гармоника со скольжением

    phase1 += (2 * Math.PI * freq1) / SAMPLE_RATE;
    phase2 += (2 * Math.PI * freq2) / SAMPLE_RATE;

    // Вихревая турбулентность рассекаемого воздуха (амплитудная модуляция 16 Гц)
    const turbulence = 1 + 0.25 * Math.sin(2 * Math.PI * 16 * t);

    // Огибающая: нарастание по мере приближения и резкий спад в конце
    const env = Math.pow(Math.sin(progress * Math.PI * 0.95), 1.2);

    bp.setFreq(freq1);
    const windNoise = bp.process(Math.random() * 2 - 1) * 0.35;

    const tone = (Math.sin(phase1) * 0.55 + Math.sin(phase2) * 0.25);
    out[i] = (tone + windNoise) * env * turbulence;
  }

  return out;
}

// ----------------------------------------------------------------------------
// 3. HIT.WAV - Реалистичный взрыв и пробитие брони
// ----------------------------------------------------------------------------
function generateHitSound() {
  const duration = 1.45;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(totalSamples);

  const lpBoom = new BiquadFilter('lowpass', 240, 1.5);
  const bpMetal = new BiquadFilter('bandpass', 1800, 3.0);
  let brownState = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;

    // 1. Металлический треск разрываемой брони (0-50 мс)
    const metalEnv = Math.exp(-t * 60);
    const metalScreech = bpMetal.process((Math.random() * 2 - 1)) * metalEnv * 2.2;

    // 2. Мощный детонационный удар фугаса (0-250 мс)
    const detEnv = Math.exp(-t * 12);
    const detFreq = 45 + 120 * Math.exp(-t * 25);
    const detPhase = 2 * Math.PI * detFreq * t;
    const detonation = Math.sin(detPhase) * detEnv * 1.6;

    // 3. Глубокий раскатистый грохот огня и обломков
    brownState = (brownState + (Math.random() * 2 - 1) * 0.2) * 0.96;
    const boomEnv = Math.exp(-t * 3.5);
    const boom = lpBoom.process(brownState) * boomEnv * 2.8;

    // 4. Осколочные щелчки
    const shrapnel = (Math.random() > 0.992 && t < 0.8) ? (Math.random() * 2 - 1) * 0.8 : 0;

    const raw = metalScreech + detonation + boom + shrapnel;
    out[i] = Math.tanh(raw * 2.0);
  }

  return out;
}

// ----------------------------------------------------------------------------
// 4. MISS.WAV - Реалистичный всплеск воды (снаряд в океан)
// ----------------------------------------------------------------------------
function generateMissSound() {
  const duration = 1.3;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(totalSamples);

  const bpGeyser = new BiquadFilter('bandpass', 750, 1.8);
  const lpThud = new BiquadFilter('lowpass', 140, 1.2);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;

    // 1. Гидроудар о толщу воды ("БУХ/ПЛЮХ")
    const thudEnv = Math.exp(-t * 24);
    const thudFreq = 40 + 130 * Math.exp(-t * 30);
    const thud = lpThud.process(Math.sin(2 * Math.PI * thudFreq * t) + (Math.random() * 2 - 1) * 0.6) * thudEnv * 1.8;

    // 2. Взмывающий и опадающий водяной гейзер
    const geyserEnv = Math.pow(Math.sin(Math.min(t / 0.7, 1) * Math.PI), 1.5) * Math.exp(-t * 1.8);
    const currentFilterFreq = 1200 - 800 * Math.min(t / 1.0, 1);
    bpGeyser.setFreq(currentFilterFreq);
    const geyser = bpGeyser.process(Math.random() * 2 - 1) * geyserEnv * 2.0;

    // 3. Мелкие брызги и пузыри воды, падающие обратно
    const dripEnv = (t > 0.15) ? Math.exp(-(t - 0.15) * 3.5) : 0;
    const bubbles = (Math.random() > 0.985 && t > 0.1 && t < 0.9) ? Math.sin(2 * Math.PI * (1200 + Math.random() * 800) * t) * 0.25 : 0;
    const spray = (Math.random() * 2 - 1) * dripEnv * 0.3 + bubbles;

    out[i] = Math.tanh(thud + geyser + spray);
  }

  return out;
}

// ----------------------------------------------------------------------------
// 5. SUNK.WAV - Катастрофическое потопление судна
// ----------------------------------------------------------------------------
function generateSunkSound() {
  const duration = 2.4;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(totalSamples);

  const hit1 = generateHitSound();

  // Первый взрыв
  for (let i = 0; i < Math.min(hit1.length, totalSamples); i++) {
    out[i] += hit1[i] * 0.8;
  }

  // Второй взрыв с задержкой 220 мс
  const delaySamples = Math.floor(SAMPLE_RATE * 0.22);
  for (let i = 0; i < hit1.length && i + delaySamples < totalSamples; i++) {
    out[i + delaySamples] += hit1[i] * 0.9;
  }

  // Скрежет ломающегося металла и бурлящая вода
  const bpScreech = new BiquadFilter('bandpass', 580, 5.0);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    if (t > 0.3) {
      const groanEnv = Math.exp(-(t - 0.3) * 1.5);
      const groan = bpScreech.process(Math.sin(2 * Math.PI * (340 + Math.sin(t * 12) * 60) * t)) * groanEnv * 0.4;
      out[i] += groan;
    }
  }

  return out;
}

// ----------------------------------------------------------------------------
// 6. SONAR.WAV - Подлинный подводный эхо-импульс сонара (ASDIC ping)
// ----------------------------------------------------------------------------
function generateSonarSound() {
  const duration = 1.1;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(totalSamples);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    // Основной звонкий импульс 1050 Гц
    const envMain = Math.exp(-t * 6.0);
    const ping = Math.sin(2 * Math.PI * 1050 * t) * envMain * 0.9;

    // Подводное эхо через 180 мс и 360 мс
    const echo1 = t > 0.18 ? Math.sin(2 * Math.PI * 1045 * (t - 0.18)) * Math.exp(-(t - 0.18) * 8.0) * 0.35 : 0;
    const echo2 = t > 0.36 ? Math.sin(2 * Math.PI * 1040 * (t - 0.36)) * Math.exp(-(t - 0.36) * 10.0) * 0.15 : 0;

    out[i] = ping + echo1 + echo2;
  }

  return out;
}

// Генерация всех звуковых файлов
const soundsDir = path.join(__dirname, '../public/sounds');
writeWavFile(path.join(soundsDir, 'shot.wav'), generateShotSound());
writeWavFile(path.join(soundsDir, 'whistle.wav'), generateWhistleSound());
writeWavFile(path.join(soundsDir, 'hit.wav'), generateHitSound());
writeWavFile(path.join(soundsDir, 'miss.wav'), generateMissSound());
writeWavFile(path.join(soundsDir, 'sunk.wav'), generateSunkSound());
writeWavFile(path.join(soundsDir, 'sonar.wav'), generateSonarSound());

console.log('--- All realistic audio files generated successfully! ---');