// Page d'un signe : onglets, "mon signe", partage, et horoscope du bon jour pour le visiteur
(function () {
  "use strict";
  var dataEl = document.getElementById("sign-data");
  var data = dataEl ? JSON.parse(dataEl.textContent) : { days: {} };
  var store = (window.SL && window.SL.store) || { get: function () { return null; }, set: function () {} };

  /* ---------- onglets ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));
  function show(period) {
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-period") === period;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", String(on));
    });
    panels.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-period") === period); });
  }
  tabs.forEach(function (t) {
    t.addEventListener("click", function () { show(t.getAttribute("data-period")); });
  });

  /* ---------- le bon jour pour le visiteur ---------- */
  function key(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day;
  }
  function meterHtml(v) {
    var s = "";
    for (var i = 0; i < 5; i++) s += i < v ? '<i class="on" style="--i:' + i + '"></i>' : "<i></i>";
    return s;
  }
  function fill(panel, k, r) {
    var date = new Date(k + "T12:00:00");
    var label = new Intl.DateTimeFormat(data.locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
    panel.querySelector(".panel-date").textContent = label;
    panel.querySelector(".summary").textContent = r.summary;
    ["love", "work", "energy"].forEach(function (a) {
      var box = panel.querySelector(".aspect-" + a);
      if (!box) return;
      box.querySelector("p").textContent = r[a];
      var m = box.querySelector(".meter");
      m.innerHTML = meterHtml(r.scores[a]);
      m.setAttribute("aria-label", data.scoreLabel.replace("{n}", r.scores[a]));
    });
    var num = panel.querySelector(".lucky-num");
    if (num) num.textContent = r.number;
    var dds = panel.querySelectorAll(".lucky dd");
    if (dds[1]) {
      dds[1].innerHTML = "";
      var sw = document.createElement("i");
      sw.className = "swatch";
      sw.style.background = data.hex[r.color];
      dds[1].appendChild(sw);
      dds[1].appendChild(document.createTextNode(data.colors[r.color]));
    }
  }
  var now = new Date();
  var todayK = key(now);
  var tomorrowK = key(new Date(now.getTime() + 86400000));
  var todayPanel = document.getElementById("panel-today");
  var tomorrowPanel = document.getElementById("panel-tomorrow");
  if (todayPanel && data.days[todayK]) fill(todayPanel, todayK, data.days[todayK]);
  if (tomorrowPanel && data.days[tomorrowK]) fill(tomorrowPanel, tomorrowK, data.days[tomorrowK]);

  /* ---------- mon signe ---------- */
  var mineBtn = document.getElementById("set-mine");
  if (mineBtn) {
    var id = mineBtn.getAttribute("data-sign");
    var refresh = function () {
      var on = store.get("sl_sign") === id;
      mineBtn.setAttribute("aria-pressed", String(on));
      mineBtn.textContent = on ? mineBtn.getAttribute("data-on") : mineBtn.getAttribute("data-off");
    };
    refresh();
    mineBtn.addEventListener("click", function () {
      store.set("sl_sign", store.get("sl_sign") === id ? "" : id);
      refresh();
    });
  }

  /* ---------- partage ---------- */
  var share = document.getElementById("share");
  if (share) {
    share.addEventListener("click", function () {
      var url = location.href.split("#")[0];
      var title = document.title;
      if (navigator.share) {
        navigator.share({ title: title, url: url }).catch(function () {});
        return;
      }
      var done = function () {
        var old = share.textContent;
        share.textContent = share.getAttribute("data-copied");
        setTimeout(function () { share.textContent = old; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else done();
    });
  }
})();
