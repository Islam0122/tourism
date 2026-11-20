/* ==========================================================================
   Kyrgyzstan Tourism — app.js
   Vanilla JavaScript (ES6+). Everything lives inside one IIFE, so nothing
   leaks into the global namespace.
   ========================================================================== */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  /* ------------------------------------------------------------------------
     Helpers
     ------------------------------------------------------------------------ */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const COMMONS = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
  const photo = (file, width = 1400) => `${COMMONS}${file}?width=${width}`;

  /** Runs a feature initializer; one broken feature never stops the others. */
  const safeInit = (name, fn) => {
    try {
      fn();
    } catch (error) {
      console.error(`[Kyrgyzstan] Не удалось инициализировать «${name}»:`, error);
    }
  };

  /** rAF-throttle for scroll/resize handlers. */
  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
    };
  };

  /** Scroll lock shared by the menu, modal and lightbox. */
  const scrollLock = (() => {
    const owners = new Set();
    return {
      add(owner) {
        owners.add(owner);
        document.body.classList.add('is-locked');
      },
      remove(owner) {
        owners.delete(owner);
        if (owners.size === 0) document.body.classList.remove('is-locked');
      },
    };
  })();

  /** Keeps keyboard focus inside an open dialog. */
  const trapFocus = (container, event) => {
    if (event.key !== 'Tab') return;
    const items = $$(FOCUSABLE, container).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  /* ------------------------------------------------------------------------
     Destination data (used by the modal)
     ------------------------------------------------------------------------ */
  const DESTINATIONS = {
    'issyk-kul': {
      title: 'Иссык-Куль',
      tagline: 'Жемчужина Кыргызстана',
      region: 'Иссык-Кульская область',
      image: photo('Issyk-Kul,_Kyrgyzstan_(29685360547).jpg'),
      fallback: photo('Issykkul_plyag.jpg'),
      alt: 'Южный берег Иссык-Куля и заснеженные горы',
      text: 'Иссык-Куль — бессточное солоноватое озеро в северном Тянь-Шане длиной около 180 км. Название переводится как «тёплое озеро»: несмотря на высоту 1607 метров, зимой оно не замерзает. Северный берег — это пляжи и курорты Чолпон-Аты, южный — тихие бухты, каньоны и виды на ледники Терскей Ала-Тоо.',
      facts: [
        ['Высота', '1607 м'],
        ['Глубина', 'до 668 м'],
        ['Сезон', 'июнь – сентябрь'],
        ['От Бишкека', '≈ 250 км'],
      ],
      highlights: [
        'Пляжи и набережная Чолпон-Аты, петроглифы под открытым небом',
        'Каньон Сказка и Скалы Барскоон на южном берегу',
        'Прогулки на яхте, сапы и купание в прозрачной воде',
        'Этнокомплексы и шоу беркутчи в Боконбаеве',
      ],
    },
    'ala-archa': {
      title: 'Ала-Арча',
      tagline: 'Национальный парк',
      region: 'Чуйская область',
      image: photo('Kyrgyzstan_Ala_Archa_National_Park_03.jpg'),
      fallback: photo('Kyrgyzstan_Ala_Archa_National_Park_01.jpg'),
      alt: 'Ущелье Ала-Арча с горной рекой',
      text: 'Природный парк Ала-Арча основан в 1976 году и находится всего в 40 км к югу от Бишкека. Ущелье названо в честь пёстрой арчи — горного можжевельника. Здесь начинаются тропы к ледникам и водопадам, а альпинистский лагерь на 2100 м десятилетиями служит базой для восхождений.',
      facts: [
        ['Основан', '1976 год'],
        ['Высота лагеря', '2100 м'],
        ['От Бишкека', '≈ 40 км'],
        ['Сезон', 'круглый год'],
      ],
      highlights: [
        'Треккинг к водопаду Ак-Сай и леднику Адыгене',
        'Пикники вдоль реки Ала-Арча — идеально на один день',
        'Альпинизм на пике Корона и пике Свободной Кореи',
        'Зимние прогулки и катание на снегоступах',
      ],
    },
    'son-kul': {
      title: 'Сон-Куль',
      tagline: 'Высокогорное озеро',
      region: 'Нарынская область',
      image: photo('Song-Kul_2015_02.jpg'),
      fallback: photo('SongKolHorses.jpg'),
      alt: 'Озеро Сон-Куль среди летних пастбищ',
      text: 'Сон-Куль — крупнейшее пресноводное озеро страны, лежащее на высоте около 3016 метров. Вокруг нет ни одного посёлка: летом берега превращаются в жайлоо, куда пастухи пригоняют табуны и ставят юрты. Это лучшее место, чтобы пожить по-кочевому, покататься верхом и увидеть ночное небо без городских огней.',
      facts: [
        ['Высота', '≈ 3016 м'],
        ['Площадь', '≈ 270 км²'],
        ['Сезон', 'июнь – сентябрь'],
        ['Ночёвка', 'юрточные лагеря'],
      ],
      highlights: [
        'Ночь в юрте и домашняя кухня пастухов',
        'Конный переход от Кочкора через перевалы',
        'Звёздное небо и рассветы над озером',
        'Наблюдение за птицами: озеро — Рамсарское угодье',
      ],
    },
    karakol: {
      title: 'Каракол',
      tagline: 'Горный туристический город',
      region: 'Иссык-Кульская область',
      image: photo('Karakol_cathedral.jpg'),
      fallback: photo('Kyrgyz_Musicians_in_Karakol.jpg'),
      alt: 'Деревянный Свято-Троицкий собор в Караколе',
      text: 'Каракол, основанный в 1869 году, — главная база для походов по восточному Иссык-Кулю. В городе стоит деревянный Свято-Троицкий собор и дунганская мечеть, построенная без единого гвоздя. Зимой сюда едут за лыжами: горнолыжная база Каракол славится трассами среди тянь-шаньских елей.',
      facts: [
        ['Основан', '1869 год'],
        ['Высота', '≈ 1700 м'],
        ['Лыжи', 'декабрь – март'],
        ['Треки', 'июль – сентябрь'],
      ],
      highlights: [
        'Трек к озеру Ала-Куль и горячим источникам Алтын-Арашан',
        'Дунганская мечеть и деревянный православный собор',
        'Горнолыжная база в 20 минутах от города',
        'Воскресный скотный рынок и уличная еда — ашлян-фу',
      ],
    },
    'jeti-oguz': {
      title: 'Джети-Огуз',
      tagline: 'Красные скалы',
      region: 'Иссык-Кульская область',
      image: photo('Jeti-%C3%96g%C3%BCz.jpg'),
      fallback: photo('Kyrgyzstan_(6052094329).jpg'),
      alt: 'Красные скалы Джети-Огуз',
      text: 'Название означает «семь быков»: так местные жители видят гряду красных песчаниковых скал у входа в ущелье, примерно в 25 км от Каракола. Рядом — «Разбитое сердце», курорт с термальными источниками, а выше по ущелью начинается Долина цветов с еловыми лесами и водопадом.',
      facts: [
        ['От Каракола', '≈ 25 км'],
        ['Статус', 'памятник природы'],
        ['Сезон', 'май – октябрь'],
        ['Изюминка', 'термальные источники'],
      ],
      highlights: [
        'Скала «Разбитое сердце» и легенды о семи быках',
        'Долина цветов и водопад «Девичьи слёзы»',
        'Конные прогулки и ночёвка в юртах ущелья',
        'Санаторий с минеральными источниками',
      ],
    },
    'sary-chelek': {
      title: 'Сары-Челек',
      tagline: 'Уникальное горное озеро',
      region: 'Джалал-Абадская область',
      image: photo('Sary_Chelek_Lake.jpg'),
      fallback: photo('Kyrgyzstan_Ala_Archa_National_Park_05.jpg'),
      alt: 'Озеро Сары-Челек среди лесистых гор',
      text: 'Сары-Челек — «жёлтая чаша» — лежит в одноимённом биосферном заповеднике на высоте около 1873 метров. Глубина озера достигает 234 метров, а склоны вокруг покрыты елями, орехом и дикими яблонями. Осенью долина вспыхивает жёлтым — отсюда, по одной из версий, и название.',
      facts: [
        ['Высота', '≈ 1873 м'],
        ['Глубина', 'до 234 м'],
        ['Длина', '≈ 7,5 км'],
        ['Сезон', 'июнь – сентябрь'],
      ],
      highlights: [
        'Прогулка на лодке по извилистому озеру',
        'Шесть малых озёр заповедника и пешие тропы',
        'Ночёвка в гестхаусе села Аркит',
        'Золотая осень и дикие фруктовые леса',
      ],
    },
    'tash-rabat': {
      title: 'Таш-Рабат',
      tagline: 'Исторический караван-сарай',
      region: 'Нарынская область',
      image: photo('Tash_Rabat.jpg'),
      fallback: photo('Burana.JPG'),
      alt: 'Каменный караван-сарай Таш-Рабат',
      text: 'Таш-Рабат — «каменный двор» — хорошо сохранившийся каменный караван-сарай XV века в долине Ат-Башы на высоте около 3200 метров. Он укрывал купцов шёлкового пути на дороге в Кашгар. Ряд исследователей считает, что на его месте раньше стоял монастырь. Внутри — центральный купольный зал и десятки небольших комнат.',
      facts: [
        ['Высота', '≈ 3200 м'],
        ['Эпоха', 'XV век'],
        ['Рядом', 'озеро Чатыр-Куль'],
        ['Сезон', 'июнь – сентябрь'],
      ],
      highlights: [
        'Экскурсия по залам и кельям караван-сарая',
        'Ночёвка в юрточном лагере у стен',
        'Конная поездка к перевалу с видом на Чатыр-Куль',
        'Остановка в Нарыне и крепость Кошой-Коргон по пути',
      ],
    },
    arslanbob: {
      title: 'Арсланбоб',
      tagline: 'Крупнейшие ореховые леса',
      region: 'Джалал-Абадская область',
      image: photo('Arslanbob.jpg'),
      fallback: photo('Sary_Chelek_Lake.jpg'),
      alt: 'Ореховый лес и горы у Арсланбоба',
      text: 'Село Арсланбоб на склонах Ферганского хребта окружено самым большим в мире естественным лесом грецкого ореха — около 11 000 гектаров. Каждую осень сотни семей уходят в лес на сбор урожая. Летом сюда приезжают ради двух водопадов, святых мест и программ сельского туризма.',
      facts: [
        ['Высота', '≈ 1600 м'],
        ['Лес', '≈ 11 000 га'],
        ['Урожай', 'сентябрь – октябрь'],
        ['Водопады', '2 — Большой и Малый'],
      ],
      highlights: [
        'Прогулка к Большому водопаду высотой около 80 м',
        'Сбор орехов вместе с местными семьями осенью',
        'Конные туры к горным озёрам Кол-Мазар',
        'Гостевые дома с южнокыргызской кухней',
      ],
    },
  };

  /* ------------------------------------------------------------------------
     1. Images: fallback chain + graceful placeholder
     ------------------------------------------------------------------------ */
  const handleImageError = (img) => {
    const fallback = img.dataset.fallback;
    if (fallback && img.dataset.fallbackUsed !== 'true') {
      img.dataset.fallbackUsed = 'true';
      img.src = fallback;
      return;
    }
    const wrapper = img.closest('.media');
    if (wrapper) wrapper.classList.add('is-missing');
  };

  const initImages = () => {
    $$('img').forEach((img) => {
      img.addEventListener('error', () => handleImageError(img));
      img.addEventListener('load', () => {
        const wrapper = img.closest('.media');
        if (wrapper && img.naturalWidth > 0) wrapper.classList.remove('is-missing');
      });
      // An image may have already failed before this script ran.
      if (img.complete && img.getAttribute('src') && img.naturalWidth === 0) {
        handleImageError(img);
      }
    });
  };

  /* ------------------------------------------------------------------------
     2. Hero background with a fallback chain
     ------------------------------------------------------------------------ */
  const initHero = () => {
    const bg = $('#heroBg');
    if (!bg) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.min(2400, Math.ceil((window.innerWidth * ratio) / 400) * 400);
    const candidates = [
      photo('Kyrgyzstan_Ala_Archa_National_Park_03.jpg', width),
      photo('Kyrgyzstan_(6052094329).jpg', width),
      photo('Song-Kul_2015_02.jpg', width),
    ];

    const tryLoad = (index) => {
      if (index >= candidates.length) return; // gradient placeholder stays
      const probe = new Image();
      probe.onload = () => bg.style.setProperty('--hero-image', `url("${candidates[index]}")`);
      probe.onerror = () => tryLoad(index + 1);
      probe.src = candidates[index];
    };
    tryLoad(0);
  };

  /* ------------------------------------------------------------------------
     3. Mobile navigation
     ------------------------------------------------------------------------ */
  const nav = {
    header: null,
    toggle: null,
    menu: null,
    isOpen: false,
  };

  const setMenu = (open) => {
    if (!nav.toggle || !nav.menu) return;
    nav.isOpen = open;
    nav.menu.classList.toggle('is-open', open);
    nav.header.classList.toggle('menu-open', open);
    nav.toggle.setAttribute('aria-expanded', String(open));
    nav.toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    if (open) {
      scrollLock.add('menu');
      const firstLink = $('.nav__link', nav.menu);
      if (firstLink) firstLink.focus({ preventScroll: true });
    } else {
      scrollLock.remove('menu');
    }
  };

  const initMobileNav = () => {
    nav.header = $('#header');
    nav.toggle = $('#navToggle');
    nav.menu = $('#navMenu');
    if (!nav.header || !nav.toggle || !nav.menu) return;

    nav.toggle.addEventListener('click', () => setMenu(!nav.isOpen));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.isOpen) {
        setMenu(false);
        nav.toggle.focus();
      }
      if (nav.isOpen) trapFocus(nav.header, event);
    });

    // Close the panel when switching to the desktop layout.
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onChange = (mq) => {
      if (mq.matches && nav.isOpen) setMenu(false);
    };
    if (typeof desktop.addEventListener === 'function') desktop.addEventListener('change', onChange);
    else if (typeof desktop.addListener === 'function') desktop.addListener(onChange);
  };

  /* ------------------------------------------------------------------------
     4. Sticky navbar + 9. Back to top
     ------------------------------------------------------------------------ */
  const initScrollState = () => {
    const header = $('#header');
    const toTop = $('#toTop');

    const update = () => {
      const y = window.scrollY || window.pageYOffset;
      if (header) header.classList.toggle('is-scrolled', y > 40);
      if (toTop) toTop.classList.toggle('is-visible', y > window.innerHeight * 0.8);
    };

    window.addEventListener('scroll', rafThrottle(update), { passive: true });
    update();

    if (toTop) {
      toTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        const logo = $('.logo');
        if (logo) logo.focus({ preventScroll: true });
      });
    }
  };

  /* ------------------------------------------------------------------------
     5. Smooth scrolling for in-page links
     ------------------------------------------------------------------------ */
  const scrollToTarget = (target) => {
    const header = $('#header');
    const offset = header ? header.offsetHeight - 1 : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const initSmoothScroll = () => {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return; // demo links are handled elsewhere
      if (link.closest('.modal')) return; // the modal handles its own links

      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      event.preventDefault();
      if (nav.isOpen) setMenu(false);
      scrollToTarget(target);

      if (history.pushState) history.pushState(null, '', hash);
      // Move focus for keyboard and screen-reader users without jumping.
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  };

  /* ------------------------------------------------------------------------
     10. Active navigation link
     ------------------------------------------------------------------------ */
  const initActiveLink = () => {
    const links = $$('.nav__link');
    if (!links.length || !('IntersectionObserver' in window)) return;

    const map = new Map();
    links.forEach((link) => {
      const section = document.getElementById(link.getAttribute('href').slice(1));
      if (section) map.set(section, link);
    });

    const setActive = (link) => {
      links.forEach((l) => {
        const active = l === link;
        l.classList.toggle('is-active', active);
        if (active) l.setAttribute('aria-current', 'page');
        else l.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(map.get(entry.target));
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    map.forEach((_, section) => observer.observe(section));
  };

  /* ------------------------------------------------------------------------
     4b. Scroll reveal animations
     ------------------------------------------------------------------------ */
  const initReveal = () => {
    const items = $$('.reveal');
    if (!items.length) return;

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Stagger cards that share a grid.
    $$('.dest-grid, .adv-grid, .culture-grid, .food-grid').forEach((grid) => {
      $$('.reveal', grid).forEach((el, i) => el.style.setProperty('--reveal-delay', `${(i % 4) * 0.08}s`));
    });

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    items.forEach((el) => observer.observe(el));
  };

  /* ------------------------------------------------------------------------
     Travel guide accordion
     ------------------------------------------------------------------------ */
  const initAccordion = () => {
    const buttons = $$('.accordion__btn');
    buttons.forEach((btn) => {
      const panel = document.getElementById(btn.getAttribute('aria-controls'));
      const item = btn.closest('.accordion__item');
      if (!panel || !item) return;
      item.classList.toggle('is-open', btn.getAttribute('aria-expanded') === 'true');

      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
        item.classList.toggle('is-open', open);
      });
    });
  };

  /* ------------------------------------------------------------------------
     6. Destination modal
     ------------------------------------------------------------------------ */
  const modal = {
    root: null,
    lastFocus: null,
    closeTimer: null,
  };

  const fillModal = (data) => {
    const img = $('#modalImg');
    const media = $('#modalMedia');
    media.classList.remove('is-missing');
    media.dataset.label = data.title;
    img.dataset.fallback = data.fallback || '';
    img.dataset.fallbackUsed = 'false';
    img.src = data.image;
    img.alt = data.alt;

    $('#modalRegion').textContent = data.region;
    $('#modalTagline').textContent = data.tagline;
    $('#modalTitle').textContent = data.title;
    $('#modalText').textContent = data.text;

    const facts = $('#modalFacts');
    facts.replaceChildren(
      ...data.facts.map(([term, value]) => {
        const wrap = document.createElement('div');
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = term;
        dd.textContent = value;
        wrap.append(dt, dd);
        return wrap;
      })
    );

    const list = $('#modalList');
    list.replaceChildren(
      ...data.highlights.map((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        return li;
      })
    );
  };

  const openModal = (id, trigger) => {
    const data = DESTINATIONS[id];
    if (!modal.root || !data) return;
    window.clearTimeout(modal.closeTimer);
    modal.root.classList.remove('is-closing');
    modal.lastFocus = trigger || document.activeElement;

    fillModal(data);
    modal.root.hidden = false;
    $('.modal__dialog', modal.root).scrollTop = 0;
    scrollLock.add('modal');
    const closeBtn = $('.modal__close', modal.root);
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  };

  const closeModal = () => {
    if (!modal.root || modal.root.hidden) return;
    const finish = () => {
      modal.root.hidden = true;
      modal.root.classList.remove('is-closing');
      scrollLock.remove('modal');
      if (modal.lastFocus && typeof modal.lastFocus.focus === 'function') {
        modal.lastFocus.focus({ preventScroll: true });
      }
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    modal.root.classList.add('is-closing');
    modal.closeTimer = window.setTimeout(finish, 200);
  };

  const initModal = () => {
    modal.root = $('#destModal');
    if (!modal.root) return;

    document.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-open]');
      if (opener) {
        event.preventDefault();
        openModal(opener.dataset.open, opener);
        return;
      }
      if (!modal.root.hidden && event.target.closest('[data-close]')) {
        const closer = event.target.closest('[data-close]');
        const href = closer.getAttribute('href');
        closeModal();
        // "Спланировать поездку" closes the modal, then scrolls to the form.
        if (href && href.startsWith('#')) {
          event.preventDefault();
          const target = document.getElementById(href.slice(1));
          if (target) {
            modal.lastFocus = null;
            window.setTimeout(() => {
              scrollToTarget(target);
              const nameField = $('#name');
              if (nameField) nameField.focus({ preventScroll: true });
            }, 220);
          }
        }
      }
    });

    // Clicking on the image area of a card opens the modal too.
    $$('.dest-card__media').forEach((media) => {
      media.style.cursor = 'pointer';
      media.addEventListener('click', () => {
        const card = media.closest('.dest-card');
        const btn = card ? $('[data-open]', card) : null;
        if (card) openModal(card.dataset.id, btn);
      });
    });

    document.addEventListener('keydown', (event) => {
      if (modal.root.hidden) return;
      if (event.key === 'Escape') closeModal();
      trapFocus(modal.root, event);
    });
  };

  /* ------------------------------------------------------------------------
     7. Gallery navigation (filters) + Image Lightbox
     ------------------------------------------------------------------------ */
  const lb = {
    root: null,
    img: null,
    caption: null,
    counter: null,
    source: null,
    items: [],
    index: 0,
    lastFocus: null,
    touchX: null,
  };

  const visibleGalleryItems = () =>
    $$('#galleryGrid .g-item').filter((item) => !item.classList.contains('is-hidden') && !item.classList.contains('is-missing'));

  const showSlide = (index) => {
    if (!lb.items.length) return;
    lb.index = (index + lb.items.length) % lb.items.length;
    const item = lb.items[lb.index];
    const thumb = $('img', item);
    const caption = $('figcaption', item);
    const full = thumb.dataset.full || thumb.currentSrc || thumb.src;

    lb.img.classList.add('is-loading');
    lb.img.onload = () => lb.img.classList.remove('is-loading');
    lb.img.onerror = () => {
      lb.img.classList.remove('is-loading');
      // Fall back to the already-loaded thumbnail.
      if (lb.img.src !== thumb.currentSrc && thumb.currentSrc) lb.img.src = thumb.currentSrc;
    };
    lb.img.src = full;
    lb.img.alt = thumb.alt;
    lb.caption.textContent = caption ? caption.textContent : thumb.alt;
    lb.counter.textContent = `${lb.index + 1} / ${lb.items.length}`;
    lb.source.href = thumb.dataset.source || full;

    // Preload neighbours for instant navigation.
    [lb.index + 1, lb.index - 1].forEach((i) => {
      const neighbour = lb.items[(i + lb.items.length) % lb.items.length];
      const nImg = neighbour ? $('img', neighbour) : null;
      if (nImg && nImg.dataset.full) {
        const pre = new Image();
        pre.src = nImg.dataset.full;
      }
    });
  };

  const openLightbox = (item) => {
    lb.items = visibleGalleryItems();
    const start = lb.items.indexOf(item);
    if (start < 0) return;
    lb.lastFocus = document.activeElement;
    lb.root.hidden = false;
    scrollLock.add('lightbox');
    showSlide(start);
    const close = $('[data-lb-close]', lb.root);
    if (close) close.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    if (!lb.root || lb.root.hidden) return;
    lb.root.hidden = true;
    lb.img.removeAttribute('src');
    scrollLock.remove('lightbox');
    if (lb.lastFocus && typeof lb.lastFocus.focus === 'function') lb.lastFocus.focus({ preventScroll: true });
  };

  const initGallery = () => {
    const grid = $('#galleryGrid');
    lb.root = $('#lightbox');
    lb.img = $('#lbImg');
    lb.caption = $('#lbCaption');
    lb.counter = $('#lbCounter');
    lb.source = $('#lbSource');
    if (!grid || !lb.root || !lb.img) return;

    // Filters
    const chips = $$('.gallery__filters .chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        chips.forEach((c) => {
          const active = c === chip;
          c.classList.toggle('is-active', active);
          c.setAttribute('aria-pressed', String(active));
        });
        $$('.g-item', grid).forEach((item) => {
          const show = filter === 'all' || item.dataset.cat === filter;
          item.classList.toggle('is-hidden', !show);
        });
      });
    });

    // Open
    grid.addEventListener('click', (event) => {
      const btn = event.target.closest('.g-item__btn');
      if (!btn) return;
      const item = btn.closest('.g-item');
      if (item && !item.classList.contains('is-missing')) openLightbox(item);
    });

    // Controls
    $('#lbPrev').addEventListener('click', () => showSlide(lb.index - 1));
    $('#lbNext').addEventListener('click', () => showSlide(lb.index + 1));
    $$('[data-lb-close]', lb.root).forEach((btn) => btn.addEventListener('click', closeLightbox));
    lb.root.addEventListener('click', (event) => {
      if (event.target === lb.root) closeLightbox();
    });

    document.addEventListener('keydown', (event) => {
      if (lb.root.hidden) return;
      if (event.key === 'Escape') closeLightbox();
      else if (event.key === 'ArrowRight') showSlide(lb.index + 1);
      else if (event.key === 'ArrowLeft') showSlide(lb.index - 1);
      else trapFocus(lb.root, event);
    });

    // Swipe on touch devices
    lb.root.addEventListener('touchstart', (event) => {
      lb.touchX = event.changedTouches[0].clientX;
    }, { passive: true });
    lb.root.addEventListener('touchend', (event) => {
      if (lb.touchX === null) return;
      const dx = event.changedTouches[0].clientX - lb.touchX;
      if (Math.abs(dx) > 50) showSlide(lb.index + (dx < 0 ? 1 : -1));
      lb.touchX = null;
    }, { passive: true });
  };

  /* ------------------------------------------------------------------------
     Toast notifications
     ------------------------------------------------------------------------ */
  const toast = (() => {
    let timer = null;
    const show = (title, text, variant = 'info') => {
      const root = $('#toast');
      if (!root) return;
      $('#toastTitle').textContent = title;
      $('#toastText').textContent = text;
      root.classList.toggle('toast--success', variant === 'success');
      const icon = $('.toast__icon', root);
      if (icon) {
        icon.className = `fa-solid ${variant === 'success' ? 'fa-circle-check' : 'fa-circle-info'} toast__icon`;
      }
      root.hidden = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { root.hidden = true; }, 7000);
    };
    const hide = () => {
      const root = $('#toast');
      if (root) root.hidden = true;
      window.clearTimeout(timer);
    };
    return { show, hide };
  })();

  const initToast = () => {
    const close = $('#toastClose');
    if (close) close.addEventListener('click', toast.hide);

    // Demo-only links (social networks) — honest notice instead of a dead "#".
    $$('[data-demo="social"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const network = (link.getAttribute('aria-label') || 'Соцсеть').replace(' (демо)', '');
        toast.show('Демонстрационный режим', `Страница ${network} ещё не создана — ссылка появится после запуска проекта.`);
      });
    });
  };

  /* ------------------------------------------------------------------------
     8. Contact form validation (demo mode, nothing is sent)
     ------------------------------------------------------------------------ */
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const validators = {
    name: (v) => {
      if (!v.trim()) return 'Введите ваше имя.';
      if (v.trim().length < 2) return 'Имя должно содержать минимум 2 символа.';
      if (!/^[\p{L}\s'-]+$/u.test(v.trim())) return 'Имя может содержать только буквы, пробел, дефис и апостроф.';
      return '';
    },
    email: (v) => {
      if (!v.trim()) return 'Введите email.';
      if (!EMAIL_RE.test(v.trim())) return 'Проверьте формат email, например name@mail.com.';
      return '';
    },
    subject: (v) => (v ? '' : 'Выберите тему обращения.'),
    message: (v) => {
      if (!v.trim()) return 'Напишите сообщение.';
      if (v.trim().length < 10) return `Слишком коротко: ещё ${10 - v.trim().length} симв. минимум.`;
      return '';
    },
  };

  const initForm = () => {
    const form = $('#contactForm');
    if (!form) return;
    const fields = Object.keys(validators).map((name) => form.elements[name]).filter(Boolean);
    const counter = $('#messageCount');
    const submit = $('.form__submit', form);

    const validateField = (field) => {
      const message = validators[field.name](field.value);
      const wrap = field.closest('.form__field');
      const error = $(`#${field.name}Error`);
      if (error) error.textContent = message;
      field.setAttribute('aria-invalid', String(Boolean(message)));
      if (wrap) {
        wrap.classList.toggle('has-error', Boolean(message));
        wrap.classList.toggle('is-valid', !message);
      }
      return !message;
    };

    fields.forEach((field) => {
      field.addEventListener('blur', () => {
        if (field.value || field.dataset.touched) validateField(field);
        field.dataset.touched = 'true';
      });
      field.addEventListener('input', () => {
        if (field.dataset.touched) validateField(field);
      });
      field.addEventListener('change', () => {
        if (field.tagName === 'SELECT') validateField(field);
      });
    });

    const message = form.elements.message;
    if (message && counter) {
      const updateCount = () => { counter.textContent = `${message.value.length} / ${message.maxLength}`; };
      message.addEventListener('input', updateCount);
      updateCount();
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const results = fields.map((field) => {
        field.dataset.touched = 'true';
        return validateField(field);
      });
      const firstInvalid = fields[results.indexOf(false)];
      if (firstInvalid) {
        firstInvalid.focus();
        toast.show('Проверьте форму', 'Некоторые поля заполнены неверно — подсказки под полями.');
        return;
      }

      submit.disabled = true;
      const name = form.elements.name.value.trim();
      window.setTimeout(() => {
        submit.disabled = false;
        form.reset();
        fields.forEach((field) => {
          delete field.dataset.touched;
          field.removeAttribute('aria-invalid');
          const wrap = field.closest('.form__field');
          if (wrap) wrap.classList.remove('is-valid', 'has-error');
        });
        if (counter) counter.textContent = `0 / ${message.maxLength}`;
        toast.show(
          `Спасибо, ${name}! Форма заполнена верно`,
          'Это демонстрационный режим: сервер не подключён, поэтому сообщение никуда не отправлено.',
          'success'
        );
      }, 400);
    });
  };

  /* ------------------------------------------------------------------------
     11. Dynamic copyright year
     ------------------------------------------------------------------------ */
  const initYear = () => {
    const year = $('#year');
    if (year) year.textContent = String(new Date().getFullYear());
  };

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */
  const boot = () => {
    safeInit('images', initImages);
    safeInit('hero', initHero);
    safeInit('mobile navigation', initMobileNav);
    safeInit('sticky navbar & back to top', initScrollState);
    safeInit('smooth scrolling', initSmoothScroll);
    safeInit('active link', initActiveLink);
    safeInit('scroll reveal', initReveal);
    safeInit('accordion', initAccordion);
    safeInit('destination modal', initModal);
    safeInit('gallery & lightbox', initGallery);
    safeInit('toast', initToast);
    safeInit('contact form', initForm);
    safeInit('copyright year', initYear);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();