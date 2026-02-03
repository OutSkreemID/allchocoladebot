const tg = window.Telegram.WebApp;
tg.expand();

let products = [];
let cart = [];

// 1. Загрузка данных из JSON
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error('Ошибка загрузки JSON');
        const data = await response.json();
        products = data.products;
        renderCatalog();
    } catch (error) {
        console.error("Критическая ошибка:", error);
        document.getElementById("catalog").innerHTML = "<p>Не удалось загрузить товары...</p>";
    }
}

// 2. Отрисовка каталога
function renderCatalog() {
    const catalog = document.getElementById("catalog");
    catalog.innerHTML = "";

    products.forEach(p => {
        const div = document.createElement("div");
        div.className = "card";
        div.innerHTML = `
            <strong>${p.name}</strong><br>
            <small>${p.description}</small><br>
            <p>${p.price} ₽</p>
            <button onclick="addToCart(${p.id})">Добавить</button>
        `;
        catalog.appendChild(div);
    });
}

// 3. Добавление в корзину
window.addToCart = function(id) {
    const product = products.find(p => p.id === id);
    const cartItem = cart.find(i => i.id === id);

    if (cartItem) {
        cartItem.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    renderCart();
};

// 4. Отрисовка корзины
function renderCart() {
    const cartDiv = document.getElementById("cart");
    cartDiv.innerHTML = "";

    if (cart.length === 0) {
        cartDiv.innerHTML = "<p>Корзина пуста</p>";
        return;
    }

    cart.forEach(item => {
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <span>${item.name} x${item.qty}</span>
            <span>${item.price * item.qty} ₽</span>
        `;
        cartDiv.appendChild(row);
    });

    const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalDiv = document.createElement("div");
    totalDiv.style.fontWeight = "bold";
    totalDiv.style.marginTop = "10px";
    totalDiv.innerHTML = `Итого: ${total} ₽`;
    cartDiv.appendChild(totalDiv);
}

// 5. Оформление заказа (Отправка боту)
window.checkout = function() {
    if (cart.length === 0) {
        tg.showAlert("Добавьте хотя бы один товар!");
        return;
    }

    const orderData = {
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
    };

    // Отправляем JSON-строку боту
    tg.sendData(JSON.stringify(orderData));
    tg.close();
};

// Запуск приложения
loadProducts();