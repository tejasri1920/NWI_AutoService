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
    var el = document.querySelector('[data-shop-status]');
    if (!el) return;

    var now;
    try { now = hammondNow(); } catch (err) { return; } // keep static hours text
    if (now.day < 0) return;

    var today = HOURS[now.day];
    var openAt = today[0] * 60;
    var closeAt = today[1] * 60;

    if (now.minutes >= openAt && now.minutes < closeAt) {
      el.innerHTML = '<span class="status-open">Open now</span> · until ' + formatHour(today[1]) + ' today';
      return;
    }

    var next = now.minutes < openAt
      ? 'opens today at ' + formatHour(today[0])
      : 'opens ' + DAYS[(now.day + 1) % 7] + ' at ' + formatHour(HOURS[(now.day + 1) % 7][0]);
    el.innerHTML = '<span class="status-closed">Closed</span> · ' + next + ' · towing still 24/7';
  }

  renderShopStatus();
  setInterval(renderShopStatus, 60000);
})();
