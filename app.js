const tg = window.Telegram.WebApp;
tg.expand();

let products = [];
let cart = [];
let counts = { strawberry: 0, raspberry: 0 };

// Инициализация пикеров (от 0 до 20)
function initPickers() {
    ['strawberry', 'raspberry'].forEach(type => {
        const picker = document.getElementById(`picker-${type}`);
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

window.calcConstructor = function() {
    const chocSelect = document.getElementById("c-chocolate");
    const chocPrice = parseInt(chocSelect.options[chocSelect.selectedIndex].getAttribute('data-price'));
    const total = (counts.strawberry + counts.raspberry) * 100 + chocPrice;
    document.getElementById("constructor-price").innerText = total;
}

// КОРЗИНА С УДАЛЕНИЕМ
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
    document.getElementById("main-checkout").innerText = `Заказать (${total} ₽)`;
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
}

// Запуск
initPickers();
loadProducts();
// ... (остальные функции loadProducts, checkout и т.д. остаются из прошлого ответа)