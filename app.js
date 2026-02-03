const tg = window.Telegram.WebApp;

let products = [];
let cart = [];
let counts = { strawberry: 0, raspberry: 0 };

document.addEventListener('DOMContentLoaded', () => {
    tg.expand();
    initPickers();
    loadProducts();
    renderCart();
});

// Инициализация прокрутки цифр
function initPickers() {
    ['strawberry', 'raspberry'].forEach(type => {
        const picker = document.getElementById(`picker-${type}`);
        if (!picker) return;
        picker.innerHTML = "";
        for (let i = 0; i <= 20; i++) {
            const el = document.createElement('div');
            // Если значение совпадает с текущим counts, ставим selected (нужно для сброса в 0)
            el.className = `picker-item ${counts[type] === i ? 'selected' : ''}`;
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

// Переключение вкладок
window.openTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if(tabId === 'catalog-tab') document.getElementById('btn-catalog').classList.add('active');
    if(tabId === 'constructor-tab') document.getElementById('btn-constructor').classList.add('active');
};

// Загрузка товаров из JSON
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        const data = await response.json();
        products = data.products;
        renderCatalog();
    } catch (e) {
        console.error(e);
        document.getElementById("catalog").innerHTML = "Ошибка загрузки товаров";
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

// Расчет конструктора
window.calcConstructor = function() {
    const chocS = document.getElementById("c-chocolate-strawberry");
    const chocR = document.getElementById("c-chocolate-raspberry");
    
    const priceS = parseInt(chocS.options[chocS.selectedIndex].getAttribute('data-price') || 0);
    const priceR = parseInt(chocR.options[chocR.selectedIndex].getAttribute('data-price') || 0);
    
    const totalS = counts.strawberry > 0 ? (counts.strawberry * 100 + priceS) : 0;
    const totalR = counts.raspberry > 0 ? (counts.raspberry * 100 + priceR) : 0;
    
    document.getElementById("constructor-price").innerText = totalS + totalR;
};

// Добавление конструктора + СБРОС
window.addConstructorToCart = function() {
    const price = parseInt(document.getElementById("constructor-price").innerText);
    if (price <= 0) {
        tg.showAlert("Выберите хотя бы одну ягоду!");
        return;
    }

    const chocS = document.getElementById("c-chocolate-strawberry").value;
    const chocR = document.getElementById("c-chocolate-raspberry").value;

    let details = [];
    if (counts.strawberry > 0) details.push(`Клубника: ${counts.strawberry} шт (${chocS})`);
    if (counts.raspberry > 0) details.push(`Малина: ${counts.raspberry} шт (${chocR})`);

    cart.push({
        id: Date.now(),
        name: `Собранный микс`,
        qty: 1,
        price: price,
        description: details.join(" + ")
    });

    renderCart();

    // СБРОС СОСТОЯНИЯ
    counts.strawberry = 0;
    counts.raspberry = 0;
    document.getElementById("c-chocolate-strawberry").selectedIndex = 0;
    document.getElementById("c-chocolate-raspberry").selectedIndex = 0;
    initPickers(); // Визуально вернет на 0
    calcConstructor(); // Обнулит цену на экране

    tg.showAlert("Микс добавлен в корзину!");
};

window.addToCart = function(id) {
    const p = products.find(x => x.id === id);
    if (!p) return;
    const existing = cart.find(x => x.id === id && !x.description);
    if (existing) existing.qty++;
    else cart.push({ ...p, qty: 1 });
    renderCart();
};

window.renderCart = function() {
    const cartDiv = document.getElementById("cart");
    const checkoutBtn = document.getElementById("main-checkout");
    if (!cartDiv) return;

    if (cart.length === 0) {
        cartDiv.innerHTML = "<p style='text-align:center; color:#999; margin-bottom:15px;'>Корзина пуста</p>";
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
            <div style="flex:1;">
                <b style="color:var(--primary-color)">${item.name}</b><br>
                ${item.description ? `<small style="color:#777;">${item.description}</small><br>` : ''}
                <b>${item.qty} шт. — ${item.price * item.qty} ₽</b>
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

window.checkout = function() {
    if (cart.length === 0) return tg.showAlert("Корзина пуста!");
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    tg.sendData(JSON.stringify({ items: cart, total: total }));
    tg.close();
};