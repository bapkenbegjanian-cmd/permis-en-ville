(function(){var module={exports:{}};var exports=module.exports;
"use strict";
// Donnees et calculs astrologiques/astronomiques (sans reseau) : signes, lune, horoscope chinois, numerologie, compatibilite.
// Les calculs de lune suivent les formules de Jean Meeus (Astronomical Algorithms, chap. 49) : precision de l'ordre de la minute.

const SIGNS = [
  // id, symbole, debut (mois, jour), element, modalite, planete, teinte (pour les couleurs du site)
  { id: "aries", glyph: "♈", from: [3, 21], to: [4, 19], element: "fire", modality: "cardinal", ruler: "mars", hue: 8 },
  { id: "taurus", glyph: "♉", from: [4, 20], to: [5, 20], element: "earth", modality: "fixed", ruler: "venus", hue: 140 },
  { id: "gemini", glyph: "♊", from: [5, 21], to: [6, 20], element: "air", modality: "mutable", ruler: "mercury", hue: 48 },
  { id: "cancer", glyph: "♋", from: [6, 21], to: [7, 22], element: "water", modality: "cardinal", ruler: "moon", hue: 200 },
  { id: "leo", glyph: "♌", from: [7, 23], to: [8, 22], element: "fire", modality: "fixed", ruler: "sun", hue: 32 },
  { id: "virgo", glyph: "♍", from: [8, 23], to: [9, 22], element: "earth", modality: "mutable", ruler: "mercury", hue: 100 },
  { id: "libra", glyph: "♎", from: [9, 23], to: [10, 22], element: "air", modality: "cardinal", ruler: "venus", hue: 320 },
  { id: "scorpio", glyph: "♏", from: [10, 23], to: [11, 21], element: "water", modality: "fixed", ruler: "pluto", hue: 345 },
  { id: "sagittarius", glyph: "♐", from: [11, 22], to: [12, 21], element: "fire", modality: "mutable", ruler: "jupiter", hue: 270 },
  { id: "capricorn", glyph: "♑", from: [12, 22], to: [1, 19], element: "earth", modality: "cardinal", ruler: "saturn", hue: 220 },
  { id: "aquarius", glyph: "♒", from: [1, 20], to: [2, 18], element: "air", modality: "fixed", ruler: "uranus", hue: 185 },
  { id: "pisces", glyph: "♓", from: [2, 19], to: [3, 20], element: "water", modality: "mutable", ruler: "neptune", hue: 245 },
];
const SIGN_IDS = SIGNS.map((s) => s.id);
const signById = (id) => SIGNS.find((s) => s.id === id);

// Signe solaire d'une date (mois 1-12, jour 1-31)
function signFor(month, day) {
  for (const s of SIGNS) {
    const [m1, d1] = s.from;
    const [m2, d2] = s.to;
    if (m1 <= m2) {
      if ((month > m1 || (month === m1 && day >= d1)) && (month < m2 || (month === m2 && day <= d2))) return s;
    } else if ((month > m1 || (month === m1 && day >= d1)) || (month < m2 || (month === m2 && day <= d2))) {
      return s;
    }
  }
  return SIGNS[0];
}

// ---------- Fonctions deterministes (meme resultat pour tout le monde, un meme jour) ----------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
// Nombre pseudo-aleatoire stable entre 0 et 1 pour une cle
const rand = (key) => hash(key) / 4294967296;

// Notes du jour (1 a 5) et porte-bonheur d'un signe pour une periode ("2026-10-26", "2026-W44", "2026-10")
function dayScores(signId, periodKey) {
  const pick = (k) => 1 + Math.floor(rand(`${signId}|${periodKey}|${k}`) * 5);
  // evite les notes toutes identiques : au moins une note haute
  const s = { love: pick("love"), work: pick("work"), energy: pick("energy") };
  if (Math.max(s.love, s.work, s.energy) < 4) s[["love", "work", "energy"][hash(signId + periodKey) % 3]] = 4;
  return s;
}
function lucky(signId, periodKey) {
  return { number: 1 + Math.floor(rand(`${signId}|${periodKey}|num`) * 99), color: Math.floor(rand(`${signId}|${periodKey}|col`) * 12) };
}

// ---------- Compatibilite ----------
const ELEMENT_SCORE = {
  "fire-fire": 82, "earth-earth": 80, "air-air": 78, "water-water": 84,
  "air-fire": 90, "earth-water": 88,
  "earth-fire": 56, "air-water": 58,
  "air-earth": 48, "fire-water": 42,
};
const pairKey = (a, b) => [a, b].sort().join("-");
function compatibility(idA, idB) {
  const A = signById(idA);
  const B = signById(idB);
  const key = pairKey(A.element, B.element);
  const base = ELEMENT_SCORE[key];
  if (base == null) throw new Error(`Paire d'elements inconnue : ${key}`);
  // ajustement par la modalite et un petit decalage stable propre a la paire
  const modBonus = A.modality === B.modality ? (idA === idB ? 2 : -3) : 3;
  const jitter = (a) => Math.round((rand(`compat|${[idA, idB].sort().join("|")}|${a}`) - 0.5) * 14);
  const clamp = (n) => Math.max(20, Math.min(98, n));
  const love = clamp(base + modBonus + jitter("love"));
  const friendship = clamp(base + modBonus + jitter("friend") + 2);
  const work = clamp(base + modBonus + jitter("work") - 1);
  const overall = Math.round((love + friendship + work) / 3);
  return { elementPair: key, love, friendship, work, overall };
}
function bestMatch(signId) {
  let best = null;
  for (const s of SIGNS) {
    if (s.id === signId) continue;
    const c = compatibility(signId, s.id).overall;
    if (!best || c > best.score) best = { id: s.id, score: c };
  }
  return best;
}

// ---------- Lune (Meeus, chap. 49) ----------
const RAD = Math.PI / 180;
const JD_UNIX_EPOCH = 2440587.5;
const jdToDate = (jd) => new Date((jd - JD_UNIX_EPOCH) * 86400000);
const dateToJd = (d) => d.getTime() / 86400000 + JD_UNIX_EPOCH;

// phase : 0 nouvelle lune, 0.25 premier quartier, 0.5 pleine lune, 0.75 dernier quartier ; k entier + phase
function moonPhaseJde(k) {
  const T = k / 1236.85;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T * T * T + 0.00000000073 * T * T * T * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T) * RAD;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T) * RAD;
  const phase = k - Math.floor(k);
  let corr;
  if (Math.abs(phase) < 1e-9 || Math.abs(phase - 0.5) < 1e-9) {
    const full = Math.abs(phase - 0.5) < 1e-9;
    corr =
      (full ? -0.40614 : -0.4072) * Math.sin(Mp) +
      (full ? 0.17302 : 0.17241) * E * Math.sin(M) +
      (full ? 0.01614 : 0.01608) * Math.sin(2 * Mp) +
      (full ? 0.01043 : 0.01039) * Math.sin(2 * F) +
      (full ? 0.00734 : 0.00739) * E * Math.sin(Mp - M) +
      (full ? -0.00515 : -0.00514) * E * Math.sin(Mp + M) +
      (full ? 0.00209 : 0.00208) * E * E * Math.sin(2 * M) -
      0.00111 * Math.sin(Mp - 2 * F) -
      0.00057 * Math.sin(Mp + 2 * F) +
      0.00056 * E * Math.sin(2 * Mp + M) -
      0.00042 * Math.sin(3 * Mp) +
      0.00042 * E * Math.sin(M + 2 * F) +
      0.00038 * E * Math.sin(M - 2 * F) -
      0.00024 * E * Math.sin(2 * Mp - M) -
      0.00017 * Math.sin(O);
  } else {
    // quartiers
    corr =
      -0.62801 * Math.sin(Mp) +
      0.17172 * E * Math.sin(M) -
      0.01183 * E * Math.sin(Mp + M) +
      0.00862 * Math.sin(2 * Mp) +
      0.00804 * Math.sin(2 * F) +
      0.00454 * E * Math.sin(Mp - M) +
      0.00204 * E * E * Math.sin(2 * M) -
      0.0018 * Math.sin(Mp - 2 * F) -
      0.0007 * Math.sin(Mp + 2 * F);
    const W = 0.00306 - 0.00038 * E * Math.cos(M) + 0.00026 * Math.cos(Mp) - 0.00002 * Math.cos(Mp - M) + 0.00002 * Math.cos(Mp + M) + 0.00002 * Math.cos(2 * F);
    corr += abs(phase - 0.25) < 1e-9 ? W : -W;
  }
  return jde + corr;
}
function abs(x) {
  return Math.abs(x);
}
// Instant (Date UTC) de la phase numero k (k + 0, .25, .5, .75)
const moonPhaseDate = (k) => jdToDate(moonPhaseJde(k));
// k approche pour une date
const kFor = (date) => (date.getUTCFullYear() + (date.getUTCMonth() + date.getUTCDate() / 30.4) / 12 - 2000) * 12.3685;

// Prochaine pleine lune / nouvelle lune apres une date
function nextMoon(date, kind) {
  const offset = kind === "full" ? 0.5 : 0;
  let k = Math.floor(kFor(date)) - 2 + offset;
  for (let i = 0; i < 8; i++, k += 1) {
    const d = moonPhaseDate(k);
    if (d > date) return d;
  }
  return null;
}
function prevMoon(date, kind) {
  const offset = kind === "full" ? 0.5 : 0;
  let k = Math.floor(kFor(date)) + 2 + offset;
  for (let i = 0; i < 8; i++, k -= 1) {
    const d = moonPhaseDate(k);
    if (d <= date) return d;
  }
  return null;
}
const SYNODIC = 29.530588861;
// Etat de la lune : age (jours), illumination (0-1), phase (0-7), pourcentage
function moonState(date) {
  const lastNew = prevMoon(date, "new");
  const age = (date - lastNew) / 86400000;
  const frac = age / SYNODIC; // 0..1
  const illumination = (1 - Math.cos(2 * Math.PI * frac)) / 2;
  const idx = Math.floor(((frac + 1 / 16) % 1) * 8); // 0 nouvelle, 1 croissant, 2 premier quartier, 3 gibbeuse croissante, 4 pleine, 5 gibbeuse decroissante, 6 dernier quartier, 7 decroissant
  return { age, frac, illumination, phase: idx, nextFull: nextMoon(date, "full"), nextNew: nextMoon(date, "new") };
}

// ---------- Horoscope chinois ----------
const CHINESE_ANIMALS = ["rat", "ox", "tiger", "rabbit", "dragon", "snake", "horse", "goat", "monkey", "rooster", "dog", "pig"];
const CHINESE_ELEMENTS = ["metal", "water", "wood", "fire", "earth"]; // selon le dernier chiffre de l'annee : 0-1 metal, 2-3 eau, 4-5 bois, 6-7 feu, 8-9 terre

// Solstice de decembre (Meeus, chap. 27, valeur moyenne) en jours juliens
function decemberSolsticeJde(year) {
  const Y = (year - 2000) / 1000;
  return 2451900.05952 + 365242.74049 * Y - 0.06223 * Y * Y - 0.00823 * Y * Y * Y + 0.00032 * Y * Y * Y * Y;
}
const cnDay = (date) => Math.floor(date.getTime() / 86400000 + 8 / 24); // numero du jour a l'heure de Chine (UTC+8)

// Nouvel An chinois d'une annee : 2e nouvelle lune apres celle qui ouvre le mois contenant le solstice de decembre (hors mois bissextile 11 ou 12, rare)
function chineseNewYear(year) {
  const solstice = jdToDate(decemberSolsticeJde(year - 1));
  const solDay = cnDay(solstice);
  let k = Math.floor(kFor(solstice)) - 2;
  let month11 = null;
  for (let i = 0; i < 6; i++, k++) {
    const d = moonPhaseDate(k);
    if (cnDay(d) <= solDay) month11 = k;
    else break;
  }
  const date = moonPhaseDate(month11 + 2);
  const cn = new Date(date.getTime() + 8 * 3600000);
  return { year: cn.getUTCFullYear(), month: cn.getUTCMonth() + 1, day: cn.getUTCDate() };
}
// Animal et element d'une date de naissance (annee chinoise : avant le Nouvel An, c'est l'animal de l'annee precedente)
function chineseSign(year, month, day) {
  const cny = chineseNewYear(year);
  const before = month < cny.month || (month === cny.month && day < cny.day);
  const y = before ? year - 1 : year;
  return { year: y, animal: CHINESE_ANIMALS[(((y - 4) % 12) + 12) % 12], element: CHINESE_ELEMENTS[Math.floor((((y % 10) + 10) % 10) / 2)], newYear: cny };
}

// ---------- Numerologie ----------
function reduceNumber(n) {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) n = String(n).split("").reduce((a, c) => a + Number(c), 0);
  return n;
}
// Chemin de vie : on reduit separement le jour, le mois et l'annee, puis on additionne
function lifePath(year, month, day) {
  return reduceNumber(reduceNumber(day) + reduceNumber(month) + reduceNumber(year));
}

// ---------- Tarot (22 arcanes majeurs) ----------
const TAROT_IDS = [
  "fool", "magician", "high-priestess", "empress", "emperor", "hierophant", "lovers", "chariot", "strength", "hermit", "wheel-of-fortune",
  "justice", "hanged-man", "death", "temperance", "devil", "tower", "star", "moon", "sun", "judgement", "world",
];
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];

// ---------- Mercure rétrograde ----------
// Positions calculées avec les éléments orbitaux approchés de la NASA/JPL (valables de 1800 à 2050).
// Une période commence et finit quand la vitesse apparente de la planète change de sens (« stations »).
const MERC_EL = {
  mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.2503235, 149472.67411175], w: [77.45779628, 0.16047689], O: [48.33076593, -0.12534081] },
  earth: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], O: [0, 0] },
};
function mercHelio(p, jd) {
  const R = Math.PI / 180;
  const T = (jd - 2451545.0) / 36525;
  const g = (k) => p[k][0] + p[k][1] * T;
  const a = g("a"), e = g("e"), I = g("I") * R, L = g("L"), w = g("w"), O = g("O") * R;
  const om = (w - g("O")) * R;
  const M = ((((L - w) % 360) + 360) % 360) * R;
  let E = M;
  for (let i = 0; i < 12; i++) E = M + e * Math.sin(E);
  const xv = a * (Math.cos(E) - e), yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const x = (Math.cos(om) * Math.cos(O) - Math.sin(om) * Math.sin(O) * Math.cos(I)) * xv + (-Math.sin(om) * Math.cos(O) - Math.cos(om) * Math.sin(O) * Math.cos(I)) * yv;
  const y = (Math.cos(om) * Math.sin(O) + Math.sin(om) * Math.cos(O) * Math.cos(I)) * xv + (-Math.sin(om) * Math.sin(O) + Math.cos(om) * Math.cos(O) * Math.cos(I)) * yv;
  return [x, y];
}
function mercLon(jd) {
  const m = mercHelio(MERC_EL.mercury, jd), e = mercHelio(MERC_EL.earth, jd);
  return (Math.atan2(m[1] - e[1], m[0] - e[0]) * 180) / Math.PI;
}
function mercSpeed(jd) {
  let d = mercLon(jd + 0.05) - mercLon(jd - 0.05);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d / 0.1;
}
function mercRoot(a, b) {
  let fa = mercSpeed(a);
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2, fm = mercSpeed(m);
    if (fa < 0 === fm < 0) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}
const jdToDay = (jd) => { const d = new Date((jd - 2440587.5) * 86400000); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
// Périodes de Mercure rétrograde qui commencent entre le 1er janvier y0 et le 31 décembre y1 : [{ from: Date, to: Date }] (jours UTC, bornes comprises)
function mercuryPeriods(y0, y1) {
  const out = [];
  let jd = Date.UTC(y0, 0, 1) / 86400000 + 2440587.5;
  const end = Date.UTC(y1 + 1, 0, 1) / 86400000 + 2440587.5 + 40;
  let prev = mercSpeed(jd), start = null;
  for (jd += 0.5; jd < end; jd += 0.5) {
    const s = mercSpeed(jd);
    if (prev >= 0 && s < 0) start = mercRoot(jd - 0.5, jd);
    if (prev < 0 && s >= 0 && start != null) {
      out.push({ from: jdToDay(start), to: jdToDay(mercRoot(jd - 0.5, jd)) });
      start = null;
    }
    prev = s;
  }
  return out.filter((p) => p.from.getUTCFullYear() >= y0 && p.from.getUTCFullYear() <= y1);
}
function mercuryState(date) {
  const y = date.getUTCFullYear();
  const periods = mercuryPeriods(y - 1, y + 2);
  const today = Date.UTC(y, date.getUTCMonth(), date.getUTCDate());
  const current = periods.find((p) => p.from.getTime() <= today && today <= p.to.getTime()) || null;
  const next = periods.find((p) => p.from.getTime() > today) || null;
  return { retrograde: !!current, current, next, periods: periods.filter((p) => p.from.getUTCFullYear() >= y) };
}

module.exports = {
  SIGNS, SIGN_IDS, signById, signFor, hash, rand, dayScores, lucky, compatibility, bestMatch, pairKey,
  moonPhaseDate, moonState, nextMoon, prevMoon, SYNODIC, chineseNewYear, chineseSign, CHINESE_ANIMALS, CHINESE_ELEMENTS,
  lifePath, reduceNumber, TAROT_IDS, ROMAN, mercuryPeriods, mercuryState,
};

window.Astro=module.exports;})();
