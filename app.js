// State
let currentUser = null;
let cart = [];

// DOM Elements
const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('btn-logout');

// Initial load check
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupNavigation();
    setupModals();
    setupForms();
});

function checkAuth() {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginView.style.display = 'flex';
    appView.style.display = 'none';
}

function showApp() {
    loginView.style.display = 'none';
    appView.style.display = 'flex';
    document.getElementById('current-user-name').innerText = currentUser.username;
    
    // Check role, hide users tab if not admin
    if (currentUser.role !== 'Admin') {
        document.getElementById('nav-users').style.display = 'none';
        if(document.getElementById('backup-panel')) document.getElementById('backup-panel').style.display = 'none';
    } else {
        document.getElementById('nav-users').style.display = 'flex';
        if(document.getElementById('backup-panel')) document.getElementById('backup-panel').style.display = 'block';
    }
    
    // Load default view (dashboard)
    loadView('dashboard');
}

// Authentication
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        
        const validUser = DB.UserDB.login(user, pass);
        if (validUser) {
            currentUser = validUser;
            sessionStorage.setItem('currentUser', JSON.stringify(validUser));
            document.getElementById('login-error').style.display = 'none';
            document.getElementById('login-password').value = '';
            showApp();
        } else {
            const err = document.getElementById('login-error');
            err.innerText = "Credenciales incorrectas";
            err.style.display = 'block';
        }
    });
}

if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        sessionStorage.removeItem('currentUser');
        showLogin();
    });
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            loadView(target.dataset.target);
            
            // Close mobile sidebar if open
            if(window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('open');
            }
        });
    });
    
    // Mobile Hamburger button
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if(mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
        });
    }
}

function loadView(viewName) {
    document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    
    const titleObj = document.getElementById('page-title');
    if(titleObj) {
        titleObj.innerText = viewName === 'dashboard' ? 'Panel de Inicio' :
            viewName === 'inventory' ? 'Inventario' :
            viewName === 'sales' ? 'Punto de Venta' : 
            viewName === 'clients' ? 'Clientes' : 'Usuarios';
    }
        
    switch(viewName) {
        case 'dashboard': renderDashboard(); break;
        case 'inventory': renderInventory(); break;
        case 'sales': renderSales(); break;
        case 'clients': renderClients(); break;
        case 'users': 
            if(currentUser.role === 'Admin') renderUsers(); 
            break;
    }
}

// Modals
function setupModals() {
    const btnAddItem = document.getElementById('btn-add-item');
    if(btnAddItem) {
        btnAddItem.addEventListener('click', () => {
            document.getElementById('item-form').reset();
            document.getElementById('item-id').value = '';
            document.getElementById('modal-item-title').innerText = 'Nuevo Artículo';
            document.getElementById('modal-item-form').classList.add('active');
        });
    }
    
    const btnAddUser = document.getElementById('btn-add-user');
    if(btnAddUser) {
        btnAddUser.addEventListener('click', () => {
            document.getElementById('user-form').reset();
            document.getElementById('modal-user-form').classList.add('active');
        });
    }

    const btnAddClient = document.getElementById('btn-add-client');
    if(btnAddClient) {
        btnAddClient.addEventListener('click', () => {
            document.getElementById('client-form').reset();
            document.getElementById('client-id').value = '';
            document.getElementById('modal-client-form').classList.add('active');
        });
    }
}

// Global Functions
function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

window.editUser = function(id) {
    const user = DB.UserDB.getAll().find(u => u.id === id);
    if(user) {
        document.getElementById('modal-user-title').innerText = 'Editar Usuario';
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-password').value = '';
        document.getElementById('user-role').value = user.role;
        openModal('modal-user-form');
    }
};

// Forms & Logic
function setupForms() {
    // Inventory Form
    const itemForm = document.getElementById('item-form');
    if(itemForm) {
        itemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('item-id').value;
            const item = {
                name: document.getElementById('item-name').value,
                description: document.getElementById('item-desc').value,
                cost_price: parseFloat(document.getElementById('item-cost-price').value),
                price: parseFloat(document.getElementById('item-price').value),
                quantity: parseInt(document.getElementById('item-qty').value, 10)
            };
            
            if (id) {
                DB.InventoryDB.update(id, item);
                if(currentUser.role === 'Staff') DB.ActivityDB.log(currentUser.username, `Editó el producto ${item.name}`);
            } else {
                DB.InventoryDB.add(item);
                if(currentUser.role === 'Staff') DB.ActivityDB.log(currentUser.username, `Añadió el producto nuevo ${item.name}`);
            }
            closeModal('modal-item-form');
            renderInventory();
        });
    }
    
    // User Form
    document.getElementById('btn-add-user')?.addEventListener('click', () => {
        document.getElementById('modal-user-title').innerText = 'Nuevo Usuario';
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        document.getElementById('modal-user-form').classList.add('active');
    });
    const userForm = document.getElementById('user-form');
    if(userForm) {
        userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const id = document.getElementById('user-id').value;
                const pwd = document.getElementById('user-password').value;
                const usrData = {
                    username: document.getElementById('user-username').value,
                    role: document.getElementById('user-role').value
                };
                if(pwd) usrData.password = pwd;

                if (id) {
                    DB.UserDB.update(id, usrData);
                } else {
                    if(!pwd) throw new Error("La contraseña es obligatoria para usuarios nuevos");
                    DB.UserDB.add(usrData);
                }
                closeModal('modal-user-form');
                renderUsers();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // Client Form
    const clientForm = document.getElementById('client-form');
    if(clientForm) {
        clientForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('client-id').value;
            const newPlan = document.getElementById('client-plan').value;
            
            let paymentDate = new Date().toISOString();
            if(id) {
                const oldClient = DB.ClientsDB.getById(id);
                // Si el plan no cambia, mantemos la fecha original. 
                // Si hace upgrade/downgrade, la fecha se reinicia a hoy.
                if(oldClient && oldClient.plan_type === newPlan) {
                    paymentDate = oldClient.payment_date;
                }
            }
            
            const client = {
                name: document.getElementById('client-name').value,
                surname: document.getElementById('client-surname').value,
                age: parseInt(document.getElementById('client-age').value, 10),
                weight: parseFloat(document.getElementById('client-weight').value),
                address: document.getElementById('client-address').value,
                phone: document.getElementById('client-phone').value,
                plan_type: newPlan,
                payment_date: paymentDate
            };
            
            if (id) {
                DB.ClientsDB.update(id, client);
                if(currentUser.role === 'Staff') DB.ActivityDB.log(currentUser.username, `Editó al cliente ${client.name} ${client.surname}`);
            } else {
                DB.ClientsDB.add(client);
                if(currentUser.role === 'Staff') DB.ActivityDB.log(currentUser.username, `Registró al nuevo cliente ${client.name} ${client.surname}`);
            }
            closeModal('modal-client-form');
            renderClients();
        });
    }
    
    // Stock Form
    const stockForm = document.getElementById('stock-form');
    if(stockForm) {
        stockForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('stock-item-id').value;
            const type = document.getElementById('stock-action').value;
            let amount = parseInt(document.getElementById('stock-amount').value, 10);
            
            if (type === 'OUT') amount = -amount;
            
            try {
                DB.InventoryDB.adjustStock(id, amount, currentUser.id, type);
                if(currentUser.role === 'Staff') {
                    const item = DB.InventoryDB.getById(id);
                    DB.ActivityDB.log(currentUser.username, `Registró una ${type === 'IN' ? 'entrada' : 'salida'} manual de ${Math.abs(amount)} unidades en ${item.name}`);
                }
                closeModal('modal-stock-form');
                renderInventory();
            } catch(err) {
                alert(err.message);
            }
        });
    }

    // POS Cart Events
    const btnAddToCart = document.getElementById('btn-add-to-cart');
    if (btnAddToCart) {
        btnAddToCart.addEventListener('click', () => {
            const itemId = document.getElementById('sale-item-select').value;
            const qty = parseInt(document.getElementById('sale-item-qty').value, 10);
            if(!itemId || qty < 1) return;
            
            const item = DB.InventoryDB.getById(itemId);
            if(!item) return;
            
            if(item.quantity < qty) {
                alert("Stock insuficiente para añadir al carrito.");
                return;
            }
            
            const existing = cart.find(c => c.id === itemId);
            if(existing) {
                if (item.quantity < existing.qty + qty) {
                    alert("Stock insuficiente para añadir más de este artículo.");
                    return;
                }
                existing.qty += qty;
                existing.subtotal = existing.qty * existing.price;
            } else {
                cart.push({
                    id: itemId,
                    name: item.name,
                    price: item.price,
                    qty: qty,
                    subtotal: item.price * qty
                });
            }
            
            document.getElementById('sale-item-qty').value = 1;
            renderCart();
        });
    }
    
    const btnProcess = document.getElementById('btn-process-sale');
    if (btnProcess) {
        btnProcess.addEventListener('click', () => {
            if(cart.length === 0) {
                alert("El carrito está vacío");
                return;
            }
            try {
                DB.SalesDB.processSale(currentUser.id, cart);
                if(currentUser.role === 'Staff') DB.ActivityDB.log(currentUser.username, `Procesó una venta de ${cart.length} productos diferentes`);
                alert("Venta procesada con éxito");
                cart = [];
                renderCart();
                document.getElementById('btn-print-invoice').disabled = false;
                renderSalesHistory();
                
                // Reload select just in case some stock went 0
                populateSalesSelect();
            } catch (error) {
                alert("Error al procesar: " + error.message);
            }
        });
    }
    
    const btnPrint = document.getElementById('btn-print-invoice');
    if(btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }
}

// Rendering Dashboards & Views
function renderDashboard() {
    const inv = DB.InventoryDB.getAll();
    const sales = DB.SalesDB.getAll();
    const txs = DB.TransactionsDB.getAll();
    
    const sumQty = inv.reduce((sum, item) => sum + parseInt(item.quantity), 0);
    document.getElementById('stat-total-items').innerText = sumQty;
    
    const totalSalesValue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
    document.getElementById('stat-total-sales').innerText = `$${totalSalesValue.toFixed(2)}`;
    
    // Calculate total profit
    const totalProfitValue = sales.reduce((sum, sale) => sum + parseFloat(sale.profit || 0), 0);
    if(document.getElementById('stat-total-profit')) {
        document.getElementById('stat-total-profit').innerText = `$${totalProfitValue.toFixed(2)}`;
    }
    
    // Product Individual Stock Cards
    const productGrid = document.getElementById('product-stock-cards');
    if (productGrid) {
        productGrid.innerHTML = '';
        inv.forEach(item => {
            const stockColor = item.quantity <= 5 ? 'var(--danger-color)' : 'var(--accent-color)';
            productGrid.innerHTML += `
                <div class="glass-panel" style="padding: 1rem; text-align: center; border-left: 4px solid ${stockColor};">
                    <h4 style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;" title="${item.name}">${item.name}</h4>
                    <div style="font-size: 2rem; font-weight: bold; color: ${stockColor};">${item.quantity}</div>
                </div>
            `;
        });
    }
    
    // Product Report
    const reportTbody = document.querySelector('#product-report-table tbody');
    if (reportTbody) {
        reportTbody.innerHTML = '';
        
        let productProfits = {};
        sales.forEach(s => {
            s.items.forEach(i => {
                if(!productProfits[i.id]) productProfits[i.id] = 0;
                const currentCost = DB.InventoryDB.getById(i.id)?.cost_price || 0;
                const profitForItem = i.subtotal - (currentCost * i.qty);
                productProfits[i.id] += profitForItem;
            });
        });
        
        inv.forEach(item => {
            const prof = productProfits[item.id] || 0;
            reportTbody.innerHTML += `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td style="color: var(--success-color); font-weight: bold;">$${prof.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    const tbody = document.querySelector('#recent-transactions-table tbody');
    if (tbody) {
        tbody.innerHTML = '';
        // show last 5
        txs.slice(-5).reverse().forEach(tx => {
            tbody.innerHTML += `
                <tr>
                    <td>${new Date(tx.date).toLocaleString()}</td>
                    <td>${tx.item_name}</td>
                    <td><span style="color: ${tx.type==='IN'?'var(--success-color)': (tx.type === 'SALE' ? 'var(--accent-color)' : 'var(--danger-color)')}">${tx.type}</span></td>
                    <td>${tx.quantity}</td>
                </tr>
            `;
        });
    }
}

function renderInventory() {
    const inv = DB.InventoryDB.getAll();
    const tbody = document.querySelector('#inventory-table tbody');
    if(!tbody) return;
    
    tbody.innerHTML = '';
    
    if(inv.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay artículos. Añade uno.</td></tr>';
        return;
    }
    
    inv.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.id.substring(0,6)}</td>
                <td>${item.name}</td>
                <td>${item.description || '-'}</td>
                <td>$${parseFloat(item.cost_price || 0).toFixed(2)}</td>
                <td>$${parseFloat(item.price).toFixed(2)}</td>
                <td style="color: ${item.quantity <= 5 ? 'var(--danger-color)' : 'inherit'}; font-weight: ${item.quantity <= 5 ? 'bold' : 'normal'}">${item.quantity}</td>
                <td class="action-btns">
                    <button class="btn-icon" onclick="editItem('${item.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="adjustStockForm('${item.id}')" title="Ajustar Stock"><i class="fas fa-exchange-alt"></i></button>
                    ${currentUser.role === 'Admin' ? `<button class="btn-icon" style="color: var(--danger-color)" onclick="deleteItem('${item.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                </td>
            </tr>
        `;
    });
}

function renderSales() {
    populateSalesSelect();
    renderCart();
    renderSalesHistory();
}

function populateSalesSelect() {
    const select = document.getElementById('sale-item-select');
    if(!select) return;
    select.innerHTML = '<option value="">Seleccione un artículo...</option>';
    DB.InventoryDB.getAll().forEach(i => {
        if(i.quantity > 0) {
            select.innerHTML += `<option value="${i.id}">${i.name} ($${parseFloat(i.price).toFixed(2)} - Stock: ${i.quantity})</option>`;
        }
    });
}

function renderCart() {
    const tbody = document.querySelector('#cart-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    let total = 0;
    
    if(cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">El carrito está vacío</td></tr>';
    } else {
        cart.forEach((c, index) => {
            total += c.subtotal;
            tbody.innerHTML += `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.qty}</td>
                    <td>$${parseFloat(c.price).toFixed(2)}</td>
                    <td>$${c.subtotal.toFixed(2)}</td>
                    <td><button class="btn-icon" style="color: var(--danger-color)" onclick="removeFromCart(${index})"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
        });
    }
    
    document.getElementById('cart-subtotal').innerText = `$${total.toFixed(2)}`;
    document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
}

function renderSalesHistory() {
    const sales = DB.SalesDB.getAll();
    const tbody = document.querySelector('#sales-history-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    sales.slice(-10).reverse().forEach(s => {
        tbody.innerHTML += `
            <tr>
                <td>${new Date(s.date).toLocaleString()}</td>
                <td>${s.id}</td>
                <td>$${parseFloat(s.total_amount).toFixed(2)}</td>
            </tr>
        `;
    });
}

function renderUsers() {
    const users = DB.UserDB.getAll();
    const tbody = document.querySelector('#users-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    users.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td>${u.username}</td>
                <td>${u.role}</td>
                <td class="action-btns">
                    ${u.username !== 'admin' ? `
                        <button class="btn-icon" style="color: var(--primary-color)" onclick="editUser('${u.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon" style="color: var(--danger-color)" onclick="deleteUser('${u.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                    ` : `
                        <button class="btn-icon" style="color: var(--primary-color)" onclick="editUser('${u.id}')" title="Editar Contraseña"><i class="fas fa-edit"></i></button>
                    `}
                </td>
            </tr>
        `;
    });
}

window.renderNotifications = function() {
    const activity = DB.ActivityDB.getAll().sort((a,b) => new Date(b.date) - new Date(a.date));
    const unread = activity.filter(a => !a.readByAdmin).length;
    
    // Update Bell Widget
    const bellIconDiv = document.getElementById('notification-bell');
    const badge = document.getElementById('notif-badge');
    if(bellIconDiv && badge) {
        if(currentUser && currentUser.role === 'Admin') {
            bellIconDiv.style.display = 'block';
            if(unread > 0) {
                badge.style.display = 'block';
                badge.innerText = unread > 9 ? '9+' : unread;
            } else {
                badge.style.display = 'none';
            }
        } else {
            bellIconDiv.style.display = 'none';
        }
    }

    // Update List
    const list = document.getElementById('notifications-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(activity.length === 0) {
        list.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No hay actividad reciente.</p>';
        return;
    }
    
    activity.slice(0, 30).forEach(act => {
        const bg = act.readByAdmin ? 'transparent' : 'rgba(16, 185, 129, 0.1)';
        const dateStr = new Date(act.date).toLocaleString([], {hour: '2-digit', minute:'2-digit', month:'short', day:'numeric'});
        list.innerHTML += `
            <div style="background: ${bg}; padding: 0.75rem; border-radius: 4px; border-bottom: 1px solid var(--border-color);">
                <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.2rem;">${dateStr} - <b>${act.username}</b></div>
                <div style="font-size: 0.95rem;">${act.action}</div>
            </div>
        `;
    });
}

window.renderMessages = function() {
    const msgs = DB.MessagesDB.getAll().sort((a,b) => new Date(a.date) - new Date(b.date));
    const box = document.getElementById('chat-box');
    if(!box) return;
    
    box.innerHTML = '';
    msgs.forEach(m => {
        const isMe = currentUser && m.sender === currentUser.username;
        const align = isMe ? 'flex-end' : 'flex-start';
        const bg = isMe ? 'var(--primary-color)' : 'var(--card-bg)';
        const color = isMe ? 'white' : 'var(--text-primary)';
        
        box.innerHTML += `
            <div style="align-self: ${align}; max-width: 80%; display: flex; flex-direction: column;">
                <span style="font-size: 0.7rem; color: var(--text-secondary); margin-left: 5px; margin-right: 5px; text-align: ${isMe ? 'right' : 'left'}">${m.sender}</span>
                <div style="background: ${bg}; color: ${color}; padding: 0.75rem 1rem; border-radius: 12px; margin-top: 2px;">
                    ${m.text}
                </div>
            </div>
        `;
    });
    box.scrollTop = box.scrollHeight;
}

// Chat Form Listener
document.addEventListener('DOMContentLoaded', () => {
    const msgForm = document.getElementById('message-form');
    if(msgForm) {
        msgForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('message-input');
            const txt = input.value.trim();
            if(txt && currentUser) {
                DB.MessagesDB.add(currentUser.username, txt);
                input.value = '';
            }
        });
    }
});

function renderClients() {
    const clients = DB.ClientsDB.getAll();
    const now = new Date();
    
    let mensual = 0, diario = 0, personal = 0, expired = 0;
    
    clients.forEach(c => {
        if(c.plan_type === 'Mensual') mensual++;
        if(c.plan_type === 'Diario') diario++;
        if(c.plan_type === 'Personalizado') personal++;
        
        // Verifica si está vencido (solo mensual o personalizado, asumiendo 30 días)
        if(c.plan_type === 'Mensual' || c.plan_type === 'Personalizado') {
            const payDate = new Date(c.payment_date);
            const daysDiff = (now - payDate) / (1000 * 60 * 60 * 24);
            if(daysDiff >= 30) expired++;
        }
    });
    
    document.getElementById('stat-cat-mensual').innerText = mensual;
    document.getElementById('stat-cat-diario').innerText = diario;
    document.getElementById('stat-cat-personal').innerText = personal;
    document.getElementById('stat-expired-clients').innerText = expired;
}

window.showClientsCategory = function(category) {
    const clients = DB.ClientsDB.getAll();
    const tbody = document.querySelector('#clients-table tbody');
    const container = document.getElementById('clients-list-container');
    const title = document.getElementById('client-category-title');
    
    if(!tbody || !container) return;
    
    tbody.innerHTML = '';
    title.innerText = `Visualizando: ${category}`;
    
    const now = new Date();
    let filtered = [];
    
    if (category === 'Vencidos') {
        filtered = clients.filter(c => {
            if(c.plan_type === 'Mensual' || c.plan_type === 'Personalizado') {
                const payDate = new Date(c.payment_date);
                return (now - payDate) / (1000 * 60 * 60 * 24) >= 30;
            }
            return false;
        });
    } else {
        filtered = clients.filter(c => c.plan_type === category);
    }
    
    if(filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay clientes en esta categoría.</td></tr>';
    } else {
        filtered.forEach(c => {
            let isExpired = false;
            if(c.plan_type === 'Mensual' || c.plan_type === 'Personalizado') {
                const payDate = new Date(c.payment_date);
                isExpired = (now - payDate) / (1000 * 60 * 60 * 24) >= 30;
            }
            
            const pdate = new Date(c.payment_date).toLocaleDateString();
            const expBadge = isExpired ? '<span style="color: white; background: var(--danger-color); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 5px;">Vencido</span>' : '';
            
            tbody.innerHTML += `
                <tr style="${isExpired && category !== 'Vencidos' ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                    <td><strong>${c.name} ${c.surname}</strong></td>
                    <td>${c.age} años / ${c.weight} kg</td>
                    <td>${c.address} <br> <small style="color:var(--text-secondary)"><i class="fas fa-phone"></i> ${c.phone}</small></td>
                    <td>${c.plan_type}</td>
                    <td>${pdate} ${expBadge}</td>
                    <td class="action-btns">
                        <button class="btn-icon" onclick="editClient('${c.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        ${currentUser.role === 'Admin' ? `<button class="btn-icon" style="color: var(--danger-color)" onclick="deleteClient('${c.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
                    </td>
                </tr>
            `;
        });
    }
    
    container.style.display = 'block';
}

// Global actions for onclick
window.editItem = function(id) {
    const item = DB.InventoryDB.getById(id);
    if(!item) return;
    
    document.getElementById('item-id').value = item.id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-desc').value = item.description;
    document.getElementById('item-cost-price').value = item.cost_price || 0;
    document.getElementById('item-price').value = item.price;
    document.getElementById('item-qty').value = item.quantity;
    
    document.getElementById('modal-item-title').innerText = 'Editar Artículo';
    document.getElementById('modal-item-form').classList.add('active');
}

window.adjustStockForm = function(id) {
    const item = DB.InventoryDB.getById(id);
    if(!item) return;
    
    document.getElementById('stock-item-id').value = item.id;
    document.getElementById('stock-item-name').innerText = item.name;
    document.getElementById('stock-current').innerText = item.quantity;
    document.getElementById('stock-amount').value = '';
    
    document.getElementById('modal-stock-form').classList.add('active');
}

window.deleteItem = function(id) {
    if(confirm('¿Seguro que desea eliminar este artículo?')) {
        DB.InventoryDB.remove(id);
        renderInventory();
    }
}

window.deleteUser = function(id) {
    if(confirm('¿Seguro que desea eliminar este usuario?')) {
        DB.UserDB.remove(id);
        renderUsers();
    }
}

window.editClient = function(id) {
    const client = DB.ClientsDB.getById(id);
    if(!client) return;
    
    document.getElementById('client-id').value = client.id;
    document.getElementById('client-name').value = client.name;
    document.getElementById('client-surname').value = client.surname;
    document.getElementById('client-age').value = client.age;
    document.getElementById('client-weight').value = client.weight;
    document.getElementById('client-address').value = client.address;
    document.getElementById('client-phone').value = client.phone;
    document.getElementById('client-plan').value = client.plan_type;
    
    document.getElementById('modal-client-form').classList.add('active');
}

window.deleteClient = function(id) {
    if(confirm('¿Seguro que desea eliminar este cliente?')) {
        DB.ClientsDB.remove(id);
        renderClients();
        document.getElementById('clients-list-container').style.display='none';
    }
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
}

// Data Export & Import
const btnExport = document.getElementById('btn-export-data');
if(btnExport) {
    btnExport.addEventListener('click', () => {
        const data = {
            users: localStorage.getItem('gym_users'),
            inventory: localStorage.getItem('gym_inventory'),
            transactions: localStorage.getItem('gym_transactions'),
            sales: localStorage.getItem('gym_sales'),
            clients: localStorage.getItem('gym_clients')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `respaldo_gimnasio_${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

const fileImport = document.getElementById('import-data-file');
if(fileImport) {
    fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if(!file) return;
        
        if(!confirm('¿Estás seguro de que deseas importar estos datos? ADVERTENCIA: Se borrarán todos los datos actuales del sistema y se reemplazarán por los del archivo.')) {
            e.target.value = ''; // reset hidden input
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const importedData = JSON.parse(event.target.result);
                // Ensure it looks like a valid backup by checking for users
                if(importedData.users) {
                    const processArray = (arrStr, collName) => {
                        const arr = typeof arrStr === 'string' ? JSON.parse(arrStr) : arrStr;
                        if(Array.isArray(arr)) {
                            arr.forEach(obj => firebase.firestore().collection(collName).doc(obj.id).set(obj));
                        }
                    };
                    
                    processArray(importedData.users, 'gym_users');
                    processArray(importedData.inventory, 'gym_inventory');
                    processArray(importedData.transactions, 'gym_transactions');
                    processArray(importedData.sales, 'gym_sales');
                    processArray(importedData.clients, 'gym_clients');
                    
                    alert('Datos importados a la Nube correctamente. Podría tomar unos segundos en aparecer.');
                    window.location.reload();
                } else {
                    alert('El archivo no parece ser un respaldo válido del programa.');
                }
            } catch(error) {
                alert('Hubo un error al leer el archivo. Verifica que sea el .json correcto.');
            }
        };
        reader.readAsText(file);
    });
}
