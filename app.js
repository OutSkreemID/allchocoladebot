// Защита от запуска вне Телеграма
const tg = window.Telegram.WebApp;

let products = [];
let cart = [];
let counts = { strawberry: 0, raspberry: 0 };

// 1. Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    tg.expand();
    initPickers();
    loadProducts();
    renderCart(); // Чтобы сразу показать "Корзина пуста"
});

// 2. Инициализация пикеров
function initPickers() {
    ['strawberry', 'raspberry'].forEach(type => {
        const picker = document.getElementById(`picker-${type}`);
        if (!picker) return;
        picker.innerHTML = "";
        for (let i = 0; i <= 20; i++) {
            const el = document.createElement('div');
            el.className = `picker-item ${i === 0 ? 'selected' : ''}`;
            el.innerText = i;
            el.onclick = function() { selectNumber(type, i, this); };
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

// 3. Вкладки
window.openTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    // Находим кнопку, которая вызвала это
    if(tabId === 'catalog-tab') document.getElementById('btn-catalog').classList.add('active');
    if(tabId === 'constructor-tab') document.getElementById('btn-constructor').classList.add('active');
};

// 4. Загрузка товаров
async function loadProducts() {
    const catalog = document.getElementById("catalog");
    try {
        const response = await fetch('products.json');
        if (!response.ok) throw new Error("Файл не найден");
        const data = await response.json();
        products = data.products;
        renderCatalog();
    } catch (e) {
        console.error(e);
        if(catalog) catalog.innerHTML = "Ошибка загрузки товаров. Проверьте products.json";
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

// 5. Модалка
window.showModal = function(product) {
    document.getElementById("modal-title").innerText = product.name;
    document.getElementById("modal-desc").innerText = product.description || "";
    document.getElementById("modal-price").innerText = product.price + " ₽";
    document.getElementById("modal-add-btn").onclick = () => {
        addToCart(product.id);
        closeModal();
    };
    document.getElementById("modal").style.display = "block";
};

window.closeModal = function() {
    document.getElementById("modal").style.display = "none";
};

// 6. Конструктор
window.calcConstructor = function() {
    const chocSelect = document.getElementById("c-chocolate");
    const chocPrice = parseInt(chocSelect.options[chocSelect.selectedIndex].getAttribute('data-price') || 0);
    const total = (counts.strawberry + counts.raspberry) * 100 + chocPrice;
    document.getElementById("constructor-price").innerText = total;
};

window.addConstructorToCart = function() {
    const price = parseInt(document.getElementById("constructor-price").innerText);
    if (price <= 0) {
        alert("Выберите ягоды!"); 
        return;
    }
    const choc = document.getElementById("c-chocolate").value;
    const item = {
        id: Date.now(),
        name: `Свой набор (${choc})`,
        qty: 1,
        price: price,
        details: `Клубника: ${counts.strawberry}, Малина: ${counts.raspberry}`
    };
    cart.push(item);
    renderCart();
};

// 7. Корзина
window.addToCart = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const existing = cart.find(x => x.id === id);
    if (existing) existing.qty++;
    else cart.push({ ...p, qty: 1 });
    renderCart();
};

window.renderCart = function() {
    const cartDiv = document.getElementById("cart");
    const checkoutBtn = document.getElementById("main-checkout");
    
    if (!cartDiv || !checkoutBtn) return;

    if (cart.length === 0) {
        cartDiv.innerHTML = "<p style='text-align:center; color:#999;'>Корзина пуста</p>";
        checkoutBtn.innerText = "Оформить заказ (0 ₽)";
        return;
    }

    cartDiv.innerHTML = "";
    let total = 0;

    cart.forEach((item, index) => {
        total += item.price * item.qty;
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
    
    checkoutBtn.innerText = `Оформить заказ (${total} ₽)`;
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
};

// 8. Отправка заказа
window.checkout = function() {
    if (cart.length === 0) {
        if (tg.showAlert) tg.showAlert("Корзина пуста!");
        else alert("Корзина пуста!");
        return;
    }
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    tg.sendData(JSON.stringify({ items: cart, total: total }));
    tg.close();
};