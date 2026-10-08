// Supports both the original author-page navigation and upgraded navigation.
document.addEventListener('DOMContentLoaded', () => {
  const menu = document.querySelector('.menu-toggle, .menu');
  const nav = document.querySelector('.nav-links, .header nav');
  if (menu && nav) {
    const close = () => { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); };
    menu.setAttribute('aria-expanded', 'false');
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { close(); menu.focus(); } });
  }
  document.querySelectorAll('[data-year], #year').forEach(node => { node.textContent = String(new Date().getFullYear()); });
  const config = window.BOOK_STORE || {};
  document.querySelectorAll('[data-checkout]').forEach(link => {
    const kind = link.dataset.checkout;
    const product = Object.prototype.hasOwnProperty.call(config, kind) ? config[kind] : {};
    let checkout;
    try {
      const url = new URL(product.checkoutUrl);
      if (url.protocol === 'https:' && !url.username && !url.password) checkout = url.href;
    } catch { /* Missing or invalid checkout stays disabled. */ }
    if (checkout) {
      link.setAttribute('href', checkout);
      link.removeAttribute('aria-disabled');
      link.removeAttribute('tabindex');
      link.textContent = kind === 'ebook' ? 'Buy ebook' : 'Buy paperback';
    } else {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('tabindex', '-1');
      link.textContent = kind === 'ebook' ? 'Ebook — coming soon' : 'Direct paperback sales — coming soon';
    }
  });
  document.querySelectorAll('[data-price]').forEach(node => {
    const kind = node.dataset.price;
    const product = Object.prototype.hasOwnProperty.call(config, kind) ? config[kind] : {};
    node.textContent = typeof product.price === 'string' && product.price.trim() ? product.price : 'Price announced at launch';
  });
  // Content remains visible without JavaScript; motion is deliberately minimal.
});
