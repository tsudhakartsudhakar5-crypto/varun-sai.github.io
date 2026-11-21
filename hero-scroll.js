// Scroll book reel: the homepage hero swaps books as you scroll.
(function () {
  var track = document.getElementById('reelTrack');
  var swap = document.getElementById('bookSwap');
  if (!track || !swap) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var BY = ' by Thipparapu Varun Sai';
  var BOOKS = [
    { label: 'FEATURED BOOK', title: 'THE TIME<br>CHANGES', tag: 'TIME MOVES. LIFE CHANGES. YOU DECIDE.', intro: 'A journey from awareness to transformation.', href: 'book.html', cap: 'A PHILOSOPHICAL & MOTIVATIONAL BOOK', cover: 'the-time-changes-front.jpg', alt: 'Original front cover of The Time Changes' + BY, spine: 'THE TIME CHANGES', name: 'The Time Changes', long: false },
    { label: 'FEATURED BOOK', title: 'LEARN IT.<br>BUILD IT.<br>MASTER IT.', tag: 'LEARNING BY BUILDING REAL THINGS.', intro: "A beginner's guide to learning technology and building real projects with AI.", href: 'learn-it-build-it-master-it.html', cap: 'LEARNING & TECHNOLOGY', cover: 'learn-it-build-it-master-it-cover.jpg', alt: 'Book cover of Learn It. Build It. Master It.' + BY, spine: 'LEARN IT. BUILD IT. MASTER IT.', name: 'Learn It. Build It. Master It.', long: true },
    { label: 'UPCOMING BOOK', title: 'THE UNKNOWN<br>TRUTH', tag: 'THE SEARCH FOR TRUTH BENEATH APPEARANCES.', intro: 'A philosophical story about deception, hidden realities and the search for truth.', href: 'the-unknown-truth.html', cap: 'PHILOSOPHICAL FANTASY', cover: 'the-unknown-truth-cover.jpg', alt: 'Cover artwork for The Unknown Truth' + BY, spine: 'THE UNKNOWN TRUTH', name: 'The Unknown Truth', long: false }
  ];
  var N = BOOKS.length;
  var $ = function (id) { return document.getElementById(id); };
  var hero = $('home-hero'), copy = hero.querySelector('.hero-copy'), stage = hero.querySelector('.cinematic-stage');
  var railWide = $('railWide'), railStage = $('railStage'), mq = window.matchMedia('(max-width:760px)');
  var els = { label: hero.querySelector('.cinematic-label'), title: hero.querySelector('.cinematic-book-title'), tag: hero.querySelector('.cinematic-tagline'), intro: hero.querySelector('.cinematic-intro'), link: $('heroLink'), cap: $('capText'), slink: $('stageLink'), count: $('heroCounter'), front: $('bookFront'), spine: $('spineTitle'), model: $('bookModel') };

  BOOKS.forEach(function (b) { var i = new Image(); i.src = b.cover; });
  track.classList.add('reel-on');
  track.style.setProperty('--steps', N);

  var cur = 0, timer = 0, ticking = false;

  function show(i) {
    var b = BOOKS[i];
    els.label.textContent = b.label;
    els.title.innerHTML = b.title;
    els.tag.textContent = b.tag;
    els.intro.textContent = b.intro;
    els.link.href = b.href;
    els.slink.href = b.href;
    els.cap.textContent = b.cap;
    els.front.src = b.cover;
    els.front.alt = b.alt;
    els.spine.textContent = b.spine;
    els.model.setAttribute('aria-label', 'Three-dimensional paperback edition of ' + b.name + BY);
    els.count.firstChild.nodeValue = '0' + (i + 1) + ' ';
    els.count.lastChild.nodeValue = ' ' + '0' + N;
    copy.classList.toggle('is-long', b.long);
  }

  function change(i) {
    cur = i;
    clearTimeout(timer);
    copy.classList.add('is-changing');
    timer = setTimeout(function () { show(i); copy.classList.remove('is-changing'); }, 180);
  }

  function update() {
    ticking = false;
    var small = mq.matches;
    var rail = small ? railStage : railWide;
    var pin = small ? stage : hero;
    var r = rail.getBoundingClientRect();
    var pinBottom = 72 + pin.offsetHeight;
    var p = Math.min(1, Math.max(0, 1 - (r.bottom - pinBottom) / r.height));
    var x = p * N, i = Math.min(N - 1, Math.floor(x)), t = x - i;
    if (i !== cur) change(i);
    var enter = (i > 0 && t < 0.2) ? t / 0.2 : 1;
    var exit = (i < N - 1 && t > 0.8) ? (t - 0.8) / 0.2 : 0;
    var op = Math.min(enter, 1 - exit);
    swap.style.opacity = op;
    swap.style.transform = 'translateY(' + ((1 - enter) * 28) + 'px) rotateY(' + ((1 - enter) * 70 - exit * 70) + 'deg)';
  }

  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
