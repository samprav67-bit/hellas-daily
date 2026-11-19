/* ============================================================
   ЭЛЛАДА — script: intro, reveals, navigation, oracle, timeline
   ============================================================ */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const body = document.body;
  const intro = $('#intro');
  const fold = $('#fold');
  const site = $('#site');
  const openPaper = $('#openPaper');
  const skipIntro = $('#skipIntro');
  const foldBack = $('#foldBack');
  const topbar = $('#topbar');
  const menuBtn = $('#menuBtn');
  const nav = $('#nav');
  const progress = $('#progress');
  const timeline = $('#timelineScroll');
  const timelinePrev = $('#timelinePrev');
  const timelineNext = $('#timelineNext');
  const oracleFab = $('#oracleFab');
  const oracleModal = $('#oracleModal');
  const oracleNext = $('#oracleNext');
  const oracleGreek = $('#oracleGreek');
  const oracleText = $('#oracleText');
  const oracleNote = $('#oracleNote');
  const oracleBody = $('.oracle-scroll__body', oracleModal);
  const oracleClose = $('.oracle-modal__close', oracleModal);

  let introOpened = false;
  let introDone = false;
  let lastFocus = null;
  let maximTimer = 0;
  let oracleOpenTimer = 0;
  let oracleCloseTimer = 0;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ----------------------------------------------------------
     Intro: unfold the newspaper
     ---------------------------------------------------------- */

  function setOpenScale() {
    const foldWidth = Math.min(860, window.innerWidth * 1.72);
    const available = Math.max(240, window.innerWidth - 24);
    const scale = Math.min(1, available / foldWidth);
    document.documentElement.style.setProperty('--open-scale', scale.toFixed(4));
  }

  function unlockSite() {
    introDone = true;
    body.classList.remove('is-locked');
    body.classList.add('is-ready');
    site.inert = false;
    site.removeAttribute('inert');

    const hashId = location.hash.replace(/^#/, '');
    const target = hashId ? document.getElementById(hashId) : null;

    if (target) {
      window.setTimeout(() => {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
      }, 80);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

      if (introOpened) {
        const front = document.getElementById('front');
        if (front) {
          window.setTimeout(() => front.focus({ preventScroll: true }), 90);
        }
      }
    }
  }

  function finishIntro() {
    if (introDone) return;
    intro.hidden = true;
    unlockSite();
  }

  function openNewspaper() {
    if (introOpened) return;
    introOpened = true;

    if (reduceMotion.matches) {
      finishIntro();
      return;
    }

    intro.classList.add('is-breaking');
    window.setTimeout(() => fold.classList.add('is-open'), 380);
    window.setTimeout(() => intro.classList.add('is-revealed'), 1500);
    window.setTimeout(finishIntro, 2420);
  }

  function resetIntro() {
    introOpened = false;
    introDone = false;

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    body.classList.remove('is-ready');
    body.classList.add('is-locked');
    site.inert = true;
    closeMenu();

    if ('replaceState' in history) {
      history.replaceState(null, '', location.pathname + location.search);
    }

    intro.hidden = false;
    void intro.offsetWidth;
    intro.classList.remove('is-revealed', 'is-breaking');
    fold.classList.remove('is-open');

    window.setTimeout(() => {
      if (openPaper) openPaper.focus({ preventScroll: true });
    }, 120);
  }

  if (intro && fold && site) {
    setOpenScale();

    if (reduceMotion.matches) {
      intro.hidden = true;
      unlockSite();
    } else {
      site.inert = true;
      openPaper.addEventListener('click', openNewspaper);
      skipIntro.addEventListener('click', openNewspaper);
      document.addEventListener('keydown', (e) => {
        if (!introDone && e.key === 'Escape') openNewspaper();
      });
    }

    if (foldBack) {
      foldBack.addEventListener('click', () => {
        if (reduceMotion.matches) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          return;
        }
        resetIntro();
      });
    }
  }

  window.addEventListener('resize', setOpenScale, { passive: true });

  /* ----------------------------------------------------------
     Reveal on scroll
     ---------------------------------------------------------- */

  const revealItems = $$('.reveal');

  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -7% 0px', threshold: 0.06 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  /* ----------------------------------------------------------
     Mobile menu
     ---------------------------------------------------------- */

  function closeMenu() {
    topbar.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Открыть меню');
  }

  function toggleMenu() {
    const isOpen = topbar.classList.toggle('is-open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
    menuBtn.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', toggleMenu);

    nav.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) closeMenu();
    });

    document.addEventListener('click', (e) => {
      if (!topbar.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && topbar.classList.contains('is-open')) {
        closeMenu();
        menuBtn.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1020) closeMenu();
    });
  }

  /* ----------------------------------------------------------
     Reading progress + active section
     ---------------------------------------------------------- */

  const sections = $$('main section[id]');
  const navLinks = $$('#nav a[href^="#"]');

  function updateScrollUI() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;

    if (progress) progress.style.transform = `scaleX(${ratio})`;

    if (!sections.length || !navLinks.length) return;

    const topbarH = parseFloat(getComputedStyle(doc).getPropertyValue('--topbar-h')) || 58;
    const line = window.scrollY + topbarH + window.innerHeight * 0.28;
    let currentId = '';

    sections.forEach((section) => {
      const top = section.getBoundingClientRect().top + window.scrollY;
      if (top <= line) currentId = section.id;
    });

    navLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${currentId}`;
      link.classList.toggle('is-active', active);
      if (active) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  window.addEventListener('scroll', updateScrollUI, { passive: true });
  window.addEventListener('resize', updateScrollUI, { passive: true });
  updateScrollUI();

  /* ----------------------------------------------------------
     Timeline
     ---------------------------------------------------------- */

  if (timeline && timelinePrev && timelineNext) {
    const updateTimeline = () => {
      const max = timeline.scrollWidth - timeline.clientWidth;
      timelinePrev.disabled = timeline.scrollLeft <= 2;
      timelineNext.disabled = timeline.scrollLeft >= max - 2;
    };

    const scrollTimeline = (direction) => {
      const item = timeline.querySelector('.timeline__item');
      const step = item
        ? item.getBoundingClientRect().width + 1
        : Math.round(timeline.clientWidth * 0.8);
      timeline.scrollBy({ left: direction * step, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    };

    timelinePrev.addEventListener('click', () => scrollTimeline(-1));
    timelineNext.addEventListener('click', () => scrollTimeline(1));
    timeline.addEventListener('scroll', updateTimeline, { passive: true });
    window.addEventListener('resize', updateTimeline);
    window.addEventListener('load', updateTimeline);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateTimeline).catch(() => {});
    }
    updateTimeline();

    timeline.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollTimeline(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollTimeline(-1);
      }
    });
  }

  /* ----------------------------------------------------------
     Oracle
     ---------------------------------------------------------- */

  const maxims = [
    {
      greek: 'ΓΝΩΘΙ ΣΑΥΤΟΝ',
      text: '«Познай самого себя»',
      note: 'Надпись у входа в храм Аполлона в Дельфах. Прежде чем спрашивать о будущем, загляните внутрь себя.'
    },
    {
      greek: 'ΜΗΔΕΝ ΑΓΑΝ',
      text: '«Ничего сверх меры»',
      note: 'Дельфийский завет, приписываемый Клеобулу. Мера — не осторожность, а точность.'
    },
    {
      greek: 'ΠΑΝΤΑ ΡΕΙ',
      text: '«Всё течёт»',
      note: 'Гераклит Эфесский. В одну реку нельзя войти дважды — и самого берега уже нет.'
    },
    {
      greek: 'ΕΝ ΟΙΔΑ ΟΤΙ ΟΥΔΕΝ ΟΙΔΑ',
      text: '«Я знаю, что ничего не знаю»',
      note: 'Сократ. Единственное честное начало всякого знания — признать его границы.'
    },
    {
      greek: 'ΑΡΧΗ ΗΜΙΣΥ ΠΑΝΤΟΣ',
      text: '«Начало — половина всего»',
      note: 'Греческая поговорка, которую любил повторять Платон. Самое трудное — решиться начать.'
    },
    {
      greek: 'ΠΑΝΤΩΝ ΧΡΗΜΑΤΩΝ ΜΕΤΡΟΝ ΑΝΘΡΩΠΟΣ',
      text: '«Человек — мера всех вещей»',
      note: 'Протагор. Не боги и не цари, а человек становится точкой отсчёта.'
    },
    {
      greek: 'ΦΥΣΙΣ ΚΡΥΠΤΕΣΘΑΙ ΦΙΛΕΙ',
      text: '«Природа любит скрываться»',
      note: 'Гераклит. Истина не лежит на поверхности — её надо искать, а не получать готовой.'
    },
    {
      greek: 'ΛΟΓΟΣ ΕΡΓΟΥ ΣΚΙΑ',
      text: '«Слово — тень дела»',
      note: 'Демокрит. Разговоры о поступке — лишь тень самого поступка.'
    },
    {
      greek: 'ΠΟΛΕΜΟΣ ΠΑΝΤΩΝ ΠΑΤΗΡ',
      text: '«Война — отец всех»',
      note: 'Гераклит. Спор и противоречие — двигатель мира, а не только его бедствие.'
    },
    {
      greek: 'ΕΙΝΑΙ, ΟΥ ΔΟΚΕΙΝ',
      text: '«Быть, а не казаться»',
      note: 'Древнегреческий принцип, который Сократ проверял на себе каждый день.'
    },
    {
      greek: 'ΣΠΕΥΔΕ ΒΡΑΔΕΩΣ',
      text: '«Спеши медленно»',
      note: 'Девиз, который приписывают Августу, но греки знали его раньше: поспешность — плохой советчик.'
    },
    {
      greek: 'ΓΝΩΘΙ ΚΑΙΡΟΝ',
      text: '«Знай своё время»',
      note: 'Дельфийский завет. У каждого дела есть момент — и он проходит.'
    }
  ];

  let maximIndex = 0;

  function fillMaxim(index) {
    const maxim = maxims[index];
    oracleGreek.textContent = maxim.greek;
    oracleText.textContent = maxim.text;
    oracleNote.textContent = maxim.note;
  }

  function nextMaxim() {
    if (!oracleBody) return;

    window.clearTimeout(maximTimer);
    oracleBody.classList.add('is-changing');

    maximTimer = window.setTimeout(() => {
      maximIndex = (maximIndex + 1 + Math.floor(Math.random() * (maxims.length - 1))) % maxims.length;
      fillMaxim(maximIndex);
      oracleBody.classList.remove('is-changing');
    }, reduceMotion.matches ? 0 : 190);
  }

  function trapOracleFocus(e) {
    if (e.key !== 'Tab') return;

    const focusable = $$(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      oracleModal
    ).filter((el) => {
      const style = getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
    });

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  }

  function openOracle() {
    if (!oracleModal) return;

    window.clearTimeout(oracleCloseTimer);
    window.clearTimeout(oracleOpenTimer);

    if (!oracleModal.hidden && oracleModal.classList.contains('is-open')) return;

    lastFocus = document.activeElement;
    oracleModal.hidden = false;
    body.classList.add('is-oracle-open');
    site.inert = true;

    if (oracleFab) {
      oracleFab.inert = true;
      oracleFab.setAttribute('aria-hidden', 'true');
    }

    oracleOpenTimer = window.setTimeout(() => {
      oracleModal.classList.add('is-open');
      if (oracleClose) oracleClose.focus({ preventScroll: true });
    }, 20);
  }

  function closeOracle() {
    if (!oracleModal || oracleModal.hidden) return;

    window.clearTimeout(oracleOpenTimer);
    oracleModal.classList.remove('is-open');
    body.classList.remove('is-oracle-open');
    site.inert = !intro.hidden;

    if (oracleFab) {
      oracleFab.inert = false;
      oracleFab.removeAttribute('aria-hidden');
    }

    oracleCloseTimer = window.setTimeout(() => {
      oracleModal.hidden = true;

      const canRestore =
        lastFocus &&
        lastFocus !== document.body &&
        lastFocus !== document.documentElement &&
        isVisible(lastFocus);

      const target = canRestore ? lastFocus : (isVisible(oracleFab) ? oracleFab : null);
      if (target) target.focus({ preventScroll: true });
    }, reduceMotion.matches ? 0 : 380);
  }

  if (oracleModal) {
    fillMaxim(maximIndex);

    $$('[data-oracle-open]').forEach((btn) => btn.addEventListener('click', openOracle));

    if (oracleFab) {
      oracleFab.addEventListener('click', () => {
        if (oracleFab.hasAttribute('aria-hidden')) return;
        openOracle();
      });
    }

    $$('[data-oracle-close]', oracleModal).forEach((el) => {
      el.addEventListener('click', closeOracle);
    });

    if (oracleNext) oracleNext.addEventListener('click', nextMaxim);

    document.addEventListener('keydown', (e) => {
      if (oracleModal.hidden) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        closeOracle();
        return;
      }

      trapOracleFocus(e);
    });
  }

  /* ----------------------------------------------------------
     Reduce motion changes at runtime
     ---------------------------------------------------------- */

  function handleMotionPreference() {
    if (reduceMotion.matches) {
      if (!introDone) {
        intro.hidden = true;
        unlockSite();
      }
      revealItems.forEach((item) => item.classList.add('is-visible'));
    }
  }

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', handleMotionPreference);
  } else if (typeof reduceMotion.addListener === 'function') {
    reduceMotion.addListener(handleMotionPreference);
  }
})();
