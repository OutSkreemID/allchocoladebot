const tg = window.Telegram.WebApp;
let products = [], cart = [], counts = { strawberry: 0, raspberry: 0, blueberry: 0 }, config = {};

document.addEventListener('DOMContentLoaded', () => {
    tg.expand();
    initPickers();
    loadData();
});
// URL вашего бота на Railway
const API_BASE = "https://vsevshokoladebot-production.up.railway.app";

function initPickers() {
    // Настройки для каждого типа ягод
    const settings = {
        strawberry: { max: 20, step: 1 },    // 0, 1, 2... 20
        raspberry: { max: 100, step: 10 },   // 0, 10, 20... 100
        blueberry: { max: 100, step: 20 }    // 0, 20, 40... 100
    };

    // Проходим циклом по настройкам
    Object.keys(settings).forEach(type => {
        const p = document.getElementById(`picker-${type}`);
        if (!p) return; // Если блока нет в HTML, просто пропускаем
        
        p.innerHTML = ""; // Очищаем старые цифры
        const { max, step } = settings[type];

        // Генерируем цифры с нужным шагом
        for (let i = 0; i <= max; i += step) {
            const el = document.createElement('div');
            // Если текущее кол-во совпадает с i, помечаем как выбранное (нужно для сброса в 0)
            el.className = `picker-item ${counts[type] === i ? 'selected' : ''}`;
            el.innerText = i;
            
            el.onclick = () => {
                counts[type] = i; // Записываем выбранное число
                // Убираем выделение у всех соседних цифр в этом пикере
                p.querySelectorAll('.picker-item').forEach(item => item.classList.remove('selected'));
                // Выделяем текущую цифру
                el.classList.add('selected');
                // Пересчитываем общую цену
                calcConstructor();
            };
            p.appendChild(el);
        }
    });
}
// --- 4. ЛОГИКА КОНСТРУКТОРА ---
window.calcConstructor = () => {
    if (!config.berry_base_price) return 0;

    const sChoc = document.getElementById("c-chocolate-strawberry").value;
    const rChoc = document.getElementById("c-chocolate-raspberry").value;
    const bChoc = document.getElementById("c-chocolate-blueberry").value;
    
    const priceS = counts.strawberry * (config.berry_base_price + (config[`strawberry_${sChoc}_extra`] || 0));
    const priceR = counts.raspberry * (config.berry_base_price + (config[`raspberry_${rChoc}_extra`] || 0));
    const priceB = counts.blueberry * (config.berry_base_price + (config[`blueberry_${bChoc}_extra`] || 0));
    
    const total = priceS + priceR + priceB;
    document.getElementById("constructor-price").innerText = total;
    return total;
};

window.addConstructorToCart = () => {
    const total = window.calcConstructor();
    if (total <= 0) return tg.showAlert("Выберите хотя бы одну ягоду!");

    let desc = [];
    const berryNames = { strawberry: "Клубника", raspberry: "Малина", blueberry: "Голубика" };

    Object.keys(berryNames).forEach(key => {
        if (counts[key] > 0) {
            const select = document.getElementById(`c-chocolate-${key}`);
            const chocText = select.options[select.selectedIndex].text;
            desc.push(`${berryNames[key]}: ${counts[key]}шт (${chocText})`);
        }
    });

    cart.push({ 
        id: Date.now(), 
        name: "Микс собранный", 
        qty: 1, 
        price: total, 
        description: desc.join(" + ") 
    });
    
    // Сброс всего
    counts = { strawberry: 0, raspberry: 0, blueberry: 0 };
    initPickers();
    calcConstructor();
    renderCart();
    tg.showAlert("Добавлено в корзину!");
};

// --- 5. ЛОГИКА КОРЗИНЫ (С УДАЛЕНИЕМ) ---
window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    renderCart();
};

window.renderCart = () => {
    const div = document.getElementById("cart");
    const checkoutBtn = document.getElementById("main-checkout");
    if (!div) return;

    if (cart.length === 0) {
        div.innerHTML = "<p style='text-align:center;color:#999'>Корзина пуста</p>";
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
                <b>${item.name}</b><br>
                <small>${item.description || ''}</small><br>
                <b>${item.price * item.qty} ₽</b>
            </div>
            <button class="remove-btn" onclick="window.removeFromCart(${idx})">×</button>
        `;
        div.appendChild(row);
    });
    checkoutBtn.innerText = `Оформить заказ (${total} ₽)`;
};

// --- 7. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
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

// 3. ОТРИСОВКА ОПЦИЙ ШОКОЛАДА
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
        const extraB = config[`blueberry_${type}_extra`]
        if (extraS !== undefined) {
            strawberrySelect.innerHTML += `<option value="${type}">${translate[type] || type} (+${extraS} ₽)</option>`;
        }
        if (extraR !== undefined) {
            raspberrySelect.innerHTML += `<option value="${type}">${translate[type] || type} (+${extraR} ₽)</option>`;
        }
    });
}
// 2. ЗАГРУЗКА ДАННЫХ с API на Railway
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
