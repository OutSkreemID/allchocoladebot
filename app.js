const tg = window.Telegram.WebApp;
tg.expand();

let products = [];
let cart = [];
let counts = { strawberry: 0, raspberry: 0 };

// 1. Инициализация пикеров
function initPickers() {
    ['strawberry', 'raspberry'].forEach(type => {
        const picker = document.getElementById(`picker-${type}`);
        if (!picker) return;
        picker.innerHTML = "";
        for (let i = 0; i <= 20; i++) {
            const el = document.createElement('div');
            el.className = `picker-item ${i === 0 ? 'selected' : ''}`;
            el.innerText = i;
            el.onclick = () => selectNumber(type, i, el);
            picker.appendChild(el);
        }
    });
}

function selectNumber(type, val, el) {
    const parent = el.parentElement;
    parent.querySelectorAll('.picker-item').forEach(item => item.classList.remove('selected'));
    el.classList.add('selected');
    counts[type] = val;
    calcConstructor();
}

// 2. Логика вкладок
window.openTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// 3. Загрузка товаров
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        const data = await response.json();
        products = data.products;
        renderCatalog();
    } catch (e) {
        console.error("Ошибка загрузки товаров:", e);
    }
}

function renderCatalog() {
    const catalog = document.getElementById("catalog");
    if (!catalog) return;
    catalog.innerHTML = "";
    products.forEach(p => {
        const div = document.createElement("div");
        div.className = "card";
        div.onclick = () => showModal(p);
        div.innerHTML = `
            <strong>${p.name}</strong>
            <span>${p.price} ₽</span><br>
            <button onclick="event.stopPropagation(); addToCart(${p.id})">В корзину</button>
        `;
        catalog.appendChild(div);
    });
}

// 4. Модальное окно
window.showModal = function(product) {
    document.getElementById("modal-title").innerText = product.name;
    document.getElementById("modal-desc").innerText = product.description || "";
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

// 5. Конструктор
window.calcConstructor = function() {
    const chocSelect = document.getElementById("c-chocolate");
    const chocPrice = parseInt(chocSelect.options[chocSelect.selectedIndex].getAttribute('data-price'));
    const total = (counts.strawberry + counts.raspberry) * 100 + chocPrice;
    document.getElementById("constructor-price").innerText = total;
}

window.addConstructorToCart = function() {
    const total = parseInt(document.getElementById("constructor-price").innerText);
    if (total <= 0) return tg.showAlert("Выберите количество ягод!");

    const choc = document.getElementById("c-chocolate").value;
    const item = {
        id: Date.now(),
        name: `Свой набор (${choc})`,
        qty: 1,
        price: total,
        details: `Клубника: ${counts.strawberry}, Малина: ${counts.raspberry}`
    };
    cart.push(item);
    renderCart();
    tg.showAlert("Конструктор добавлен!");
}

// 6. Корзина
window.addToCart = function(id) {
    const p = products.find(x => x.id === id);
    const existing = cart.find(x => x.id === id);
    if (existing) existing.qty++;
    else cart.push({ ...p, qty: 1 });
    renderCart();
}

window.renderCart = function() {
    const cartDiv = document.getElementById("cart");
    cartDiv.innerHTML = cart.length ? "" : "<p>Корзина пуста</p>";
    
    cart.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `
            <div>
                <b>${item.name}</b><br>
                <small>${item.qty} шт. — ${item.price * item.qty} ₽</small>
            </div>
            <button class="remove-btn" onclick="removeFromCart(${index})">×</button>
        `;
        cartDiv.appendChild(row);
    });
    
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    document.getElementById("main-checkout").innerText = `Оформить заказ (${total} ₽)`;
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
}

// 7. Отправка заказа
window.checkout = function() {
    if (!cart.length) return tg.showAlert("Корзина пуста!");
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    tg.sendData(JSON.stringify({ items: cart, total: total }));
    tg.close();
}

// Старт
initPickers();
loadProducts();