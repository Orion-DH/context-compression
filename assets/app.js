(() => {
  "use strict";

  const PAGE_SIZE = 10;
  const AWARD_RANK = { Oral: 0, Spotlight: 1 };
  const NOTES = [
    ["method", "核心方法"],
    ["evidence", "实验证据"],
    ["assumptions", "依赖假设"],
    ["limitations", "局限与失效条件"],
    ["related", "关联论文"],
  ];

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");

  let papers = [];
  let taxonomy = null;
  let facets = [];
  const hueOf = new Map();
  const state = { relevance: "", category: "", branch: "", q: "", sort: "default", page: 1, sel: {} };

  const load = (url) => fetch(url, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(url);
    return r.json();
  });

  const valuesOf = (p, key) => {
    const v = p[key];
    if (v === undefined || v === null || v === "") return [];
    return Array.isArray(v) ? v.map(String) : [String(v)];
  };

  function init(paperData, taxonomyData) {
    papers = paperData;
    taxonomy = taxonomyData;
    const derived = (key, label, sorter) => {
      const options = [...new Set(papers.flatMap((p) => valuesOf(p, key)))].sort(sorter);
      return { key, label, options: options.map((value) => ({ value })) };
    };
    facets = [
      derived("source", "来源", (a, b) => taxonomy.sources.indexOf(a) - taxonomy.sources.indexOf(b)),
      derived("venue", "发表渠道", (a, b) => a.localeCompare(b)),
      derived("track", "录用类型", (a, b) => taxonomy.trackOrder.indexOf(a) - taxonomy.trackOrder.indexOf(b)),
      ...taxonomy.facets,
    ];
    facets.forEach((f) => {
      state.sel[f.key] = new Set();
      f.options.forEach((o) => { if (o.hue) hueOf.set(`${f.key}:${o.value}`, o.hue); });
    });
    readHash();
    renderLegend();
    const latest = papers.map((p) => p.added || "").sort().pop();
    $("updated").textContent = `${latest ? `更新于 ${latest} · ` : ""}共 ${papers.length} 篇`;
    render();
  }

  function matches(p, skip) {
    if (skip !== "relevance" && state.relevance && p.relevance !== state.relevance) return false;
    if (skip !== "category" && state.category && p.category !== state.category) return false;
    if (skip !== "category" && state.branch && p.branch !== state.branch) return false;
    if (state.q) {
      const hay = [p.title, p.category, p.branch, p.summary, p.venue, ...(p.authors || []), ...Object.values(p.notes || {})]
        .join(" ").toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
    }
    return facets.every((f) => {
      const s = state.sel[f.key];
      return f.key === skip || !s.size || valuesOf(p, f.key).some((v) => s.has(v));
    });
  }

  const sorted = (list) => {
    const compare = {
      default: () => 0,
      hf: (a, b) => (b.hfDate || "").localeCompare(a.hfDate || ""),
      award: (a, b) => (AWARD_RANK[a.track] ?? 9) - (AWARD_RANK[b.track] ?? 9),
      title: (a, b) => String(a.title).localeCompare(String(b.title)),
    }[state.sort];
    return [...list].sort(compare);
  };

  function renderSections() {
    const pool = papers.filter((p) => matches(p, "relevance"));
    const count = (s) => pool.filter((p) => p.relevance === s).length;
    const items = [["", "全部", pool.length], ...taxonomy.relevances.map((s) => [s, s, count(s)])];
    $("sections").innerHTML = items.map(([v, label, n]) => (
      `<button class="${state.relevance === v ? "on" : ""}" data-relevance="${esc(v)}"${taxonomy.relevanceNotes[v] ? ` title="${esc(taxonomy.relevanceNotes[v])}"` : ""}>${esc(label)} <span class="n">${n}</span></button>`
    )).join("");
  }

  function renderRelevanceNote() {
    const note = taxonomy.relevanceNotes[state.relevance];
    $("relevance-note").hidden = !note;
    $("relevance-note").innerHTML = note ? `<b>${esc(state.relevance)}：</b>${esc(note)}` : "";
  }

  function renderLegend() {
    $("legend-relevance").innerHTML = taxonomy.relevances.map((r) => (
      `<dt>${esc(r)}</dt><dd>${esc(taxonomy.relevanceNotes[r])}</dd>`
    )).join("");
  }

  function renderFacets() {
    const pool = papers.filter((p) => matches(p, "category"));
    const countCat = (c) => pool.filter((p) => p.category === c).length;
    const categories = `<section class="facet"><div class="facet-head"><span>压缩主类</span></div><div class="list">
      <button class="${state.category ? "" : "on"}" data-category=""><span>全部</span><span class="n">${pool.length}</span></button>
      ${taxonomy.categories.map((c) => `<button class="${state.category === c.name ? "on" : ""}" data-category="${esc(c.name)}"><span>${esc(c.name)}</span><span class="n">${countCat(c.name)}</span></button>`).join("")}
    </div></section>`;

    const blocks = facets.filter((f) => f.options.length).map((f) => {
      const facetPool = papers.filter((p) => matches(p, f.key));
      const chips = f.options.map((o) => {
        const n = facetPool.filter((p) => valuesOf(p, f.key).includes(o.value)).length;
        const on = state.sel[f.key].has(o.value);
        return `<button class="chip ${on ? "on" : ""} ${n ? "" : "zero"}" data-facet="${esc(f.key)}" data-value="${esc(o.value)}">${esc(o.value)} <span class="n">${n}</span></button>`;
      }).join("");
      const clear = state.sel[f.key].size ? `<button class="facet-clear" data-clear="${esc(f.key)}">清空</button>` : "";
      return `<section class="facet"><div class="facet-head"><span>${esc(f.label)}</span>${clear}</div><div class="chips">${chips}</div></section>`;
    });
    $("facets").innerHTML = categories + blocks.join("");
  }

  function renderMap() {
    const pool = papers.filter((p) => matches(p, "category"));
    $("map-grid").innerHTML = taxonomy.categories.map((c) => {
      const n = pool.filter((p) => p.category === c.name).length;
      const items = c.branches.map((b) => {
        const count = pool.filter((p) => p.category === c.name && p.branch === b).length;
        return `<li><button class="${state.branch === b ? "on" : ""}" data-category="${esc(c.name)}" data-branch="${esc(b)}"><span>${esc(b)}</span><span>${count}</span></button></li>`;
      }).join("");
      return `<div class="map-col"><h3>${esc(c.name)} <span class="n">(${n})</span></h3><ul>${items}</ul></div>`;
    }).join("");
  }

  function cardHtml(p) {
    const link = safeUrl(p.url);
    const actions = [
      safeUrl(p.pdf) && `<a class="btn primary" href="${esc(p.pdf)}" target="_blank" rel="noopener">${/openreview\.net/.test(p.pdf) ? "OpenReview" : "PDF"}</a>`,
      link && p.venue !== "HF Daily" && `<a class="btn" href="${esc(link)}" target="_blank" rel="noopener">官方页面</a>`,
      safeUrl(p.hf) && `<a class="btn" href="${esc(p.hf)}" target="_blank" rel="noopener">HF 页面</a>`,
      safeUrl(p.arxiv) && `<a class="btn" href="${esc(p.arxiv)}" target="_blank" rel="noopener">arXiv</a>`,
      safeUrl(p.code) && `<a class="btn" href="${esc(p.code)}" target="_blank" rel="noopener">代码</a>`,
    ].filter(Boolean).join("");
    const authors = p.authors || [];
    const authorText = authors.length > 3 ? `${authors.slice(0, 3).join(", ")} 等` : authors.join(", ");
    const meta = [
      [p.category, p.branch].filter(Boolean).map(esc).join(" / "),
      esc(authorText),
      esc(p.venue),
      p.track === p.venue ? "" : AWARD_RANK[p.track] !== undefined ? `<span class="award">${esc(p.track)}</span>` : esc(p.track),
      p.hfDate ? `HF 收录 ${esc(p.hfDate)}` : "",
      esc(p.relevance),
    ].filter(Boolean).join(" · ");
    const rows = taxonomy.facets.map((f) => {
      const vals = valuesOf(p, f.key);
      if (!vals.length) return "";
      const tags = vals.map((v) => `<button class="tag hue-${esc(hueOf.get(`${f.key}:${v}`) || "Gray")}" data-facet="${esc(f.key)}" data-value="${esc(v)}" title="按「${esc(v)}」筛选">${esc(v)}</button>`).join("");
      return `<span class="k">${esc(f.label)}：</span><div class="tags">${tags}</div>`;
    }).join("");
    const notes = NOTES.filter(([k]) => p.notes && p.notes[k])
      .map(([k, label]) => `<div class="note"><h4>${label}</h4><p>${esc(p.notes[k])}</p></div>`).join("");
    const title = link ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title);
    return `<article class="card">
      <div class="card-head"><h2>${title}</h2><div class="card-actions">${actions}</div></div>
      <p class="meta">${meta}</p>
      ${p.summary ? `<p class="summary">${esc(p.summary)}</p>` : ""}
      ${rows ? `<div class="rows">${rows}</div>` : ""}
      ${notes ? `<details class="details"><summary>展开详情</summary>${notes}</details>` : ""}
    </article>`;
  }

  function renderPager(pages) {
    if (pages <= 1) { $("pager").innerHTML = ""; return; }
    const cur = state.page;
    const nums = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    const btn = (label, page, extra = "") => `<button data-page="${page}" ${extra}>${label}</button>`;
    let html = btn("上一页", cur - 1, cur === 1 ? "disabled" : "");
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) html += "<span>…</span>";
      html += btn(n, n, n === cur ? 'class="on" aria-current="page"' : "");
    });
    html += btn("下一页", cur + 1, cur === pages ? "disabled" : "");
    $("pager").innerHTML = `${html}<span>第 ${cur} / ${pages} 页</span>`;
  }

  function renderActive() {
    const items = [];
    if (state.q) items.push(`<button class="chip" data-remove="q">搜索：${esc(state.q)} ✕</button>`);
    if (state.category) items.push(`<button class="chip" data-remove="category">主类：${esc(state.category)} ✕</button>`);
    if (state.branch) items.push(`<button class="chip" data-remove="branch">分支：${esc(state.branch)} ✕</button>`);
    facets.forEach((f) => state.sel[f.key].forEach((v) => {
      items.push(`<button class="chip" data-facet="${esc(f.key)}" data-value="${esc(v)}">${esc(f.label)}：${esc(v)} ✕</button>`);
    }));
    $("active-filters").innerHTML = items.join("");
    $("clear-all").hidden = !items.length && !state.relevance;
  }

  function render() {
    const list = sorted(papers.filter((p) => matches(p)));
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    state.page = Math.min(state.page, pages);
    const slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);
    $("match").innerHTML = `匹配 <b>${list.length}</b> / ${papers.length} 篇`;
    $("cards").innerHTML = slice.length
      ? slice.map(cardHtml).join("")
      : papers.length
        ? '<p class="empty">没有符合条件的论文。</p>'
        : '<p class="empty">还没有收录论文。<small>论文写入 data/papers.json 后会显示在这里。</small></p>';
    renderSections();
    renderRelevanceNote();
    renderFacets();
    renderMap();
    renderActive();
    renderPager(pages);
    writeHash();
  }

  function writeHash() {
    const h = new URLSearchParams();
    if (state.q) h.set("q", state.q);
    if (state.relevance) h.set("relevance", state.relevance);
    if (state.category) h.set("category", state.category);
    if (state.branch) h.set("branch", state.branch);
    if (state.sort !== "default") h.set("sort", state.sort);
    if (state.page > 1) h.set("page", state.page);
    facets.forEach((f) => { if (state.sel[f.key].size) h.set(f.key, [...state.sel[f.key]].join("|")); });
    const next = h.toString();
    if (next !== location.hash.slice(1)) history.replaceState(null, "", next ? `#${next}` : location.pathname);
  }

  function readHash() {
    const h = new URLSearchParams(location.hash.slice(1));
    state.q = h.get("q") || "";
    state.relevance = h.get("relevance") || "";
    state.category = h.get("category") || "";
    state.branch = h.get("branch") || "";
    state.sort = h.get("sort") || "default";
    state.page = Math.max(1, parseInt(h.get("page"), 10) || 1);
    facets.forEach((f) => { state.sel[f.key] = new Set((h.get(f.key) || "").split("|").filter(Boolean)); });
    $("search").value = state.q;
    $("sort").value = state.sort;
  }

  const update = (fn) => { fn(); state.page = 1; render(); };
  const closeDrawer = () => { $("sidebar").classList.remove("open"); $("scrim").classList.remove("open"); };

  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const d = b.dataset;
    if (d.page) {
      state.page = Number(d.page);
      render();
      window.scrollTo(0, 0);
    } else if (d.relevance !== undefined) {
      update(() => { state.relevance = d.relevance; });
    } else if (d.category !== undefined) {
      update(() => {
        const sameBranch = d.branch && state.branch === d.branch;
        state.category = sameBranch ? "" : d.category;
        state.branch = sameBranch ? "" : d.branch || "";
      });
    } else if (d.facet) {
      update(() => {
        const s = state.sel[d.facet];
        if (s.has(d.value)) s.delete(d.value); else s.add(d.value);
      });
    } else if (d.clear) {
      update(() => state.sel[d.clear].clear());
    } else if (d.remove) {
      update(() => {
        state[d.remove] = "";
        if (d.remove === "category") state.branch = "";
        if (d.remove === "q") $("search").value = "";
      });
    }
  });

  $("search").addEventListener("input", (e) => update(() => { state.q = e.target.value.trim(); }));
  $("sort").addEventListener("change", (e) => update(() => { state.sort = e.target.value; }));
  $("clear-all").addEventListener("click", () => update(() => {
    Object.assign(state, { q: "", relevance: "", category: "", branch: "" });
    $("search").value = "";
    facets.forEach((f) => state.sel[f.key].clear());
  }));
  $("toggle-filters").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
    $("scrim").classList.toggle("open");
  });
  $("scrim").addEventListener("click", closeDrawer);

  Promise.all([load("data/papers.json"), load("data/taxonomy.json")])
    .then(([p, t]) => init(p, t))
    .catch(() => { $("cards").innerHTML = '<p class="empty">数据加载失败，请刷新重试。</p>'; });
})();
