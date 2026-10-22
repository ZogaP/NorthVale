/**
 * NorthVale: Sombras de 1989 — RetroAudioSynthesizer.js
 * Especialista em Web Audio API Nativa & Síntese Sonora Procedural (1989)
 *
 * Módulo puro em Web Audio API desacoplado (sem ficheiros MP3/WAV externos):
 * - Chiado de chuva contínua a bater em telhados de zinco (ruído rosa + filtro passa-banda metálico).
 * - Estalido mecânico de interruptor e cliques secos de gazua em tambor de latão.
 * - Estática de rádio policial de ondas curtas com ruído de corte (squelch).
 * - Acordes graves e sombrios de sintetizador estilo anos 80 para momentos de tensão.
 * - Motor mecânico, ruído de fita magnética (tape hiss) e cliques de gravador cassete.
 * - Analisador de amplitude em tempo real para alimentar o VU Meter de CassettePlayerView.
 */

export class RetroAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.analyser = null;
    this.analyserData = null;

    // Estado da atmosfera contínua
    this.activeAtmosphereType = null;
    this.atmosphereNodes = [];
    this.atmosphereGain = null;

    // Buffer de dados de amplitude
    this.currentAmplitude = 0.0;
  }

  /**
   * Inicializa ou retoma o AudioContext do navegador após interação do utilizador.
   * @private
   */
  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.75, this.ctx.currentTime);

      // AnalyserNode para medir amplitudes em tempo real (VU meter)
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.65;
      this.analyserData = new Uint8Array(this.analyser.frequencyBinCount);

      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Retorna a amplitude sonora instantânea normalizada (0.0 a 1.0) para mover a agulha do VU meter.
   * @returns {number}
   */
  getAudioAmplitude() {
    if (!this.analyser || !this.analyserData) return 0.0;
    this.analyser.getByteTimeDomainData(this.analyserData);

    let sum = 0;
    for (let i = 0; i < this.analyserData.length; i++) {
      const val = (this.analyserData[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / this.analyserData.length);
    // Suavização
    this.currentAmplitude += (rms * 2.8 - this.currentAmplitude) * 0.35;
    return Math.min(1.0, Math.max(0.0, this.currentAmplitude));
  }

  /**
   * Reproduz um efeito sonoro procedural instantâneo.
   * @param {string} sfxType 'switch_click' | 'lockpick_tick' | 'police_radio' | 'cassette_clunk' | 'synth_chord'
   */
  playSFX(sfxType) {
    this._ensureContext();
    const t = this.ctx.currentTime;

    switch (sfxType) {
      case 'switch_click':
        this._playSwitchClick(t);
        break;
      case 'lockpick_tick':
        this._playLockpickTick(t);
        break;
      case 'police_radio':
        this._playPoliceRadio(t);
        break;
      case 'synth_chord':
        this._playTensionStab(t);
        break;
      case 'cassette_clunk':
      default:
        this._playCassetteClunk(t);
        break;
    }
  }

  /**
   * Inicia uma atmosfera contínua sintetizada em loop procedural.
   * @param {string} type 'rain_zinc' | 'synth_tension' | 'tape_hiss'
   */
  startAtmosphere(type) {
    this._ensureContext();
    if (this.activeAtmosphereType === type) return;
    this.stopAtmosphere();

    this.activeAtmosphereType = type;
    const t = this.ctx.currentTime;

    if (type === 'rain_zinc') {
      this._startRainOnZincRoof(t);
    } else if (type === 'synth_tension') {
      this._startSynthTensionDrone(t);
    } else if (type === 'tape_hiss') {
      this._startTapeHissAndMotor(t);
    }
  }

  /**
   * Encerra a atmosfera sonora ativa com fade-out suave de 0.4s.
   */
  stopAtmosphere() {
    if (!this.activeAtmosphereType || !this.atmosphereGain) return;
    const t = this.ctx ? this.ctx.currentTime : 0;

    const gain = this.atmosphereGain;
    const nodes = this.atmosphereNodes;

    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.001, t + 0.4);

    setTimeout(() => {
      for (const n of nodes) {
        try {
          if (n.stop) n.stop();
          n.disconnect();
        } catch (e) {
          // ignore
        }
      }
    }, 450);

    this.activeAtmosphereType = null;
    this.atmosphereNodes = [];
    this.atmosphereGain = null;
  }

  // ==========================================================================
  // SÍNTESE PROCEDURAL DE EFEITOS SONOROS (SFX)
  // ==========================================================================

  /**
   * Estalido mecânico de interruptor e trava industrial de 1989.
   * @private
   */
  _playSwitchClick(t) {
    // 1. Ruído de impacto metálico seco
    const noiseBuf = this._createNoiseBuffer(0.04);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.Q.value = 4.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.65, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

    noiseSrc.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noiseSrc.start(t);
    noiseSrc.stop(t + 0.04);

    // 2. Thump grave de contato
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.03);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.7, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Clique seco e nítido de pino de gazua a rodar no tambor de latão.
   * @private
   */
  _playLockpickTick(t) {
    // Mini-ressonância metálica em latão (4200 Hz e 5600 Hz)
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4400, t);
    osc.frequency.exponentialRampToValueAtTime(3800, t + 0.025);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.4, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    // Ruído de atrito raspado do aço
    const noiseBuf = this._createNoiseBuffer(0.02);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const bpf = this.ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 5200;
    bpf.Q.value = 5.0;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.5, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    noiseSrc.connect(bpf);
    bpf.connect(nGain);
    nGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.03);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.025);
  }

  /**
   * Estática de rádio policial de ondas curtas com ruído de corte (squelch).
   * @private
   */
  _playPoliceRadio(t) {
    const duration = 0.55;

    // 1. Squelch burst inicial
    const noiseBuf = this._createNoiseBuffer(duration);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    // Filtro telefônico / rádio VHF (350Hz a 2800Hz)
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(2600, t);

    const hpf = this.ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(450, t);

    const radioGain = this.ctx.createGain();
    radioGain.gain.setValueAtTime(0.001, t);
    radioGain.gain.linearRampToValueAtTime(0.45, t + 0.04);
    radioGain.gain.setValueAtTime(0.35, t + duration - 0.06);
    radioGain.gain.linearRampToValueAtTime(0.001, t + duration);

    // Beep característico de transmissão policial analógica (quindar tone)
    const beep = this.ctx.createOscillator();
    beep.type = 'sine';
    beep.frequency.setValueAtTime(1050, t + 0.01);
    const beepGain = this.ctx.createGain();
    beepGain.gain.setValueAtTime(0.18, t + 0.01);
    beepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    beep.connect(beepGain);
    beepGain.connect(this.masterGain);

    noiseSrc.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(radioGain);
    radioGain.connect(this.masterGain);

    beep.start(t + 0.01);
    beep.stop(t + 0.08);

    noiseSrc.start(t);
    noiseSrc.stop(t + duration);
  }

  /**
   * Acorde grave e tenso em sintetizador analógico estilo filme policial 1989.
   * @private
   */
  _playTensionStab(t) {
    const dur = 2.4;
    // Acorde em trítono tenso: C2 (65.4Hz), Eb2 (77.8Hz), F#2 (92.5Hz), G2 (98.0Hz)
    const freqs = [65.41, 77.78, 92.50, 97.99];

    const stabGain = this.ctx.createGain();
    stabGain.gain.setValueAtTime(0.001, t);
    stabGain.gain.linearRampToValueAtTime(0.4, t + 0.08);
    stabGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    stabGain.connect(this.masterGain);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(850, t);
    lpf.frequency.exponentialRampToValueAtTime(220, t + dur);
    lpf.Q.value = 3.5;
    lpf.connect(stabGain);

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      // Ligeiro desafinamento analógico
      osc.frequency.setValueAtTime(f + (Math.random() - 0.5) * 0.8, t);
      osc.connect(lpf);
      osc.start(t);
      osc.stop(t + dur);
    }
  }

  /**
   * Clique e tranco mecânico pesado de teclas de gravador cassete (PLAY / STOP).
   * @private
   */
  _playCassetteClunk(t) {
    // 1. Tranco mecânico plástico/metal
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.045);

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    // 2. Ruído de mola e engrenagem
    const noiseBuf = this._createNoiseBuffer(0.05);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;

    const bpf = this.ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 2400;
    bpf.Q.value = 3.0;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.45, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(g);
    g.connect(this.masterGain);

    noiseSrc.connect(bpf);
    bpf.connect(nGain);
    nGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.05);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.05);
  }

  // ==========================================================================
  // SÍNTESE PROCEDURAL DE ATMOSFERAS CONTÍNUAS
  // ==========================================================================

  /**
   * Chiado contínuo de chuva forte a bater em telhados de zinco.
   * Ruído de fundo filtrado + impactos metálicos aleatórios simulados.
   * @private
   */
  _startRainOnZincRoof(t) {
    const atmoGain = this.ctx.createGain();
    atmoGain.gain.setValueAtTime(0.001, t);
    atmoGain.gain.linearRampToValueAtTime(0.38, t + 0.5);
    atmoGain.connect(this.masterGain);
    this.atmosphereGain = atmoGain;

    // Loop contínuo de ruído rosa
    const noiseBuf = this._createPinkNoiseBuffer(4.0);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    // Filtro passa-faixa para ressonância metálica da chapa de zinco (2800 Hz)
    const zincFilter = this.ctx.createBiquadFilter();
    zincFilter.type = 'bandpass';
    zincFilter.frequency.setValueAtTime(2800, t);
    zincFilter.Q.value = 1.8;

    // Filtro passa-baixas para o peso d'água
    const rainLow = this.ctx.createBiquadFilter();
    rainLow.type = 'lowpass';
    rainLow.frequency.setValueAtTime(1400, t);

    noiseSrc.connect(zincFilter);
    zincFilter.connect(atmoGain);

    noiseSrc.connect(rainLow);
    rainLow.connect(atmoGain);

    noiseSrc.start(t);
    this.atmosphereNodes.push(noiseSrc, zincFilter, rainLow);
  }

  /**
   * Drone grave e sombrio de sintetizador estilo Vangelis / Carpenter (1989).
   * @private
   */
  _startSynthTensionDrone(t) {
    const atmoGain = this.ctx.createGain();
    atmoGain.gain.setValueAtTime(0.001, t);
    atmoGain.gain.linearRampToValueAtTime(0.32, t + 0.8);
    atmoGain.connect(this.masterGain);
    this.atmosphereGain = atmoGain;

    // Frequências graves contínuas (Dó1 e Sol1: 32.7Hz e 49.0Hz)
    const freqs = [32.70, 48.99, 65.41];

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(280, t);
    lpf.Q.value = 4.0;
    lpf.connect(atmoGain);

    // LFO lento para respirar o filtro
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.18, t); // 0.18 Hz (respiração lenta)

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(140, t);

    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);
    lfo.start(t);
    this.atmosphereNodes.push(lfo, lfoGain, lpf);

    for (const f of freqs) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f + (Math.random() - 0.5) * 0.4, t);
      osc.connect(lpf);
      osc.start(t);
      this.atmosphereNodes.push(osc);
    }
  }

  /**
   * Ruído de motor e hissing característico de fita magnética rodando no cabeçote.
   * @private
   */
  _startTapeHissAndMotor(t) {
    const atmoGain = this.ctx.createGain();
    atmoGain.gain.setValueAtTime(0.001, t);
    atmoGain.gain.linearRampToValueAtTime(0.24, t + 0.3);
    atmoGain.connect(this.masterGain);
    this.atmosphereGain = atmoGain;

    // 1. Tape Hiss (Ruído branco suave de fita magnética)
    const noiseBuf = this._createNoiseBuffer(3.0);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuf;
    noiseSrc.loop = true;

    const hpf = this.ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(2200, t);

    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(7500, t);

    noiseSrc.connect(hpf);
    hpf.connect(lpf);
    lpf.connect(atmoGain);
    noiseSrc.start(t);

    // 2. Hum elétrico sutil de motor DC de 1989 (92 Hz)
    const motor = this.ctx.createOscillator();
    motor.type = 'triangle';
    motor.frequency.setValueAtTime(92, t);

    const motorGain = this.ctx.createGain();
    motorGain.gain.setValueAtTime(0.04, t);

    motor.connect(motorGain);
    motorGain.connect(atmoGain);
    motor.start(t);

    this.atmosphereNodes.push(noiseSrc, hpf, lpf, motor, motorGain);
  }

  // ==========================================================================
  // GERADORES MATEMÁTICOS DE BUFFERS DE RUÍDO
  // ==========================================================================

  _createNoiseBuffer(durationSeconds) {
    const sr = this.ctx ? this.ctx.sampleRate : 44100;
    const samples = Math.floor(sr * durationSeconds);
    const buf = this.ctx.createBuffer(1, samples, sr);
    const data = buf.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  _createPinkNoiseBuffer(durationSeconds) {
    const sr = this.ctx ? this.ctx.sampleRate : 44100;
    const samples = Math.floor(sr * durationSeconds);
    const buf = this.ctx.createBuffer(1, samples, sr);
    const data = buf.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < samples; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buf;
  }
}
