(function () {
  'use strict';

  var KEY = 'hadi_snack_cart';
  var cart = {}; // { "Dish name": { price: cents, qty: n } }

  try { cart = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { cart = {}; }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {}
  }

  function money(cents) { return '$' + (cents / 100).toFixed(2); }

  function totals() {
    var count = 0, sum = 0;
    Object.keys(cart).forEach(function (n) {
      count += cart[n].qty;
      sum += cart[n].qty * cart[n].price;
    });
    return { count: count, sum: sum };
  }

  function change(name, price, delta) {
    var item = cart[name] || { price: price, qty: 0 };
    item.qty += delta;
    if (item.qty <= 0) delete cart[name]; else cart[name] = item;
    save();
    refresh();
  }

  /* ---------- styles (injected so styles.css stays untouched) ---------- */
  var css = [
    '.cart-ctrl{display:flex;align-items:center;gap:8px;flex-shrink:0;align-self:center}',
    '.cart-btn{width:34px;height:34px;border-radius:50%;border:none;background:#FFC107;color:#111;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}',
    '.cart-btn .material-symbols-outlined{color:#111;font-size:22px}',
    '.cart-btn:active{transform:scale(.92)}',
    '.cart-btn.ghost{background:#333}',
    '.cart-btn.ghost .material-symbols-outlined{color:#FFC107}',
    '.cart-qty{min-width:18px;text-align:center;color:#fff;font-weight:700;font-size:17px}',
    '.cart-fab{position:fixed;right:18px;bottom:18px;width:58px;height:58px;border-radius:50%;border:none;background:#FFC107;box-shadow:0 4px 14px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:50;padding:0}',
    '.cart-fab .material-symbols-outlined{color:#111;font-size:28px}',
    '.cart-badge{position:absolute;top:-4px;right:-4px;min-width:22px;height:22px;padding:0 5px;border-radius:11px;background:#e53935;color:#fff;font-size:12px;font-weight:700;display:none;align-items:center;justify-content:center}',
    '.cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);display:none;align-items:flex-end;justify-content:center;z-index:100}',
    '.cart-overlay.open{display:flex}',
    '.cart-sheet{background:#1E1E1E;width:100%;max-width:500px;max-height:85vh;border-radius:20px 20px 0 0;padding:20px;display:flex;flex-direction:column;color:#fff}',
    '.cart-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}',
    '.cart-head h2{margin:0;font-size:22px;letter-spacing:.5px;text-transform:uppercase;font-weight:400;color:#B0B0B0}',
    '.cart-items{overflow-y:auto;flex:1}',
    '.cart-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #333}',
    '.cart-row-name{font-weight:700;font-size:16px}',
    '.cart-row-price{color:#FFC107;font-weight:700;margin-top:4px}',
    '.cart-empty{color:#B0B0B0;text-align:center;padding:30px 0}',
    '.cart-total{display:flex;justify-content:space-between;align-items:baseline;margin-top:16px;font-size:20px;font-weight:700}',
    '.cart-total span:last-child{color:#FFC107;font-size:28px}',
    '.cart-note{color:#B0B0B0;font-size:13px;text-align:center;margin:12px 0 0}',
    '.cart-clear{margin-top:12px;background:none;border:1px solid #444;color:#B0B0B0;border-radius:10px;padding:10px;font-size:14px;cursor:pointer}'
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- helper to build icon buttons ---------- */
  function iconBtn(icon, cls, label, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'cart-btn' + (cls ? ' ' + cls : '');
    b.setAttribute('aria-label', label);
    b.innerHTML = '<span class="material-symbols-outlined">' + icon + '</span>';
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- + buttons on every dish ---------- */
  var ctrls = [];

  function renderCtrl(c) {
    var qty = cart[c.name] ? cart[c.name].qty : 0;
    c.el.innerHTML = '';
    if (qty === 0) {
      c.el.appendChild(iconBtn('add', '', 'Add ' + c.name, function () { change(c.name, c.price, 1); }));
    } else {
      c.el.appendChild(iconBtn('remove', 'ghost', 'Remove one ' + c.name, function () { change(c.name, c.price, -1); }));
      var q = document.createElement('span');
      q.className = 'cart-qty';
      q.textContent = qty;
      c.el.appendChild(q);
      c.el.appendChild(iconBtn('add', '', 'Add one more ' + c.name, function () { change(c.name, c.price, 1); }));
    }
  }

  document.querySelectorAll('.dish').forEach(function (dish) {
    var nameEl = dish.querySelector('.dish-name');
    var priceEl = dish.querySelector('.dish-price');
    var info = dish.querySelector('.dish-info');
    if (!nameEl || !priceEl || !info) return;
    var c = {
      name: nameEl.textContent.trim(),
      price: Math.round(parseFloat(priceEl.textContent.replace(/[^0-9.]/g, '')) * 100),
      el: document.createElement('div')
    };
    c.el.className = 'cart-ctrl';
    info.appendChild(c.el);
    ctrls.push(c);
  });

  /* ---------- floating cart icon ---------- */
  var fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'cart-fab';
  fab.setAttribute('aria-label', 'Open cart');
  fab.innerHTML = '<span class="material-symbols-outlined">shopping_cart</span><span class="cart-badge"></span>';
  document.body.appendChild(fab);
  var badge = fab.querySelector('.cart-badge');

  /* ---------- cart panel ---------- */
  var overlay = document.createElement('div');
  overlay.className = 'cart-overlay';
  overlay.innerHTML =
    '<div class="cart-sheet" role="dialog" aria-label="My order">' +
    '<div class="cart-head"><h2>My Order:</h2></div>' +
    '<div class="cart-items"></div>' +
    '<div class="cart-total"><span>Total:</span><span class="cart-sum"></span></div>' +
    '<p class="cart-note">Show this screen to the waiter</p>' +
    '<button type="button" class="cart-clear">Clear order</button>' +
    '</div>';
  document.body.appendChild(overlay);

  var sheet = overlay.querySelector('.cart-sheet');
  var itemsEl = overlay.querySelector('.cart-items');
  var sumEl = overlay.querySelector('.cart-sum');
  var clearBtn = overlay.querySelector('.cart-clear');
  overlay.querySelector('.cart-head').appendChild(
    iconBtn('close', 'ghost', 'Close cart', function () { overlay.classList.remove('open'); })
  );

  fab.addEventListener('click', function () { overlay.classList.add('open'); });
  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('open'); });
  clearBtn.addEventListener('click', function () { cart = {}; save(); refresh(); });

  function renderPanel() {
    itemsEl.innerHTML = '';
    var names = Object.keys(cart);
    if (!names.length) {
      var empty = document.createElement('div');
      empty.className = 'cart-empty';
      empty.textContent = 'Your order is empty.';
      itemsEl.appendChild(empty);
    }
    names.forEach(function (name) {
      var it = cart[name];
      var row = document.createElement('div');
      row.className = 'cart-row';

      var left = document.createElement('div');
      var n = document.createElement('div');
      n.className = 'cart-row-name';
      n.textContent = name;
      var p = document.createElement('div');
      p.className = 'cart-row-price';
      p.textContent = money(it.price) + (it.qty > 1 ? '  x' + it.qty + ' = ' + money(it.price * it.qty) : '');
      left.appendChild(n);
      left.appendChild(p);

      var ctrl = document.createElement('div');
      ctrl.className = 'cart-ctrl';
      ctrl.appendChild(iconBtn('remove', 'ghost', 'Remove one ' + name, function () { change(name, it.price, -1); }));
      var q = document.createElement('span');
      q.className = 'cart-qty';
      q.textContent = it.qty;
      ctrl.appendChild(q);
      ctrl.appendChild(iconBtn('add', '', 'Add one more ' + name, function () { change(name, it.price, 1); }));

      row.appendChild(left);
      row.appendChild(ctrl);
      itemsEl.appendChild(row);
    });
    var t = totals();
    sumEl.textContent = money(t.sum);
    clearBtn.style.display = names.length ? '' : 'none';
  }

  function refresh() {
    ctrls.forEach(renderCtrl);
    renderPanel();
    var t = totals();
    badge.textContent = t.count;
    badge.style.display = t.count ? 'flex' : 'none';
  }

  refresh();
})();
