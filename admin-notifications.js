/* VARUN SAI NOTIFICATION CENTER: adds the notification bell to the author admin panel.
   Works without changing how the panel signs in: it waits for the panel header to appear and uses the
   panel's own helper (window.VSAdminApi), which attaches the signed-in admin's token. No keys here. */
(function () {
  'use strict';
  var root = document.getElementById('admin-app'), bell = null, slot = null;
  if (!root || !window.VarunNotifications) return;
  function sync() {
    var head = root.querySelector('.admin-head');
    if (bell && (!head || !root.contains(slot))) { bell.destroy(); if (slot) slot.remove(); bell = null; slot = null; }
    if (head && window.VSAdminApi && !bell) {
      slot = document.createElement('div'); slot.className = 'vsn-slot';
      slot.style.cssText = 'align-self:center;margin-left:auto;--vsn-accent:var(--gold,#c8a45c);--vsn-text:var(--ivory,#f3ebdd)';
      head.appendChild(slot);
      bell = VarunNotifications.mount({ supabase: VarunNotifications.restClient(window.VSAdminApi), container: slot });
    }
  }
  new MutationObserver(sync).observe(root, { childList: true });
  sync();
})();
