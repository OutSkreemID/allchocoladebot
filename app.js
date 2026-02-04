const tg = window.Telegram.WebApp;
let products = [], cart = [], counts = { strawberry: 0, raspberry: 0 }, config = {};

document.addEventListener('DOMContentLoaded', () => {
    tg.expand();
    initPickers();
    loadData();
});

async function loadData() {
    try {
        const [pRes, cRes] = await Promise.all([fetch('products.json'), fetch('constructor_config.json')]);
        products = (await pRes.json()).products;
        config = await cRes.json();
        renderCatalog();
        renderCart();
        calcConstructor();
    } catch (e) { console.error("Ошибка загрузки данных", e); }
}

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

window.openTab = (id) => {
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById(id === 'catalog-tab' ? 'btn-catalog' : 'btn-constructor').classList.add('active');
};

window.calcConstructor = () => {
    const chocS = document.getElementById("c-chocolate-strawberry").value;
    const chocR = document.getElementById("c-chocolate-raspberry").value;
    
    // Наценка из конфига (ключи: strawberry_dubai_extra и т.д.)
    const getExtra = (berry, type) => {
        const key = `${berry}_${type.toLowerCase()}_extra`;
        return config[key] || 0;
    };

    const priceS = counts.strawberry * (config.berry_base_price + getExtra('strawberry', chocS));
    const priceR = counts.raspberry * (config.berry_base_price + getExtra('raspberry', chocR));
    
    document.getElementById("constructor-price").innerText = priceS + priceR;
};

window.addConstructorToCart = () => {
    const total = parseInt(document.getElementById("constructor-price").innerText);
    if (total <= 0) return tg.showAlert("Выберите ягоды!");

    const chocS = document.getElementById("c-chocolate-strawberry").value;
    const chocR = document.getElementById("c-chocolate-raspberry").value;

    let desc = [];
    if (counts.strawberry > 0) desc.push(`Клубника: ${counts.strawberry} шт (${chocS})`);
    if (counts.raspberry > 0) desc.push(`Малина: ${counts.raspberry} шт (${chocR})`);

    cart.push({ id: Date.now(), name: "Микс собранный", qty: 1, price: total, description: desc.join(" + ") });
    
    counts = { strawberry: 0, raspberry: 0 };
    initPickers();
    calcConstructor();
    renderCart();
    tg.showAlert("Добавлено!");
};

window.renderCart = () => {
    const div = document.getElementById("cart");
    div.innerHTML = cart.length ? "" : "<p style='text-align:center;color:#999'>Пусто</p>";
    let total = 0;
    cart.forEach((item, idx) => {
        total += item.price * item.qty;
        const row = document.createElement('div');
        row.className = "cart-item";
        row.innerHTML = `<div style="flex:1"><b>${item.name}</b><br><small>${item.description || ''}</small><br>${item.price*item.qty}₽</div><button class="remove-btn" onclick="removeFromCart(${idx})">×</button>`;
        div.appendChild(row);
    });
    document.getElementById("main-checkout").innerText = `Заказать (${total} ₽)`;
};

window.removeFromCart = (idx) => { cart.splice(idx, 1); renderCart(); };

window.renderCatalog = () => {
    const cat = document.getElementById("catalog");
    cat.innerHTML = "";
    products.forEach(p => {
        const d = document.createElement("div");
        d.className = "card";
        d.innerHTML = `<strong>${p.name}</strong><span>${p.price}₽</span><button onclick="addToCart(${p.id})">В корзину</button>`;
        d.onclick = () => showModal(p);
        cat.appendChild(d);
    });
};

window.addToCart = (id) => {
    const p = products.find(x => x.id === id);
    const ex = cart.find(x => x.id === id && !x.description);
    if (ex) ex.qty++; else cart.push({...p, qty: 1});
    renderCart();
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