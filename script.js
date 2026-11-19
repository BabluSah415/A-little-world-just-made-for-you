(function () {
  'use strict';

  var SECRET_CODE = '0612';
  var TOTAL_PAGES = 10;

  var BALLOONS = [
    { id: 0, from: '#FFA6C3', to: '#F05B8A', bg: '#FFF2F6', border: '#FAC8D8', msg: 'You are so special! ♡' },
    { id: 1, from: '#D6C2FB', to: '#A78BFA', bg: '#F7F3FF', border: '#DED2FA', msg: 'You deserve all the happiness in the world! ✨' },
    { id: 2, from: '#FFD0A6', to: '#FA8C68', bg: '#FFF6EF', border: '#FCD7BF', msg: 'Keep smiling, Sunshine! 🌸' },
    { id: 3, from: '#AEEAE0', to: '#5CC3B3', bg: '#EFFCF9', border: '#BFECE3', msg: 'You make everything more beautiful! 💗' }
  ];

  var PHOTOS = [
    { base: 'assets/photo1', tape: 'rgba(205, 189, 242, 0.85)', rot: -2.5, caption: 'A beautiful smile ♡' },
    { base: 'assets/photo2', tape: 'rgba(248, 189, 208, 0.85)', rot: 2.0, caption: 'A moment to remember ✨' },
    { base: 'assets/photo3', tape: 'rgba(185, 230, 219, 0.85)', rot: -1.8, caption: 'Forever a special memory 🌷' }
  ];

  var state = {
    page: 1,
    envelopeOpened: false,
    cakeCut: false,
    wishMade: false,
    popped: [false, false, false, false],
    photoIdx: 0,
    seenLastPhoto: false,
    musicPlaying: false,
    musicMuted: false
  };

  var audioEl = document.getElementById('birthday-audio');
  var stageEl = document.getElementById('story-stage');
  var dotsEl = document.getElementById('progress-dots');
  var confettiEl = document.getElementById('confetti-layer');
  var audioCtx = null;
  var timers = [];

  function haptic(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern || 12); } catch (e) {}
    }
  }

  function getCtx() {
    if (!audioCtx) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) audioCtx = new Ctor();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(function () {});
    }
    return audioCtx;
  }

  function playClickSfx() {
    haptic(12);
    var ctx = getCtx();
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.06);
      g.gain.setValueAtTime(0.05, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.09);
    } catch (e) {}
  }

  function playSparkleSfx() {
    haptic([15, 25, 20]);
    var ctx = getCtx();
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        var t = now + i * 0.07;
        osc.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.08, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.36);
      });
    } catch (e) {}
  }

  function playPopSfx() {
    haptic([22, 18, 12]);
    var ctx = getCtx();
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      var len = Math.floor(ctx.sampleRate * 0.09);
      var buf = ctx.createBuffer(1, len, ctx.sampleRate);
      var ch = buf.getChannelData(0);
      for (var i = 0; i < len; i++) {
        ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18));
      }
      var src = ctx.createBufferSource();
      src.buffer = buf;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.35, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      src.connect(g); g.connect(ctx.destination);
      src.start(now);
    } catch (e) {}
  }

  function renderConfetti(active) {
    confettiEl.innerHTML = '';
    if (!active) return;
    var colors = ['#FF79A6', '#FFD166', '#A88BEB', '#7CD4C4', '#FF9E80'];
    for (var i = 0; i < 24; i++) {
      var s = document.createElement('span');
      s.className = 'confetti-piece';
      s.style.left = ((i * 37) % 94 + 3) + '%';
      s.style.width = (6 + (i % 4) * 2) + 'px';
      s.style.height = (6 + (i % 4) * 2) + 'px';
      s.style.backgroundColor = colors[i % colors.length];
      s.style.borderRadius = i % 2 === 0 ? '9999px' : '2px';
      s.style.animationDelay = ((i % 8) * 0.14) + 's';
      s.style.animationDuration = (2.1 + (i % 4) * 0.35) + 's';
      confettiEl.appendChild(s);
    }
  }

  function updateMusicUI() {
    var eq = document.getElementById('music-eq');
    var note = document.getElementById('music-note-icon');
    var label = document.getElementById('music-label');
    if (state.musicPlaying && !state.musicMuted) {
      eq.classList.remove('hidden');
      note.classList.add('hidden');
      label.textContent = 'Playing';
    } else {
      eq.classList.add('hidden');
      note.classList.remove('hidden');
      label.textContent = 'Music';
    }
  }

  function startMusic() {
    if (!audioEl) return;
    try {
      audioEl.muted = state.musicMuted;
      audioEl.volume = 0.65;
      var p = audioEl.play();
      if (p && p.then) {
        p.then(function () {
          state.musicPlaying = true;
          updateMusicUI();
        }).catch(function () {});
      } else {
        state.musicPlaying = true;
        updateMusicUI();
      }
    } catch (e) {}
  }

  function goToPage(num) {
    state.page = num;
    stageEl.className = 'story-stage theme-page-' + num;
    stageEl.setAttribute('data-page', String(num));

    var sections = document.querySelectorAll('.story-page');
    sections.forEach(function (sec) {
      var p = Number(sec.getAttribute('data-page-section'));
      sec.classList.toggle('active', p === num);
    });

    dotsEl.innerHTML = '';
    dotsEl.setAttribute('aria-label', 'Page ' + num + ' of ' + TOTAL_PAGES);
    for (var i = 1; i <= TOTAL_PAGES; i++) {
      var dot = document.createElement('span');
      dot.className = 'progress-dot' + (i === num ? ' active' : (i < num ? ' done' : ''));
      dotsEl.appendChild(dot);
    }

    renderConfetti(num === 4 || num === 10 || (num === 5 && state.cakeCut));

    if (num === 9) {
      var paras = document.querySelectorAll('#letter-body p');
      paras.forEach(function (p) { p.classList.remove('revealed'); });
      paras.forEach(function (p, idx) {
        timers.push(setTimeout(function () { p.classList.add('revealed'); }, idx * 200));
      });
    }
  }

  // Page 1 -> 2
  document.getElementById('btn-start-surprise').addEventListener('click', function () {
    playClickSfx();
    goToPage(2);
  });

  // Page 2 -> 3
  document.getElementById('btn-open-envelope').addEventListener('click', function () {
    if (state.envelopeOpened) return;
    state.envelopeOpened = true;
    playSparkleSfx();
    document.getElementById('envelope-stage').classList.add('opened');
    document.getElementById('envelope-btn-text').textContent = 'Opening for Suchita...';
    renderConfetti(true);
    timers.push(setTimeout(function () { goToPage(3); }, 1850));
  });

  // Page 3 Password
  document.getElementById('password-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = document.getElementById('secret-input');
    var errEl = document.getElementById('password-error');
    var boxEl = document.getElementById('password-box');
    if (input.value.trim() !== SECRET_CODE) {
      haptic([20, 40, 20]);
      errEl.textContent = "Oops! That's not the right secret. Try again, Sunshine ♡";
      boxEl.classList.remove('shake');
      void boxEl.offsetWidth;
      boxEl.classList.add('shake');
      return;
    }
    errEl.textContent = '';
    playSparkleSfx();
    startMusic();
    stageEl.classList.add('unlocking');
    document.getElementById('btn-unlock').textContent = 'Unlocking Magic ✨';
    timers.push(setTimeout(function () { goToPage(4); }, 1350));
  });

  // Page 4 -> 5
  document.getElementById('btn-celebrate').addEventListener('click', function () {
    playClickSfx();
    goToPage(5);
  });

  // Page 5 Cake Candles & Cut
  function renderCandles(extinguished) {
    var g = document.getElementById('cake-candles');
    g.innerHTML = '';
    var xs = [102, 122, 158, 178];
    var colors = ['#A78BFA', '#FB7185', '#6EE7B7', '#FBBF24'];
    xs.forEach(function (x, i) {
      var shift = extinguished ? (i < 2 ? -22 : 22) : 0;
      var flame = extinguished
        ? ''
        : '<path d="M' + x + ' 11 C' + (x + 5) + ' 18,' + (x + 5) + ' 28,' + x + ' 29 C' + (x - 5) + ' 28,' + (x - 5) + ' 18,' + x + ' 11 Z" fill="#FF9F1C" style="animation: flameFlicker 0.65s infinite alternate; transform-origin: ' + x + 'px 28px;" />';
      g.innerHTML +=
        '<g style="transform: translateX(' + shift + 'px); transition: transform 650ms ease;">' +
        '<rect x="' + (x - 4) + '" y="34" width="8" height="29" rx="3" fill="#FFFDFB" stroke="#E8DCD4" stroke-width="0.6"/>' +
        '<rect x="' + (x - 4) + '" y="42" width="8" height="5" fill="' + colors[i] + '" opacity="0.85"/>' +
        '<line x1="' + x + '" y1="30" x2="' + x + '" y2="34" stroke="#5A453C" stroke-width="1.5"/>' +
        flame + '</g>';
    });
  }

  function cutCake() {
    if (state.cakeCut) return;
    state.cakeCut = true;
    playSparkleSfx();
    document.getElementById('cake-stage').classList.add('is-cut');
    renderCandles(true);
    renderConfetti(true);
    document.getElementById('cake-title').textContent = 'You did it! 🎉';
    document.getElementById('cake-sub').textContent = 'The candles are out — the sweetest slice is yours!';
    document.getElementById('btn-cut-cake').classList.add('hidden');
    document.getElementById('btn-cake-next').classList.remove('hidden');
  }

  document.getElementById('btn-cut-cake').addEventListener('click', cutCake);
  document.getElementById('btn-cake-next').addEventListener('click', function () {
    playClickSfx();
    goToPage(6);
  });

  // Swipe down across cake
  var cakeStage = document.getElementById('cake-stage');
  var cakeDragStartY = null;
  cakeStage.addEventListener('pointerdown', function (e) { cakeDragStartY = e.clientY; });
  cakeStage.addEventListener('pointermove', function (e) {
    if (cakeDragStartY === null || state.cakeCut) return;
    if (e.clientY - cakeDragStartY > 90) {
      cakeDragStartY = null;
      cutCake();
    }
  });
  cakeStage.addEventListener('pointerup', function () { cakeDragStartY = null; });

  // Page 6 Make a Wish
  document.getElementById('btn-make-wish').addEventListener('click', function () {
    if (state.wishMade) return;
    state.wishMade = true;
    playSparkleSfx();
    document.getElementById('wish-halo').classList.add('burst');
    document.getElementById('wish-title').textContent = 'Your wish is on its way.';
    document.getElementById('wish-sub').textContent = 'Somewhere, a tiny star just said yes ✨';
    document.getElementById('btn-make-wish').textContent = 'Wish Sent ✨';
    renderConfetti(true);
    timers.push(setTimeout(function () { goToPage(7); }, 2000));
  });

  // Page 7 Balloons
  function renderBalloons() {
    var grid = document.getElementById('balloons-grid');
    grid.innerHTML = '';
    BALLOONS.forEach(function (b, idx) {
      var slot = document.createElement('div');
      slot.className = 'balloon-slot';
      if (!state.popped[idx]) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'balloon-btn';
        btn.setAttribute('aria-label', 'Pop balloon ' + (idx + 1));
        btn.innerHTML =
          '<svg width="74" height="94" viewBox="0 0 88 112" class="float-gentle">' +
          '<defs><radialGradient id="vg' + idx + '" cx="34%" cy="28%" r="68%">' +
          '<stop offset="0%" stop-color="#FFF" stop-opacity="0.9"/>' +
          '<stop offset="30%" stop-color="' + b.from + '"/>' +
          '<stop offset="100%" stop-color="' + b.to + '"/>' +
          '</radialGradient></defs>' +
          '<path d="M44 6 C20 6 8 24 8 45 C8 68 29 82 44 86 C59 82 80 68 80 45 C80 24 68 6 44 6 Z" fill="url(#vg' + idx + ')"/>' +
          '<polygon points="40,86 48,86 44,92" fill="' + b.to + '"/>' +
          '<path d="M44 92 Q49 98 42 103 Q37 107 45 111" fill="none" stroke="#C7A6B2" stroke-width="2" stroke-linecap="round"/>' +
          '</svg>';
        btn.addEventListener('click', function () {
          playPopSfx();
          state.popped[idx] = true;
          renderBalloons();
        });
        slot.appendChild(btn);
      } else {
        var card = document.createElement('div');
        card.className = 'balloon-msg-card';
        card.style.backgroundColor = b.bg;
        card.style.border = '1px solid ' + b.border;
        card.textContent = b.msg;
        slot.appendChild(card);
      }
      grid.appendChild(slot);
    });

    var count = state.popped.filter(Boolean).length;
    document.getElementById('balloon-count-text').textContent = count + ' of 4 balloons popped';
    if (count === 4) {
      document.getElementById('balloon-title').textContent = 'All surprises unlocked! 🎀';
      document.getElementById('balloon-count-text').classList.add('hidden');
      document.getElementById('btn-balloons-next').classList.remove('hidden');
      renderConfetti(true);
    } else {
      document.getElementById('balloon-title').textContent = 'A little surprise is waiting inside each balloon...';
      document.getElementById('balloon-count-text').classList.remove('hidden');
      document.getElementById('btn-balloons-next').classList.add('hidden');
    }
  }

  document.getElementById('btn-balloons-next').addEventListener('click', function () {
    playClickSfx();
    goToPage(8);
  });

  // Page 8 Photos (supports .jpg, .jpeg, .png, .webp automatically)
  function createSmartPhotoImg(basePath, caption) {
    var exts = ['.jpg', '.jpeg', '.png', '.webp'];
    var attempt = 0;
    var img = document.createElement('img');
    img.src = basePath + exts[0];
    img.alt = caption;
    img.draggable = false;
    img.addEventListener('error', function () {
      attempt += 1;
      if (attempt < exts.length) {
        img.src = basePath + exts[attempt];
      } else {
        img.style.display = 'none';
      }
    });
    return img;
  }

  function renderPhotos() {
    var deck = document.getElementById('photo-deck');
    var dots = document.getElementById('photo-dots');
    deck.innerHTML = '';
    dots.innerHTML = '';

    PHOTOS.forEach(function (ph, idx) {
      var offset = idx - state.photoIdx;
      var isActive = offset === 0;
      var card = document.createElement('div');
      card.className = 'polaroid-card';
      card.style.transform = 'translateX(calc(-50% + ' + (offset * 46) + 'px)) scale(' + (isActive ? 1 : 0.87) + ') rotate(' + (ph.rot + offset * 4) + 'deg)';
      card.style.zIndex = String(PHOTOS.length - Math.abs(offset));
      card.style.opacity = Math.abs(offset) > 1 ? '0' : (isActive ? '1' : '0.55');

      var tape = document.createElement('div');
      tape.className = 'washi-tape';
      tape.style.background = ph.tape;
      card.appendChild(tape);

      var wrap = document.createElement('div');
      wrap.className = 'polaroid-img-wrap';
      wrap.appendChild(createSmartPhotoImg(ph.base, ph.caption));
      card.appendChild(wrap);

      var cap = document.createElement('p');
      cap.className = 'polaroid-caption';
      cap.textContent = ph.caption;
      card.appendChild(cap);

      deck.appendChild(card);

      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'photo-dot' + (isActive ? ' active' : '');
      dot.setAttribute('aria-label', 'View photograph ' + (idx + 1));
      dot.addEventListener('click', function () {
        playClickSfx();
        setPhotoIdx(idx);
      });
      dots.appendChild(dot);
    });

    document.getElementById('photo-counter').textContent = 'Swipe left or right · ' + (state.photoIdx + 1) + ' / ' + PHOTOS.length;
    document.getElementById('btn-photo-prev').disabled = state.photoIdx === 0;
    document.getElementById('btn-photo-next').disabled = state.photoIdx === PHOTOS.length - 1;

    if (state.photoIdx === PHOTOS.length - 1) state.seenLastPhoto = true;
    if (state.seenLastPhoto) {
      document.getElementById('photo-after-hint').classList.remove('hidden');
      document.getElementById('btn-read-letter').classList.remove('hidden');
      document.getElementById('photo-swipe-hint').classList.add('hidden');
    } else {
      document.getElementById('photo-after-hint').classList.add('hidden');
      document.getElementById('btn-read-letter').classList.add('hidden');
      document.getElementById('photo-swipe-hint').classList.remove('hidden');
    }
  }

  function setPhotoIdx(idx) {
    state.photoIdx = Math.max(0, Math.min(PHOTOS.length - 1, idx));
    renderPhotos();
  }

  document.getElementById('btn-photo-prev').addEventListener('click', function () {
    playClickSfx();
    setPhotoIdx(state.photoIdx - 1);
  });
  document.getElementById('btn-photo-next').addEventListener('click', function () {
    playClickSfx();
    setPhotoIdx(state.photoIdx + 1);
  });

  var photoDeck = document.getElementById('photo-deck');
  var photoStartX = null;
  photoDeck.addEventListener('pointerdown', function (e) { photoStartX = e.clientX; });
  photoDeck.addEventListener('pointerup', function (e) {
    if (photoStartX === null) return;
    var dx = e.clientX - photoStartX;
    if (dx < -36 && state.photoIdx < PHOTOS.length - 1) {
      playClickSfx();
      setPhotoIdx(state.photoIdx + 1);
    } else if (dx > 36 && state.photoIdx > 0) {
      playClickSfx();
      setPhotoIdx(state.photoIdx - 1);
    }
    photoStartX = null;
  });

  document.getElementById('btn-read-letter').addEventListener('click', function () {
    playClickSfx();
    goToPage(9);
  });

  // Page 9 -> 10
  document.getElementById('btn-one-last-thing').addEventListener('click', function () {
    playClickSfx();
    goToPage(10);
  });

  // Page 10 Replay (keeps music playing!)
  document.getElementById('btn-replay').addEventListener('click', function () {
    timers.forEach(clearTimeout);
    timers = [];
    playSparkleSfx();

    state.envelopeOpened = false;
    state.cakeCut = false;
    state.wishMade = false;
    state.popped = [false, false, false, false];
    state.photoIdx = 0;
    state.seenLastPhoto = false;

    document.getElementById('envelope-stage').classList.remove('opened');
    document.getElementById('envelope-btn-text').textContent = 'Open the Envelope ♡';
    document.getElementById('secret-input').value = '';
    document.getElementById('password-error').textContent = '';
    document.getElementById('btn-unlock').textContent = 'Unlock Your Surprise ✨';
    document.getElementById('cake-stage').classList.remove('is-cut');
    document.getElementById('cake-title').textContent = 'Make the first cut ✨';
    document.getElementById('cake-sub').textContent = 'Tap the button or swipe down across the cake.';
    document.getElementById('btn-cut-cake').classList.remove('hidden');
    document.getElementById('btn-cake-next').classList.add('hidden');
    document.getElementById('wish-halo').classList.remove('burst');
    document.getElementById('wish-title').textContent = 'Close your eyes...';
    document.getElementById('wish-sub').textContent = 'Make a little birthday wish in your heart.';
    document.getElementById('btn-make-wish').textContent = 'Make a Wish ♡';

    renderCandles(false);
    renderBalloons();
    renderPhotos();
    goToPage(1);
  });

  // Music toggle button
  document.getElementById('music-toggle-btn').addEventListener('click', function () {
    playClickSfx();
    if (!audioEl) return;
    if (state.musicPlaying && !state.musicMuted) {
      audioEl.pause();
      state.musicMuted = true;
      state.musicPlaying = false;
      updateMusicUI();
    } else {
      state.musicMuted = false;
      startMusic();
    }
  });

  // Init
  renderCandles(false);
  renderBalloons();
  renderPhotos();
  goToPage(1);
})();
