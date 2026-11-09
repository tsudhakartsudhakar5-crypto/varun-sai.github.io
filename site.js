/* VARUN SAI — shared client + public features (journal, polls, quotes, announcements, forms) */
(function () {
  "use strict";
  var CFG = window.SITE_CONFIG || {};

  /* ---------- tiny API client for Supabase REST (no third-party library) ---------- */
  function hdr(token) {
    var h = { apikey: CFG.key, "Content-Type": "application/json" };
    if (token) h.Authorization = "Bearer " + token;
    return h;
  }
  function req(path, opts) {
    return fetch(CFG.url + path, opts).then(function (r) {
      return r.text().then(function (t) {
        var d = null;
        try { d = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) {
          var err = new Error((d && (d.message || d.msg || d.error_description || d.error)) || "Request failed (" + r.status + ")");
          err.status = r.status; throw err;
        }
        return { data: d, res: r };
      });
    });
  }
  var api = {
    select: function (t, q, tok) { return req("/rest/v1/" + t + (q ? "?" + q : ""), { headers: hdr(tok) }).then(function (x) { return x.data || []; }); },
    count: function (t, q, tok) {
      var h = hdr(tok); h.Prefer = "count=exact";
      return req("/rest/v1/" + t + "?select=id" + (q ? "&" + q : ""), { method: "HEAD", headers: h }).then(function (x) {
        var n = parseInt((x.res.headers.get("content-range") || "").split("/")[1], 10);
        return isNaN(n) ? 0 : n;
      });
    },
    rpc: function (name, args, tok) { return req("/rest/v1/rpc/" + name, { method: "POST", headers: hdr(tok), body: JSON.stringify(args || {}) }).then(function (x) { return x.data; }); },
    insert: function (t, row, tok) { var h = hdr(tok); h.Prefer = "return=representation"; return req("/rest/v1/" + t, { method: "POST", headers: h, body: JSON.stringify(row) }).then(function (x) { return x.data; }); },
    update: function (t, filter, patch, tok) { var h = hdr(tok); h.Prefer = "return=representation"; return req("/rest/v1/" + t + "?" + filter, { method: "PATCH", headers: h, body: JSON.stringify(patch) }).then(function (x) { return x.data; }); },
    remove: function (t, filter, tok) { var h = hdr(tok); h.Prefer = "return=representation"; return req("/rest/v1/" + t + "?" + filter, { method: "DELETE", headers: h }).then(function (x) { return x.data; }); },
    raw: req, hdr: hdr
  };

  /* ---------- helpers ---------- */
  function add(e, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(e, x); });
    else e.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
  function h(tag, props) {
    var e = document.createElement(tag); props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k]; if (v == null || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else if (k === "value") e.value = v;
      else e.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) add(e, arguments[i]);
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    return new Promise(function (res) {
      var t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(t); res(ok);
    });
  }
  function flash(btn, msg) {
    var old = btn.textContent; btn.textContent = msg;
    setTimeout(function () { btn.textContent = old; }, 1800);
  }
  var IMG_PREFIX = (CFG.url || "") + "/storage/v1/object/public/article-images/";
  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a class="text-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }
  /* Safe mini-markdown: everything is HTML-escaped first; only a few formats are re-enabled */
  function render(text) {
    return String(text || "").replace(/\r/g, "").split(/\n{2,}/).map(function (b) {
      b = b.trim(); if (!b) return "";
      var m = b.match(/^!\[([^\]]*)\]\((.+)\)$/);
      if (m) {
        var url = m[2].replace(/&amp;/g, "&");
        return url.indexOf(IMG_PREFIX) === 0 ? '<figure><img src="' + esc(url) + '" alt="' + esc(m[1] || "Article image") + '" loading="lazy"></figure>' : "";
      }
      if (/^### /.test(b)) return "<h3>" + inline(b.slice(4)) + "</h3>";
      if (/^## /.test(b)) return "<h2>" + inline(b.slice(3)) + "</h2>";
      if (/^> /.test(b)) return "<blockquote>" + inline(b.replace(/^> ?/gm, "").replace(/\n/g, " ")) + "</blockquote>";
      if (/^- /.test(b)) return "<ul class=\"list\">" + b.split("\n").map(function (l) { return "<li>" + inline(l.replace(/^- /, "")) + "</li>"; }).join("") + "</ul>";
      return "<p>" + inline(b).replace(/\n/g, "<br>") + "</p>";
    }).join("\n");
  }
  function slugify(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100); }
  function readingMinutes(text) { return Math.max(1, Math.round(String(text || "").split(/\s+/).filter(Boolean).length / 200)); }
  function token() {
    var t = null;
    try { t = localStorage.getItem("vs_token"); } catch (e) {}
    if (!t || t.length < 20) {
      var a = new Uint8Array(16); (window.crypto || window.msCrypto).getRandomValues(a);
      t = Array.prototype.map.call(a, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
      try { localStorage.setItem("vs_token", t); } catch (e) {}
    }
    return t;
  }
  function shareBar(url, title) {
    var enc = encodeURIComponent, wrap = h("div", { class: "share" });
    var copyBtn = h("button", { class: "btn secondary small", type: "button", text: "Copy link", onclick: function () { copyText(url).then(function (ok) { flash(copyBtn, ok ? "Copied" : "Press and hold to copy"); }); } });
    wrap.appendChild(copyBtn);
    [["WhatsApp", "https://wa.me/?text=" + enc(title + " " + url)],
     ["X", "https://twitter.com/intent/tweet?text=" + enc(title) + "&url=" + enc(url)],
     ["Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + enc(url)]].forEach(function (s) {
      wrap.appendChild(h("a", { class: "btn secondary small", href: s[1], target: "_blank", rel: "noopener noreferrer", text: s[0] }));
    });
    return wrap;
  }
  function note(text, kind) { return h("p", { class: "notice " + (kind || ""), role: kind === "error" ? "alert" : "status", text: text }); }

  window.Site = { api: api, h: h, esc: esc, fmtDate: fmtDate, clear: clear, qs: qs, copyText: copyText, flash: flash, render: render, slugify: slugify, readingMinutes: readingMinutes, token: token, shareBar: shareBar, note: note, CFG: CFG };

  /* =================== PUBLIC PAGES =================== */
  var page = document.body && document.body.getAttribute("data-page");
  var P = {};
  var pageUrl = function (f) { return new URL(f, location.href).href.split("#")[0]; };

  function isActive(p) {
    var now = Date.now();
    return p.status === "published" && (!p.starts_at || new Date(p.starts_at) <= now) && (!p.closes_at || new Date(p.closes_at) > now);
  }

  function articleCard(a) {
    var meta = [fmtDate(a.published_at), a.category && a.category.name, a.reading_minutes ? a.reading_minutes + " min read" : null].filter(Boolean).join(" · ");
    return h("article", { class: "card article-card" },
      h("p", { class: "meta-line", text: meta }),
      h("h3", null, h("a", { href: "article.html?slug=" + encodeURIComponent(a.slug), text: a.title })),
      a.excerpt ? h("p", { class: "grow", text: a.excerpt }) : null,
      h("a", { class: "text-link", href: "article.html?slug=" + encodeURIComponent(a.slug), text: "Read article →" }));
  }

  /* ----- Home ----- */
  P.home = function () {
    Promise.all([
      api.select("articles", "select=slug,title,published_at&order=published_at.desc&limit=3").catch(function () { return []; }),
      api.select("polls", "select=id,question,status,starts_at,closes_at&status=eq.published&order=created_at.desc&limit=10").catch(function () { return []; }),
      api.select("announcements", "select=id,title,is_important,published_at&order=published_at.desc&limit=3").catch(function () { return []; })
    ]).then(function (r) {
      var arts = r[0], polls = r[1].filter(isActive), anns = r[2];
      function fill(id, items, builder, empty) {
        var card = document.getElementById(id); if (!card || !items.length) return;
        var tag = card.querySelector(".tag"); if (tag) tag.textContent = "Latest";
        var p = card.querySelector("p.grow");
        var list = h("ul", { class: "mini-list grow" }, items.map(builder));
        if (p) p.replaceWith(list);
      }
      fill("home-thoughts", arts, function (a) { return h("li", null, h("a", { href: "article.html?slug=" + encodeURIComponent(a.slug), text: a.title }), h("small", { text: fmtDate(a.published_at) })); });
      fill("home-poll", polls.slice(0, 1), function (p) { return h("li", null, h("a", { href: "readers-corner.html", text: p.question }), p.closes_at ? h("small", { text: "Closes " + fmtDate(p.closes_at) }) : null); });
      fill("home-news", anns, function (a) { return h("li", null, h("a", { href: "announcements.html?id=" + a.id, text: (a.is_important ? "★ " : "") + a.title }), h("small", { text: fmtDate(a.published_at) })); });
    });
  };

  /* ----- Thoughts (journal list) ----- */
  P.thoughts = function () {
    var list = document.getElementById("article-list"), chips = document.getElementById("cat-chips"), search = document.getElementById("article-search");
    var all = [], cats = [], activeCat = "";
    function draw() {
      var q = search.value.trim().toLowerCase();
      var shown = all.filter(function (a) {
        return (!activeCat || (a.category && a.category.slug === activeCat)) &&
          (!q || (a.title + " " + (a.excerpt || "") + " " + (a.category ? a.category.name : "")).toLowerCase().indexOf(q) > -1);
      });
      clear(list);
      if (!all.length) { list.appendChild(h("div", { class: "empty" }, h("strong", { text: "The journal is opening soon" }), "No articles have been published yet.")); return; }
      if (!shown.length) { list.appendChild(h("div", { class: "empty" }, h("strong", { text: "No matching articles" }), "Try another word or category.")); return; }
      shown.forEach(function (a) { list.appendChild(articleCard(a)); });
    }
    function drawChips() {
      clear(chips);
      [{ slug: "", name: "All" }].concat(cats).forEach(function (c) {
        chips.appendChild(h("button", { type: "button", class: "chip" + (activeCat === c.slug ? " on" : ""), "aria-pressed": String(activeCat === c.slug), text: c.name, onclick: function () { activeCat = c.slug; drawChips(); draw(); } }));
      });
    }
    search.addEventListener("input", draw);
    Promise.all([
      api.select("articles", "select=slug,title,excerpt,published_at,reading_minutes,category:categories(name,slug)&order=published_at.desc&limit=200"),
      api.select("categories", "select=slug,name,sort_order&order=sort_order.asc")
    ]).then(function (r) { all = r[0]; cats = r[1]; drawChips(); draw(); })
      .catch(function () { clear(list).appendChild(note("The journal could not be loaded right now. Please try again later.", "error")); });
  };

  /* ----- Single article ----- */
  P.article = function () {
    var box = document.getElementById("article-box"), slug = qs("slug");
    if (!slug) { box.appendChild(note("No article was selected. Visit the journal to choose one.")); return; }
    api.select("articles", "select=id,slug,title,excerpt,content,cover_image_url,published_at,reading_minutes,category_id,category:categories(name,slug)&slug=eq." + encodeURIComponent(slug) + "&limit=1")
      .then(function (rows) {
        clear(box);
        if (!rows.length) { box.appendChild(h("div", { class: "empty" }, h("strong", { text: "Article not found" }), "It may have been unpublished or moved.", h("p", null, h("a", { class: "text-link", href: "thoughts.html", text: "← Back to Thoughts" })))); return; }
        var a = rows[0];
        document.title = a.title + " | Varun Sai";
        var cl = document.querySelector('link[rel="canonical"]'); if (cl) cl.setAttribute("href", pageUrl("article.html?slug=" + encodeURIComponent(a.slug)));
        var md = document.querySelector('meta[name="description"]'); if (md && a.excerpt) md.setAttribute("content", a.excerpt);
        var meta = [fmtDate(a.published_at), a.category && a.category.name, (a.reading_minutes || S_readingMinutes(a.content)) + " min read"].filter(Boolean).join(" · ");
        var body = h("div", { class: "article-body" }); body.innerHTML = render(a.content);
        box.appendChild(h("p", { class: "eyebrow", text: a.category ? a.category.name : "Thoughts" }));
        box.appendChild(h("h1", { text: a.title }));
        box.appendChild(h("p", { class: "meta-line", text: meta }));
        if (a.cover_image_url && a.cover_image_url.indexOf(IMG_PREFIX) === 0) box.appendChild(h("img", { class: "wide-feature", src: a.cover_image_url, alt: "Cover image for " + a.title }));
        box.appendChild(body);
        box.appendChild(h("h3", { text: "Share this article" }));
        box.appendChild(shareBar(pageUrl("article.html?slug=" + encodeURIComponent(a.slug)), a.title));
        return api.select("articles", "select=slug,title,published_at,category_id&order=published_at.desc&limit=200").then(function (list) {
          var i = list.findIndex(function (x) { return x.slug === a.slug; });
          var newer = i > 0 ? list[i - 1] : null, older = i > -1 && i < list.length - 1 ? list[i + 1] : null;
          var nav = h("nav", { class: "prevnext", "aria-label": "More articles" });
          nav.appendChild(older ? h("a", { href: "article.html?slug=" + encodeURIComponent(older.slug) }, h("small", { text: "← Previous" }), h("span", { text: older.title })) : h("span"));
          nav.appendChild(newer ? h("a", { class: "next", href: "article.html?slug=" + encodeURIComponent(newer.slug) }, h("small", { text: "Next →" }), h("span", { text: newer.title })) : h("span"));
          box.appendChild(nav);
          var rel = list.filter(function (x) { return x.slug !== a.slug && a.category_id && x.category_id === a.category_id; }).slice(0, 3);
          if (rel.length) {
            box.appendChild(h("h3", { text: "Related articles" }));
            box.appendChild(h("ul", { class: "mini-list" }, rel.map(function (x) { return h("li", null, h("a", { href: "article.html?slug=" + encodeURIComponent(x.slug), text: x.title }), h("small", { text: fmtDate(x.published_at) })); })));
          }
        });
      }).catch(function () { clear(box).appendChild(note("This article could not be loaded right now. Please try again later.", "error")); });
  };
  function S_readingMinutes(t) { return readingMinutes(t); }

  /* ----- Reader's Corner (polls + feedback) ----- */
  var VOTE_MSG = { already_voted: "This browser has already voted in this poll.", poll_not_open: "This poll is not open for voting.", invalid_option: "That choice is not valid.", invalid_token: "Voting could not be verified. Reload the page and try again.", rate_limited: "Too many votes right now. Please try again in a minute." };
  function voted(id) { try { return localStorage.getItem("vs_voted_" + id); } catch (e) { return null; } }
  function setVoted(id, opt) { try { localStorage.setItem("vs_voted_" + id, opt || "1"); } catch (e) {} }
  function resultsView(rows, closedNote) {
    var wrap = h("div", { class: "results" });
    var total = rows.length ? Number(rows[0].total_votes) : 0;
    rows.forEach(function (r) {
      wrap.appendChild(h("div", { class: "result" },
        h("div", { class: "result-top" }, h("span", { text: r.label }), h("strong", { text: Number(r.percent).toFixed(1).replace(/\.0$/, "") + "%" })),
        h("div", { class: "bar", role: "img", "aria-label": r.label + ": " + r.percent + " percent, " + r.votes + " votes" }, h("span", { style: "width:" + Math.max(0, Math.min(100, Number(r.percent))) + "%" })),
        h("small", { text: r.votes + (Number(r.votes) === 1 ? " vote" : " votes") })));
    });
    wrap.appendChild(h("p", { class: "muted total", text: "Total votes: " + total + (closedNote ? " · " + closedNote : "") }));
    return wrap;
  }
  function pollCard(p) {
    var active = isActive(p), card = h("article", { class: "card poll" });
    var body = h("div", { class: "poll-body" });
    card.appendChild(h("span", { class: "tag " + (active ? "gold" : ""), text: active ? "Open" : "Closed" }));
    card.appendChild(h("h3", { text: p.question }));
    if (p.description) card.appendChild(h("p", { class: "muted", text: p.description }));
    card.appendChild(h("p", { class: "meta-line", text: p.closes_at ? (active ? "Closes " : "Closed ") + fmtDate(p.closes_at) : (active ? "No closing date" : "") }));
    card.appendChild(body);
    var opts = (p.poll_options || []).slice().sort(function (a, b) { return a.sort_order - b.sort_order; });
    function showResults() {
      api.rpc("get_poll_results", { p_poll_id: p.id }).then(function (rows) { clear(body).appendChild(resultsView(rows || [])); })
        .catch(function () { clear(body).appendChild(note("Results could not be loaded.", "error")); });
    }
    function showVote() {
      var msg = h("div", { "aria-live": "polite" });
      var list = h("div", { class: "options", role: "group", "aria-label": p.question });
      opts.forEach(function (o) {
        var b = h("button", { type: "button", class: "btn secondary option", text: o.label, onclick: function () {
          list.querySelectorAll("button").forEach(function (x) { x.disabled = true; });
          api.rpc("cast_vote", { p_poll_id: p.id, p_option_id: o.id, p_client_token: token() }).then(function (r) {
            if (r && (r.counted || r.reason === "already_voted")) { setVoted(p.id, o.id); showResults(); }
            else { list.querySelectorAll("button").forEach(function (x) { x.disabled = false; }); clear(msg).appendChild(note(VOTE_MSG[r && r.reason] || "Your vote could not be counted.", "error")); }
          }).catch(function () { list.querySelectorAll("button").forEach(function (x) { x.disabled = false; }); clear(msg).appendChild(note("Your vote could not be sent. Check your connection and try again.", "error")); });
        } });
        list.appendChild(b);
      });
      var see = h("button", { type: "button", class: "text-link linkbtn", text: "See results without voting", onclick: showResults });
      clear(body).appendChild(list); body.appendChild(msg); body.appendChild(see);
    }
    if (!active || voted(p.id)) showResults(); else showVote();
    return card;
  }
  P.readers = function () {
    var open = document.getElementById("polls-open"), closed = document.getElementById("polls-closed"), closedHead = document.getElementById("closed-head");
    api.select("polls", "select=id,question,description,status,starts_at,closes_at,created_at,poll_options(id,label,sort_order)&order=created_at.desc&limit=50").then(function (polls) {
      var a = polls.filter(isActive), c = polls.filter(function (p) { return !isActive(p); });
      clear(open);
      if (!a.length) open.appendChild(h("div", { class: "empty" }, h("strong", { text: "No poll is open right now" }), "When a new poll opens it will appear here."));
      a.forEach(function (p) { open.appendChild(pollCard(p)); });
      if (c.length) { closedHead.hidden = false; c.forEach(function (p) { closed.appendChild(pollCard(p)); }); }
    }).catch(function () { clear(open).appendChild(note("Polls could not be loaded right now. Please try again later.", "error")); });

    var form = document.getElementById("feedback-form"), out = document.getElementById("feedback-msg"), wall = document.getElementById("feedback-wall");
    api.rpc("get_approved_feedback", { p_limit: 20 }).then(function (rows) {
      if (!rows || !rows.length) return;
      document.getElementById("wall-head").hidden = false;
      rows.forEach(function (f) { wall.appendChild(h("blockquote", null, f.message, h("footer", { class: "muted", text: "— " + f.name }))); });
    }).catch(function () {});
    form.addEventListener("submit", function (e) {
      e.preventDefault(); clear(out);
      var d = new FormData(form), name = (d.get("name") || "").trim(), msg = (d.get("message") || "").trim(), email = (d.get("email") || "").trim();
      if (!name) return out.appendChild(note("Please enter your name.", "error"));
      if (msg.length < 10) return out.appendChild(note("Please write at least 10 characters.", "error"));
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return out.appendChild(note("That email address does not look right.", "error"));
      var btn = form.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Sending…";
      api.rpc("submit_feedback", { p_name: name, p_message: msg, p_email: email || null, p_website: d.get("website") || null }).then(function (r) {
        if (r && r.ok) { form.reset(); out.appendChild(note("Thank you! Your feedback was received. It will appear here only after it has been reviewed.", "ok")); }
        else out.appendChild(note(r && r.error === "rate_limited" ? "Too many messages right now. Please try again later." : "Your feedback could not be sent. Please check it and try again.", "error"));
      }).catch(function () { out.appendChild(note("Your feedback could not be sent. Please try again.", "error")); })
        .then(function () { btn.disabled = false; btn.textContent = "Send feedback"; });
    });
  };

  /* ----- Quotes ----- */
  P.quotes = function () {
    var list = document.getElementById("quote-list"), chips = document.getElementById("quote-chips"), all = [], cat = "";
    function draw() {
      clear(list);
      var shown = all.filter(function (q) { return !cat || q.category === cat; });
      if (!all.length) return list.appendChild(h("div", { class: "empty" }, h("strong", { text: "Quotes are coming soon" }), "Original quotes by Varun Sai will appear here."));
      shown.forEach(function (q) {
        var text = "“" + q.text + "” — Varun Sai";
        var copy = h("button", { class: "btn secondary small", type: "button", text: "Copy", onclick: function () { copyText(text).then(function (ok) { flash(copy, ok ? "Copied" : "Press and hold"); }); } });
        var share = h("button", { class: "btn secondary small", type: "button", text: "Share", onclick: function () {
          if (navigator.share) navigator.share({ title: "Varun Sai", text: text, url: pageUrl("quotes.html") }).catch(function () {});
          else window.open("https://wa.me/?text=" + encodeURIComponent(text + " " + pageUrl("quotes.html")), "_blank", "noopener");
        } });
        list.appendChild(h("figure", { class: "quote-card" }, h("blockquote", { text: q.text }), h("figcaption", { text: "— Varun Sai" + (q.category ? " · " + q.category : "") }), h("div", { class: "btn-row" }, copy, share)));
      });
    }
    function drawChips() {
      clear(chips);
      var cats = Array.from(new Set(all.map(function (q) { return q.category; }).filter(Boolean)));
      if (!cats.length) return;
      ["All"].concat(cats).forEach(function (c) {
        var v = c === "All" ? "" : c;
        chips.appendChild(h("button", { type: "button", class: "chip" + (cat === v ? " on" : ""), "aria-pressed": String(cat === v), text: c, onclick: function () { cat = v; drawChips(); draw(); } }));
      });
    }
    api.select("quotes", "select=id,text,category,sort_order&order=sort_order.asc,created_at.desc&limit=200")
      .then(function (r) { all = r; drawChips(); draw(); })
      .catch(function () { clear(list).appendChild(note("Quotes could not be loaded right now.", "error")); });
  };

  /* ----- Announcements ----- */
  P.announcements = function () {
    var box = document.getElementById("news-box"), id = qs("id");
    function row(a) { return h("li", null, h("a", { href: "announcements.html?id=" + a.id, text: (a.is_important ? "★ " : "") + a.title }), h("small", { text: fmtDate(a.published_at) })); }
    api.select("announcements", "select=id,title,body,is_important,published_at&order=published_at.desc&limit=100").then(function (rows) {
      clear(box);
      if (id) {
        var a = rows.find(function (x) { return x.id === id; });
        if (!a) { box.appendChild(h("div", { class: "empty" }, h("strong", { text: "Announcement not found" }), h("a", { class: "text-link", href: "announcements.html", text: "← All announcements" }))); return; }
        document.title = a.title + " | Varun Sai";
        box.appendChild(h("p", { class: "meta-line", text: fmtDate(a.published_at) + (a.is_important ? " · Important" : "") }));
        box.appendChild(h("h2", { text: a.title }));
        var body = h("div", { class: "article-body" }); body.innerHTML = render(a.body); box.appendChild(body);
        box.appendChild(h("p", null, h("a", { class: "text-link", href: "announcements.html", text: "← All announcements" })));
        return;
      }
      if (!rows.length) { box.appendChild(h("div", { class: "empty" }, h("strong", { text: "No announcements yet" }), "Publishing and author updates will appear here.")); return; }
      var recent = rows.slice(0, 5), older = rows.slice(5);
      box.appendChild(h("ul", { class: "mini-list big" }, recent.map(row)));
      if (older.length) { box.appendChild(h("h3", { text: "Archive" })); box.appendChild(h("ul", { class: "mini-list" }, older.map(row))); }
    }).catch(function () { clear(box).appendChild(note("Announcements could not be loaded right now.", "error")); });
  };

  /* ----- Contact ----- */
  P.contact = function () {
    var form = document.getElementById("contact-form"), out = document.getElementById("contact-msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault(); clear(out);
      var d = new FormData(form), v = function (k) { return (d.get(k) || "").trim(); };
      var errs = [];
      if (!v("name")) errs.push("Please enter your name.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email"))) errs.push("Please enter a valid email address.");
      if (v("subject").length < 2) errs.push("Please add a subject.");
      if (v("message").length < 10) errs.push("Your message should be at least 10 characters.");
      if (errs.length) return out.appendChild(note(errs.join(" "), "error"));
      var btn = form.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Sending…";
      api.rpc("submit_contact", { p_name: v("name"), p_email: v("email"), p_subject: v("subject"), p_message: v("message"), p_website: d.get("website") || null }).then(function (r) {
        if (r && r.ok) { form.reset(); out.appendChild(note("Thank you! Your message was sent. The author will read it soon.", "ok")); }
        else out.appendChild(note(r && r.error === "rate_limited" ? "Too many messages were sent recently. Please try again in a few minutes." : "Your message could not be sent. Please check the fields and try again.", "error"));
      }).catch(function () { out.appendChild(note("Your message could not be sent. Please try again, or email the author directly.", "error")); })
        .then(function () { btn.disabled = false; btn.textContent = "Send message"; });
    });
  };

  if (page && P[page]) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", P[page]); else P[page](); }
})();
