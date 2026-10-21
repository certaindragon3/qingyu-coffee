/* 青屿咖啡 — 交互脚本：导航、滚动显现、当前章节高亮、豆单筛选、选豆测试、烘焙新鲜度 */
(function () {
  "use strict";

  var header = document.getElementById("siteHeader");
  var nav = document.getElementById("siteNav");
  var toggle = document.getElementById("navToggle");

  /* ---- 移动端菜单 ---- */
  function closeNav() {
    nav.classList.remove("open");
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "打开菜单");
  }
  function openNav() {
    nav.classList.add("open");
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "关闭菜单");
  }
  toggle.addEventListener("click", function () {
    if (nav.classList.contains("open")) closeNav();
    else openNav();
  });
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) closeNav();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && nav.classList.contains("open")) {
      closeNav();
      toggle.focus();
    }
  });

  /* ---- 页眉滚动态 ---- */
  var lastKnownScroll = 0;
  var ticking = false;
  function onScroll() {
    lastKnownScroll = window.scrollY;
    if (!ticking) {
      window.requestAnimationFrame(function () {
        header.classList.toggle("scrolled", lastKnownScroll > 24);
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---- 滚动显现 ---- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  } else {
    revealEls.forEach(function (el) {
      var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
      if (delay) el.style.transitionDelay = delay + "ms";
    });
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---- 当前章节高亮 ---- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-link"));
  var sections = navLinks
    .map(function (link) {
      var id = link.getAttribute("href");
      return id && id.charAt(0) === "#" ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = "#" + entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle("active", link.getAttribute("href") === id);
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---- 豆单：数据来自每个 .menu-item 上的 data-* 属性 ---- */
  var LABELS = {
    floral: "花香茶感", fruity: "果汁感", cocoa: "坚果可可",
    washed: "水洗", natural: "日晒",
    hot: "热手冲", iced: "冰冲", milk: "奶咖"
  };
  var ACIDITY_LABELS = { 1: "低酸醇厚", 2: "酸质圆润", 3: "酸质明亮" };
  var scrollBehavior = reduceMotion ? "auto" : "smooth";

  var beans = Array.prototype.slice.call(document.querySelectorAll(".menu-item[data-flavor]")).map(function (el) {
    return {
      el: el,
      name: el.querySelector("h3").firstChild.textContent.trim(),
      origin: el.querySelector(".menu-tag").textContent.trim(),
      price: el.querySelector(".menu-price").textContent.trim(),
      flavor: el.getAttribute("data-flavor").split(" "),
      process: el.getAttribute("data-process"),
      use: el.getAttribute("data-use").split(" "),
      acidity: parseInt(el.getAttribute("data-acidity"), 10)
    };
  });

  /* ---- 风味筛选 ---- */
  var filterBox = document.getElementById("menuFilters");
  var filterStatus = document.getElementById("filterStatus");
  var menuEmpty = document.getElementById("menuEmpty");
  var chips = filterBox ? Array.prototype.slice.call(filterBox.querySelectorAll(".chip")) : [];
  var activeFilters = { flavor: "", process: "", use: "" };

  function matchesFilters(bean) {
    return (!activeFilters.flavor || bean.flavor.indexOf(activeFilters.flavor) !== -1) &&
      (!activeFilters.process || bean.process === activeFilters.process) &&
      (!activeFilters.use || bean.use.indexOf(activeFilters.use) !== -1);
  }

  function applyFilters() {
    var shown = 0;
    beans.forEach(function (bean) {
      var visible = matchesFilters(bean);
      bean.el.hidden = !visible;
      if (visible) shown++;
    });
    chips.forEach(function (chip) {
      var on = activeFilters[chip.getAttribute("data-filter")] === chip.getAttribute("data-value");
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var filtering = activeFilters.flavor || activeFilters.process || activeFilters.use;
    filterStatus.textContent = filtering ? "显示 " + shown + " / " + beans.length + " 支" : "";
    menuEmpty.hidden = shown !== 0;
  }

  function resetFilters() {
    activeFilters = { flavor: "", process: "", use: "" };
    applyFilters();
  }

  if (filterBox && beans.length) {
    filterBox.hidden = false;
    filterBox.addEventListener("click", function (e) {
      var chip = e.target.closest(".chip");
      if (!chip) return;
      activeFilters[chip.getAttribute("data-filter")] = chip.getAttribute("data-value");
      applyFilters();
    });
    document.getElementById("filterReset").addEventListener("click", resetFilters);
  }

  /* ---- 选豆小测试 ---- */
  var quiz = document.getElementById("beanQuiz");

  function scoreBean(bean, answers) {
    var score = 0;
    var flavorRank = bean.flavor.indexOf(answers.flavor);
    if (flavorRank === 0) score += 6;
    else if (flavorRank > 0) score += 4;
    if (answers.use === "hot") score += 1;
    else if (bean.use.indexOf(answers.use) !== -1) score += 3;
    score += 2 - Math.abs(bean.acidity - answers.acidity);
    return score;
  }

  function pickBean(answers) {
    var best = null;
    var bestScore = -Infinity;
    beans.forEach(function (bean) {
      var s = scoreBean(bean, answers);
      if (s > bestScore) { best = bean; bestScore = s; }
    });
    return best;
  }

  if (quiz && beans.length) {
    var intro = document.getElementById("quizIntro");
    var form = document.getElementById("quizForm");
    var steps = Array.prototype.slice.call(form.querySelectorAll(".quiz-step"));
    var backBtn = document.getElementById("quizBack");
    var result = document.getElementById("quizResult");
    var current = 0;
    var picked = null;

    var showStep = function (i) {
      current = i;
      steps.forEach(function (step, idx) { step.hidden = idx !== i; });
      backBtn.hidden = i === 0;
      var checked = steps[i].querySelector("input:checked");
      (checked || steps[i].querySelector("input")).focus();
    };

    var showResult = function () {
      var answers = {
        flavor: form.elements.flavor.value,
        use: form.elements.use.value,
        acidity: parseInt(form.elements.acidity.value, 10)
      };
      picked = pickBean(answers);
      var reasons = [];
      if (picked.flavor.indexOf(answers.flavor) !== -1) reasons.push(LABELS[answers.flavor]);
      if (answers.use !== "hot" && picked.use.indexOf(answers.use) !== -1) reasons.push("适合" + LABELS[answers.use]);
      reasons.push(ACIDITY_LABELS[picked.acidity]);
      reasons.push(LABELS[picked.process] + "处理");
      document.getElementById("quizResultName").textContent = picked.name;
      document.getElementById("quizResultMeta").textContent = picked.origin + " · " + reasons.join(" · ") + " · " + picked.price;
      document.getElementById("quizResultWhy").textContent = picked.el.querySelector(".menu-desc").textContent.trim();
      form.hidden = true;
      result.hidden = false;
      document.getElementById("quizShow").focus();
    };

    quiz.hidden = false;

    document.getElementById("quizStart").addEventListener("click", function () {
      intro.hidden = true;
      form.hidden = false;
      showStep(0);
    });

    form.addEventListener("change", function (e) {
      if (e.target.type !== "radio") return;
      if (current < steps.length - 1) showStep(current + 1);
      else showResult();
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); });

    backBtn.addEventListener("click", function () {
      if (current > 0) showStep(current - 1);
    });

    document.getElementById("quizRestart").addEventListener("click", function () {
      form.reset();
      result.hidden = true;
      form.hidden = false;
      beans.forEach(function (bean) { bean.el.classList.remove("is-picked"); });
      showStep(0);
    });

    document.getElementById("quizShow").addEventListener("click", function () {
      if (!picked) return;
      if (picked.el.hidden) resetFilters();
      beans.forEach(function (bean) { bean.el.classList.toggle("is-picked", bean === picked); });
      picked.el.classList.add("in");
      picked.el.setAttribute("tabindex", "-1");
      picked.el.focus({ preventScroll: true });
      picked.el.scrollIntoView({ behavior: scrollBehavior, block: "center" });
    });
  }

  /* ---- 烘焙新鲜度（按上海时间计算） ---- */
  var ROAST_DAYS = [2, 5]; // 周二、周五开炉
  var SALE_DAYS = 21;
  var DAY_MS = 86400000;
  var WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  var freshness = document.getElementById("freshness");

  function shanghaiToday() {
    var parts = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai", year: "numeric", month: "numeric", day: "numeric"
    }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day);
  }
  function isRoastDay(t) { return ROAST_DAYS.indexOf(new Date(t).getUTCDay()) !== -1; }
  function formatDate(t) {
    var d = new Date(t);
    return (d.getUTCMonth() + 1) + "月" + d.getUTCDate() + "日 " + WEEKDAYS[d.getUTCDay()];
  }
  function relativeDays(n) {
    if (n === 0) return "今天";
    if (n === -1) return "昨天";
    if (n === 1) return "明天";
    return n < 0 ? (-n) + " 天前" : n + " 天后";
  }

  if (freshness) {
    var today = shanghaiToday();
    var lastOffset = 0;
    while (lastOffset < 7 && !isRoastDay(today - lastOffset * DAY_MS)) lastOffset++;
    var nextOffset = 1;
    while (nextOffset <= 7 && !isRoastDay(today + nextOffset * DAY_MS)) nextOffset++;
    var oldestOffset = SALE_DAYS - 1;
    while (oldestOffset > 0 && !isRoastDay(today - oldestOffset * DAY_MS)) oldestOffset--;

    document.getElementById("freshLast").textContent = formatDate(today - lastOffset * DAY_MS);
    document.getElementById("freshLastRel").textContent = relativeDays(-lastOffset);
    document.getElementById("freshNext").textContent = formatDate(today + nextOffset * DAY_MS);
    document.getElementById("freshNextRel").textContent = relativeDays(nextOffset);
    document.getElementById("freshWindow").textContent = formatDate(today - oldestOffset * DAY_MS).split(" ")[0] + " 之后烘焙";
    freshness.hidden = false;
  }

  /* ---- 页脚年份 ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
