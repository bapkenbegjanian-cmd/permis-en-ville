// Staralyn : comportements communs (fond d'etoiles, menu, langue, apparitions, "mon signe")
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var store = {
    get: function (k) {
      try { return localStorage.getItem(k); } catch (e) { return null; }
    },
    set: function (k, v) {
      try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
    },
  };
  window.SL = { store: store, reduce: reduce };

  /* ---------- fond d'etoiles ---------- */
  var canvas = document.getElementById("stars");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var stars = [];
    var shooting = null;
    var W = 0, H = 0, dpr = 1;
    var resize = function () {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.round(Math.min(220, (W * H) / 7500));
      stars = [];
      for (var i = 0; i < count; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + 0.2, p: Math.random() * Math.PI * 2, s: Math.random() * 0.02 + 0.005, h: Math.random() < 0.18 ? 38 : 235 });
      }
    };
    var draw = function (t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var a = reduce ? 0.7 : 0.35 + 0.65 * Math.abs(Math.sin(s.p + t * s.s));
        ctx.beginPath();
        ctx.fillStyle = "hsla(" + s.h + ",80%," + (s.h === 38 ? 78 : 92) + "%," + a.toFixed(2) + ")";
        ctx.arc(s.x, s.y, s.r, 0, 6.2832);
        ctx.fill();
      }
      if (!reduce) {
        if (!shooting && Math.random() < 0.0022) {
          shooting = { x: Math.random() * W * 0.8 + W * 0.2, y: Math.random() * H * 0.4, vx: -7 - Math.random() * 4, vy: 3.5 + Math.random() * 2, life: 1 };
        }
        if (shooting) {
          var g = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - shooting.vx * 9, shooting.y - shooting.vy * 9);
          g.addColorStop(0, "rgba(255,244,214," + shooting.life.toFixed(2) + ")");
          g.addColorStop(1, "rgba(255,244,214,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(shooting.x, shooting.y);
          ctx.lineTo(shooting.x - shooting.vx * 9, shooting.y - shooting.vy * 9);
          ctx.stroke();
          shooting.x += shooting.vx;
          shooting.y += shooting.vy;
          shooting.life -= 0.016;
          if (shooting.life <= 0 || shooting.x < -50 || shooting.y > H + 50) shooting = null;
        }
      }
    };
    var raf = null;
    var loop = function (t) {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    resize();
    window.addEventListener("resize", resize);
    if (reduce) draw(0);
    else raf = requestAnimationFrame(loop);
    document.addEventListener("visibilitychange", function () {
      if (reduce) return;
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = null; }
      else if (!document.hidden && !raf) raf = requestAnimationFrame(loop);
    });
  }

  /* ---------- menu mobile ---------- */
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  if (burger && nav) {
    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      burger.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { nav.classList.remove("open"); burger.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------- langue ---------- */
  var sel = document.getElementById("lang-select");
  if (sel) {
    // le choix n'est memorise que lorsque le visiteur change lui-meme de langue
    sel.addEventListener("change", function () {
      var l = sel.options[sel.selectedIndex].getAttribute("lang");
      if (l) store.set("sl_lang", l);
      window.location.href = sel.value;
    });

    // Page ouverte dans une autre langue que celle du navigateur (lien partage, resultat Google) : on propose, une fois, de passer dans sa langue
    var page = document.body.getAttribute("data-lang");
    var pref = ((navigator.languages && navigator.languages[0]) || navigator.language || "").slice(0, 2).toLowerCase();
    var dismissed = false;
    try { dismissed = sessionStorage.getItem("sl_suggest") === "1"; } catch (e) { /* ignore */ }
    var target = null;
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].getAttribute("lang") === pref) target = sel.options[i];
    var sd = document.getElementById("suggest-data");
    if (target && pref !== page && !store.get("sl_lang") && !dismissed && sd) {
      var txt = JSON.parse(sd.textContent)[pref];
      if (txt) {
        var bar = document.createElement("div");
        bar.className = "suggest";
        bar.setAttribute("role", "region");
        bar.setAttribute("lang", pref);
        var p = document.createElement("p");
        p.textContent = txt.msg;
        var go = document.createElement("a");
        go.className = "btn";
        go.href = target.value;
        go.textContent = txt.btn;
        go.addEventListener("click", function () { store.set("sl_lang", pref); });
        var x = document.createElement("button");
        x.type = "button";
        x.className = "suggest-x";
        x.setAttribute("aria-label", txt.close);
        x.textContent = "×";
        x.addEventListener("click", function () {
          bar.remove();
          try { sessionStorage.setItem("sl_suggest", "1"); } catch (e) { /* ignore */ }
        });
        bar.appendChild(p);
        bar.appendChild(go);
        bar.appendChild(x);
        document.body.appendChild(bar);
      }
    }
  }

  /* ---------- apparition au defilement ---------- */
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i % 12, 8) * 45 + "ms";
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- mon signe (garde dans le navigateur) ---------- */
  var mine = store.get("sl_sign");
  if (mine) {
    var card = document.querySelector('.sign-card[data-sign="' + mine + '"]');
    if (card) card.classList.add("is-mine");
  }
})();
