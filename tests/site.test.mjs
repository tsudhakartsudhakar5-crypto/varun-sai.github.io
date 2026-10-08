import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => readFileSync(resolve(root, path), 'utf8');
for (const page of ['index.html', 'book.html', 'about.html']) {
  test(`${page} preserves author identity and book content`, () => {
    const html = read(page);
    assert.match(html, /Varun Sai/i);
    assert.match(html, /The Time Changes/);
    assert.match(html, /<main[\s>]/);
    assert.match(html, /style\.css/);
    assert.match(html, /script\.js/);
  });
}
test('book page preserves the existing Pothi listing', () => {
  assert.ok(read('book.html').includes('https://store.pothi.com/book/thipparapu-varun-sai-the-time-changes-1/'));
});
test('homepage preserves section anchors and book cover', () => {
  const html = read('index.html');
  for (const id of ['home', 'book', 'journey', 'author', 'future']) assert.ok(html.includes(`id="${id}"`));
  assert.ok(html.includes('book-cover.png'));
  assert.ok(existsSync(resolve(root, 'book-cover.png')));
});
// Upgrade-specific checks run after the new script exists; the baseline above
// characterizes the original pages before the storefront is introduced.
if (existsSync(resolve(root, 'script.js'))) {
  test('upgraded pages contain one body and load local assets', () => {
    for (const page of ['index.html', 'book.html', 'about.html']) {
      const html = read(page);
      assert.equal((html.match(/<body[\s>]/g) || []).length, 1);
      assert.match(html, /<\/head>/);
      for (const asset of ['style.css', 'script.js', 'favicon.svg', 'store-config.js']) {
        assert.ok(html.includes(asset));
        assert.ok(existsSync(resolve(root, asset)));
      }
    }
  });
  test('checkout is disabled by default without invented prices', () => {
    const context = { window: {} };
    vm.runInNewContext(read('store-config.js'), context);
    const config = context.window.BOOK_STORE;
    assert.equal(config.paperback.checkoutUrl, '');
    assert.equal(config.ebook.checkoutUrl, '');
    assert.equal(config.paperback.price, '');
    assert.equal(config.ebook.price, '');
  });
  test('unsafe checkout addresses remain disabled', () => {
    for (const checkoutUrl of ['', 'javascript:alert(1)', 'http://example.com/pay', 'https://user:secret@example.com/pay', 'not a url']) {
      const button = { dataset: { checkout: 'ebook' }, textContent: '', attrs: {}, setAttribute(k,v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
      const context = {
        URL, window: { BOOK_STORE: { ebook: { checkoutUrl, price: '' } } },
        document: { addEventListener(event, handler) { handler(); }, querySelector() { return null; }, querySelectorAll(selector) { return selector === '[data-checkout]' ? [button] : []; } }
      };
      vm.runInNewContext(read('script.js'), context);
      assert.equal(button.attrs['aria-disabled'], 'true');
      assert.equal(button.attrs.href, undefined);
    }
  });
  test('valid HTTPS checkout is configured without a public ebook file', () => {
    const button = { dataset: { checkout: 'ebook' }, textContent: '', attrs: {}, setAttribute(k,v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
    const context = {
      URL, window: { BOOK_STORE: { ebook: { checkoutUrl: 'https://example.com/checkout', price: '' } } },
      document: { addEventListener(event, handler) { handler(); }, querySelector() { return null; }, querySelectorAll(selector) { return selector === '[data-checkout]' ? [button] : []; } }
    };
    vm.runInNewContext(read('script.js'), context);
    assert.equal(button.attrs.href, 'https://example.com/checkout');
    assert.equal(button.attrs['aria-disabled'], undefined);
    assert.match(read('book.html'), /store-config\.js/);
  });
}
