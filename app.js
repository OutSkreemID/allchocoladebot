const tg = window.Telegram.WebApp;
tg.expand();

// Каталог (потом вынесем в JSON)
const products = [
  { id: 1, name: "Клубника в шоколаде", price: 1200 },
  { id: 2, name: "Малина в шоколаде", price: 1400 },
  { id: 3, name: "Банан в шоколаде", price: 900 }
];

let cart = [];

// Рендер каталога
function renderCatalog() {
  const catalog = document.getElementById("catalog");
  catalog.innerHTML = "";

  products.forEach(p => {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `
      <strong>${p.name}</strong><br>
      <small>${p.price} ₽</small><br>
      <button onclick="addToCart(${p.id})">Добавить</button>
    `;
    catalog.appendChild(div);
  });
}

// Добавление в корзину
function addToCart(id) {
  const product = products.find(p => p.id === id);
  const item = cart.find(i => i.id === id);

  if (item) {
    item.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  renderCart();
}

// Рендер корзины
function renderCart() {
  const cartDiv = document.getElementById("cart");
  cartDiv.innerHTML = "";

  cart.forEach(item => {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <span>${item.name} x${item.qty}</span>
      <span>${item.price * item.qty} ₽</span>
    `;
    cartDiv.appendChild(row);
  });
}

// Отправка заказа в бота
function checkout() {
  if (cart.length === 0) {
    tg.showAlert("Корзина пуста");
    return;
  }

  const order = {
    items: cart,
    total: cart.reduce((s, i) => s + i.price * i.qty, 0)
  };

  tg.sendData(JSON.stringify(order)); // Отправляем объект с массивом items
  tg.close();
}

// init
renderCatalog();

fetch('catalog.json')
  .then(res => res.json())
  .then(data => console.log(data));