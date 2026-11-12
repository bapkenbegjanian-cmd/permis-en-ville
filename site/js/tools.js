// Staralyn : outils (accueil, trouver son signe, compatibilite, lune, tarot, horoscope chinois, numerologie)
(function () {
  "use strict";
  var dataEl = document.getElementById("page-data");
  if (!dataEl || !window.Astro) return;
  var D = JSON.parse(dataEl.textContent);
  var S = D.strings || {};
  var A = window.Astro;
  var store = (window.SL && window.SL.store) || { get: function () { return null; }, set: function () {} };
  var reduce = window.SL && window.SL.reduce;
  var $ = function (id) { return document.getElementById(id); };
  var VS15 = String.fromCharCode(0xfe0e);

  function fmt(s, v) {
    for (var k in v) s = s.split("{" + k + "}").join(v[k]);
    return s;
  }
  function parseDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1900) return null;
    return { y: y, mo: mo, d: d };
  }
  function signBy(id) {
    for (var i = 0; i < D.signs.length; i++) if (D.signs[i].id === id) return D.signs[i];
    return null;
  }
  function localKey(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  // meme dessin que celui du serveur (src/render.js)
  function moonSvg(frac, size) {
    var r = size / 2 - 4, c = size / 2;
    var k = Math.cos(2 * Math.PI * frac);
    var waxing = frac < 0.5;
    var rx = Math.abs(k) * r;
    var outer = waxing ? 1 : 0;
    var term = k > 0 ? (waxing ? 0 : 1) : waxing ? 1 : 0;
    var d = "M " + c + " " + (c - r) + " A " + r + " " + r + " 0 0 " + outer + " " + c + " " + (c + r) + " A " + rx.toFixed(2) + " " + r + " 0 0 " + term + " " + c + " " + (c - r) + " Z";
    var id = "mg" + size + "x" + Math.round(frac * 1000);
    return '<svg class="moon-svg" viewBox="0 0 ' + size + " " + size + '" role="img" aria-label="moon"><defs><radialGradient id="' + id + '" cx="40%" cy="38%" r="70%"><stop offset="0" stop-color="#fffbe9"/><stop offset="1" stop-color="#e8dcb4"/></radialGradient></defs><circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="#171538" stroke="rgba(255,255,255,.14)"/><path d="' + d + '" fill="url(#' + id + ')"/></svg>';
  }
  function countUp(el, to, ms) {
    if (reduce) { el.textContent = to; return; }
    var t0 = Date.now();
    var timer = setInterval(function () {
      var p = Math.min(1, (Date.now() - t0) / ms);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) clearInterval(timer);
    }, 30);
  }
  function signResult(sg) {
    return sg.glyph + " " + fmt(S["finder.result"], { sign: sg.name });
  }

  /* ================= ACCUEIL ================= */
  function initHome() {
    var mineId = store.get("sl_sign");
    var banner = $("mine-banner");
    if (banner && mineId && signBy(mineId)) {
      var sg = signBy(mineId);
      banner.href = sg.url;
      banner.textContent = sg.glyph + " " + fmt(S["home.yourSign"], { sign: sg.name }) + " →";
      banner.hidden = false;
    }
    var form = $("home-finder");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var out = $("home-finder-out");
        var d = parseDate($("home-birth").value);
        out.textContent = "";
        if (!d) { out.textContent = S["form.invalid"]; return; }
        var s = A.signFor(d.mo, d.d);
        var sg2 = signBy(s.id);
        var a = document.createElement("a");
        a.href = sg2.url;
        a.textContent = signResult(sg2) + " →";
        out.appendChild(a);
        store.set("sl_sign", s.id);
      });
    }
    // lune du moment du visiteur
    var st = A.moonState(new Date());
    var box = $("home-moon");
    if (box) box.innerHTML = moonSvg(st.frac, 120);
    if ($("home-moon-name")) $("home-moon-name").textContent = S["moon.p" + st.phase];
    if ($("home-moon-pct")) $("home-moon-pct").textContent = fmt(S["moon.illumination"], { n: Math.round(st.illumination * 100) });
  }

  /* ================= TROUVER SON SIGNE ================= */
  function initFinder() {
    $("date-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var res = $("result");
      var d = parseDate($("birth").value);
      if (!d) { res.hidden = false; $("result-title").textContent = S["form.invalid"]; $("result-text").textContent = ""; $("result-link").hidden = true; return; }
      var s = A.signFor(d.mo, d.d);
      var sg = signBy(s.id);
      res.hidden = false;
      var orb = $("result-orb");
      orb.style.setProperty("--hue", sg.hue);
      orb.firstChild.textContent = sg.glyph;
      $("result-title").textContent = fmt(S["finder.result"], { sign: sg.name });
      $("result-text").textContent = S["sign.element"] + " : " + S["el." + s.element] + " · " + S["sign.modality"] + " : " + S["mod." + s.modality] + " · " + S["sign.ruler"] + " : " + S["pl." + s.ruler];
      var link = $("result-link");
      link.hidden = false;
      link.href = sg.url;
      store.set("sl_sign", s.id);
    });
  }

  /* ================= COMPATIBILITE ================= */
  function initCompat() {
    var a = $("sign-a"), b = $("sign-b");
    var q = new URLSearchParams(location.search);
    if (q.get("a") && signBy(q.get("a"))) a.value = q.get("a");
    if (q.get("b") && signBy(q.get("b"))) b.value = q.get("b");
    function run() {
      var c = A.compatibility(a.value, b.value);
      var sa = signBy(a.value), sb = signBy(b.value);
      $("compat-names").textContent = fmt(S["compat.both"], { a: sa.glyph + " " + sa.name, b: sb.glyph + " " + sb.name });
      $("compat-text").textContent = D.compat[c.elementPair] || "";
      var more = $("compat-more");
      if (more && D.pairBase) {
        var ids = D.signs.map(function (s) { return s.id; });
        var first = ids.indexOf(a.value) <= ids.indexOf(b.value) ? sa : sb;
        var second = first === sa ? sb : sa;
        var slug = function (s) { return s.url.split("/")[2]; };
        more.href = D.pairBase + slug(first) + "-" + slug(second) + "/";
        more.hidden = false;
      }
      var res = $("compat-result");
      res.hidden = false;
      var fg = $("ring-fg");
      fg.style.strokeDashoffset = "326.7";
      ["love", "friendship", "work"].forEach(function (k) { $("bar-" + k).style.width = "0"; $("val-" + k).textContent = "0"; });
      $("score-overall").textContent = "0";
      setTimeout(function () {
        fg.style.strokeDashoffset = String(326.7 * (1 - c.overall / 100));
        countUp($("score-overall"), c.overall, 1300);
        ["love", "friendship", "work"].forEach(function (k) {
          $("bar-" + k).style.width = c[k] + "%";
          countUp($("val-" + k), c[k], 1200);
        });
      }, 60);
      if (!reduce) res.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    $("compat-form").addEventListener("submit", function (e) { e.preventDefault(); run(); });
    if (q.get("a")) run();
  }

  /* ================= LUNE ================= */
  function initMoon() {
    var now = new Date();
    var st = A.moonState(now);
    $("moon-big").innerHTML = moonSvg(st.frac, 240);
    $("moon-phase").textContent = S["moon.p" + st.phase];
    $("moon-illum").textContent = fmt(S["moon.illumination"], { n: Math.round(st.illumination * 100) });
    $("moon-age").textContent = fmt(S["moon.age"], { n: new Intl.NumberFormat(D.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(st.age) });
    var loc = D.locale;
    var dayFmt = new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long" });
    $("next-full").textContent = dayFmt.format(st.nextFull);
    $("next-new").textContent = dayFmt.format(st.nextNew);

    // calendrier du mois en cours (lundi en premier)
    var y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1);
    var days = new Date(y, m + 1, 0).getDate();
    var offset = (first.getDay() + 6) % 7;
    // phases principales du mois (instants exacts)
    var major = {};
    var k0 = Math.floor((y - 2000) * 12.3685 + (m / 12) * 12.3685) - 2;
    var names = { 0: "moon.p0", 0.25: "moon.p2", 0.5: "moon.p4", 0.75: "moon.p6" };
    for (var j = 0; j < 6; j++) {
      [0, 0.25, 0.5, 0.75].forEach(function (ph) {
        var dt = A.moonPhaseDate(k0 + j + ph);
        if (dt.getFullYear() === y && dt.getMonth() === m) major[dt.getDate()] = S[names[ph]];
      });
    }
    var html = "";
    var ref = new Date(2024, 0, 1); // un lundi
    for (var w = 0; w < 7; w++) html += '<div class="cal-head">' + new Intl.DateTimeFormat(loc, { weekday: "short" }).format(new Date(ref.getTime() + w * 86400000)) + "</div>";
    for (var e = 0; e < offset; e++) html += '<div class="cal-day empty"></div>';
    for (var d = 1; d <= days; d++) {
      var s2 = A.moonState(new Date(y, m, d, 12));
      var cls = "cal-day" + (d === now.getDate() ? " today" : "") + (major[d] ? " major" : "");
      html += '<div class="' + cls + '"' + (major[d] ? ' title="' + major[d] + '"' : "") + ">" + moonSvg(s2.frac, 44) + "<span>" + d + "</span></div>";
    }
    $("moon-cal").innerHTML = html;
  }

  /* ================= TAROT ================= */
  var ART = ["☆", "☿", "☽", "♀", "♂", "☩", "♡", "♞", "♌", "✧", "☸", "♎", "♆", "☠", "♒", "♑", "☄", "★", "☾", "☀", "☼", "♁"];
  function initTarot() {
    var card = $("tarot-card");
    var btn = $("tarot-draw");
    var current = null;
    var today = localKey(new Date());
    function show(id, animate) {
      var i = D.ids.indexOf(id);
      var c = D.cards[id];
      $("card-num").textContent = D.roman[i];
      $("card-art").textContent = ART[i] + VS15;
      $("card-name").textContent = c.name;
      $("tarot-title").textContent = c.name;
      $("tarot-meaning").textContent = c.meaning;
      $("tarot-advice").textContent = c.advice;
      var reveal = function () {
        card.classList.add("flipped");
        $("tarot-read").hidden = false;
        $("tarot-label").hidden = false;
        btn.hidden = true;
        $("tarot-redraw").hidden = false;
        current = id;
      };
      if (animate && !reduce) setTimeout(reveal, 450);
      else reveal();
      // la lecture est sous la carte : on y amene le visiteur une fois la carte retournee
      if (animate) setTimeout(function () { $("tarot-read").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }, reduce ? 60 : 1500);
    }
    var saved = null;
    try { saved = JSON.parse(store.get("sl_tarot") || "null"); } catch (e) { saved = null; }
    if (saved && saved.d === today && D.cards[saved.id]) show(saved.id, false);
    function pick() {
      var id;
      do {
        var buf = new Uint32Array(1);
        if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
        else buf[0] = Math.floor(Math.random() * 4294967295);
        id = D.ids[buf[0] % D.ids.length];
      } while (id === current && D.ids.length > 1);
      return id;
    }
    function draw() {
      // carte deja retournee : un clic ramene simplement a sa lecture
      if (card.classList.contains("flipped")) {
        $("tarot-read").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
        return;
      }
      var id = pick();
      store.set("sl_tarot", JSON.stringify({ d: today, id: id }));
      show(id, true);
    }
    function redraw() {
      card.classList.remove("flipped");
      $("tarot-read").hidden = true;
      $("tarot-redraw").hidden = true;
      var id = pick();
      store.set("sl_tarot", JSON.stringify({ d: today, id: id }));
      setTimeout(function () { show(id, true); }, reduce ? 0 : 750);
    }
    card.addEventListener("click", draw);
    btn.addEventListener("click", draw);
    $("tarot-redraw").addEventListener("click", redraw);
  }

  /* ================= HOROSCOPE CHINOIS ================= */
  function initChinese() {
    $("date-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var res = $("result");
      var d = parseDate($("birth").value);
      res.hidden = false;
      if (!d) { $("result-title").textContent = S["form.invalid"]; $("result-text").textContent = ""; $("result-note").textContent = ""; return; }
      var c = A.chineseSign(d.y, d.mo, d.d);
      $("result-title").textContent = fmt(S["chinese.result"], { animal: S["an." + c.animal], element: S["ce." + c.element] });
      $("result-text").textContent = D.texts[c.animal];
      var cny = new Intl.DateTimeFormat(D.locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(c.newYear.year, c.newYear.month - 1, c.newYear.day, 12)));
      $("result-note").textContent = fmt(S["chinese.newyear"], { year: c.newYear.year, date: cny });
    });
  }

  /* ================= NUMEROLOGIE ================= */
  function initNumerology() {
    $("date-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var res = $("result");
      var d = parseDate($("birth").value);
      res.hidden = false;
      if (!d) { $("result-num").textContent = ""; $("result-title").textContent = S["form.invalid"]; $("result-text").textContent = ""; return; }
      var n = A.lifePath(d.y, d.mo, d.d);
      $("result-num").textContent = n;
      $("result-title").textContent = fmt(S["num.result"], { n: n }) + " — " + D.texts[n].title;
      $("result-text").textContent = D.texts[n].text;
    });
  }

  var tool = D.tool;
  if (!tool) initHome();
  else if (tool === "finder") initFinder();
  else if (tool === "compat") initCompat();
  else if (tool === "moon") initMoon();
  else if (tool === "tarot") initTarot();
  else if (tool === "chinese") initChinese();
  else if (tool === "numerology") initNumerology();
})();
