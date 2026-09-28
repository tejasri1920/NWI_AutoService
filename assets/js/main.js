(function () {
  'use strict';

  var header = document.getElementById('site-header');
  var toggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('mobile-menu');

  /* Header shadow once the page scrolls */
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.hidden = !open;
  }

  toggle.addEventListener('click', function () {
    setMenu(toggle.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });

  window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
    if (mq.matches) setMenu(false);
  });

  /* Live shop status, computed in Hammond's time zone (America/Chicago) */
  var HOURS = { 0: [9, 17], 1: [8, 20], 2: [8, 20], 3: [8, 20], 4: [8, 20], 5: [8, 20], 6: [8, 20] };
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function formatHour(h) {
    var suffix = h >= 12 ? 'PM' : 'AM';
    return (h % 12 || 12) + ' ' + suffix;
  }

  function hammondNow() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      weekday: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23'
    }).formatToParts(new Date());
    var get = function (type) {
      return parts.filter(function (p) { return p.type === type; })[0].value;
    };
    return {
      day: DAYS.indexOf(get('weekday')),
      minutes: (parseInt(get('hour'), 10) % 24) * 60 + parseInt(get('minute'), 10)
    };
  }

  function renderShopStatus() {
    var els = document.querySelectorAll('[data-shop-status]');
    if (!els.length) return;

    var now;
    try { now = hammondNow(); } catch (err) { return; } // keep static hours text
    if (now.day < 0) return;

    var rows = document.querySelectorAll('.hours-table tr[data-day]');
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.toggle('is-today', Number(rows[i].getAttribute('data-day')) === now.day);
    }

    var today = HOURS[now.day];
    var openAt = today[0] * 60;
    var closeAt = today[1] * 60;
    var html;

    if (now.minutes >= openAt && now.minutes < closeAt) {
      html = '<span class="status-open">Open now</span> · until ' + formatHour(today[1]) + ' today';
    } else {
      var next = now.minutes < openAt
        ? 'opens today at ' + formatHour(today[0])
        : 'opens ' + DAYS[(now.day + 1) % 7] + ' at ' + formatHour(HOURS[(now.day + 1) % 7][0]);
      html = '<span class="status-closed">Closed</span> · ' + next + ' · towing still 24/7';
    }

    for (var j = 0; j < els.length; j++) {
      if (els[j].innerHTML !== html) els[j].innerHTML = html;
    }
  }

  renderShopStatus();
  setInterval(renderShopStatus, 60000);

  /* Footer year */
  var yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Mark the section currently in view in the desktop nav */
  var navLinks = document.querySelectorAll('.nav-link');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    for (var n = 0; n < navLinks.length; n++) byId[navLinks[n].getAttribute('href').slice(1)] = navLinks[n];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        for (var k in byId) byId[k].removeAttribute('aria-current');
        byId[entry.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) observer.observe(section);
    });
  }

  /* Quick estimate form
     Set data-endpoint on the form to a POST endpoint (e.g. a Formspree URL) to
     deliver submissions. Without one, the form hands the request off as a text
     message to the shop phone. */
  var form = document.getElementById('quote-form');
  if (!form) return;

  var SHOP_PHONE = '2193339293';
  var status = document.getElementById('quote-status');
  var submitBtn = form.querySelector('button[type="submit"]');
  var vehicleGroup = form.querySelector('.segmented');

  function digits(value) { return value.replace(/\D/g, ''); }

  function validPhone(value) {
    var d = digits(value);
    return d.length === 10 || (d.length === 11 && d.charAt(0) === '1');
  }

  function setError(input, errorId, invalid) {
    var err = document.getElementById(errorId);
    if (input) input.setAttribute('aria-invalid', String(invalid));
    err.hidden = !invalid;
  }

  function validate() {
    var name = form.elements.name;
    var phone = form.elements.phone;
    var service = form.elements.service;
    var vehicle = form.querySelector('input[name="vehicle"]:checked');

    var nameBad = name.value.trim().length < 2;
    var phoneBad = !validPhone(phone.value);
    var vehicleBad = !vehicle;
    var serviceBad = !service.value;

    setError(name, 'q-name-error', nameBad);
    setError(phone, 'q-phone-error', phoneBad);
    setError(service, 'q-service-error', serviceBad);
    document.getElementById('q-vehicle-error').hidden = !vehicleBad;
    vehicleGroup.setAttribute('data-invalid', String(vehicleBad));

    var firstBad = nameBad ? name
      : phoneBad ? phone
      : vehicleBad ? form.querySelector('input[name="vehicle"]')
      : serviceBad ? service
      : null;
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function showStatus(kind, html) {
    status.className = 'form-status is-' + kind;
    status.innerHTML = html;
    status.hidden = false;
  }

  function formatPhone(value) {
    var d = digits(value).slice(-10);
    return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
  }

  function smsBody() {
    return 'Estimate request from ' + form.elements.name.value.trim() +
      '\nPhone: ' + formatPhone(form.elements.phone.value) +
      '\nVehicle: ' + form.querySelector('input[name="vehicle"]:checked').value +
      '\nService: ' + form.elements.service.value;
  }

  // Clear an error as soon as the field is fixed
  form.addEventListener('input', function (e) {
    var t = e.target;
    if (t.getAttribute('aria-invalid') === 'true') {
      var ok = t.name === 'phone' ? validPhone(t.value) : t.name === 'name' ? t.value.trim().length >= 2 : !!t.value;
      if (ok) setError(t, 'q-' + t.name + '-error', false);
    }
  });
  form.addEventListener('change', function (e) {
    if (e.target.name === 'vehicle') {
      document.getElementById('q-vehicle-error').hidden = true;
      vehicleGroup.setAttribute('data-invalid', 'false');
    }
    if (e.target.name === 'service' && e.target.value) setError(e.target, 'q-service-error', false);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    status.hidden = true;
    if (!validate()) return;

    var endpoint = form.getAttribute('data-endpoint');

    if (endpoint) {
      submitBtn.disabled = true;
      fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      }).then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        form.reset();
        showStatus('success', '<strong>Got it. Thanks!</strong> Roberto will call or text you shortly. Need help right now? <a href="tel:' + SHOP_PHONE + '">Call (219) 333-9293</a>.');
      }).catch(function () {
        showStatus('error', 'Sorry, that didn\'t go through. Please <a href="tel:' + SHOP_PHONE + '">call (219) 333-9293</a> and we\'ll quote you over the phone.');
      }).then(function () {
        submitBtn.disabled = false;
      });
      return;
    }

    var smsHref = 'sms:' + SHOP_PHONE + '?&body=' + encodeURIComponent(smsBody());
    showStatus('success',
      '<strong>Almost done.</strong> Your request is ready to send as a text to Roberto. ' +
      '<a href="' + smsHref + '">Open it in Messages</a>, or ' +
      '<a href="tel:' + SHOP_PHONE + '">call (219) 333-9293</a> for a quote right away.');

    if (window.matchMedia('(pointer: coarse)').matches) {
      window.location.href = smsHref;
    }
  });
})();
