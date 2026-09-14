/* ==========================================================================
   Bricks Law LLP — site behaviour
   Vanilla, dependency-free, progressively enhanced.
   Everything here degrades gracefully: with JS off, all content stays visible
   and every link/anchor still works.
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  root.classList.remove('no-js');
  root.classList.add('js');

  /* --------------------------------------------------------------- helpers */
  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function on(el, type, sel, fn) {
    if (!el) return;
    if (typeof sel === 'function') { el.addEventListener(type, sel); return; }
    el.addEventListener(type, function (e) {
      var target = e.target.closest(sel);
      if (target && el.contains(target)) fn(e, target);
    });
  }

  /* ------------------------------------------------------------ header/CTA */
  var header = qs('.site-header');
  var progress = qs('.scroll-progress');
  var toTop = qs('.to-top');
  var callbar = qs('.mobile-callbar');
  var ticking = false;

  function onScroll() {
    var y = window.pageYOffset || doc.documentElement.scrollTop || 0;
    if (header) header.classList.toggle('is-stuck', y > 24);
    if (progress) {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      progress.style.setProperty('--progress', max > 0 ? Math.min(y / max, 1).toFixed(4) : 0);
    }
    if (toTop) toTop.classList.toggle('is-visible', y > 700);
    if (callbar) callbar.classList.toggle('is-visible', y > 460);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------- nav drawer */
  var toggle = qs('.nav-toggle');
  var drawer = qs('.mobile-nav');
  var lastFocus = null;

  function setNav(open) {
    if (!drawer || !toggle) return;
    root.classList.toggle('nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    doc.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      lastFocus = doc.activeElement;
      var first = qs('a, button', drawer);
      if (first) first.focus();
    } else if (lastFocus) {
      lastFocus.focus();
    }
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
  }
  qsa('[data-nav-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { setNav(false); });
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('nav-open')) setNav(false);
  });
  on(doc, 'click', '.mobile-nav a', function () { setNav(false); });
  doc.addEventListener('click', function (e) {
    if (!root.classList.contains('nav-open')) return;
    if (drawer && (drawer.contains(e.target) || (toggle && toggle.contains(e.target)))) return;
    setNav(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1080 && root.classList.contains('nav-open')) setNav(false);
  }, { passive: true });

  /* keyboard trap inside drawer while open */
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab' || !root.classList.contains('nav-open') || !drawer) return;
    var items = qsa('a[href], button:not([disabled])', drawer).filter(function (el) { return el.offsetParent !== null; });
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ---------------------------------------------------- reveal on scroll */
  if ('IntersectionObserver' in window && !reduceMotion) {
    /* children of a [data-reveal-group] stagger in automatically */
    qsa('[data-reveal-group]').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (child.hasAttribute('data-reveal')) return;
        child.setAttribute('data-reveal', '');
        child.setAttribute('data-reveal-delay', String(Math.min(i * 90, 450)));
      });
    });

    var revealables = qsa('[data-reveal]');
    revealables.forEach(function (el) { el.classList.add('reveal-hidden'); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
        window.setTimeout(function () {
          el.classList.remove('reveal-hidden');
          el.classList.add('reveal-shown');
        }, delay);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealables.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------ counters */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count-to') || '0');
    var decimals = parseInt(el.getAttribute('data-count-decimals') || '0', 10);
    var duration = parseInt(el.getAttribute('data-count-duration') || '1600', 10);
    var prefix = el.getAttribute('data-count-prefix') || '';
    var suffix = el.getAttribute('data-count-suffix') || '';

    function format(value) {
      var text = value.toFixed(decimals);
      var parts = text.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return prefix + parts.join('.') + suffix;
    }

    if (reduceMotion) { el.textContent = format(target); return; }

    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased);
      if (p < 1) window.requestAnimationFrame(frame);
    }
    el.textContent = format(0);
    window.requestAnimationFrame(frame);
  }

  var counters = qsa('[data-count-to]');
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCount(entry.target);
          cio.unobserve(entry.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(animateCount);
    }
  }

  /* ------------------------------------------------------ seamless ticker */
  var ticker = qs('.ticker-track');
  if (ticker && !reduceMotion) {
    ticker.insertAdjacentHTML('beforeend', ticker.innerHTML);
    ticker.setAttribute('aria-hidden', 'false');
  }

  /* ------------------------------------------------- accordion (one open) */
  var acc = qs('.accordion[data-accordion="single"]');
  if (acc) {
    /* the toggle event does not bubble in every engine: bind per panel */
    qsa('details', acc).forEach(function (el) {
      el.addEventListener('toggle', function () {
        if (!el.open) return;
        qsa('details[open]', acc).forEach(function (other) { if (other !== el) other.removeAttribute('open'); });
      });
    });
  }

  /* ------------------------------------------------------------ lightbox */
  var galItems = qsa('[data-lightbox]');
  if (galItems.length) {
    var box = doc.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Image viewer');
    box.setAttribute('data-open', 'false');
    box.innerHTML =
      '<button class="lightbox-close" type="button" aria-label="Close image viewer">' +
      '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<button class="lightbox-nav prev" type="button" aria-label="Previous image">' +
      '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
      '<button class="lightbox-nav next" type="button" aria-label="Next image">' +
      '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
      '<figure><img alt=""><figcaption></figcaption></figure>';
    doc.body.appendChild(box);

    var lbImg = qs('img', box);
    var lbCap = qs('figcaption', box);
    var index = 0;

    function show(i) {
      index = (i + galItems.length) % galItems.length;
      var item = galItems[index];
      var full = item.getAttribute('data-full') || item.getAttribute('href');
      lbImg.src = full;
      lbImg.alt = item.getAttribute('data-caption') || '';
      lbCap.textContent = item.getAttribute('data-caption') || '';
    }
    function open(i) {
      show(i);
      box.setAttribute('data-open', 'true');
      doc.body.style.overflow = 'hidden';
      qs('.lightbox-close', box).focus();
    }
    function close() {
      box.setAttribute('data-open', 'false');
      doc.body.style.overflow = '';
      if (galItems[index]) galItems[index].focus();
    }

    galItems.forEach(function (item, i) {
      item.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    });
    qs('.lightbox-close', box).addEventListener('click', close);
    qs('.lightbox-nav.prev', box).addEventListener('click', function () { show(index - 1); });
    qs('.lightbox-nav.next', box).addEventListener('click', function () { show(index + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    doc.addEventListener('keydown', function (e) {
      if (box.getAttribute('data-open') !== 'true') return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* ------------------------------------------------- filter chips (team) */
  var filters = qs('[data-filter-group]');
  if (filters) {
    on(filters, 'click', '[data-filter]', function (e, btn) {
      e.preventDefault();
      var value = btn.getAttribute('data-filter');
      qsa('[data-filter]', filters).forEach(function (b) {
        var active = b === btn;
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      var visible = 0;
      qsa('[data-filter-tags]').forEach(function (card) {
        var tags = (card.getAttribute('data-filter-tags') || '').split(/\s+/);
        var match = value === 'all' || tags.indexOf(value) > -1;
        card.hidden = !match;
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      var count = qs('[data-filter-count]');
      if (count) {
        var noun = count.getAttribute('data-noun') || 'item';
        count.textContent = visible + ' ' + noun + (visible === 1 ? '' : 's');
      }
    });
  }

  /* ------------------------------------------------------- form handling */
  qsa('form[data-validate]').forEach(function (form) {
    var status = qs('[data-form-status]', form) || qs('.form-status');

    function fieldOf(input) { return input.closest('.field'); }

    function validateField(input) {
      var field = fieldOf(input);
      if (!field) return true;
      var error = '';
      var value = (input.value || '').trim();

      if (input.hasAttribute('required') && !value) {
        error = input.getAttribute('data-error-required') || 'This field is required.';
      } else if (input.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
        error = 'Enter a valid email address, e.g. name@company.com.';
      } else if (input.type === 'tel' && value && value.replace(/\D/g, '').length < 7) {
        error = 'Enter a phone number with at least 7 digits.';
      } else if (input.getAttribute('data-min-chars') && value.length < parseInt(input.getAttribute('data-min-chars'), 10)) {
        error = 'Please add a little more detail (' + input.getAttribute('data-min-chars') + '+ characters).';
      } else if (input.type === 'checkbox' && input.hasAttribute('required') && !input.checked) {
        error = 'Please confirm before sending.';
      }

      field.setAttribute('data-invalid', error ? 'true' : 'false');
      var msg = qs('.error-msg', field);
      if (msg) {
        msg.textContent = error || msg.getAttribute('data-default') || '';
      }
      input.setAttribute('aria-invalid', error ? 'true' : 'false');
      return !error;
    }

    qsa('input, select, textarea', form).forEach(function (input) {
      input.addEventListener('blur', function () { if (input.value !== '') validateField(input); });
      input.addEventListener('input', function () {
        var field = fieldOf(input);
        if (field && field.getAttribute('data-invalid') === 'true') validateField(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = qsa('input, select, textarea', form);
      var firstInvalid = null;
      fields.forEach(function (input) {
        if (input.disabled || input.type === 'hidden') return;
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });

      if (firstInvalid) {
        firstInvalid.focus();
        if (status) {
          status.setAttribute('data-show', 'error');
          status.textContent = 'Please review the highlighted fields and try again.';
        }
        return;
      }

      var submit = qs('button[type="submit"]', form);
      var original = submit ? submit.textContent : '';
      if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }

      /* Demo build: no back-end is wired up yet. Replace this block with a
         fetch() to your intake endpoint or a form service (Formspree,
         Netlify Forms, HubSpot) to go live. */
      setTimeout(function () {
        if (submit) { submit.disabled = false; submit.textContent = original; }
        form.reset();
        if (status) {
          status.setAttribute('data-show', 'success');
          status.textContent = 'Thank you — your request has been logged. A member of our intake team will reply within one business day. For urgent matters call (713) 555-0142.';
          status.setAttribute('tabindex', '-1');
          status.focus();
        }
      }, 700);
    });
  });

  /* ------------------------------------------------------- scroll-spy TOC */
  var tocLinks = qsa('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var targets = Object.keys(map).map(function (id) { return doc.getElementById(id); }).filter(Boolean);
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var link = map[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          tocLinks.forEach(function (a) { a.classList.remove('active'); });
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    targets.forEach(function (t) { tio.observe(t); });
  }

  /* --------------------------------------------------- active nav on scroll */
  var sectionLinks = qsa('.nav a[href^="#"]');
  if (sectionLinks.length && 'IntersectionObserver' in window) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        sectionLinks.forEach(function (a) {
          a.setAttribute('aria-current', a.getAttribute('href') === '#' + entry.target.id ? 'page' : 'false');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sectionLinks.forEach(function (a) {
      var el = doc.getElementById(a.getAttribute('href').slice(1));
      if (el) sio.observe(el);
    });
  }

  /* --------------------------------------------------------------- footer */
  qsa('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
