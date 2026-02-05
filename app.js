const tg = window.Telegram.WebApp;
let products = [], cart = [], counts = { strawberry: 0, raspberry: 0 }, config = {};

document.addEventListener('DOMContentLoaded', () => {
    tg.expand();
    initPickers();
    loadData();
});
// URL вашего бота на Railway
const API_BASE = "https://vsevshokoladebot-production.up.railway.app";

function initPickers() {
    ['strawberry', 'raspberry'].forEach(type => {
        const p = document.getElementById(`picker-${type}`);
        p.innerHTML = "";
        for (let i = 0; i <= 20; i++) {
            const el = document.createElement('div');
            el.className = `picker-item ${counts[type] === i ? 'selected' : ''}`;
            el.innerText = i;
            el.onclick = () => {
                counts[type] = i;
                p.querySelectorAll('.picker-item').forEach(item => item.classList.remove('selected'));
                el.classList.add('selected');
                calcConstructor();
            };
            p.appendChild(el);
        }
    });
}

window.calcConstructor = () => {
    if (!config.berry_base_price) return;

    const chocS = document.getElementById("c-chocolate-strawberry").value;
    const chocR = document.getElementById("c-chocolate-raspberry").value;
    
    // Получаем наценку из конфига
    const extraS = config[`strawberry_${chocS}_extra`] || 0;
    const extraR = config[`raspberry_${chocR}_extra`] || 0;

    // Считаем цену за каждую ягоду отдельно (База + Наценка)
    const priceS = counts.strawberry * (config.berry_base_price + extraS);
    const priceR = counts.raspberry * (config.berry_base_price + extraR);
    
    const total = priceS + priceR;
    document.getElementById("constructor-price").innerText = total;
    return { total, detailsS: { count: counts.strawberry, choc: chocS }, detailsR: { count: counts.raspberry, choc: chocR } };
};

window.addConstructorToCart = () => {
    const calculation = window.calcConstructor();
    if (!calculation || calculation.total <= 0) return tg.showAlert("Выберите ягоды!");

    let desc = [];
    if (counts.strawberry > 0) desc.push(`Клубника: ${counts.strawberry}шт (${document.getElementById("c-chocolate-strawberry").options[document.getElementById("c-chocolate-strawberry").selectedIndex].text})`);
    if (counts.raspberry > 0) desc.push(`Малина: ${counts.raspberry}шт (${document.getElementById("c-chocolate-raspberry").options[document.getElementById("c-chocolate-raspberry").selectedIndex].text})`);

    cart.push({ 
        id: Date.now(), 
        name: "Микс собранный", 
        qty: 1, 
        price: calculation.total, 
        description: desc.join(" + ") 
    });
    
    counts = { strawberry: 0, raspberry: 0 };
    initPickers();
    calcConstructor();
    renderCart();
    tg.showAlert("Добавлено в корзину!");
};

window.renderCart = () => {
    const div = document.getElementById("cart");
    const checkoutBtn = document.getElementById("main-checkout");
    div.innerHTML = cart.length ? "" : "<p style='text-align:center;color:#999'>Корзина пуста</p>";
    
    let total = 0;
    cart.forEach((item, idx) => {
        total += item.price * item.qty;
        const row = document.createElement('div');
        row.className = "cart-item";
        row.innerHTML = `
            <div style="flex:1">
                <b>${item.name}</b><br>
                <small>${item.description || ''}</small><br>
                <b>${item.price} ₽</b>
            </div>
            <button class="remove-btn" onclick="removeFromCart(${idx})">×</button>
        `;
        div.appendChild(row);
    });
    checkoutBtn.innerText = `Оформить заказ (${total} ₽)`;
};

// Остальные функции (renderCatalog, addToCart, removeFromCart, checkout, openTab) остаются такими же
window.openTab = (id) => {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(id === 'catalog-tab' ? 'btn-catalog' : 'btn-constructor').classList.add('active');
};
window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    const ex = cart.find(x => x.id === id && !x.description);
    if (ex) ex.qty++; else cart.push({...p, qty: 1});
    renderCart();
};
window.renderCatalog = () => {
    const cat = document.getElementById("catalog");
    cat.innerHTML = "";
    products.forEach(p => {
        const d = document.createElement("div"); d.className = "card";
        d.innerHTML = `<strong>${p.name}</strong><span>${p.price} ₽</span><button onclick="event.stopPropagation(); addToCart(${p.id})">В корзину</button>`;
        d.onclick = () => showModal(p);
        cat.appendChild(d);
    });
};
window.showModal = (p) => {
    document.getElementById("modal-title").innerText = p.name;
    document.getElementById("modal-desc").innerText = p.description || "";
    document.getElementById("modal-price").innerText = p.price + " ₽";
    document.getElementById("modal-add-btn").onclick = () => { addToCart(p.id); closeModal(); };
    document.getElementById("modal").style.display = "block";
};
window.closeModal = () => document.getElementById("modal").style.display = "none";
window.checkout = () => {
    if (!cart.length) return tg.showAlert("Пусто!");
    tg.sendData(JSON.stringify({ items: cart, total: cart.reduce((s, i) => s + i.price*i.qty, 0) }));
    tg.close();
};
function renderConstructorOptions() {
    const strawberrySelect = document.getElementById("c-chocolate-strawberry");
    const raspberrySelect = document.getElementById("c-chocolate-raspberry");
    
    if (!strawberrySelect || !raspberrySelect) return;

    // Список доступных типов шоколада (можно тоже вынести в конфиг)
    // Но пока сделаем на основе ключей, которые есть в config
    const chocTypes = ["milk", "dark", "white", "dubai", "kinder"]; 
    
    const translate = {
        milk: "Молочный", dark: "Темный", white: "Белый",
        dubai: "Дубайский", kinder: "Киндер"
    };

    strawberrySelect.innerHTML = "";
    raspberrySelect.innerHTML = "";

    chocTypes.forEach(type => {
        // Проверяем, есть ли наценка для этого шоколада в конфиге
        const extraS = config[`strawberry_${type}_extra`];
        const extraR = config[`raspberry_${type}_extra`];

        if (extraS !== undefined) {
            strawberrySelect.innerHTML += `<option value="${type}">${translate[type] || type} (+${extraS} ₽)</option>`;
        }
        if (extraR !== undefined) {
            raspberrySelect.innerHTML += `<option value="${type}">${translate[type] || type} (+${extraR} ₽)</option>`;
        }
    });
}
// Функция загрузки данных с API на Railway
async function loadData() {
    try {
        // Добавляем временную метку, чтобы избежать кеширования
        const v = Date.now();
        const [pRes, cRes] = await Promise.all([
            fetch(`${API_BASE}/api/products?v=${v}`),
            fetch(`${API_BASE}/api/config?v=${v}`)
        ]);

        products = (await pRes.json()).products || [];
        config = await cRes.json() || {};

        renderCatalog();
        renderCart();
        renderConstructorOptions();
        calcConstructor();
    } catch (e) {
        console.error("Критическая ошибка loadData:", e);
        document.getElementById("catalog").innerHTML = "<p style='color:red; text-align:center;'>Ошибка загрузки данных</p>";
    }
}
// Функция изменения цены товара (можно вызывать из консоли для теста)
async function apiUpdateProductPrice(id, newPrice) {
    try {
        const response = await fetch(`${API_BASE}/api/update-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id, price: newPrice })
        });
        const result = await response.json();
        if (result.status === 'ok') loadData(); // Обновляем данные на экране
    } catch (e) { console.error("Ошибка обновления товара:", e); }
}

// Функция изменения цен конструктора
async function apiUpdateConfig(key, value) {
    try {
        const response = await fetch(`${API_BASE}/api/update-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: key, value: value })
        });
        const result = await response.json();
        if (result.status === 'ok') loadData();
    } catch (e) { console.error("Ошибка обновления конфига:", e); }
}
function renderConstructorOptions() {
    const sSelect = document.getElementById("c-chocolate-strawberry");
    const rSelect = document.getElementById("c-chocolate-raspberry");
    if (!sSelect || !rSelect) return;

    const chocTypes = ["milk", "dark", "white", "dubai", "kinder"];
    const names = { milk: "Молочный", dark: "Темный", white: "Белый", dubai: "Дубайский", kinder: "Киндер" };

    sSelect.innerHTML = ""; rSelect.innerHTML = "";

    chocTypes.forEach(t => {
        const exS = config[`strawberry_${t}_extra`];
        const exR = config[`raspberry_${t}_extra`];
        if (exS !== undefined) sSelect.innerHTML += `<option value="${t}">${names[t]} (+${exS}₽/шт)</option>`;
        if (exR !== undefined) rSelect.innerHTML += `<option value="${t}">${names[t]} (+${exR}₽/шт)</option>`;
    });
}

window.calcConstructor = () => {
    if (!config.berry_base_price) return;
    const sChoc = document.getElementById("c-chocolate-strawberry").value;
    const rChoc = document.getElementById("c-chocolate-raspberry").value;
    
    const priceS = counts.strawberry * (config.berry_base_price + (config[`strawberry_${sChoc}_extra`] || 0));
    const priceR = counts.raspberry * (config.berry_base_price + (config[`raspberry_${rChoc}_extra`] || 0));
    
    const total = priceS + priceR;
    document.getElementById("constructor-price").innerText = total;
    return total;
};
