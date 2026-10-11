/* ================= REVELADO AL SCROLL ================= */
const REVEAL_SELECTORS = '#game .reveal, #final .reveal, .game-content, .cake-side, .puzzle-side, .section-title, .section-sub';
const revealTargets = document.querySelectorAll(REVEAL_SELECTORS);
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in-view'); revealObs.unobserve(en.target); } });
}, { threshold: 0.18 });
revealTargets.forEach(el => revealObs.observe(el));

/* ================= SINTETIZADOR DE AUDIO (Web Audio API) ================= */
const AudioEngine = (function () {
  let ctx = null;
  let muted = false;
  let bgmOsc = null;
  let bgmGain = null;
  let bgmTimer = null;
  let isPlayingBgm = false;

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, type = 'sine', duration = 0.15, vol = 0.2, freqRamp = null) {
    if (muted) return;
    try {
      const c = getCtx();
      if (!c) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      if (freqRamp) {
        osc.frequency.exponentialRampToValueAtTime(freqRamp, c.currentTime + duration);
      }
      gain.gain.setValueAtTime(vol, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + duration);
    } catch (e) { }
  }

  function playEat() {
    playTone(440, 'triangle', 0.08, 0.25, 880);
  }

  function playDead() {
    playTone(300, 'sawtooth', 0.35, 0.3, 100);
  }

  function playPop() {
    playTone(600, 'sine', 0.06, 0.2, 900);
  }

  function playSnap() {
    playTone(523.25, 'sine', 0.12, 0.35, 1046.5);
    setTimeout(() => playTone(659.25, 'sine', 0.15, 0.3, 1318.5), 60);
  }

  function playWin() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      setTimeout(() => playTone(n, 'triangle', 0.3, 0.3), i * 110);
    });
  }

  function playBlow() {
    if (muted) return;
    try {
      const c = getCtx();
      if (!c) return;
      // Ruido de viento
      const bufferSize = c.sampleRate * 0.4;
      const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = c.createBufferSource();
      noise.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, c.currentTime);
      filter.frequency.linearRampToValueAtTime(100, c.currentTime + 0.4);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.4, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.4);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      noise.start();
    } catch (e) { }
  }

  // Melodía Cumpleaños Feliz sutil en bucle
  function startBgm() {
    if (isPlayingBgm) return;
    isPlayingBgm = true;
    const c = getCtx();
    if (!c) return;
    const melody = [
      { n: 392, d: 0.3 }, { n: 392, d: 0.3 }, { n: 440, d: 0.6 }, { n: 392, d: 0.6 }, { n: 523, d: 0.6 }, { n: 493, d: 1.0 },
      { n: 392, d: 0.3 }, { n: 392, d: 0.3 }, { n: 440, d: 0.6 }, { n: 392, d: 0.6 }, { n: 587, d: 0.6 }, { n: 523, d: 1.0 },
      { n: 392, d: 0.3 }, { n: 392, d: 0.3 }, { n: 784, d: 0.6 }, { n: 659, d: 0.6 }, { n: 523, d: 0.6 }, { n: 493, d: 0.6 }, { n: 440, d: 0.6 },
      { n: 698, d: 0.3 }, { n: 698, d: 0.3 }, { n: 659, d: 0.6 }, { n: 523, d: 0.6 }, { n: 587, d: 0.6 }, { n: 523, d: 1.2 }
    ];
    let step = 0;
    function playStep() {
      if (!isPlayingBgm || muted) {
        bgmTimer = setTimeout(playStep, 500);
        return;
      }
      const item = melody[step];
      playTone(item.n, 'sine', item.d * 0.85, 0.08);
      step = (step + 1) % melody.length;
      bgmTimer = setTimeout(playStep, item.d * 600);
    }
    playStep();
  }

  function stopBgm() {
    isPlayingBgm = false;
    if (bgmTimer) clearTimeout(bgmTimer);
  }

  function toggleMute() {
    muted = !muted;
    if (!muted && !isPlayingBgm) startBgm();
    return muted;
  }

  return { playEat, playDead, playPop, playSnap, playWin, playBlow, startBgm, stopBgm, toggleMute, isMuted: () => muted };
})();

/* ================= PERSONALIZACIÓN DE NOMBRE ================= */
const NameManager = (function () {
  let recipientName = localStorage.getItem('cumple_recipient_name') || 'Tía';

  function updateDOM() {
    const heroName = document.getElementById('hero-name');
    const headerName = document.getElementById('header-name-display');
    const recipientElems = document.querySelectorAll('.letter-recipient-name');

    if (heroName) heroName.textContent = recipientName.toUpperCase();
    if (headerName) headerName.textContent = `¡Feliz Cumpleaños ${recipientName}!`;
    recipientElems.forEach(el => el.textContent = recipientName);

    // Notificar al puzzle si existe
    if (window.onNameChanged) window.onNameChanged(recipientName);
  }

  function setName(newName) {
    if (!newName || !newName.trim()) return;
    recipientName = newName.trim();
    localStorage.setItem('cumple_recipient_name', recipientName);
    updateDOM();
  }

  function getName() { return recipientName; }

  // Listeners de modales de nombre
  document.addEventListener('DOMContentLoaded', () => {
    updateDOM();

    const btnEdit = document.getElementById('btn-edit-name');
    const modal = document.getElementById('name-modal');
    const btnClose = document.getElementById('close-name-modal');
    const btnSave = document.getElementById('btn-save-name');
    const inputName = document.getElementById('input-recipient-name');

    btnEdit?.addEventListener('click', () => {
      inputName.value = recipientName;
      modal?.classList.remove('hidden');
      inputName?.focus();
    });

    btnClose?.addEventListener('click', () => modal?.classList.add('hidden'));

    btnSave?.addEventListener('click', () => {
      setName(inputName.value);
      modal?.classList.add('hidden');
    });

    inputName?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        setName(inputName.value);
        modal?.classList.add('hidden');
      }
    });

    // Control Sonido Top Bar
    const btnSound = document.getElementById('btn-sound-toggle');
    btnSound?.addEventListener('click', () => {
      const isMuted = AudioEngine.toggleMute();
      btnSound.querySelector('.btn-text').textContent = isMuted ? 'Música: OFF' : 'Música: ON';
      btnSound.style.opacity = isMuted ? '0.6' : '1';
    });
  });

  return { getName, setName, updateDOM };
})();

/* ================= MINI JUEGO: LA VELA HAMBRIENTA ================= */
const CV = document.getElementById('game-canvas');
const CTX = CV ? CV.getContext('2d') : null;
const SCOREEL = document.getElementById('game-score');
const HIGHSCOREEL = document.getElementById('game-high-score');
const RESTARTBTN = document.getElementById('btn-restart-game');
const STARTTOAST = document.getElementById('game-start-toast');
const WINMODAL = document.getElementById('game-win-modal');
const WINRESTARTBTN = document.getElementById('btn-game-win-continue');

if (CV && CTX) {
  const CELL = 20;
  const COLS = CV.width / CELL;
  const ROWS = CV.height / CELL;
  const TICK_MS = 145;
  const TARGET_SCORE = 29;

  const C = {
    bg: '#150a28', gridA: '#1c0e33', gridB: '#190c2d',
    candleWax: '#f7e8d5', candleShade: '#d8bfa8', candleDark: '#a9836a',
    flameOuter: '#ff6d00', flameMid: '#ffa726', flameInner: '#fff176',
    wick: '#4e342e', drips: '#ffca28'
  };

  let candle, dir, nextDir, flames, score, highScore, alive, started, lastTick, rafId, particles, toastTimer;
  highScore = parseInt(localStorage.getItem('vela_high_score') || '0', 10);
  if (HIGHSCOREEL) HIGHSCOREEL.textContent = '🏆 Récord: ' + highScore;

  function showStartToast() {
    if (!STARTTOAST) return;
    STARTTOAST.classList.remove('fade-out', 'hidden');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      STARTTOAST.classList.add('fade-out');
    }, 3500);
  }

  function resetGame() {
    candle = [{ x: 8, y: 12 }, { x: 7, y: 12 }, { x: 6, y: 12 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    flames = [];
    score = 0;
    alive = true;
    started = false;
    lastTick = 0;
    particles = [];
    WINMODAL?.classList.add('hidden');
    showStartToast();
    for (let i = 0; i < 3; i++) spawnFlame();
    updateScore();
  }

  function spawnFlame() {
    let pos;
    do {
      pos = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0 };
    } while (candle.some(s => s.x === pos.x && s.y === pos.y) || flames.some(f => f.x === pos.x && f.y === pos.y));
    flames.push({ x: pos.x, y: pos.y, born: performance.now() });
  }

  function updateScore() {
    if (SCOREEL) SCOREEL.textContent = `🔥 ${score} / ${TARGET_SCORE}`;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('vela_high_score', highScore);
      if (HIGHSCOREEL) HIGHSCOREEL.textContent = '🏆 Récord: ' + highScore;
    }
  }

  function handleWin() {
    alive = false;
    // La serpiente se disuelve en chispas de fiesta
    candle.forEach(seg => burstEat(seg));
    candle = [];
    AudioEngine.playWin();

    // Ráfaga de confeti continuo
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        if (window.confettiBurst) window.confettiBurst();
      }, i * 200);
    }

    // Mostrar modal de ¡FELICES 29!
    setTimeout(() => {
      WINMODAL?.classList.remove('hidden');
    }, 600);
  }

  const KEYMAP = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 }
  };

  window.addEventListener('keydown', (e) => {
    const nd = KEYMAP[e.key] || KEYMAP[e.key.toLowerCase?.()];
    if (!nd) return;
    if (nd.x === -dir.x && nd.y === -dir.y) return;
    nextDir = nd;
    if (!started) {
      started = true;
      AudioEngine.startBgm();
    }
    e.preventDefault();
  });

  RESTARTBTN?.addEventListener('click', () => {
    resetGame();
    started = true;
  });

  WINRESTARTBTN?.addEventListener('click', () => {
    resetGame();
    started = true;
  });

  function tick() {
    dir = nextDir;
    const head = candle[0];
    if (!head) return;
    const nh = { x: head.x + dir.x, y: head.y + dir.y };

    if (nh.x < 0 || nh.x >= COLS || nh.y < 0 || nh.y >= ROWS || candle.some(s => s.x === nh.x && s.y === nh.y)) {
      alive = false;
      AudioEngine.playDead();
      burstDead(head);
      setTimeout(resetGame, 1200);
      return;
    }

    candle.unshift(nh);
    const fi = flames.findIndex(f => f.x === nh.x && f.y === nh.y);
    if (fi >= 0) {
      flames.splice(fi, 1);
      score++;
      AudioEngine.playEat();
      updateScore();

      if (score >= TARGET_SCORE) {
        handleWin();
        return;
      }

      spawnFlame();
      burstEat(nh);
    } else {
      candle.pop();
    }
  }

  function burstEat(cell) {
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: cell.x * CELL + CELL / 2, y: cell.y * CELL + CELL / 2,
        vx: (Math.random() - 0.5) * 110, vy: -Math.random() * 120 - 30,
        life: 1, color: i % 3 === 0 ? C.flameInner : (i % 3 === 1 ? C.flameMid : C.drips)
      });
    }
  }

  function burstDead(cell) {
    for (let i = 0; i < 24; i++) {
      particles.push({
        x: cell.x * CELL + CELL / 2, y: cell.y * CELL + CELL / 2,
        vx: (Math.random() - 0.5) * 180, vy: (Math.random() - 0.5) * 180,
        life: 1, color: i % 2 ? C.candleWax : C.flameOuter
      });
    }
  }

  function px(x, y, w, h, color) {
    CTX.fillStyle = color;
    CTX.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function drawFlame(f, t) {
    const cx = f.x * CELL + CELL / 2;
    const cy = f.y * CELL + CELL / 2;
    const wob = Math.sin(t * 0.006 + f.born * 0.01) * 1.6;
    px(cx - 2, cy + 2, 4, 3, C.wick);
    px(cx - 4 + wob, cy - 6, 8, 9, C.flameOuter);
    px(cx - 3 + wob, cy - 4, 6, 6, C.flameMid);
    px(cx - 1 + wob, cy - 2, 2, 3, C.flameInner);
  }

  function drawCandleSegment(x, y, i, t) {
    const bx = x * CELL, by = y * CELL;
    const isHead = i === 0;

    px(bx + 1, by + 1, CELL - 2, CELL - 2, C.candleWax);
    px(bx + CELL - 5, by + 1, 4, CELL - 2, C.candleShade);
    px(bx + 1, by + CELL - 4, CELL - 2, 3, C.candleDark);

    if (isHead) {
      const blink = (t % 3800) < 90;
      if (!blink) {
        px(bx + 4, by + 5, 3, 4, '#212121');
        px(bx + CELL - 8, by + 5, 3, 4, '#212121');
      } else {
        px(bx + 4, by + 8, 3, 1, '#212121');
        px(bx + CELL - 8, by + 8, 3, 1, '#212121');
      }
      px(bx + 3, by + CELL - 6, 3, 2, '#ffab91');
      px(bx + CELL - 7, by + CELL - 6, 3, 2, '#ffab91');
      const wob = Math.sin(t * 0.02) * 1.4;
      px(bx + CELL / 2 - 1, by - 8 + wob, 2, 3, C.wick);
      px(bx + CELL / 2 - 3 + wob, by - 15 + wob, 6, 7, C.flameOuter);
      px(bx + CELL / 2 - 2 + wob, by - 13 + wob, 4, 5, C.flameMid);
      px(bx + CELL / 2 - 1, by - 11 + wob, 2, 2, C.flameInner);
    }
  }

  function drawGrid() {
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        px(col * CELL, r * CELL, CELL, CELL, (r + col) % 2 ? C.gridA : C.gridB);
      }
    }
  }

  function drawParticles(dt) {
    particles = particles.filter(p => p.life > 0);
    for (const p of particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt * 1.9;
      CTX.globalAlpha = Math.max(0, p.life);
      px(p.x - 2, p.y - 2, 5, 5, p.color);
    }
    CTX.globalAlpha = 1;
  }

  function render(now) {
    const dt = Math.min((now - (render.last || now)) / 1000, 0.05);
    render.last = now;

    drawGrid();
    for (const f of flames) drawFlame(f, now);
    for (let i = candle.length - 1; i >= 0; i--) drawCandleSegment(candle[i].x, candle[i].y, i, now);

    if (!started) {
      CTX.fillStyle = 'rgba(0,0,0,0.55)';
      CTX.fillRect(0, CV.height / 2 - 46, CV.width, 92);
      CTX.font = '15px "Press Start 2P", monospace';
      CTX.fillStyle = '#ffd54f';
      CTX.textAlign = 'center';
      CTX.fillText('PULSA UNA FLECHA PARA JUGAR', CV.width / 2, CV.height / 2 + 5);
    }
    if (!alive) {
      CTX.fillStyle = 'rgba(0,0,0,0.65)';
      CTX.fillRect(0, CV.height / 2 - 40, CV.width, 80);
      CTX.font = '18px "Press Start 2P", monospace';
      CTX.fillStyle = '#ff6d00';
      CTX.textAlign = 'center';
      CTX.fillText('¡GAME OVER!', CV.width / 2, CV.height / 2 + 6);
    }

    drawParticles(dt);

    if (alive && started && now - lastTick >= TICK_MS) {
      lastTick = now;
      tick();
    }
    rafId = requestAnimationFrame(render);
  }

  const gameObs = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (en.isIntersecting) { lastTick = performance.now(); rafId = requestAnimationFrame(render); }
    });
  }, { threshold: 0.15 });
  gameObs.observe(CV);

  resetGame();
  rafId = requestAnimationFrame(render);
}

/* ================= CONFETI DEL HERO ================= */
const HC = document.getElementById('hero-confetti');
if (HC) {
  const HCTX = HC.getContext('2d');
  let heroBits = [];

  function heroConfettiInit() {
    HC.width = HC.clientWidth;
    HC.height = HC.clientHeight;
    heroBits = Array.from({ length: 90 }, () => ({
      x: Math.random() * HC.width,
      y: Math.random() * -HC.height,
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 9,
      vy: 55 + Math.random() * 95,
      vx: (Math.random() - 0.5) * 32,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 4,
      color: ['#ffd54f', '#ff8a65', '#f48fb1', '#4dd0e1', '#ba68c8'][(Math.random() * 5) | 0]
    }));
  }

  function heroConfettiLoop() {
    HCTX.clearRect(0, 0, HC.width, HC.height);
    for (const b of heroBits) {
      b.y += b.vy / 60; b.x += b.vx / 60; b.rot += b.vr / 60;
      if (b.y > HC.height + 30) { b.y = -25; b.x = Math.random() * HC.width; }
      HCTX.save();
      HCTX.translate(b.x, b.y);
      HCTX.rotate(b.rot);
      HCTX.fillStyle = b.color;
      HCTX.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      HCTX.restore();
    }
    requestAnimationFrame(heroConfettiLoop);
  }

  window.confettiBurst = function () {
    for (let i = 0; i < 40; i++) {
      heroBits.push({
        x: Math.random() * (HC.width || window.innerWidth),
        y: (HC.height || window.innerHeight) + 20,
        w: 7 + Math.random() * 8,
        h: 9 + Math.random() * 10,
        vy: -200 - Math.random() * 300,
        vx: (Math.random() - 0.5) * 220,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
        color: ['#ffd54f', '#ff8a65', '#f48fb1', '#4dd0e1', '#ba68c8', '#ffd700'][(Math.random() * 6) | 0]
      });
    }
  };

  heroConfettiInit();
  requestAnimationFrame(heroConfettiLoop);
  window.addEventListener('resize', heroConfettiInit);
}

/* ================= PASTEL 3D INTERACTIVO (Three.js) ================= */
(function buildCake() {
  const holder = document.getElementById('cake-3d');
  if (!holder || !window.THREE) return;

  const W = holder.clientWidth, H = holder.clientHeight;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
  camera.position.set(0, 2.4, 8.2);
  camera.lookAt(0, 1.4, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  holder.appendChild(renderer.domElement);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  // ---- Iluminación ----
  scene.add(new THREE.AmbientLight(0xfff5eb, 0.45));

  const hemi = new THREE.HemisphereLight(0xfff0d8, 0x3a0a3a, 0.5);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfffffc, 1.7);
  key.position.set(6, 10, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const warm = new THREE.PointLight(0xffa840, 1.8, 24, 2);
  warm.position.set(-5, 5, -5);
  scene.add(warm);

  const cakeGroup = new THREE.Group();
  scene.add(cakeGroup);

  // Paletas de color para glaseado
  const PALETTES = [
    { side: 0xf48fb1, top: 0xfff8f2, name: 'Rosa & Crema' },
    { side: 0x3d1f11, top: 0xffecb3, name: 'Chocolate Elegante' },
    { side: 0x80cbc4, top: 0xfff0f5, name: 'Pastel Menta & Fresa' }
  ];
  let currentPaletteIdx = 0;

  const frostMaterials = [];

  function createFrostMat(color, opts = {}) {
    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: opts.roughness ?? 0.28,
      clearcoat: opts.clearcoat ?? 0.95,
      clearcoatRoughness: opts.clearcoatRoughness ?? 0.15,
      sheen: opts.sheen ?? 0.7,
      sheenColor: opts.sheenColor ?? 0xffffff,
      ior: 1.33,
    });
    frostMaterials.push(mat);
    return mat;
  }

  function createTier(radius, height, yPos, sideColor, topColor, tierIndex) {
    const g = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(radius, radius, height, 80);
    const bodyMat = createFrostMat(sideColor);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = yPos;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const topGeo = new THREE.CylinderGeometry(radius * 1.02, radius * 0.99, height * 0.15, 80, 4, true);
    const topMat = createFrostMat(topColor, { clearcoat: 1.0, clearcoatRoughness: 0.08 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = yPos + height / 2 + height * 0.05;
    top.castShadow = true;
    g.add(top);

    // Gotas
    const dripCount = Math.max(12, Math.round(radius * 8));
    for (let i = 0; i < dripCount; i++) {
      const a = (i / dripCount) * Math.PI * 2;
      const seed = (i * 2654435761 + tierIndex * 9781) % 997;
      const len = 0.12 + (seed / 997) * 0.22;
      const thickness = 0.07 + (seed % 13) / 13 * 0.04;
      const drip = new THREE.Mesh(new THREE.SphereGeometry(thickness, 14, 16), topMat);
      drip.scale.set(1, 1 + len / 0.1, 1);
      drip.position.set(Math.cos(a) * radius * 1.01, yPos + height / 2 - len * 0.4, Math.sin(a) * radius * 1.01);
      drip.rotation.x = Math.PI / 2;
      g.add(drip);
    }
    return g;
  }

  cakeGroup.add(createTier(2.2, 1.4, 0.7, PALETTES[0].side, PALETTES[0].top, 0));
  cakeGroup.add(createTier(1.55, 1.15, 1.95, 0xba68c8, 0xfff0f5, 1));
  cakeGroup.add(createTier(0.9, 1.0, 3.0, 0xffd54f, 0xfffffc, 2));

  // Velas interactivas
  const candles = [];
  let candlesLit = true;
  const candleGroup = new THREE.Group();

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const cn = new THREE.Group();

    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.65, 12), new THREE.MeshStandardMaterial({ color: 0xfbe9e7 }));
    stick.position.y = 0.3;
    cn.add(stick);

    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6), new THREE.MeshStandardMaterial({ color: 0x3e2723 }));
    wick.position.y = 0.65;
    cn.add(wick);

    const flameGeo = new THREE.ConeGeometry(0.055, 0.18, 12);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.9 });
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.y = 0.76;
    flame.rotation.x = Math.PI;
    cn.add(flame);

    const candleLight = new THREE.PointLight(0xffb300, 0.6, 3, 2);
    candleLight.position.set(0, 0.76, 0);
    cn.add(candleLight);

    cn.userData = { flame, flameMat, candleLight, baseScale: flame.scale.y, phase: i * 1.7, isLit: true };
    cn.position.set(Math.cos(a) * 0.48, 3.50, Math.sin(a) * 0.48);
    candleGroup.add(cn);
    candles.push(cn);
  }
  cakeGroup.add(candleGroup);

  // Plato
  const plateBase = new THREE.Mesh(
    new THREE.CylinderGeometry(2.9, 3.05, 0.18, 80),
    new THREE.MeshPhysicalMaterial({ color: 0xe8edf0, roughness: 0.05, metalness: 0.95 })
  );
  plateBase.position.y = -0.01;
  cakeGroup.add(plateBase);

  // Partículas mágicas
  const sparkMats = [new THREE.MeshBasicMaterial({ color: 0xffff80, transparent: true, opacity: 0.9 })];
  const sparkGeos = [new THREE.TetrahedronGeometry(0.05)];
  const sparks = [];
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(sparkGeos[0], sparkMats[0]);
    m.userData = { ang: Math.random() * Math.PI * 2, radius: 2.6 + Math.random() * 2, y0: 0.3 + Math.random() * 3.5, speed: 0.4 + Math.random() * 0.6 };
    scene.add(m);
    sparks.push(m);
  }

  // ---- Control Orbit del Mouse / Touch ----
  let isDragging = false;
  let previousMousePos = { x: 0, y: 0 };
  let targetRotY = 0;
  let targetRotX = 0;

  holder.addEventListener('pointerdown', (e) => {
    isDragging = true;
    previousMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePos.x;
    const deltaY = e.clientY - previousMousePos.y;
    targetRotY += deltaX * 0.008;
    targetRotX += deltaY * 0.004;
    targetRotX = Math.max(-0.4, Math.min(0.6, targetRotX));
    previousMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('pointerup', () => { isDragging = false; });

  // Acciones de Velas (Soplar / Encender)
  const btnBlow = document.getElementById('btn-blow-candles');
  const btnRelight = document.getElementById('btn-relight-candles');
  const wishBanner = document.getElementById('wish-banner');
  const btnPalette = document.getElementById('btn-cake-palette');

  function blowCandles() {
    if (!candlesLit) return;
    candlesLit = false;
    AudioEngine.playBlow();
    AudioEngine.playWin();

    candles.forEach(cn => {
      cn.userData.isLit = false;
      cn.userData.flame.visible = false;
      cn.userData.candleLight.intensity = 0;
    });

    btnBlow?.classList.add('hidden');
    btnRelight?.classList.remove('hidden');
    wishBanner?.classList.remove('hidden');

    // Confeti gigante
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        if (window.confettiBurst) window.confettiBurst();
      }, i * 200);
    }
  }

  function relightCandles() {
    candlesLit = true;
    AudioEngine.playPop();
    candles.forEach(cn => {
      cn.userData.isLit = true;
      cn.userData.flame.visible = true;
      cn.userData.candleLight.intensity = 0.6;
    });

    btnBlow?.classList.remove('hidden');
    btnRelight?.classList.add('hidden');
    wishBanner?.classList.add('hidden');
  }

  btnBlow?.addEventListener('click', blowCandles);
  btnRelight?.addEventListener('click', relightCandles);

  btnPalette?.addEventListener('click', () => {
    currentPaletteIdx = (currentPaletteIdx + 1) % PALETTES.length;
    const pal = PALETTES[currentPaletteIdx];
    if (frostMaterials[0]) frostMaterials[0].color.setHex(pal.side);
    if (frostMaterials[1]) frostMaterials[1].color.setHex(pal.top);
    AudioEngine.playPop();
  });

  // Haz click en el pastel para soplar
  holder.addEventListener('click', (e) => {
    if (!isDragging && candlesLit) blowCandles();
  });

  // Animación 3D
  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.1 }).observe(holder);

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();

    if (!isDragging) {
      targetRotY += 0.005; // auto-rotación suave
    }

    cakeGroup.rotation.y += (targetRotY - cakeGroup.rotation.y) * 0.1;
    cakeGroup.rotation.x += (targetRotX - cakeGroup.rotation.x) * 0.1;
    cakeGroup.position.y = Math.sin(t * 0.9) * 0.06;

    // Velas
    candles.forEach(cn => {
      const d = cn.userData;
      if (d.isLit) {
        const flicker = Math.sin(t * 12 + d.phase) * 0.18;
        d.flame.scale.set(0.7 * (1 + flicker * 0.5), d.baseScale * (1 + flicker), 0.7 * (1 + flicker * 0.5));
        d.flameMat.opacity = 0.85 + flicker * 0.1;
      }
    });

    // Sparkles
    sparks.forEach(m => {
      const d = m.userData;
      const ang = d.ang + t * d.speed * 0.25;
      m.position.set(Math.cos(ang) * d.radius, d.y0 + Math.sin(t * 1.2) * 0.3, Math.sin(ang) * d.radius);
    });

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    const w2 = holder.clientWidth, h2 = holder.clientHeight;
    camera.aspect = w2 / h2; camera.updateProjectionMatrix();
    renderer.setSize(w2, h2);
  });
})();

/* ================= ROMPECABEZAS CON PIEZAS JIGSAW (Tabs & Sockets) ================= */
(function buildPuzzle() {
  const PC = document.getElementById('puzzle-canvas');
  if (!PC) return;
  const PCTX = PC.getContext('2d');

  const COLS = 4, ROWS = 3, N = COLS * ROWS;
  const SNAP_DIST = 28;
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  let pieces = [];
  let state = 'assembled'; // assembled | scattered | solved
  let dragP = null;
  let dragOff = { dx: 0, dy: 0 };
  let solvedAt = 0;
  let isPreviewing = false;
  let tabMatrix = []; // matriz de bordes con solapas jigsaw
  let imgBitmap = null;
  let currentTheme = 'carta';

  const PW = () => PC.width / COLS;
  const PH = () => PC.height / ROWS;

  // ---- Generador de Matriz de Encajes Jigsaw (Solapas/Pestañas) ----
  function generateTabMatrix() {
    tabMatrix = [];
    for (let r = 0; r < ROWS; r++) {
      tabMatrix[r] = [];
      for (let c = 0; c < COLS; c++) {
        tabMatrix[r][c] = {
          top: r === 0 ? 0 : -tabMatrix[r - 1][c].bottom,
          left: c === 0 ? 0 : -tabMatrix[r][c - 1].right,
          right: c === COLS - 1 ? 0 : (Math.random() < 0.5 ? 1 : -1),
          bottom: r === ROWS - 1 ? 0 : (Math.random() < 0.5 ? 1 : -1)
        };
      }
    }
  }

  // ---- Generador de Diseños de Carta para la Imagen del Puzzle ----
  function generatePuzzleImage(theme) {
    const off = document.createElement('canvas');
    off.width = PC.width;
    off.height = PC.height;
    const octx = off.getContext('2d');

    const name = NameManager.getName();

    if (theme === 'flores') {
      // Fondo Jardín Floral
      const grad = octx.createLinearGradient(0, 0, off.width, off.height);
      grad.addColorStop(0, '#fce4ec'); grad.addColorStop(1, '#f8bbd0');
      octx.fillStyle = grad; octx.fillRect(0, 0, off.width, off.height);

      // Marco dorado
      octx.strokeStyle = '#d4af37'; octx.lineWidth = 10;
      octx.strokeRect(10, 10, off.width - 20, off.height - 20);

      // Texto
      octx.fillStyle = '#880e4f';
      octx.font = 'bold 24px "Dancing Script", cursive';
      octx.textAlign = 'center';
      octx.fillText(`¡Para la mejor Tía, ${name}! 🌸`, off.width / 2, 70);
      octx.font = '15px "Poppins", sans-serif';
      octx.fillText('Que la vida te llene de momentos tan hermosos', off.width / 2, 140);
      octx.fillText('y florecientes como tú. ❤️', off.width / 2, 175);
    } else if (theme === 'fiesta') {
      // Fondo Fiesta
      const grad = octx.createLinearGradient(0, 0, off.width, off.height);
      grad.addColorStop(0, '#1a237e'); grad.addColorStop(1, '#4a148c');
      octx.fillStyle = grad; octx.fillRect(0, 0, off.width, off.height);

      // Globos y Confeti
      const colors = ['#ffd54f', '#ff8a65', '#f48fb1', '#4dd0e1'];
      for (let i = 0; i < 25; i++) {
        octx.fillStyle = colors[i % colors.length];
        octx.beginPath();
        octx.arc(Math.random() * off.width, Math.random() * off.height, 6 + Math.random() * 12, 0, Math.PI * 2);
        octx.fill();
      }

      octx.fillStyle = '#ffd54f';
      octx.font = 'bold 26px "Dancing Script", cursive';
      octx.textAlign = 'center';
      octx.fillText(`🎉 ¡Felicidades ${name}! 🎉`, off.width / 2, off.height / 2 - 10);
      octx.font = '14px "Poppins", sans-serif';
      octx.fillStyle = '#fff';
      octx.fillText('¡A celebrar en grande este super día!', off.width / 2, off.height / 2 + 35);
    } else {
      // Theme default: Carta Dorada Elegante
      const grad = octx.createLinearGradient(0, 0, off.width, off.height);
      grad.addColorStop(0, '#fffdf5'); grad.addColorStop(1, '#fff8e1');
      octx.fillStyle = grad; octx.fillRect(0, 0, off.width, off.height);

      // Marco dorado doble
      octx.strokeStyle = '#ffd700'; octx.lineWidth = 4;
      octx.strokeRect(8, 8, off.width - 16, off.height - 16);
      octx.strokeStyle = '#ffb300'; octx.lineWidth = 1.5;
      octx.strokeRect(14, 14, off.width - 28, off.height - 28);

      octx.fillStyle = '#4a148c';
      octx.font = 'bold 26px "Dancing Script", cursive';
      octx.textAlign = 'center';
      octx.fillText(`Querida ${name} ❤️`, off.width / 2, 65);

      octx.fillStyle = '#3e2723';
      octx.font = '14px "Poppins", sans-serif';
      octx.fillText('Tu alegría ilumina nuestras vidas.', off.width / 2, 130);
      octx.fillText('Arma este rompecabezas para ver tu sorpresa...', off.width / 2, 165);

      // Sello de lacre en la imagen
      octx.fillStyle = '#d32f2f';
      octx.beginPath(); octx.arc(off.width / 2, 235, 28, 0, Math.PI * 2); octx.fill();
      octx.fillStyle = '#fff';
      octx.font = 'bold 12px "Poppins", sans-serif';
      octx.fillText('AMOR', off.width / 2, 240);
    }

    imgBitmap = off;
  }

  // Notificar cuando el nombre cambie
  window.onNameChanged = function () {
    generatePuzzleImage(currentTheme);
    render(performance.now());
  };

  // ---- Trazador de Contornos Jigsaw (Bezier Tabs) ----
  function pathJigsawPiece(ctx, x, y, w, h, tabs) {
    const tabSize = Math.min(w, h) * 0.22;
    ctx.beginPath();
    ctx.moveTo(x, y);

    // Borde Superior
    if (tabs.top === 0) {
      ctx.lineTo(x + w, y);
    } else {
      const dir = tabs.top;
      ctx.lineTo(x + w * 0.35, y);
      ctx.bezierCurveTo(x + w * 0.35, y - tabSize * dir, x + w * 0.65, y - tabSize * dir, x + w * 0.65, y);
      ctx.lineTo(x + w, y);
    }

    // Borde Derecho
    if (tabs.right === 0) {
      ctx.lineTo(x + w, y + h);
    } else {
      const dir = tabs.right;
      ctx.lineTo(x + w, y + h * 0.35);
      ctx.bezierCurveTo(x + w + tabSize * dir, y + h * 0.35, x + w + tabSize * dir, y + h * 0.65, x + w, y + h * 0.65);
      ctx.lineTo(x + w, y + h);
    }

    // Borde Inferior
    if (tabs.bottom === 0) {
      ctx.lineTo(x, y + h);
    } else {
      const dir = tabs.bottom;
      ctx.lineTo(x + w * 0.65, y + h);
      ctx.bezierCurveTo(x + w * 0.65, y + h + tabSize * dir, x + w * 0.35, y + h + tabSize * dir, x + w * 0.35, y + h);
      ctx.lineTo(x, y + h);
    }

    // Borde Izquierdo
    if (tabs.left === 0) {
      ctx.lineTo(x, y);
    } else {
      const dir = tabs.left;
      ctx.lineTo(x, y + h * 0.65);
      ctx.bezierCurveTo(x - tabSize * dir, y + h * 0.65, x - tabSize * dir, y + h * 0.35, x, y + h * 0.35);
      ctx.lineTo(x, y);
    }

    ctx.closePath();
  }

  function initPieces() {
    generateTabMatrix();
    generatePuzzleImage(currentTheme);
    pieces = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        pieces.push({
          r, c,
          x: c * PW(), y: r * PH(),
          sx: 0, sy: 0, tx: 0, ty: 0,
          animT: 1,
          lock: true,
          tabs: tabMatrix[r][c]
        });
      }
    }
    updateProgress();
  }

  function scatterAnimated() {
    for (const p of pieces) {
      const x = Math.random() * (PC.width - PW() * 0.9);
      const y = Math.random() * (PC.height - PH() * 0.9);
      p.sx = p.x; p.sy = p.y;
      p.tx = x; p.ty = y;
      p.animT = 0;
      p.lock = false;
    }
    updateProgress();
  }

  function updateProgress() {
    const locked = pieces.filter(p => p.lock).length;
    const pct = Math.round((locked / N) * 100);
    const bar = document.getElementById('puzzle-progress-bar');
    const txt = document.getElementById('puzzle-progress-text');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `Progreso: ${locked} / ${N} piezas (${pct}%)`;
  }

  function drawPiece(p) {
    const pw = PW(), ph = PH();
    PCTX.save();

    // Dibujar sombra si se arrastra
    if (p === dragP) {
      PCTX.shadowColor = 'rgba(0,0,0,0.5)';
      PCTX.shadowBlur = 14;
      PCTX.shadowOffsetX = 3;
      PCTX.shadowOffsetY = 6;
    }

    pathJigsawPiece(PCTX, p.x, p.y, pw, ph, p.tabs);
    PCTX.clip();

    // Dibujar trozo correspondiente de la imagen bitmap
    PCTX.drawImage(imgBitmap, p.c * pw, p.r * ph, pw, ph, p.x, p.y, pw, ph);

    // Trazo de borde de la pieza
    PCTX.strokeStyle = p.lock ? 'rgba(255,213,79,0.3)' : (p === dragP ? '#ffd54f' : 'rgba(0,0,0,0.4)');
    PCTX.lineWidth = p === dragP ? 2.5 : 1.2;
    pathJigsawPiece(PCTX, p.x, p.y, pw, ph, p.tabs);
    PCTX.stroke();

    PCTX.restore();
  }

  function render(t) {
    PCTX.clearRect(0, 0, PC.width, PC.height);

    // Animación de dispersión
    for (const p of pieces) {
      if (p.animT < 1) {
        p.animT = Math.min(p.animT + 0.04, 1);
        const e = easeOut(p.animT);
        p.x = p.sx + (p.tx - p.sx) * e;
        p.y = p.sy + (p.ty - p.sy) * e;
      }
    }

    if (isPreviewing) {
      PCTX.globalAlpha = 0.9;
      PCTX.drawImage(imgBitmap, 0, 0);
      PCTX.globalAlpha = 1;
      requestAnimationFrame(render);
      return;
    }

    if (state === 'assembled') {
      PCTX.drawImage(imgBitmap, 0, 0);
      // Sello "CLICK PARA EMPEZAR"
      const pulse = 1 + Math.sin(t * 0.004) * 0.06;
      PCTX.save();
      PCTX.translate(PC.width / 2, PC.height / 2);
      PCTX.scale(pulse, pulse);
      PCTX.fillStyle = '#d32f2f';
      PCTX.beginPath(); PCTX.arc(0, 0, 48, 0, Math.PI * 2); PCTX.fill();
      PCTX.strokeStyle = '#fff'; PCTX.lineWidth = 2.5;
      PCTX.beginPath(); PCTX.arc(0, 0, 54, 0, Math.PI * 2); PCTX.stroke();
      PCTX.fillStyle = '#fff';
      PCTX.font = 'bold 15px "Poppins", sans-serif';
      PCTX.textAlign = 'center'; PCTX.textBaseline = 'middle';
      PCTX.fillText('¡DESARMAR!', 0, 0);
      PCTX.restore();
    } else {
      // Fondo fantasma suave
      PCTX.globalAlpha = 0.18;
      PCTX.drawImage(imgBitmap, 0, 0);
      PCTX.globalAlpha = 1;

      // Piezas colocadas y luego en movimiento
      for (const p of pieces) {
        if (p !== dragP) drawPiece(p);
      }
      if (dragP) drawPiece(dragP);
    }

    requestAnimationFrame(render);
  }

  function evPos(e) {
    const r = PC.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (PC.width / r.width),
      y: (e.clientY - r.top) * (PC.height / r.height),
    };
  }

  function onDown(e) {
    if (state === 'solved' || isPreviewing) return;
    const { x, y } = evPos(e);

    if (state === 'assembled') {
      state = 'scattered';
      AudioEngine.playPop();
      scatterAnimated();
      return;
    }

    const tabBuf = Math.min(PW(), PH()) * 0.25;
    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      if (p.lock) continue;
      // Hitbox extendido con buffer para incluir solapas jigsaw
      if (x >= p.x - tabBuf && x <= p.x + PW() + tabBuf && y >= p.y - tabBuf && y <= p.y + PH() + tabBuf) {
        dragP = p;
        dragOff = { dx: x - p.x, dy: y - p.y };
        pieces.splice(pieces.indexOf(p), 1);
        pieces.push(p);
        p.animT = 1;
        AudioEngine.playPop();
        PC.setPointerCapture?.(e.pointerId);
        return;
      }
    }
  }

  function onMove(e) {
    if (!dragP) return;
    const { x, y } = evPos(e);
    const nx = x - dragOff.dx;
    const ny = y - dragOff.dy;
    // Limitar posición para evitar que la pieza se pierda fuera del canvas
    dragP.x = Math.max(-PW() * 0.25, Math.min(PC.width - PW() * 0.75, nx));
    dragP.y = Math.max(-PH() * 0.25, Math.min(PC.height - PH() * 0.75, ny));
    dragP.animT = 1;
  }

  function onUp(e) {
    if (!dragP) return;
    const targetX = dragP.c * PW();
    const targetY = dragP.r * PH();
    const dist = Math.hypot(dragP.x - targetX, dragP.y - targetY);

    if (dist < SNAP_DIST) {
      dragP.x = targetX; dragP.y = targetY;
      dragP.lock = true;
      AudioEngine.playSnap();
      updateProgress();
    }
    dragP = null;

    if (pieces.every(p => p.lock)) {
      state = 'solved';
      AudioEngine.playWin();
      setTimeout(openLetterOverlay, 600);
    }
    PC.releasePointerCapture?.(e.pointerId);
  }

  PC.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // Botones de la barra de herramientas del Rompecabezas
  const selectTheme = document.getElementById('puzzle-theme-select');
  const btnPreview = document.getElementById('btn-puzzle-preview');
  const btnShuffle = document.getElementById('btn-puzzle-shuffle');
  const btnHint = document.getElementById('btn-puzzle-hint');
  const fileInput = document.getElementById('puzzle-file-input');

  selectTheme?.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      fileInput?.click();
    } else {
      currentTheme = val;
      state = 'assembled';
      initPieces();
    }
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
      const img = new Image();
      img.onload = function () {
        const off = document.createElement('canvas');
        off.width = PC.width; off.height = PC.height;
        const octx = off.getContext('2d');
        octx.drawImage(img, 0, 0, PC.width, PC.height);
        imgBitmap = off;
        state = 'assembled';
        initPieces();
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  btnPreview?.addEventListener('pointerdown', () => { isPreviewing = true; });
  window.addEventListener('pointerup', () => { isPreviewing = false; });

  btnShuffle?.addEventListener('click', () => {
    if (state === 'solved') state = 'scattered';
    AudioEngine.playPop();
    scatterAnimated();
  });

  btnHint?.addEventListener('click', () => {
    const unlocked = pieces.filter(p => !p.lock);
    if (!unlocked.length) return;
    const p = unlocked[0];
    p.sx = p.x; p.sy = p.y;
    p.tx = p.c * PW(); p.ty = p.r * PH();
    p.animT = 0;
    p.lock = true;
    AudioEngine.playSnap();
    updateProgress();
    if (pieces.every(p => p.lock)) {
      state = 'solved';
      AudioEngine.playWin();
      setTimeout(openLetterOverlay, 600);
    }
  });

  function openLetterOverlay() {
    const overlay = document.getElementById('letter-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden', 'closing');
  }

  const closeBtn = document.getElementById('close-letter');
  closeBtn?.addEventListener('click', () => {
    const overlay = document.getElementById('letter-overlay');
    if (overlay) overlay.classList.add('closing');
    setTimeout(() => overlay?.classList.add('hidden'), 400);
  });

  const shareBtn = document.getElementById('btn-share-letter');
  shareBtn?.addEventListener('click', () => {
    AudioEngine.playWin();
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (window.confettiBurst) window.confettiBurst();
      }, i * 180);
    }
  });

  initPieces();
  requestAnimationFrame(render);
})();
