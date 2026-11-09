/* VARUN SAI — author admin panel. Security note: this page only *shows* controls.
   Every read/write is enforced by the database (Row Level Security) using the signed-in user's token. */
(function () {
  "use strict";
  var S = window.Site, api = S.api, h = S.h, CFG = S.CFG, clear = S.clear, fmt = S.fmtDate;
  var root = document.getElementById("admin-app");
  var KEY = "vs_admin_session", session = null;

  /* ---------- session ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
  function save(s) { session = s; try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch (e) {} }
  function authReq(grant, body) {
    return api.raw("/auth/v1/token?grant_type=" + grant, { method: "POST", headers: api.hdr(), body: JSON.stringify(body) }).then(function (x) {
      var d = x.data; return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, email: (d.user && d.user.email) || (session && session.email) || "" };
    });
  }
  function tok() {
    if (!session) return Promise.reject(new Error("Not signed in"));
    if (session.expires_at - Date.now() > 60000) return Promise.resolve(session.access_token);
    return authReq("refresh_token", { refresh_token: session.refresh_token }).then(function (s) { save(s); return s.access_token; })
      .catch(function (e) { save(null); showLogin("Your session expired. Please sign in again."); throw e; });
  }
  var A = {
    select: function (t, q) { return tok().then(function (k) { return api.select(t, q, k); }); },
    count: function (t, q) { return tok().then(function (k) { return api.count(t, q, k); }); },
    insert: function (t, r) { return tok().then(function (k) { return api.insert(t, r, k); }); },
    update: function (t, f, p) { return tok().then(function (k) { return api.update(t, f, p, k); }); },
    remove: function (t, f) { return tok().then(function (k) { return api.remove(t, f, k); }); },
    rpc: function (n, a) { return tok().then(function (k) { return api.rpc(n, a, k); }); }
  };

  /* ---------- UI helpers ---------- */
  var toastBox;
  function toast(msg, kind) {
    if (!toastBox) { toastBox = h("div", { class: "toast-box", "aria-live": "polite" }); document.body.appendChild(toastBox); }
    var t = h("div", { class: "toast " + (kind || "ok"), text: msg }); toastBox.appendChild(t);
    setTimeout(function () { t.remove(); }, kind === "error" ? 6000 : 3000);
  }
  function fail(e) { toast((e && e.message) || "Something went wrong.", "error"); }
  function field(label, input, hint) { return h("label", { class: "fld" }, h("span", { text: label }), input, hint ? h("small", { text: hint }) : null); }
  function inp(name, type, val, attrs) { return h("input", Object.assign({ name: name, type: type || "text", value: val == null ? "" : val }, attrs || {})); }
  function area(name, val, rows) { var a = h("textarea", { name: name, rows: rows || 5 }); a.value = val == null ? "" : val; return a; }
  function sel(name, opts, val) {
    var s = h("select", { name: name }, opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; var op = h("option", { value: v, text: l }); if (String(v) === String(val)) op.selected = true; return op; }));
    return s;
  }
  function toLocal(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return ""; var p = function (n) { return ("0" + n).slice(-2); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function fromLocal(v) { if (!v) return null; var d = new Date(v); return isNaN(d) ? null : d.toISOString(); }
  function btn(text, fn, cls) { return h("button", { type: "button", class: "btn small " + (cls || "secondary"), text: text, onclick: fn }); }
  function confirmDelete(what) { return window.confirm("Delete " + what + "? This cannot be undone."); }
  function statusTag(s) { return h("span", { class: "tag " + (s === "published" ? "gold" : ""), text: s }); }
  function nowOrBefore(iso) { return !iso || new Date(iso) <= Date.now(); }
  var panel, tabsEl, current = "overview";

  /* ---------- login ---------- */
  function showLogin(msg) {
    clear(root);
    var out = h("div", { "aria-live": "polite" }); if (msg) out.appendChild(S.note(msg, "error"));
    var form = h("form", { class: "admin-card", novalidate: true },
      h("h1", { text: "Author sign in" }),
      field("Email", inp("email", "email", "", { autocomplete: "username", required: true })),
      field("Password", inp("password", "password", "", { autocomplete: "current-password", required: true })),
      h("button", { class: "btn primary", type: "submit", text: "Sign in" }), out);
    form.addEventListener("submit", function (e) {
      e.preventDefault(); clear(out);
      var d = new FormData(form), email = (d.get("email") || "").trim(), pw = d.get("password") || "";
      if (!email || !pw) return out.appendChild(S.note("Enter your email and password.", "error"));
      var b = form.querySelector("button"); b.disabled = true; b.textContent = "Signing in…";
      authReq("password", { email: email, password: pw }).then(function (s) {
        s.email = s.email || email; save(s);
        return api.select("admin_users", "select=user_id", s.access_token).then(function (rows) {
          if (!rows.length) { save(null); throw new Error("This account is not an administrator."); }
          showPanel();
        });
      }).catch(function (err) { out.appendChild(S.note(err.status === 400 ? "Email or password is incorrect." : err.message, "error")); b.disabled = false; b.textContent = "Sign in"; });
    });
    root.appendChild(form);
  }

  /* ---------- shell ---------- */
  var TABS = [["overview", "Overview"], ["journal", "Journal"], ["polls", "Polls"], ["quotes", "Quotes"], ["announcements", "Announcements"], ["feedback", "Feedback"], ["messages", "Messages"], ["subscribers", "Subscribers"], ["settings", "Settings"]];
  function showPanel() {
    clear(root);
    tabsEl = h("nav", { class: "admin-tabs", "aria-label": "Admin sections" });
    panel = h("section", { class: "admin-panel", "aria-live": "polite" });
    root.appendChild(h("div", { class: "admin-head" }, h("h1", { text: "Author panel" }), h("span", { class: "muted", text: session.email })));
    root.appendChild(tabsEl); root.appendChild(panel);
    go(current);
  }
  function go(name) {
    current = name; clear(tabsEl);
    TABS.forEach(function (t) { tabsEl.appendChild(h("button", { type: "button", class: "chip" + (t[0] === name ? " on" : ""), "aria-current": t[0] === name ? "page" : null, text: t[1], onclick: function () { go(t[0]); } })); });
    clear(panel).appendChild(h("p", { class: "muted", text: "Loading…" }));
    ({ overview: overview, journal: journal, polls: polls, quotes: quotes, announcements: announcements, feedback: feedback, messages: messages, subscribers: subscribers, settings: settings })[name]();
  }
  function setPanel() { clear(panel); for (var i = 0; i < arguments.length; i++) panel.appendChild(arguments[i]); }
  function formRow(el, buttons) { return h("div", { class: "btn-row" }, buttons); }

  /* ---------- overview ---------- */
  function overview() {
    var items = [["Articles", "articles", ""], ["Published articles", "articles", "status=eq.published"], ["Drafts", "articles", "status=eq.draft"], ["Polls", "polls", ""], ["Quotes", "quotes", ""], ["Announcements", "announcements", ""], ["Feedback awaiting review", "reader_feedback", "status=eq.pending"], ["New messages", "contact_messages", "status=eq.new"]];
    Promise.all(items.map(function (i) { return A.count(i[1], i[2]).catch(function () { return "—"; }); })).then(function (counts) {
      setPanel(h("h2", { text: "Overview" }), h("div", { class: "stat-grid" }, items.map(function (it, i) { return h("div", { class: "stat" }, h("strong", { text: String(counts[i]) }), h("span", { text: it[0] })); })),
        h("p", { class: "muted", text: "Tip: open the other tabs to write articles, create polls and review readers' messages." }));
    }).catch(fail);
  }

  /* ---------- journal ---------- */
  function journal() {
    Promise.all([A.select("articles", "select=id,slug,title,status,published_at,category_id&order=created_at.desc&limit=200"), A.select("categories", "select=id,slug,name,sort_order&order=sort_order.asc")]).then(function (r) {
      var arts = r[0], cats = r[1];
      var list = h("ul", { class: "admin-list" }, arts.map(function (a) {
        var scheduled = a.status === "published" && !nowOrBefore(a.published_at);
        return h("li", null, h("div", { class: "grow" }, h("strong", { text: a.title }), h("small", { text: (scheduled ? "Scheduled for " + fmt(a.published_at) : a.published_at ? fmt(a.published_at) : "Not published") + " · /" + a.slug })),
          statusTag(scheduled ? "scheduled" : a.status),
          h("div", { class: "btn-row tight" },
            btn("Edit", function () { articleEditor(a.id, cats); }),
            btn(a.status === "published" ? "Unpublish" : "Publish", function () {
              var patch = a.status === "published" ? { status: "draft", published_at: null } : { status: "published", published_at: new Date().toISOString() };
              A.update("articles", "id=eq." + a.id, patch).then(function () { toast(a.status === "published" ? "Moved back to drafts." : "Published."); journal(); }).catch(fail);
            }),
            btn("Delete", function () { if (confirmDelete("“" + a.title + "”")) A.remove("articles", "id=eq." + a.id).then(function () { toast("Article deleted."); journal(); }).catch(fail); }, "danger")));
      }));
      setPanel(h("div", { class: "admin-bar" }, h("h2", { text: "Journal" }), btn("New article", function () { articleEditor(null, cats); }, "primary")),
        arts.length ? list : h("div", { class: "empty" }, h("strong", { text: "No articles yet" }), "Create your first article."),
        categoriesBox(cats));
    }).catch(fail);
  }
  function categoriesBox(cats) {
    var box = h("details", { class: "admin-card" }, h("summary", { text: "Manage categories" }));
    var list = h("ul", { class: "admin-list" }, cats.map(function (c) {
      return h("li", null, h("span", { class: "grow", text: c.name + " (" + c.slug + ")" }),
        btn("Rename", function () { var n = window.prompt("New name", c.name); if (n && n.trim().length > 1) A.update("categories", "id=eq." + c.id, { name: n.trim() }).then(function () { toast("Renamed."); journal(); }).catch(fail); }),
        btn("Delete", function () { if (confirmDelete("category “" + c.name + "” (articles keep existing but lose the category)")) A.remove("categories", "id=eq." + c.id).then(function () { toast("Category deleted."); journal(); }).catch(fail); }, "danger"));
    }));
    var name = inp("cname", "text", "", { placeholder: "New category name", maxlength: 80 });
    box.appendChild(list);
    box.appendChild(h("div", { class: "btn-row" }, name, btn("Add category", function () {
      var n = name.value.trim(), slug = S.slugify(n);
      if (n.length < 2 || slug.length < 2) return toast("Enter a category name (at least 2 characters).", "error");
      A.insert("categories", { name: n, slug: slug, sort_order: cats.length + 1 }).then(function () { toast("Category added."); journal(); }).catch(fail);
    }, "primary")));
    return box;
  }
  function articleEditor(id, cats) {
    (id ? A.select("articles", "select=*&id=eq." + id + "&limit=1") : Promise.resolve([{}])).then(function (rows) {
      var a = rows[0] || {};
      var f = h("form", { class: "admin-card", novalidate: true });
      var title = inp("title", "text", a.title, { maxlength: 200 }), slug = inp("slug", "text", a.slug, { maxlength: 120 }), content = area("content", a.content, 14);
      var cover = inp("cover", "url", a.cover_image_url), mins = inp("mins", "number", a.reading_minutes, { min: 1, max: 120 });
      title.addEventListener("input", function () { if (!id && !slug.dataset.touched) slug.value = S.slugify(title.value); });
      slug.addEventListener("input", function () { slug.dataset.touched = "1"; });
      var file = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif" }), upMsg = h("small", { class: "muted" });
      function upload(mode) {
        var fl = file.files[0]; if (!fl) return toast("Choose an image first.", "error");
        if (fl.size > 5 * 1024 * 1024) return toast("Image is larger than 5 MB.", "error");
        var name = Date.now() + "-" + fl.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        upMsg.textContent = "Uploading…";
        tok().then(function (k) {
          var hd = api.hdr(k); hd["Content-Type"] = fl.type; hd["x-upsert"] = "false";
          return api.raw("/storage/v1/object/article-images/" + name, { method: "POST", headers: hd, body: fl });
        }).then(function () {
          var url = CFG.url + "/storage/v1/object/public/article-images/" + name;
          if (mode === "cover") cover.value = url; else content.value += (content.value ? "\n\n" : "") + "![" + (fl.name.replace(/\.[^.]+$/, "")) + "](" + url + ")";
          upMsg.textContent = "Uploaded."; file.value = "";
        }).catch(function (e) { upMsg.textContent = ""; fail(e); });
      }
      var pub = inp("pub", "datetime-local", toLocal(a.published_at));
      var status = sel("status", [["draft", "Draft (not public)"], ["published", "Published"]], a.status || "draft");
      var catSel = sel("cat", [["", "No category"]].concat(cats.map(function (c) { return [c.id, c.name]; })), a.category_id || "");
      f.appendChild(h("h2", { text: id ? "Edit article" : "New article" }));
      [field("Title", title), field("Web address (slug)", slug, "Lowercase letters, numbers and hyphens."), field("Category", catSel),
       field("Short summary", area("excerpt", a.excerpt, 3), "Shown in lists and search results (max 400 characters)."),
       field("Article text", content, "Blank line = new paragraph. ## Heading · **bold** · *italic* · > quote · - list · [text](https://link)"),
       field("Cover image URL", cover), h("div", { class: "fld" }, h("span", { text: "Upload an image" }), file, h("div", { class: "btn-row tight" }, btn("Use as cover", function () { upload("cover"); }), btn("Insert in text", function () { upload("text"); })), upMsg),
       field("Reading time (minutes)", mins, "Leave empty to calculate automatically."), field("Status", status), field("Publish date", pub, "Choose a future date to schedule. Empty = now.")].forEach(function (x) { f.appendChild(x); });
      f.appendChild(h("div", { class: "btn-row" }, h("button", { type: "submit", class: "btn primary", text: "Save article" }), btn("Cancel", journal)));
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var d = new FormData(f), t = (d.get("title") || "").trim(), sl = (d.get("slug") || "").trim() || S.slugify(t), st = d.get("status");
        if (t.length < 3) return toast("Title needs at least 3 characters.", "error");
        if (!/^[a-z0-9-]{3,120}$/.test(sl)) return toast("Web address: 3–120 lowercase letters, numbers or hyphens.", "error");
        if ((d.get("excerpt") || "").length > 400) return toast("Summary is longer than 400 characters.", "error");
        var row = { title: t, slug: sl, category_id: d.get("cat") || null, excerpt: (d.get("excerpt") || "").trim() || null, content: d.get("content") || "", cover_image_url: (d.get("cover") || "").trim() || null,
          reading_minutes: d.get("mins") ? Math.min(120, Math.max(1, parseInt(d.get("mins"), 10))) : S.readingMinutes(d.get("content")), status: st,
          published_at: st === "published" ? (fromLocal(d.get("pub")) || new Date().toISOString()) : null };
        (id ? A.update("articles", "id=eq." + id, row) : A.insert("articles", row)).then(function () { toast("Article saved."); journal(); }).catch(function (e2) { fail(/duplicate|unique/i.test(e2.message) ? new Error("That web address is already used by another article.") : e2); });
      });
      setPanel(f);
    }).catch(fail);
  }

  /* ---------- polls ---------- */
  function pollState(p) {
    if (p.status === "draft") return "draft";
    if (p.status === "closed" || (p.closes_at && new Date(p.closes_at) <= Date.now())) return "closed";
    if (p.starts_at && new Date(p.starts_at) > Date.now()) return "scheduled";
    return "open";
  }
  function polls() {
    A.select("polls", "select=id,question,description,status,starts_at,closes_at,poll_options(id,label,sort_order)&order=created_at.desc&limit=100").then(function (rows) {
      var list = h("ul", { class: "admin-list" }, rows.map(function (p) {
        var st = pollState(p);
        return h("li", null, h("div", { class: "grow" }, h("strong", { text: p.question }), h("small", { text: (p.closes_at ? "Closes " + fmt(p.closes_at) : "No closing date") + (p.starts_at ? " · starts " + fmt(p.starts_at) : "") })), h("span", { class: "tag " + (st === "open" ? "gold" : ""), text: st }),
          h("div", { class: "btn-row tight" }, btn("Results", function () { pollStats(p); }), btn("Edit", function () { pollEditor(p); }),
            st === "draft" ? btn("Publish", function () { A.update("polls", "id=eq." + p.id, { status: "published" }).then(function () { toast("Poll published."); polls(); }).catch(fail); }) : null,
            st === "open" || st === "scheduled" ? btn("Unpublish", function () { A.update("polls", "id=eq." + p.id, { status: "draft" }).then(function () { toast("Poll moved to drafts."); polls(); }).catch(fail); }) : null,
            st === "open" || st === "scheduled" ? btn("Close now", function () { if (window.confirm("Close this poll now? Voting stops immediately.")) A.update("polls", "id=eq." + p.id, { status: "closed" }).then(function () { toast("Poll closed."); polls(); }).catch(fail); }) : null,
            btn("Delete", function () { if (confirmDelete("this poll and all its votes")) A.remove("polls", "id=eq." + p.id).then(function () { toast("Poll deleted."); polls(); }).catch(fail); }, "danger")));
      }));
      setPanel(h("div", { class: "admin-bar" }, h("h2", { text: "Polls" }), btn("New poll", function () { pollEditor(null); }, "primary")), rows.length ? list : h("div", { class: "empty" }, h("strong", { text: "No polls yet" }), "Create a poll for your readers."));
    }).catch(fail);
  }
  function pollStats(p) {
    A.rpc("get_poll_results", { p_poll_id: p.id }).then(function (rows) {
      var wrap = h("div", { class: "admin-card" }, h("h2", { text: p.question }), h("p", { class: "muted", text: "Statistics only. Individual voters are never stored or shown." }));
      var total = rows.length ? Number(rows[0].total_votes) : 0;
      rows.forEach(function (r) { wrap.appendChild(h("div", { class: "result" }, h("div", { class: "result-top" }, h("span", { text: r.label }), h("strong", { text: r.percent + "%" })), h("div", { class: "bar" }, h("span", { style: "width:" + r.percent + "%" })), h("small", { text: r.votes + " votes" }))); });
      wrap.appendChild(h("p", { text: "Total votes: " + total })); wrap.appendChild(btn("Back", polls)); setPanel(wrap);
    }).catch(fail);
  }
  function pollEditor(p) {
    var existing = p ? (p.poll_options || []).slice().sort(function (a, b) { return a.sort_order - b.sort_order; }) : [{ label: "" }, { label: "" }];
    var f = h("form", { class: "admin-card", novalidate: true });
    var q = inp("question", "text", p && p.question, { maxlength: 300 }), optBox = h("div", { class: "opt-box" }), removed = [];
    function addOpt(o) {
      var i = inp("opt", "text", o.label, { maxlength: 150, placeholder: "Answer option" }); if (o.id) i.dataset.id = o.id;
      var row = h("div", { class: "opt-row" }, i, btn("Remove", function () {
        if (optBox.children.length <= 2) return toast("A poll needs at least 2 options.", "error");
        if (o.id && !window.confirm("Remove this option? Votes for it will be deleted.")) return;
        if (o.id) removed.push(o.id); row.remove();
      }, "danger"));
      optBox.appendChild(row);
    }
    existing.forEach(addOpt);
    var status = sel("status", [["draft", "Draft (not public)"], ["published", "Published"], ["closed", "Closed"]], p ? p.status : "draft");
    [h("h2", { text: p ? "Edit poll" : "New poll" }), field("Question", q), field("Extra description (optional)", area("description", p && p.description, 2)),
     h("div", { class: "fld" }, h("span", { text: "Answer options" }), optBox, btn("Add option", function () { addOpt({ label: "" }); })),
     field("Status", status), field("Opens at (optional, to schedule)", inp("starts", "datetime-local", toLocal(p && p.starts_at))), field("Closes at (optional)", inp("closes", "datetime-local", toLocal(p && p.closes_at)))].forEach(function (x) { f.appendChild(x); });
    f.appendChild(h("div", { class: "btn-row" }, h("button", { type: "submit", class: "btn primary", text: "Save poll" }), btn("Cancel", polls)));
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(f), question = (d.get("question") || "").trim();
      var inputs = Array.prototype.slice.call(optBox.querySelectorAll("input")), labels = inputs.map(function (i) { return i.value.trim(); });
      if (question.length < 5) return toast("The question needs at least 5 characters.", "error");
      if (labels.some(function (l) { return !l; }) || labels.length < 2) return toast("Fill in at least 2 answer options (no empty ones).", "error");
      var starts = fromLocal(d.get("starts")), closes = fromLocal(d.get("closes"));
      if (starts && closes && closes <= starts) return toast("The closing time must be after the opening time.", "error");
      var row = { question: question, description: (d.get("description") || "").trim() || null, status: d.get("status"), starts_at: starts, closes_at: closes };
      var run = p ? A.update("polls", "id=eq." + p.id, row).then(function () { return p.id; }) : A.insert("polls", row).then(function (r) { return r[0].id; });
      run.then(function (pid) {
        var ops = []; removed.forEach(function (rid) { ops.push(A.remove("poll_options", "id=eq." + rid)); });
        var fresh = [];
        inputs.forEach(function (i, idx) {
          if (i.dataset.id) ops.push(A.update("poll_options", "id=eq." + i.dataset.id, { label: labels[idx], sort_order: idx + 1 }));
          else fresh.push({ poll_id: pid, label: labels[idx], sort_order: idx + 1 });
        });
        if (fresh.length) ops.push(A.insert("poll_options", fresh));
        return Promise.all(ops);
      }).then(function () { toast("Poll saved."); polls(); }).catch(fail);
    });
    setPanel(f);
  }

  /* ---------- simple content: quotes & announcements ---------- */
  function quotes() {
    A.select("quotes", "select=*&order=sort_order.asc,created_at.desc&limit=200").then(function (rows) {
      setPanel(h("div", { class: "admin-bar" }, h("h2", { text: "Original quotes" }), btn("New quote", function () { quoteEditor(null); }, "primary")),
        rows.length ? h("ul", { class: "admin-list" }, rows.map(function (q) {
          return h("li", null, h("div", { class: "grow" }, h("strong", { text: "“" + q.text + "”" }), h("small", { text: q.category || "No category" })), statusTag(q.status),
            h("div", { class: "btn-row tight" }, btn("Edit", function () { quoteEditor(q); }),
              btn(q.status === "published" ? "Unpublish" : "Publish", function () { A.update("quotes", "id=eq." + q.id, { status: q.status === "published" ? "draft" : "published" }).then(function () { toast("Updated."); quotes(); }).catch(fail); }),
              btn("Delete", function () { if (confirmDelete("this quote")) A.remove("quotes", "id=eq." + q.id).then(function () { toast("Quote deleted."); quotes(); }).catch(fail); }, "danger")));
        })) : h("div", { class: "empty" }, h("strong", { text: "No quotes yet" }), "Only add original quotes written or approved by Varun Sai."));
    }).catch(fail);
  }
  function quoteEditor(q) {
    var f = h("form", { class: "admin-card", novalidate: true }, h("h2", { text: q ? "Edit quote" : "New quote" }),
      field("Quote", area("text", q && q.text, 4), "Original quotes only (3–500 characters)."), field("Category (optional)", inp("category", "text", q && q.category, { maxlength: 40 })),
      field("Order (small numbers first)", inp("order", "number", q ? q.sort_order : 0)), field("Status", sel("status", [["draft", "Draft"], ["published", "Published"]], q ? q.status : "draft")),
      h("div", { class: "btn-row" }, h("button", { type: "submit", class: "btn primary", text: "Save quote" }), btn("Cancel", quotes)));
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var d = new FormData(f), text = (d.get("text") || "").trim();
      if (text.length < 3 || text.length > 500) return toast("The quote must be 3–500 characters.", "error");
      var row = { text: text, category: (d.get("category") || "").trim() || null, sort_order: parseInt(d.get("order"), 10) || 0, status: d.get("status") };
      (q ? A.update("quotes", "id=eq." + q.id, row) : A.insert("quotes", row)).then(function () { toast("Quote saved."); quotes(); }).catch(fail);
    });
    setPanel(f);
  }
  function announcements() {
    A.select("announcements", "select=*&order=created_at.desc&limit=200").then(function (rows) {
      setPanel(h("div", { class: "admin-bar" }, h("h2", { text: "Announcements" }), btn("New announcement", function () { announcementEditor(null); }, "primary")),
        rows.length ? h("ul", { class: "admin-list" }, rows.map(function (a) {
          return h("li", null, h("div", { class: "grow" }, h("strong", { text: (a.is_important ? "★ " : "") + a.title }), h("small", { text: a.published_at ? fmt(a.published_at) : "Not published" })), statusTag(a.status),
            h("div", { class: "btn-row tight" }, btn("Edit", function () { announcementEditor(a); }),
              btn(a.status === "published" ? "Unpublish" : "Publish", function () { A.update("announcements", "id=eq." + a.id, a.status === "published" ? { status: "draft", published_at: null } : { status: "published", published_at: new Date().toISOString() }).then(function () { toast("Updated."); announcements(); }).catch(fail); }),
              btn("Delete", function () { if (confirmDelete("this announcement")) A.remove("announcements", "id=eq." + a.id).then(function () { toast("Announcement deleted."); announcements(); }).catch(fail); }, "danger")));
        })) : h("div", { class: "empty" }, h("strong", { text: "No announcements yet" }), "Share publishing news and updates here."));
    }).catch(fail);
  }
  function announcementEditor(a) {
    var imp = h("input", { type: "checkbox", name: "important" }); imp.checked = !!(a && a.is_important);
    var f = h("form", { class: "admin-card", novalidate: true }, h("h2", { text: a ? "Edit announcement" : "New announcement" }),
      field("Title", inp("title", "text", a && a.title, { maxlength: 200 })), field("Message", area("body", a && a.body, 8), "Blank line = new paragraph."),
      h("label", { class: "fld check" }, imp, h("span", { text: "Mark as important" })),
      field("Status", sel("status", [["draft", "Draft"], ["published", "Published"]], a ? a.status : "draft")), field("Publish date", inp("pub", "datetime-local", toLocal(a && a.published_at)), "Empty = now."),
      h("div", { class: "btn-row" }, h("button", { type: "submit", class: "btn primary", text: "Save announcement" }), btn("Cancel", announcements)));
    f.addEventListener("submit", function (e) {
      e.preventDefault(); var d = new FormData(f), t = (d.get("title") || "").trim(), b = (d.get("body") || "").trim(), st = d.get("status");
      if (t.length < 3) return toast("Title needs at least 3 characters.", "error"); if (!b) return toast("Write a message.", "error");
      var row = { title: t, body: b, is_important: imp.checked, status: st, published_at: st === "published" ? (fromLocal(d.get("pub")) || new Date().toISOString()) : null };
      (a ? A.update("announcements", "id=eq." + a.id, row) : A.insert("announcements", row)).then(function () { toast("Announcement saved."); announcements(); }).catch(fail);
    });
    setPanel(f);
  }

  /* ---------- reader feedback & contact messages ---------- */
  function feedback() {
    A.select("reader_feedback", "select=*&order=created_at.desc&limit=200").then(function (rows) {
      var order = { pending: 0, approved: 1, rejected: 2 }; rows.sort(function (a, b) { return order[a.status] - order[b.status]; });
      setPanel(h("h2", { text: "Reader feedback" }), h("p", { class: "muted", text: "Nothing is shown publicly until you approve it. Email addresses are never shown publicly." }),
        rows.length ? h("ul", { class: "admin-list" }, rows.map(function (f) {
          function setStatus(s) { return A.update("reader_feedback", "id=eq." + f.id, { status: s }).then(function () { toast("Marked " + s + "."); feedback(); }).catch(fail); }
          return h("li", { class: "stack" }, h("div", { class: "grow" }, h("strong", { text: f.name }), h("small", { text: fmt(f.created_at) + (f.email ? " · " + f.email : "") }), h("p", { text: f.message })), h("span", { class: "tag " + (f.status === "approved" ? "gold" : ""), text: f.status }),
            h("div", { class: "btn-row tight" }, f.status !== "approved" ? btn("Approve", function () { setStatus("approved"); }, "primary") : null, f.status !== "rejected" ? btn("Reject", function () { setStatus("rejected"); }) : null,
              btn("Delete", function () { if (confirmDelete("this feedback")) A.remove("reader_feedback", "id=eq." + f.id).then(function () { toast("Deleted."); feedback(); }).catch(fail); }, "danger")));
        })) : h("div", { class: "empty" }, h("strong", { text: "No feedback yet" })));
    }).catch(fail);
  }
  function messages() {
    A.select("contact_messages", "select=*&order=created_at.desc&limit=200").then(function (rows) {
      setPanel(h("h2", { text: "Contact messages" }), rows.length ? h("ul", { class: "admin-list" }, rows.map(function (m) {
        return h("li", { class: "stack" }, h("div", { class: "grow" }, h("strong", { text: m.subject }), h("small", { text: m.name + " · " + m.email + " · " + fmt(m.created_at) }), h("p", { text: m.message })), h("span", { class: "tag " + (m.status === "new" ? "gold" : ""), text: m.status }),
          h("div", { class: "btn-row tight" }, h("a", { class: "btn small primary", href: "mailto:" + encodeURIComponent(m.email).replace("%40", "@") + "?subject=" + encodeURIComponent("Re: " + m.subject), text: "Reply by email" }),
            m.status !== "read" ? btn("Mark read", function () { A.update("contact_messages", "id=eq." + m.id, { status: "read" }).then(messages).catch(fail); }) : null,
            m.status !== "archived" ? btn("Archive", function () { A.update("contact_messages", "id=eq." + m.id, { status: "archived" }).then(messages).catch(fail); }) : null,
            btn("Delete", function () { if (confirmDelete("this message")) A.remove("contact_messages", "id=eq." + m.id).then(function () { toast("Deleted."); messages(); }).catch(fail); }, "danger")));
      })) : h("div", { class: "empty" }, h("strong", { text: "No messages yet" })));
    }).catch(fail);
  }
  function subscribers() { setPanel(h("h2", { text: "Subscribers" }), h("div", { class: "empty" }, h("strong", { text: "Newsletter is not set up yet" }), "A newsletter needs an email-sending service for verification and unsubscribe links. It will be added only once a secure, affordable option is chosen. No fake sign-up form is shown on the public site.")); }
  function settings() {
    setPanel(h("h2", { text: "Settings" }), h("div", { class: "admin-card" }, h("p", null, "Signed in as ", h("strong", { text: session.email })),
      h("p", { class: "muted", text: "To change your password or sign-in settings, use the Authentication section of your Supabase dashboard (author project)." }),
      h("div", { class: "btn-row" }, btn("Sign out", function () { save(null); showLogin(); }, "danger"), h("a", { class: "btn small secondary", href: "index.html", text: "View public website" }))));
  }

  /* ---------- start ---------- */
  session = load();
  if (session && session.refresh_token) {
    tok().then(function (k) { return api.select("admin_users", "select=user_id", k); }).then(function (rows) { if (rows.length) showPanel(); else { save(null); showLogin("This account is not an administrator."); } }).catch(function () { if (!root.firstChild) showLogin(); });
  } else showLogin();
})();
