
const state = {
  dishes: [],
  step: "intro",
  revealed: { base: false, veg: false, method: false },
  guesses: { base: null, veg: null, method: null },
  world: "",
  open: null,
  landed: false,
  gliding: false,
};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CHIP = 44;

const $ = (sel) => document.querySelector(sel);

function groupBy(list, key) {
  const groups = {};
  list.forEach((d) => (groups[d[key]] = groups[d[key]] || []).push(d));
  return Object.entries(groups)
    .map(([label, items]) => ({ label, items }))
    .sort((a, b) => b.items.length - a.items.length);
}

const thumb = (url) => url.replace(/([?&]width=)\d+/, (_, w) => w + "160");

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function photoHTML(d, cls) {
  return d.image
    ? `<img class="${cls}" src="${d.image}" alt="${d.dish}" loading="lazy">`
    : `<div class="${cls} no-photo" data-contains="${d.contains}" role="img" aria-label="${d.dish}">${d.dish[0]}</div>`;
}

async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned status ${response.status}`);
  return response.json();
}

async function init() {
  try {
    const [dishes, world] = await Promise.all([loadJSON("data/dishes.json"), loadJSON("data/world.json")]);
    state.dishes = dishes;
    state.world = world.path;
  } catch (error) {
    $("#load-error").hidden = false;
    $("#load-error .error-box").textContent =
      `The dishes didn't load (${error.message}). Open the site with VS Code's Live Server or GitHub Pages, not by double-clicking index.html.`;
    return;
  }
  document.querySelectorAll('[data-stat="dishes"]').forEach((el) => (el.textContent = state.dishes.length));
  document.querySelectorAll('[data-stat="countries"]').forEach((el) => (el.textContent = new Set(state.dishes.map((d) => d.country)).size));

  initLanding();
  initStory();
}

function initLanding() {
  document.querySelectorAll(".polaroid").forEach((el) => {
    const dish = state.dishes.find((d) => d.country === el.dataset.country);
    if (!dish) return;
    el.querySelector(".polaroid-photo").innerHTML = photoHTML(dish, "");
  });

  $("#entry-date").textContent = new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
  $(".scroll-down").addEventListener("click", (e) => {
    if (reduceMotion) return;
    e.preventDefault();
    enterStory();
  });

  if (reduceMotion) return;

  gsap.from([".hero-kicker", ".hero-title", ".hero-sub", ".hero-lede", ".scroll-down"], {
    y: 24, opacity: 0, duration: 0.7, ease: "power3.out", stagger: 0.1, clearProps: "transform,opacity",
  });
  gsap.from([".passport-book", ".polaroid--a", ".polaroid--b", ".polaroid--c", ".round-stamp"], {
    y: -40, scale: 0.85, opacity: 0, duration: 0.6, ease: "back.out(1.6)", stagger: 0.12, delay: 0.3,
    clearProps: "opacity",
  });
}

function enterStory() {
  const btn = $(".scroll-down");
  if (btn.dataset.busy) return;
  btn.dataset.busy = "yes";

  const props = [".polaroid--a", ".polaroid--b", ".polaroid--c", ".passport-book", ".round-stamp"];
  const words = [".hero-kicker", ".hero-title", ".hero-sub", ".hero-lede"];
  const scroller = { y: window.scrollY };
  const target = $("#story").getBoundingClientRect().top + window.scrollY;

  const tl = gsap.timeline({
    onComplete: () => {
      gsap.set([...props, ...words, ".hero-route", btn, ".entry-stamp"], { clearProps: "all" });
      delete btn.dataset.busy;
      state.gliding = false;
    },
  });

  tl.to(btn, { scale: 0.82, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut" })
    .set(".entry-stamp", { visibility: "visible" })
    .fromTo(".entry-stamp",
      { opacity: 0, scale: 2.8, rotation: -35 },
      { opacity: 1, scale: 1, rotation: -12, duration: 0.32, ease: "power4.in" })
    .to([...props, ".entry-stamp"], { x: "+=7", duration: 0.05, repeat: 5, yoyo: true, ease: "none" })
    .to(".hero-route", { x: () => window.innerWidth * 0.6, y: -120, rotation: -8, opacity: 0, duration: 0.9, ease: "power2.in" }, "+=0.25")
    .to(props, {
      y: () => window.innerHeight * 0.9,
      rotation: () => gsap.utils.random(-45, 45),
      opacity: 0, duration: 0.8, ease: "power2.in", stagger: 0.07,
    }, "<")
    .to(words, { y: -40, opacity: 0, duration: 0.45, stagger: 0.05, ease: "power2.in" }, "<0.1")
    .to(btn, { y: 40, opacity: 0, duration: 0.35 }, "<")
    .to(".entry-stamp", { opacity: 0, scale: 0.7, rotation: 0, duration: 0.35, ease: "power2.in" }, "-=0.35")
    .set(".entry-stamp", { visibility: "hidden" })
    .add(() => { state.gliding = true; snap(false); })
    .to(scroller, {
      y: target, duration: 1, ease: "power2.inOut",
      onUpdate: () => window.scrollTo(0, scroller.y),
      onComplete: () => snap(true),
    });
}

// turning off snapping during autscroll for smooter scroll
function snap(on) {
  document.documentElement.style.scrollSnapType = on ? "" : "none";
}

let autoScroll = null;
function glideTo(top) {
  if (autoScroll) autoScroll.kill();
  const max = document.documentElement.scrollHeight - window.innerHeight;
  top = Math.max(0, Math.min(top, max));
  const from = window.scrollY;
  if (reduceMotion || Math.abs(top - from) < 2) {
    window.scrollTo(0, top);
    return;
  }
  snap(false);
  const scroller = { y: from };
  autoScroll = gsap.to(scroller, {
    y: top,
    duration: Math.min(0.85, 0.45 + Math.abs(top - from) / 4000),
    ease: "power2.inOut",
    onUpdate: () => window.scrollTo(0, scroller.y),
    onComplete: () => { autoScroll = null; snap(true); },
  });
}

function initSettle() {
  const steps = [...document.querySelectorAll(".step")];
  const settle = () => {
    if (autoScroll) return;
    const r = $("#story").getBoundingClientRect();
    if (r.top > 1 || r.bottom < window.innerHeight - 1) return;
    let best = null, dist = Infinity;
    steps.forEach((s) => {
      const d = s.getBoundingClientRect().top;
      if (Math.abs(d) < Math.abs(dist)) { dist = d; best = s; }
    });
    if (best && Math.abs(dist) > 2 && (dist > 0 || best.offsetHeight <= window.innerHeight + 2)) {
      glideTo(window.scrollY + dist);
    }
  };
  let timer;
  const later = () => { clearTimeout(timer); timer = setTimeout(settle, 140); };
  if ("onscrollend" in window) window.addEventListener("scrollend", later);
  else window.addEventListener("scroll", later, { passive: true });
}

["wheel", "touchstart", "keydown"].forEach((type) =>
  window.addEventListener(type, () => {
    if (autoScroll) { autoScroll.kill(); autoScroll = null; snap(true); }
  }, { passive: true }));

function dishesLand() {
  if (!state.chips || state.landed) return;
  state.landed = true;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  shuffle(state.chips).forEach((chip, n) => {
    const img = chip.querySelector("img");
    const ready = img && !img.complete
      ? Promise.race([img.decode().catch(() => {}), wait(1500)])
      : Promise.resolve();
    Promise.all([ready, wait(n * 25)]).then(() =>
      gsap.to(chip, { opacity: 1, duration: 0.3, ease: "power1.out" }));
  });
  gsap.fromTo("#map-pins", { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.6, clearProps: "opacity" });
}

function initStory() {
  $("#chips").innerHTML = state.dishes.map((d, i) => `
    <button type="button" class="chip" data-i="${i}" data-contains="${d.contains}" tabindex="-1"
            aria-label="${d.dish}, ${d.country}">
      ${d.image ? `<img src="${thumb(d.image)}" alt="" decoding="async">` : `<span class="chip-letter">${d.dish[0]}</span>`}
    </button>`).join("");
  state.chips = [...document.querySelectorAll(".chip")];

  $("#map-layer").innerHTML = `<g id="map-land"><path d="${state.world}"/></g><g id="map-pins"></g>`;

  $("#chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) openDish(Number(chip.dataset.i));
  });
  $("#pop-close").addEventListener("click", closeDish);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDish(); });
  document.addEventListener("click", (e) => {
    if (state.open !== null && !e.target.closest(".dish-pop, .chip")) closeDish();
  });

  $("#progress").addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    e.preventDefault();
    const step = document.querySelector(link.getAttribute("href"));
    glideTo(step.getBoundingClientRect().top + window.scrollY);
  });

  document.querySelectorAll(".guess-buttons").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".guess");
      if (!btn || btn.disabled) return;
      reveal(group.dataset.guess, btn.dataset.answer, btn);
    });
  });

  $("#veg-guess").addEventListener("input", (e) => ($("#veg-guess-out").textContent = e.target.value));
  $("#veg-lock").addEventListener("click", () => reveal("veg", Number($("#veg-guess").value)));
  $("#veg-guess").max = state.dishes.length;

  writeMapText();
  writeEnding();

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const step = entry.target.dataset.step;
      if (step === "intro") dishesLand();
      document.querySelectorAll(".step").forEach((s) => s.classList.toggle("is-active", s === entry.target));
      if (step === state.step && step !== "intro") return;
      state.step = step;
      if (step === "end") writeScore();
      updateProgress();
      closeDish();
      arrange(true);
    });
  }, { rootMargin: "-50% 0px -50% 0px" });
  document.querySelectorAll(".step").forEach((s) => observer.observe(s));

  const toTop = $("#to-top");
  const showToTop = () => toTop.classList.toggle("is-shown", window.scrollY > $("#landing").offsetHeight * 0.8);
  window.addEventListener("scroll", showToTop, { passive: true });
  showToTop();
  initSettle();
  toTop.addEventListener("click", (e) => {
    e.preventDefault();
    closeDish();
    glideTo(0);
  });

  if (reduceMotion) state.landed = true;
  updateProgress();
  arrange(false);
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => arrange(false), 150);
  });
}

function reveal(question, guess, btn) {
  state.guesses[question] = guess;
  state.revealed[question] = true;
  const n = state.dishes.length;

  if (question === "veg") {
    const actual = state.dishes.filter((d) => d.contains === "Vegetarian").length;
    const off = Math.abs(guess - actual);
    $("#reveal-veg").innerHTML =
      `<strong>${off === 0 ? "Exactly right!" : off <= 3 ? "So close!" : "Not quite."}</strong> You guessed ${guess}; it's ${actual} of ${n}.`;
    $("#veg-lock").disabled = true;
    $("#veg-guess").disabled = true;
  } else {
    const groups = groupBy(state.dishes, question);
    const [first] = groups;
    const right = guess === first.label;
    $(`#reveal-${question}`).innerHTML = right
      ? `<strong>You got it!</strong> ${first.label} wins.`
      : `<strong>Not quite.</strong> ${first.label} wins.`;

    const buttons = btn.parentElement.querySelectorAll(".guess");
    buttons.forEach((b) => {
      b.disabled = true;
      if (b.dataset.answer === first.label) b.classList.add("is-answer");
    });
    if (!right) btn.classList.add("is-picked");
  }
  arrange(true);
}

function continentWinners() {
  return groupBy(state.dishes, "continent")
    .filter((c) => c.items.length >= 5)
    .map((c) => {
      const bases = groupBy(c.items, "base");
      const best = bases[0].items.length;
      return { continent: c.label, total: c.items.length, best, bases: bases.filter((x) => x.items.length === best).map((x) => x.label) };
    });
}

function writeMapText() {
  $("#map-text").innerHTML =
    "Every continent has its own favorite. The <strong>stamps</strong> show the most common base on each one, and those dishes light up.";
  $("#stamp-row").innerHTML = continentWinners().map((w, k) => `
    <li class="map-stamp map-stamp--row" style="--tilt:${k % 2 ? 3 : -3}deg">
      <span class="map-stamp-place">${w.continent}</span>
      <strong>${w.bases.join(" + ")}</strong>
      <span class="map-stamp-count">${w.bases.length > 1 ? `${w.best} each` : w.best} of ${w.total}</span>
    </li>`).join("");
}

function writeEnding() {
  const n = state.dishes.length;
  const [b1, b2] = groupBy(state.dishes, "base");
  const [m1] = groupBy(state.dishes, "method");
  const meaty = state.dishes.filter((d) => d.contains === "Meat").length;

  const figures = [
    { value: b1.items.length + b2.items.length, label: `are built on ${b1.label.toLowerCase()} or ${b2.label.toLowerCase()}` },
    { value: m1.items.length, label: `are ${m1.label.toLowerCase()}, the world's favorite way to cook` },
    { value: meaty, label: "have meat in them" },
  ];
  $("#end-figures").innerHTML = figures.map((f) =>
    `<li><strong>${f.value}<span> of ${n}</span></strong>${f.label}</li>`).join("");
  $("#end-verdict").innerHTML =
    `The closest thing to a shared meal: <em>a slow-cooked pot of ${b1.label.toLowerCase()} or ${b2.label.toLowerCase()}.</em>`;
}

function writeScore() {
  const g = state.guesses;
  const top = (key) => groupBy(state.dishes, key)[0].label;
  const vegActual = state.dishes.filter((d) => d.contains === "Vegetarian").length;
  const answered = Object.values(g).filter((v) => v !== null).length;
  if (!answered) { $("#score-text").textContent = ""; return; }
  const right = (g.base === top("base")) + (g.veg !== null && Math.abs(g.veg - vegActual) <= 3) + (g.method === top("method"));
  $("#score-text").innerHTML = `Your guesses: <strong>${right} of ${answered} right</strong>`;
}

function area() {
  const stage = $("#stage");
  const W = stage.clientWidth, H = stage.clientHeight;
  return W >= 900
    ? { x0: Math.min(600, W * 0.47), x1: W - 40, y0: 84, y1: H - 80 }
    : { x0: 14, x1: W - 14, y0: 64, y1: H * 0.5 };
}

function gridLayout(a) {
  const n = state.dishes.length;
  const w = a.x1 - a.x0, h = a.y1 - a.y0;
  let cols = Math.ceil(Math.sqrt((n * w) / h));
  const size = Math.min(CHIP * 1.3, w / cols - 6, h / Math.ceil(n / cols) - 6);
  cols = Math.min(n, Math.floor(w / (size + 6)));
  const rows = Math.ceil(n / cols);
  const left = a.x0 + (w - cols * (size + 6)) / 2;
  const top = a.y0 + (h - rows * (size + 6)) / 2;
  return state.dishes.map((_, i) => ({ x: left + (i % cols) * (size + 6), y: top + Math.floor(i / cols) * (size + 6), size }));
}

function pileLayout(a, groups) {
  const cols = groups.length;
  const colW = (a.x1 - a.x0) / cols;
  const tallest = groups[0].items.length;
  let size = CHIP, perRow = 1, rows = tallest;
  for (let s = CHIP; s >= 14; s -= 2) {
    perRow = Math.max(1, Math.min(3, Math.floor((colW - 8) / (s + 3))));
    rows = Math.ceil(tallest / perRow);
    size = s;
    if (rows * (s + 3) <= a.y1 - a.y0) break;
  }
  const pos = new Array(state.dishes.length);
  const labels = [];
  groups.forEach((g, c) => {
    const cx = a.x0 + colW * c + colW / 2;
    const rowW = perRow * (size + 3);
    g.items.forEach((d, k) => {
      const i = state.dishes.indexOf(d);
      const col = k % perRow, row = Math.floor(k / perRow);
      pos[i] = { x: cx - rowW / 2 + col * (size + 3), y: a.y1 - (row + 1) * (size + 3), size };
    });
    labels.push({ x: cx, y: a.y1 + 6, w: colW - 4, label: g.label, count: g.items.length, top: c === 0 });
  });
  return { pos, labels };
}

function mergeSmall(groups, min) {
  const big = groups.filter((g) => g.items.length >= min);
  const rest = groups.filter((g) => g.items.length < min).flatMap((g) => g.items);
  return rest.length ? [...big, { label: "Other", items: rest }] : big;
}

const VIEW = { west: -130, east: 180, north: 66, south: -50 };

function mapBox(a) {
  const w = a.x1 - a.x0, h = a.y1 - a.y0;
  const ratio = (VIEW.north - VIEW.south) / (VIEW.east - VIEW.west) * 1.25;
  let bw = w, bh = w * ratio;
  if (bh > h) { bh = h; bw = h / ratio; }
  return { x: a.x0 + (w - bw) / 2, y: a.y0 + (h - bh) / 2, w: bw, h: bh };
}
const project = (box, lng, lat) => ({
  x: box.x + ((lng - VIEW.west) / (VIEW.east - VIEW.west)) * box.w,
  y: box.y + ((VIEW.north - lat) / (VIEW.north - VIEW.south)) * box.h,
});

function mapLayout(a) {
  const box = mapBox(a);
  const size = Math.max(20, Math.min(34, box.w / 26));
  const r = size / 2 + 1.5;
  const home = state.dishes.map((d) => project(box, d.lng, d.lat));
  const p = home.map((h) => ({ ...h }));

  for (let round = 0; round < 120; round++) {
    for (let i = 0; i < p.length; i++) {
      for (let j = i + 1; j < p.length; j++) {
        const dx = p[j].x - p[i].x, dy = p[j].y - p[i].y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist < r * 2) {
          const push = (r * 2 - dist) / 2;
          p[i].x -= (dx / dist) * push;
          p[i].y -= (dy / dist) * push;
          p[j].x += (dx / dist) * push; 
          p[j].y += (dy / dist) * push;
        }
      }
    }
    p.forEach((q, i) => {
      q.x += (home[i].x - q.x) * 0.04;
      q.y += (home[i].y - q.y) * 0.04;
      q.x = Math.min(a.x1 - r, Math.max(a.x0 + r, q.x));
      q.y = Math.min(a.y1 - r, Math.max(a.y0 + r, q.y));
    });
  }
  return {
    pos: p.map((q) => ({ x: q.x - size / 2, y: q.y - size / 2, size })),
    box, home, centers: p,
  };
}

const STAMP_SPOT = {
  "North America": { lat: 58, lng: -110 },
  "South America": { lat: -36, lng: -104 },
  "Europe":        { lat: 66, lng: -47 },
  "Africa":        { lat: -28, lng: 2 },
  "Asia":          { lat: 57, lng: 102 },
};

function drawMap(m) {
  const sx = m.box.w / (VIEW.east - VIEW.west);
  const sy = m.box.h / (VIEW.north - VIEW.south);
  $("#map-land").setAttribute("transform",
    `translate(${m.box.x - VIEW.west * sx} ${m.box.y + VIEW.north * sy}) scale(${sx} ${sy})`);
  $("#map-pins").innerHTML = m.home.map((h, i) => {
    const c = m.centers[i];
    const line = Math.hypot(c.x - h.x, c.y - h.y) > 6
      ? `<line x1="${h.x}" y1="${h.y}" x2="${c.x}" y2="${c.y}"/>` : "";
    return `${line}<circle cx="${h.x}" cy="${h.y}" r="2.5"/>`;
  }).join("");
}

function arrange(animate) {
  const a = area();
  const s = state.step;
  let pos, labels = [], stamps = [], highlight = null;

  if (s === "base") {
    if (state.revealed.base) ({ pos, labels } = pileLayout(a, mergeSmall(groupBy(state.dishes, "base"), 3)));
    else pos = gridLayout(a);
  } else if (s === "veg") {
    if (state.revealed.veg) {
      const order = ["Vegetarian", "Meat", "Fish & seafood", "Varies"];
      const groups = groupBy(state.dishes, "contains").sort((x, y) => order.indexOf(x.label) - order.indexOf(y.label));
      ({ pos, labels } = pileLayout(a, groups));
      highlight = (d) => d.contains === "Vegetarian";
    } else pos = gridLayout(a);
  } else if (s === "method") {
    if (state.revealed.method) ({ pos, labels } = pileLayout(a, groupBy(state.dishes, "method")));
    else pos = gridLayout(a);
  } else {
    const m = mapLayout(a);
    pos = m.pos;
    drawMap(m);
    if (s === "map") {
      const wide = $("#stage").clientWidth >= 900;
      const winners = continentWinners();
      highlight = (d) => winners.some((w) => w.continent === d.continent && w.bases.includes(d.base));
      if (wide) stamps = winners.map((w, k) => ({ ...w, ...project(m.box, STAMP_SPOT[w.continent].lng, STAMP_SPOT[w.continent].lat), tilt: k % 2 ? 4 : -5 }));
    }
  }

  const onMap = s === "intro" || s === "map" || s === "end";
  $("#stage").classList.toggle("is-map", onMap);
  if (!onMap) drawMap(mapLayout(a));
  state.chips.forEach((c) => (c.tabIndex = onMap ? 0 : -1));

  state.chips.forEach((chip, i) => {
    const p = pos[i];
    const d = state.dishes[i];
    const on = highlight ? highlight(d) : false;
    chip.classList.toggle("is-on", on);
    const props = { x: p.x, y: p.y, scale: p.size / CHIP, opacity: !state.landed ? 0 : highlight && !on ? 0.35 : 1, transformOrigin: "0 0" };
    if (animate && !reduceMotion) gsap.to(chip, { ...props, duration: 1, ease: "power3.inOut", delay: (i % 25) * 0.012 });
    else gsap.set(chip, props);
  });

  $("#labels").innerHTML = labels.map((l) =>
    `<div class="pile-label ${l.top ? "is-top" : ""}" style="left:${l.x}px; top:${l.y}px; width:${l.w}px"><strong>${l.count}</strong>${l.label}</div>`
  ).join("") + stamps.map((t) => `
    <div class="map-stamp" style="left:${t.x}px; top:${t.y}px; --tilt:${t.tilt}deg">
      <span class="map-stamp-place">${t.continent}</span>
      <strong>${t.bases.join("<br>+ ")}</strong>
      <span class="map-stamp-count">${t.bases.length > 1 ? `${t.best} each` : t.best} of ${t.total}</span>
    </div>`).join("");
  if (animate && !reduceMotion && labels.length) gsap.from(".pile-label", { opacity: 0, y: 10, duration: 0.4, delay: 0.7, stagger: 0.05 });
  if (animate && !reduceMotion && stamps.length) gsap.from(".map-stamp", { opacity: 0, scale: 1.8, duration: 0.35, delay: 0.9, stagger: 0.18, ease: "back.out(2)" });
}

function openDish(i) {
  const d = state.dishes[i];
  const pop = $("#dish-pop");
  state.chips.forEach((c) => c.classList.remove("is-open"));
  state.chips[i].classList.add("is-open");
  state.open = i;

  $("#pop-photo").innerHTML = photoHTML(d, "");
  $("#pop-country").textContent = `${d.country} · ${d.continent}`;
  $("#pop-dish").textContent = d.dish;
  $("#pop-about").textContent = d.about;
  $("#pop-tags").innerHTML = [d.base, d.method, d.contains]
    .map((t, k) => `<li${k === 2 ? ` class="tag-kind" data-contains="${d.contains}"` : ""}>${t}</li>`).join("");
  $("#pop-credit").innerHTML = d.photoPage
    ? `Photo: <a href="${d.photoPage}" target="_blank" rel="noopener">Wikimedia Commons</a>` : "";
  pop.hidden = false;

  const stage = $("#stage").getBoundingClientRect();
  if (stage.width >= 900) {
    const chip = state.chips[i].getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = chip.right - stage.left + 14;
    if (x + pw > stage.width - 12) x = chip.left - stage.left - pw - 14;
    let y = chip.top - stage.top + chip.height / 2 - ph / 2;
    y = Math.max(64, Math.min(stage.height - ph - 12, y));
    pop.style.left = `${x}px`; pop.style.top = `${y}px`;
  } else {
    pop.style.left = ""; pop.style.top = "";
  }
  if (!reduceMotion) gsap.fromTo(pop, { opacity: 0, y: 8, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.25, ease: "power2.out" });
  $("#pop-close").focus({ preventScroll: true });
}

function closeDish() {
  if (state.open === null) return;
  const chip = state.chips[state.open];
  chip.classList.remove("is-open");
  $("#dish-pop").hidden = true;
  if (document.activeElement && document.activeElement.closest(".dish-pop")) chip.focus({ preventScroll: true });
  state.open = null;
}

function updateProgress() {
  const order = ["intro", "base", "veg", "method", "map", "end"];
  const now = order.indexOf(state.step);
  document.querySelectorAll("#progress a").forEach((a) => {
    const k = order.indexOf(a.dataset.go);
    a.classList.toggle("is-done", k < now);
    if (k === now) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current");
  });
  $("#progress").style.setProperty("--progress", now / (order.length - 1));
}

init();
