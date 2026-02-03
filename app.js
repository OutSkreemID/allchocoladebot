const tg = window.Telegram.WebApp;
tg.expand();

let products = [];
let cart = [];

// Переключение вкладок
window.openTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// Загрузка товаров
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        const data = await response.json();
        products = data.products;
        renderCatalog();
    } catch (e) { console.error(e); }
}

function renderCatalog() {
    const catalog = document.getElementById("catalog");
    catalog.innerHTML = "";
    products.forEach(p => {
        const div = document.createElement("div");
        div.className = "card";
        div.onclick = () => showModal(p); // Открытие модалки при клике
        div.innerHTML = `
            <strong>${p.name}</strong><br>
            <span>${p.price} ₽</span><br>
            <button onclick="event.stopPropagation(); addToCart(${p.id})">Быстро +</button>
        `;
        catalog.appendChild(div);
    });
}

// МОДАЛЬНОЕ ОКНО
function showModal(product) {
    document.getElementById("modal-title").innerText = product.name;
    document.getElementById("modal-desc").innerText = product.description;
    document.getElementById("modal-price").innerText = product.price + " ₽";
    document.getElementById("modal-add-btn").onclick = () => {
        addToCart(product.id);
        closeModal();
    };
    document.getElementById("modal").style.display = "block";
}

window.closeModal = function() {
    document.getElementById("modal").style.display = "none";
}

// КОНСТРУКТОР
window.calcConstructor = function() {
    const sCount = parseInt(document.getElementById("c-strawberry").value) || 0;
    const rCount = parseInt(document.getElementById("c-raspberry").value) || 0;
    const chocSelect = document.getElementById("c-chocolate");
    const chocPrice = parseInt(chocSelect.options[chocSelect.selectedIndex].getAttribute('data-price'));
    
    // Например: 100р за ягоду + доплата за шоколад
    const total = (sCount + rCount) * 100 + chocPrice;
    document.getElementById("constructor-price").innerText = total;
}

window.addConstructorToCart = function() {
    const sCount = document.getElementById("c-strawberry").value;
    const rCount = document.getElementById("c-raspberry").value;
    const choc = document.getElementById("c-chocolate").value;
    const total = parseInt(document.getElementById("constructor-price").innerText);

    if (total <= 0) return tg.showAlert("Выберите ингредиенты!");

    const customItem = {
        id: Date.now(), // уникальный ID для конструктора
        name: `Свой набор (${choc})`,
        description: `Клубника: ${sCount}, Малина: ${rCount}`,
        price: total,
        qty: 1
    };

    cart.push(customItem);
    renderCart();
    tg.showAlert("Добавлено в корзину!");
}

// КОРЗИНА И ВЫГРУЗКА
window.addToCart = function(id) {
    const p = products.find(x => x.id === id);
    const item = cart.find(x => x.id === id && !x.isCustom);
    if (item) item.qty++;
    else cart.push({ ...p, qty: 1 });
    renderCart();
}

function renderCart() {
    const cartDiv = document.getElementById("cart");
    cartDiv.innerHTML = cart.length ? "" : "<p>Корзина пуста</p>";
    cart.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `<span>${item.name} x${item.qty}</span> <span>${item.price * item.qty} ₽</span>`;
        cartDiv.appendChild(row);
    });
}

window.checkout = function() {
    if (!cart.length) return tg.showAlert("Корзина пуста!");
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    tg.sendData(JSON.stringify({ items: cart, total: total }));
    tg.close();
}

loadProducts();