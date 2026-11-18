/*! VARUN SAI NOTIFICATION CENTER: admin bell v1.0
 *  Contains NO keys. Pass in the Supabase client your admin panel already created (signed-in admin session).
 *  Usage:  VarunNotifications.mount({ supabase: sb, container: document.getElementById('notif-slot'),
 *            onAuthError: function(){ showSignIn(); } });
 *  Requests: 2 on open (unread count + list), then live updates. Polls every 60 s only if live updates are down and the tab is visible.
 */
(function (global) {
  'use strict';
  var CATS = { contact: 'Contact', feedback: 'Feedback', poll: 'Poll', order: 'Order', payment: 'Payment',
               message: 'Message', review: 'Review', security: 'Security', system: 'System' };
  var STYLE_ID = 'vsn-style';
  var CSS = [
    '.vsn{position:relative;display:inline-block;font-family:inherit;color:var(--vsn-text,#f3ebdd)}',
    '.vsn *{box-sizing:border-box}',
    '.vsn-btn{position:relative;background:transparent;border:1px solid var(--vsn-border,#4a4132);color:inherit;width:44px;height:44px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center}',
    '.vsn-btn:hover,.vsn-btn:focus-visible{border-color:var(--vsn-accent,#c8a45c);outline:none}',
    '.vsn-badge{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:var(--vsn-accent,#c8a45c);color:#171717;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}',
    '.vsn-badge[hidden]{display:none}',
    '.vsn-panel{position:absolute;right:0;top:52px;width:380px;max-height:70vh;display:flex;flex-direction:column;background:var(--vsn-surface,#1e1c19);border:1px solid var(--vsn-border,#4a4132);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.5);z-index:1000;overflow:hidden}',
    '.vsn-panel[hidden]{display:none}',
    '.vsn-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid var(--vsn-border,#4a4132)}',
    '.vsn-title{font-weight:700;font-size:16px}',
    '.vsn-link{background:none;border:0;color:var(--vsn-accent,#c8a45c);cursor:pointer;font:inherit;font-size:13px;padding:6px;min-height:32px}',
    '.vsn-link:disabled{opacity:.4;cursor:default}',
    '.vsn-tabs{display:flex;gap:4px;padding:8px 10px;border-bottom:1px solid var(--vsn-border,#4a4132)}',
    '.vsn-tab{flex:1;background:transparent;border:1px solid transparent;color:inherit;opacity:.7;border-radius:8px;padding:8px;cursor:pointer;font:inherit;font-size:13px;min-height:36px}',
    '.vsn-tab[aria-selected=true]{opacity:1;border-color:var(--vsn-accent,#c8a45c);color:var(--vsn-accent,#c8a45c)}',
    '.vsn-list{overflow-y:auto;flex:1;margin:0;padding:0;list-style:none}',
    '.vsn-item{padding:12px 14px;border-bottom:1px solid var(--vsn-border,#4a4132);display:flex;flex-direction:column;gap:6px}',
    '.vsn-item.unread{background:rgba(200,164,92,.08);border-left:3px solid var(--vsn-accent,#c8a45c)}',
    '.vsn-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.vsn-chip{font-size:11px;letter-spacing:.06em;text-transform:uppercase;border:1px solid var(--vsn-border,#4a4132);border-radius:999px;padding:2px 8px}',
    '.vsn-chip.cat-payment,.vsn-chip.cat-order{color:#8fd18f;border-color:#3f6b3f}',
    '.vsn-chip.cat-security{color:#ff9d8f;border-color:#8a4036}',
    '.vsn-chip.cat-contact,.vsn-chip.cat-message{color:#9ec5ff;border-color:#3a5a88}',
    '.vsn-chip.cat-feedback,.vsn-chip.cat-review,.vsn-chip.cat-poll{color:var(--vsn-accent,#c8a45c)}',
    '.vsn-sev{font-size:11px;color:#ff9d8f;font-weight:700}',
    '.vsn-time{margin-left:auto;font-size:12px;opacity:.7}',
    '.vsn-name{font-weight:600;font-size:14px}',
    '.vsn-body{font-size:13px;opacity:.85;line-height:1.4}',
    '.vsn-actions{display:flex;gap:4px}',
    '.vsn-empty,.vsn-msg{padding:28px 16px;text-align:center;font-size:14px;opacity:.8}',
    '.vsn-msg{background:rgba(255,157,143,.1);opacity:1}',
    '@media (max-width:600px){.vsn-panel{position:fixed;left:8px;right:8px;top:64px;width:auto;max-height:78vh}}'
  ].join('');

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function rel(iso) {
    var s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago'; if (s < 604800) return Math.floor(s / 86400) + ' d ago';
    return new Date(iso).toLocaleDateString();
  }
  function full(iso) { try { return new Date(iso).toLocaleString(); } catch (e) { return iso; } }
  function isAuthErr(err) { return !!err && (err.status === 401 || /jwt|expired|not authenticated|not signed in/i.test(err.message || '')); }


  /* Adapter for pages that do not use supabase-js (the author admin panel).
     `A` is that panel's own helper: { select(table,query), count(table,query), update(table,filter,patch), remove(table,filter) },
     which already adds the signed-in admin's token. Supports only what the bell needs. No Realtime: the bell checks every 60 s instead. */
  function restClient(A) {
    function Q(table) { this.t = table; this.op = 'select'; this.f = []; this.cols = '*'; this.head = false; this.ord = null; this.lim = null; this.patch = null; }
    function v(x) { return encodeURIComponent(String(x)); }
    Q.prototype.select = function (c, o) { this.op = 'select'; this.cols = c || '*'; this.head = !!(o && o.head); return this; };
    Q.prototype.update = function (p) { this.op = 'update'; this.patch = p; return this; };
    Q.prototype.delete = function () { this.op = 'delete'; return this; };
    Q.prototype.eq = function (c, x) { this.f.push(c + '=eq.' + v(x)); return this; };
    Q.prototype.is = function (c, x) { this.f.push(c + '=is.' + (x === null ? 'null' : v(x))); return this; };
    Q.prototype.not = function (c, op, x) { this.f.push(c + '=not.' + op + '.' + (x === null ? 'null' : v(x))); return this; };
    Q.prototype.order = function (c, o) { this.ord = c + '.' + (o && o.ascending === false ? 'desc' : 'asc'); return this; };
    Q.prototype.limit = function (n) { this.lim = n; return this; };
    Q.prototype.then = function (ok, bad) {
      var self = this, filter = this.f.join('&'), p;
      if (this.op === 'update') p = A.update(this.t, filter, this.patch).then(function () { return { error: null }; });
      else if (this.op === 'delete') p = A.remove(this.t, filter).then(function () { return { error: null }; });
      else if (this.head) p = A.count(this.t, filter).then(function (n) { return { count: n, error: null }; });
      else {
        var q = 'select=' + this.cols + (filter ? '&' + filter : '') + (this.ord ? '&order=' + this.ord : '') + (this.lim ? '&limit=' + this.lim : '');
        p = A.select(this.t, q).then(function (rows) { return { data: rows, error: null }; });
      }
      return p.catch(function (e) { return { data: null, count: null, error: e || { message: 'Request failed' } }; }).then(ok, bad);
    };
    return { from: function (t) { return new Q(t); } };
  }

  function mount(opts) {
    var sb = opts.supabase, host = opts.container;
    if (!sb || !host) throw new Error('VarunNotifications.mount needs { supabase, container }');
    if (!document.getElementById(STYLE_ID)) { var st = document.createElement('style'); st.id = STYLE_ID; st.textContent = CSS; document.head.appendChild(st); }

    var state = { open: false, tab: 'inbox', items: [], unread: 0, live: false, busy: false };
    var timer = null, channel = null, debounce = null;

    var root = el('div', 'vsn');
    var btn = el('button', 'vsn-btn'); btn.type = 'button'; btn.setAttribute('aria-label', 'Notifications'); btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
    var badge = el('span', 'vsn-badge'); badge.hidden = true; btn.appendChild(badge);
    var panel = el('div', 'vsn-panel'); panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Notification Center');
    var head = el('div', 'vsn-head'); head.appendChild(el('span', 'vsn-title', 'Notification Center'));
    var markAll = el('button', 'vsn-link', 'Mark all read'); markAll.type = 'button'; head.appendChild(markAll);
    var tabs = el('div', 'vsn-tabs'); tabs.setAttribute('role', 'tablist');
    var tInbox = el('button', 'vsn-tab', 'Inbox'), tArch = el('button', 'vsn-tab', 'Archived');
    [tInbox, tArch].forEach(function (t) { t.type = 'button'; t.setAttribute('role', 'tab'); tabs.appendChild(t); });
    var note = el('div', 'vsn-msg'); note.hidden = true; note.setAttribute('role', 'status');
    var list = el('ul', 'vsn-list');
    panel.appendChild(head); panel.appendChild(tabs); panel.appendChild(note); panel.appendChild(list);
    root.appendChild(btn); root.appendChild(panel); host.appendChild(root);

    function showNote(t) { note.textContent = t || ''; note.hidden = !t; }
    function fail(err) {
      if (isAuthErr(err)) { showNote('Your session has expired. Please sign in again.'); if (opts.onAuthError) opts.onAuthError(err); }
      else showNote('Could not reach the notification service. Showing the last data. Retrying shortly.');
    }
    function renderBadge() { badge.hidden = state.unread < 1; badge.textContent = state.unread > 99 ? '99+' : String(state.unread); btn.setAttribute('aria-label', 'Notifications, ' + state.unread + ' unread'); }
    function render() {
      tInbox.setAttribute('aria-selected', String(state.tab === 'inbox')); tArch.setAttribute('aria-selected', String(state.tab === 'archived'));
      markAll.hidden = state.tab !== 'inbox'; markAll.disabled = state.unread < 1;
      list.textContent = '';
      if (!state.items.length) {
        var li = el('li', 'vsn-empty', state.tab === 'inbox' ? 'You are all caught up. New activity will appear here.' : 'No archived notifications.');
        list.appendChild(li); return;
      }
      state.items.forEach(function (n) {
        var li = el('li', 'vsn-item' + (n.is_read ? '' : ' unread'));
        var r = el('div', 'vsn-row');
        r.appendChild(el('span', 'vsn-chip cat-' + n.category, CATS[n.category] || n.category));
        if (n.severity === 'critical') r.appendChild(el('span', 'vsn-sev', 'Critical'));
        var tm = el('span', 'vsn-time', rel(n.created_at)); tm.title = full(n.created_at); r.appendChild(tm);
        li.appendChild(r); li.appendChild(el('div', 'vsn-name', n.title));
        if (n.body) li.appendChild(el('div', 'vsn-body', n.body));
        var a = el('div', 'vsn-actions');
        function act(label, fn) { var b = el('button', 'vsn-link', label); b.type = 'button'; b.addEventListener('click', function () { fn(n); }); a.appendChild(b); }
        if (state.tab === 'inbox') { if (!n.is_read) act('Mark read', markRead); act('Archive', archive); }
        else { act('Restore', restore); act('Delete', remove); }
        li.appendChild(a); list.appendChild(li);
      });
    }

    function loadCount() {
      return sb.from('notifications').select('id', { count: 'exact', head: true }).eq('is_read', false).is('archived_at', null)
        .then(function (r) { if (r.error) throw r.error; state.unread = r.count || 0; renderBadge(); });
    }
    function loadList() {
      var q = sb.from('notifications').select('id,category,severity,title,body,is_read,created_at,archived_at').order('created_at', { ascending: false }).limit(50);
      q = state.tab === 'inbox' ? q.is('archived_at', null) : q.not('archived_at', 'is', null);
      return q.then(function (r) { if (r.error) throw r.error; state.items = r.data || []; render(); });
    }
    function refresh(withList) {
      if (state.busy) { state.again = state.again || !!withList; return Promise.resolve(); }
      state.busy = true;
      var p = loadCount().then(function () { return withList ? loadList() : null; });
      return p.then(function () { showNote(''); }).catch(fail).then(function () {
        state.busy = false;
        if (state.again) { state.again = false; refresh(true); }
      });
    }
    function update(id, patch) {
      return sb.from('notifications').update(patch).eq('id', id).then(function (r) { if (r.error) throw r.error; });
    }
    function now() { return new Date().toISOString(); }
    function markRead(n) { update(n.id, { is_read: true, read_at: now() }).then(function () { n.is_read = true; state.unread = Math.max(0, state.unread - 1); renderBadge(); render(); }).catch(fail); }
    function archive(n) { update(n.id, { archived_at: now(), is_read: true, read_at: now() }).then(function () { if (!n.is_read) state.unread = Math.max(0, state.unread - 1); state.items = state.items.filter(function (x) { return x.id !== n.id; }); renderBadge(); render(); }).catch(fail); }
    function restore(n) { update(n.id, { archived_at: null }).then(function () { state.items = state.items.filter(function (x) { return x.id !== n.id; }); render(); }).catch(fail); }
    function remove(n) {
      if (!global.confirm('Delete this notification permanently?')) return;
      sb.from('notifications').delete().eq('id', n.id).then(function (r) { if (r.error) throw r.error; state.items = state.items.filter(function (x) { return x.id !== n.id; }); render(); }).catch(fail);
    }
    markAll.addEventListener('click', function () {
      sb.from('notifications').update({ is_read: true, read_at: now() }).eq('is_read', false).is('archived_at', null)
        .then(function (r) { if (r.error) throw r.error; state.unread = 0; state.items.forEach(function (n) { n.is_read = true; }); renderBadge(); render(); }).catch(fail);
    });

    function setOpen(v) { state.open = v; panel.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) refresh(true); }
    btn.addEventListener('click', function () { setOpen(!state.open); });
    document.addEventListener('click', function (e) {
      // composedPath is captured at click time, so a button removed by a re-render still counts as inside the bell
      var inside = (e.composedPath ? e.composedPath().indexOf(root) > -1 : false) || root.contains(e.target);
      if (state.open && !inside) setOpen(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) { setOpen(false); btn.focus(); } });
    [[tInbox, 'inbox'], [tArch, 'archived']].forEach(function (p) { p[0].addEventListener('click', function () { state.tab = p[1]; refresh(true); }); });

    function schedule() { clearTimeout(debounce); debounce = setTimeout(function () { refresh(state.open); }, 400); }
    function startPoll() { if (timer) return; timer = setInterval(function () { if (!state.live && !document.hidden) refresh(state.open); }, 60000); }
    function subscribe() {
      if (!sb.channel) { startPoll(); return; }
      channel = sb.channel('vsn-' + Math.random().toString(36).slice(2))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, schedule)
        .subscribe(function (status) { state.live = status === 'SUBSCRIBED'; if (!state.live) startPoll(); });
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(state.open); });
    window.addEventListener('online', function () { refresh(state.open); });

    refresh(false); subscribe();
    return { refresh: function () { return refresh(true); }, destroy: function () { clearInterval(timer); clearTimeout(debounce); if (channel && sb.removeChannel) sb.removeChannel(channel); root.remove(); } };
  }
  global.VarunNotifications = { mount: mount, restClient: restClient };
})(window);
