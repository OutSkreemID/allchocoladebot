const tg = window.Telegram.WebApp;
const API_BASE = "https://vsevshokoladebot-production.up.railway.app";

let products = []; // Готовые наборы
let cart = [];     // Корзина
let config = {};   // Конфиг конструктора (ягоды и шоколад)
let counts = {};   // Выбранные количества в конструкторе

// --- 1. ЗАПУСК ПРИЛОЖЕНИЯ ---
document.addEventListener('DOMContentLoaded', () => {
    tg.expand();
    loadData();
});

// Загрузка данных с сервера
async function loadData() {
    try {
        const v = Date.now(); // Кеш-бастер
        const [pRes, cRes] = await Promise.all([
            fetch(`${API_BASE}/api/products?v=${v}`),
            fetch(`${API_BASE}/api/config?v=${v}`)
        ]);

        if (!pRes.ok || !cRes.ok) throw new Error("Ошибка API");

        const pData = await pRes.json();
        products = pData.products || [];
        config = await cRes.json();

        renderCatalog();            // Рисуем наборы
        renderDynamicConstructor(); // Рисуем конструктор
        renderCart();               // Рисуем корзину
    } catch (e) {
        console.error("Критическая ошибка:", e);
        document.getElementById("catalog").innerHTML = "<p style='color:red; text-align:center;'>Ошибка загрузки данных</p>";
    }
}

// --- 2. ДИНАМИЧЕСКИЙ КОНСТРУКТОР ---

function renderDynamicConstructor() {
    const container = document.getElementById("dynamic-constructor-container");
    if (!container || !config.items) return;

    container.innerHTML = "";
    config.items.forEach((item, index) => {
        // 1. Берем список ID шоколада, который разрешен для этой ягоды
        const allowedList = item.allowed_chocolates || [];
        
        // 2. Фильтруем глобальный список шоколада, оставляя только разрешенные
        const availableChoc = (config.chocolates || []).filter(c => allowedList.includes(c.id));

        // Проверка в консоли (нажмите F12 в браузере, чтобы увидеть)
console.log(`Ягода: ${item.name}, Найдено шоколада: ${availableChoc.length}`);


        // 3. Создаем HTML только если массив НЕ ПУСТОЙ
        let chocSelectHtml = "";
        // Если шоколада 0, эта переменная останется пустой строкой и не добавится в верстку
if (availableChoc.length > 0) {
    chocSelectHtml = `
        <select id="c-chocolate-${item.id}" onchange="calcConstructor()" style="width:100%; margin-top:10px;">
            ${availableChoc.map(c => `<option value="${c.id}">${c.name} (+${c.extra} ₽/шт)</option>`).join('')}
        </select>`;
}
        const block = document.createElement("div");
        block.className = "constructor-group";
        block.innerHTML = `
            <label style="font-weight:bold; display:block; margin-bottom:5px;">
                ${item.icon || '🍓'} ${item.name} (${item.base_price} ₽/шт)
            </label>
            <div id="picker-${item.id}" class="scroll-picker"></div>
            ${chocSelectHtml} 
            ${index < config.items.length - 1 ? '<hr class="separator">' : ''}
        `;
        container.appendChild(block);

        if (counts[item.id] === undefined) counts[item.id] = 0;
        renderPicker(item);
    });
    calcConstructor();
}

function renderPicker(item) {
    const p = document.getElementById(`picker-${item.id}`);
    if (!p) return;
    
    p.innerHTML = "";
    for (let i = 0; i <= item.max; i += item.step) {
        const el = document.createElement('div');
        el.className = `picker-item ${counts[item.id] === i ? 'selected' : ''}`;
        el.innerText = i;
        el.onclick = () => {
            counts[item.id] = i;
            p.querySelectorAll('.picker-item').forEach(child => child.classList.remove('selected'));
            el.classList.add('selected');
            calcConstructor();
        };
        p.appendChild(el);
    }
}

// Универсальный расчет цены конструктора
window.calcConstructor = () => {
    let total = 0;
    if (!config.items) return 0;

    config.items.forEach(item => {
        const count = counts[item.id] || 0;
const selectElement = document.getElementById(`c-chocolate-${item.id}`);

let extra = 0;
if (selectElement) {
    const chocId = selectElement.value;
    const choc = config.chocolates.find(c => c.id === chocId);
    extra = choc ? choc.extra : 0;
}
        total += count * (item.base_price + extra);
    });

    const priceEl = document.getElementById("constructor-price");
    if (priceEl) priceEl.innerText = total;
    return total;
};

// Добавление собранного микса в корзину
window.addConstructorToCart = () => {
    const total = window.calcConstructor();
    if (total <= 0) return tg.showAlert("Выберите ингредиенты!");

    let desc = [];
    config.items.forEach(item => {
    if (counts[item.id] > 0) {
        const select = document.getElementById(`c-chocolate-${item.id}`);
        // Если выбор шоколада был, пишем его название, если нет — просто название ягоды
        const chocText = select ? ` (${select.options[select.selectedIndex].text})` : "";
        desc.push(`${item.name}: ${counts[item.id]}шт${chocText}`);
    }
});
    cart.push({
        id: Date.now(),
        name: "Собранный микс",
        qty: 1,
        price: total,
        description: desc.join(" + ")
    });

    // Сброс и уведомление
    config.items.forEach(item => counts[item.id] = 0);
    renderDynamicConstructor();
    renderCart();
    tg.showAlert("Добавлено в корзину!");
};

// --- 3. ЛОГИКА КОРЗИНЫ ---

window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    renderCart();
};

window.renderCart = () => {
    const div = document.getElementById("cart");
    const checkoutBtn = document.getElementById("main-checkout");
    if (!div) return;

    if (cart.length === 0) {
        div.innerHTML = "<p style='text-align:center;color:#999;padding:10px;'>Корзина пуста</p>";
        checkoutBtn.innerText = "Оформить заказ (0 ₽)";
        return;
    }

    div.innerHTML = "";
    let total = 0;
    cart.forEach((item, idx) => {
        total += item.price * item.qty;
        const row = document.createElement('div');
        row.className = "cart-item";
        row.innerHTML = `
            <div style="flex:1">
                <b style="color:var(--primary-color)">${item.name}</b><br>
                ${item.description ? `<small style="color:#777;">${item.description}</small><br>` : ''}
                <b>${item.price * item.qty} ₽</b>
            </div>
            <button class="remove-btn" onclick="window.removeFromCart(${idx})">×</button>
        `;
        div.appendChild(row);
    });
    checkoutBtn.innerText = `Оформить заказ (${total} ₽)`;
};

// --- 4. КАТАЛОГ И МОДАЛКИ ---

window.renderCatalog = () => {
    const cat = document.getElementById("catalog");
    if (!cat) return;
    cat.innerHTML = "";
    products.forEach(p => {
        const d = document.createElement("div");
        d.className = "card";
        d.innerHTML = `
            <strong style="display:block; min-height:40px;">${p.name}</strong>
            <span style="display:block; margin:10px 0; font-weight:bold;">${p.price} ₽</span>
            <button onclick="event.stopPropagation(); window.addToCart(${p.id})">В корзину</button>
        `;
        d.onclick = () => showModal(p);
        cat.appendChild(d);
    });
};

window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    const existing = cart.find(x => x.id === id && !x.description);
    if (existing) existing.qty++;
    else cart.push({ ...p, qty: 1 });
    renderCart();
    tg.showAlert("Добавлено!");
};

window.showModal = (p) => {
    document.getElementById("modal-title").innerText = p.name;
    document.getElementById("modal-desc").innerText = p.description || "";
    document.getElementById("modal-price").innerText = p.price + " ₽";
    document.getElementById("modal-add-btn").onclick = () => {
        window.addToCart(p.id);
        closeModal();
    };
    document.getElementById("modal").style.display = "block";
};

window.closeModal = () => document.getElementById("modal").style.display = "none";

// --- 5. ФИНАЛЬНЫЙ ЗАКАЗ ---

window.checkout = () => {
    if (!cart.length) return tg.showAlert("Корзина пуста!");
    const finalTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    tg.sendData(JSON.stringify({ items: cart, total: finalTotal }));
    tg.close();
};

window.openTab = (id) => {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(id === 'catalog-tab' ? 'btn-catalog' : 'btn-constructor').classList.add('active');
};