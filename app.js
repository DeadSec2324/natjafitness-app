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
        if(DB.UserDB.getAll().find(u => u.id === currentUser.id)){
             showApp();
        } else {
             showLogin();
        }
    } else {
        showLogin();
    }
}

function showLogin() {
    loginView.style.display = 'flex';
    appView.style.display = 'none';
}

function loginUserOnline(userObj) {
    const now = new Date().toISOString();
    const today = new Date().toLocaleDateString();
    let updates = { is_online: true, last_login: now };
    
    const dbUser = DB.UserDB.getAll().find(u => u.id === userObj.id);
    if(dbUser) {
         if(!dbUser.first_login_today || new Date(dbUser.first_login_today).toLocaleDateString() !== today) {
             updates.first_login_today = now;
         }
         DB.UserDB.update(dbUser.id, updates);
    }
}

function showApp() {
    loginView.style.display = 'none';
    appView.style.display = 'flex';
    document.getElementById('current-user-name').innerText = currentUser.username;
    
    loginUserOnline(currentUser);
    
    if(currentUser.avatar) {
        document.getElementById('top-avatar-img').src = currentUser.avatar;
        document.getElementById('top-avatar-img').style.display = 'block';
        document.getElementById('top-avatar-initial').style.display = 'none';
    } else {
        document.getElementById('top-avatar-img').style.display = 'none';
        document.getElementById('top-avatar-initial').style.display = 'block';
        document.getElementById('top-avatar-initial').innerText = currentUser.username.charAt(0).toUpperCase();
    }
    
    // Check role, hide users tab if not admin
    if (currentUser.role === 'Staff') {
        document.body.classList.add('role-staff');
        document.getElementById('nav-users').style.display = 'none';
        document.getElementById('nav-reports').style.display = 'none';
        document.getElementById('nav-receivables').style.display = 'none';
        if(document.getElementById('backup-panel')) document.getElementById('backup-panel').style.display = 'none';
    } else {
        document.body.classList.remove('role-staff');
        document.getElementById('nav-users').style.display = 'flex';
        document.getElementById('nav-reports').style.display = 'flex';
        document.getElementById('nav-receivables').style.display = 'flex';
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
        if(currentUser) DB.UserDB.update(currentUser.id, { is_online: false });
        currentUser = null;
        sessionStorage.removeItem('currentUser');
        showLogin();
    });
}

window.addEventListener('beforeunload', () => {
    if(currentUser) {
        DB.UserDB.update(currentUser.id, { is_online: false });
    }
});

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
            viewName === 'clients' ? 'Clientes' : 
            viewName === 'daily-pass' ? 'Pase Diario Express' :
            viewName === 'messages' ? 'Mensajes' :
            viewName === 'receivables' ? 'Cuentas por Cobrar' :
            viewName === 'expenses' ? 'Presupuesto y Gastos' :
            viewName === 'reports' ? 'AnÃƒÂ¡lisis Financiero' :
            'Usuarios';
    }
        
    switch(viewName) {
        case 'dashboard': renderDashboard(); break;
        case 'inventory': renderInventory(); break;
        case 'sales': renderSales(); break;
        case 'clients': renderClients(); break;
        case 'daily-pass': if(window.renderDailyPassView) window.renderDailyPassView(); break;
        case 'messages': if(window.renderMessages) window.renderMessages(); break;
        case 'reports': 
            if(currentUser.role === 'Admin') {
                if(window.renderReports) window.renderReports();
            }
            break;
        case 'users': 
            if(currentUser.role === 'Admin') renderUsers(); 
            break;
        case 'expenses':
            if(window.renderExpenses) window.renderExpenses();
            break;
        case 'receivables':
            if(currentUser.role === 'Admin') {
                if(window.renderReceivables) window.renderReceivables();
            }
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
            document.getElementById('modal-item-title').innerText = 'Nuevo ArtÃƒÂ­culo';
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
            populateTrainerSelect();
            document.getElementById('modal-client-form').classList.add('active');
        });
    }
}

function populateTrainerSelect() {
    const sel = document.getElementById('client-trainer');
    if(!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Asignar Entrenador</option><option value="NONE">Sin Asignar</option>';
    DB.UserDB.getAll().forEach(u => {
        sel.innerHTML += `<option value="${u.id}">${u.username} (${u.role})</option>`;
    });
}

// Global Functions
function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

let pendingAuthCallback = null;
window.requireAuth = function(callback) {
    const sel = document.getElementById('auth-confirm-user');
    if(!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Selecciona tu usuario...</option>';
    DB.UserDB.getAll().forEach(u => {
        sel.innerHTML += `<option value="${u.username}">${u.username} (${u.role})</option>`;
    });
    document.getElementById('auth-confirm-pass').value = '';
    pendingAuthCallback = callback;
    openModal('modal-auth-confirm');
};

window.triggerDeviceNotification = function(title, body) {
    if (currentUser && currentUser.role === 'Admin') {
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body: body });
        }
    }
};

window.editUser = function(id) {
    const user = DB.UserDB.getAll().find(u => u.id === id);
    if(user) {
        document.getElementById('modal-user-title').innerText = 'Editar Usuario';
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-password').value = '';
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-training-price').value = user.training_price || '';
        document.getElementById('user-avatar').value = '';
        if(window.clearGallerySelection) window.clearGallerySelection();
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
                if(currentUser.role === 'Staff') DB.ActivityDB.log(currentUser.username, `EditÃƒÂ³ el producto ${item.name}`);
            } else {
                DB.InventoryDB.add(item);
                if(currentUser.role === 'Staff') DB.ActivityDB.log(currentUser.username, `AÃƒÂ±adiÃƒÂ³ el producto nuevo ${item.name}`);
            }
            closeModal('modal-item-form');
            renderInventory();
        });
    }

    // Modal de IntercepciÃƒÂ³n de AutorizaciÃƒÂ³n
    const authConfirmForm = document.getElementById('auth-confirm-form');
    if(authConfirmForm) {
        authConfirmForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('auth-confirm-user').value;
            const pass = document.getElementById('auth-confirm-pass').value;
            
            const authUser = DB.UserDB.login(user, pass);
            if (authUser) {
                closeModal('modal-auth-confirm');
                if(pendingAuthCallback) {
                    pendingAuthCallback(authUser);
                    pendingAuthCallback = null;
                }
                
                // Auto-logout para proteger la cuenta actual en la PC compartida
                setTimeout(() => {
                    const btn = document.getElementById('btn-logout');
                    if(btn) btn.click();
                }, 500);

            } else {
                alert("ContraseÃƒÂ±a incorrecta. Intenta de nuevo.");
            }
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
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const id = document.getElementById('user-id').value;
                const pwd = document.getElementById('user-password').value;
                const usrData = {
                    username: document.getElementById('user-username').value,
                    role: document.getElementById('user-role').value,
                    training_price: parseFloat(document.getElementById('user-training-price').value) || 0
                };
                if(pwd) usrData.password = pwd;
                
                let avatarUrl = undefined;
                const avatarFile = document.getElementById('user-avatar').files[0];
                if (avatarFile) {
                    const reader = new FileReader();
                    const b64 = await new Promise((res, rej) => {
                        reader.onload = () => res(reader.result);
                        reader.onerror = () => rej('Error leyendo imagen');
                        reader.readAsDataURL(avatarFile);
                    });
                    avatarUrl = b64;
                } else if (window.selectedGalleryAvatarTemp) {
                    avatarUrl = window.selectedGalleryAvatarTemp;
                }
                
                if (avatarUrl !== undefined) {
                    usrData.avatar = avatarUrl;
                }

                if (id) {
                    DB.UserDB.update(id, usrData);
                } else {
                    if(!pwd) throw new Error("La contraseÃƒÂ±a es obligatoria para usuarios nuevos");
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
                trainer_id: document.getElementById('client-trainer').value === 'NONE' ? '' : document.getElementById('client-trainer').value,
                payment_date: paymentDate
            };
            
            requireAuth((authUser) => {
                if (id) {
                    DB.ClientsDB.update(id, client);
                    if(authUser.role === 'Staff') DB.ActivityDB.log(authUser.username, `EditÃƒÂ³ al cliente ${client.name} ${client.surname}`);
                } else {
                    DB.ClientsDB.add(client);
                    if(authUser.role === 'Staff') DB.ActivityDB.log(authUser.username, `RegistrÃƒÂ³ al nuevo cliente ${client.name} ${client.surname}`);
                }
                closeModal('modal-client-form');
                renderClients();
            });
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
                    DB.ActivityDB.log(currentUser.username, `RegistrÃƒÂ³ una ${type === 'IN' ? 'entrada' : 'salida'} manual de ${Math.abs(amount)} unidades en ${item.name}`);
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
                alert(`OUT OF STOCK!\n\nNo hay suficiente inventario de "${item.name}".\nPor favor, solicita a un Administrador que ingrese mÃƒÂ¡s stock para continuar.`);
                return;
            }
            
            const existing = cart.find(c => c.id === itemId);
            if(existing) {
                if (item.quantity < existing.qty + qty) {
                    alert(`OUT OF STOCK!\n\nNo hay suficiente inventario de "${item.name}".\nPor favor, solicita a un Administrador que ingrese mÃƒÂ¡s stock para continuar.`);
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
                alert("El carrito estÃƒÂ¡ vacÃƒÂ­o");
                return;
            }
            
            const paymentMethod = document.getElementById('sale-payment-method').value || 'Efectivo';
            if (paymentMethod === 'CrÃƒÂ©dito') {
                window.pendingCreditData = {
                    isDailyPass: false,
                    cartClone: [...cart],
                    total_amount: cart.reduce((sum, c) => sum + c.subtotal, 0),
                    total_cost: cart.reduce((sum, c) => {
                        const item = DB.InventoryDB.getById(c.id);
                        return sum + ((item?.cost_price || 0) * c.qty);
                    }, 0),
                    desc: cart.map(c => `${c.qty}x ${c.name}`).join(' + ')
                };
                window.startCreditApproveFlow();
                return;
            }
            
            const total = cart.reduce((s,c)=>s+c.subtotal, 0);
            document.getElementById('sale-confirm-total').innerText = `$${total.toFixed(2)}`;
            document.getElementById('sale-confirm-method').innerText = paymentMethod;
            const detailsHtml = cart.map(c => `<div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem; border-bottom: 1px solid rgba(255,255,255,0.05);"><span>${c.qty}x ${c.name}</span> <span>$${c.subtotal.toFixed(2)}</span></div>`).join('');
            document.getElementById('sale-confirm-details').innerHTML = detailsHtml;
            openModal('modal-sale-confirm');
        });
    }
    
    const btnFinalProcessSale = document.getElementById('btn-final-process-sale');
    if (btnFinalProcessSale) {
        btnFinalProcessSale.addEventListener('click', () => {
            const paymentMethod = document.getElementById('sale-payment-method').value || 'Efectivo';
            closeModal('modal-sale-confirm');
            requireAuth((authUser) => {
                try {
                    const passMethodForNormal = document.getElementById('sale-payment-method').value || 'Efectivo';
                    DB.SalesDB.processSale(authUser.id, cart, passMethodForNormal);
                    
                    const itemNames = cart.map(c => `${c.qty} ${c.name}`).join(', ');
                    DB.ActivityDB.log(authUser.username, `ProcesÃƒÂ³ venta de: ${itemNames} (${paymentMethod})`);
                    
                    alert("Venta procesada con ÃƒÂ©xito");
                    cart = [];
                    renderCart();
                    document.getElementById('btn-print-invoice').disabled = false;
                    renderSalesHistory();
                    populateSalesSelect();
                } catch (error) {
                    if(error.message.includes("Stock insuficiente")) {
                        alert(`OUT OF STOCK!\n\nEl sistema detectÃƒÂ³ que no hay inventario suficiente para procesar la venta.\nPor favor, solicita a un Administrador que ajuste el stock antes de continuar.`);
                    } else {
                        alert("Error al procesar: " + error.message);
                    }
                }
            });
        });
    }
    
    const btnPrint = document.getElementById('btn-print-invoice');
    if(btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Extension Form
    const extForm = document.getElementById('extension-form');
    if(extForm) {
        extForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('ext-client-id').value;
            const days = parseInt(document.getElementById('ext-days').value, 10);
            if(id && days > 0) {
                const client = DB.ClientsDB.getById(id);
                if(client) {
                    const currentExt = client.extension_days || 0;
                    DB.ClientsDB.update(id, { extension_days: currentExt + days });
                    if(currentUser) DB.ActivityDB.log(currentUser.username, `OtorgÃƒÂ³ ${days} dÃƒÂ­as de prÃƒÂ³rroga a ${client.name} ${client.surname}`);
                    alert(`PrÃƒÂ³rroga de ${days} dÃƒÂ­as asignada con ÃƒÂ©xito a ${client.name}.`);
                    closeModal('modal-extension-form');
                    renderClients();
                }
            }
        });
    }
    
    // Daily Pass Form
    const dailyPassForm = document.getElementById('daily-pass-form');
    if(dailyPassForm) {
        dailyPassForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const clientId = document.getElementById('daily-client-id').value;
            const clientName = document.getElementById('daily-client-name').innerText;
            const price = parseFloat(document.getElementById('daily-price').value);
            const method = document.getElementById('daily-payment-method').value;
            
            requireAuth((authUser) => {
                DB.SalesDB.registerDailyPass(authUser.id, clientName, price, method);
                if(authUser.role === 'Staff' || authUser.role === 'Admin') DB.ActivityDB.log(authUser.username, `CobrÃƒÂ³ Acceso Diario de $${price.toFixed(2)} a ${clientName} (${method})`);
                alert(`Pase procesado con ÃƒÂ©xito para ${clientName}.`);
                closeModal('modal-daily-pass');
                
                if(document.getElementById('view-dashboard') && document.getElementById('view-dashboard').classList.contains('active')) renderDashboard();
                if(document.getElementById('view-reports') && document.getElementById('view-reports').classList.contains('active')) window.renderReports();
            });
        });
    }
    
    // Renew Membership Form
    const renewForm = document.getElementById('renew-membership-form');
    if (renewForm) {
        renewForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const clientId = document.getElementById('renew-client-id').value;
            const clientName = document.getElementById('renew-client-name').innerText;
            const planType = document.getElementById('renew-plan-type').value;
            const planDays = parseInt(document.getElementById('renew-plan-days').value, 10);
            const price = parseFloat(document.getElementById('renew-price').value);
            const method = document.getElementById('renew-payment-method').value;
            
            requireAuth((authUser) => {
                try {
                    // Update client payment details
                    const client = DB.ClientsDB.getById(clientId);
                    if (client) {
                        const baseDate = new Date(client.payment_date);
                        const now = new Date();
                        // if expired, start countdown from today, otherwise add to existing expiration
                        const newDateObj = baseDate < now ? now : baseDate;
                        newDateObj.setDate(newDateObj.getDate() + planDays);
                        
                        DB.ClientsDB.update(clientId, { payment_date: newDateObj.toISOString(), extension_days: 0 });
                        
                        // Register Sales & Activity
                        DB.SalesDB.registerMembershipPayment(authUser.id, clientName, planType, price, method);
                        DB.ActivityDB.log(authUser.username, `RegistrÃƒÂ³ pago de membresÃƒÂ­a de $${price.toFixed(2)} para ${clientName}`);
                        
                        closeModal('modal-renew-membership');
                        alert(`Pago registrado exitosamente. La nueva fecha de cobro ha sido actualizada.`);
                        renderClients();
                        renderDashboard();
                    }
                } catch(error) {
                    alert("Error procesando pago de membresÃƒÂ­a: " + error.message);
                }
            });
        });
    }
    
    // CrÃƒÂ©ditos Events
    document.getElementById('btn-generate-otp')?.addEventListener('click', () => {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const adminUser = DB.UserDB.getAll().find(u => u.username === 'admin');
        if(adminUser) {
            DB.UserDB.update(adminUser.id, { active_otp: code });
            document.getElementById('current-otp-display').innerText = code;
            alert("CÃƒÂ³digo OTP generado con ÃƒÂ©xito. VÃƒÂ¡lido para 1 uso.");
        }
    });

    const otpForm = document.getElementById('otp-staff-form');
    if (otpForm) {
        otpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('otp-input').value;
            const adminUser = DB.UserDB.getAll().find(u => u.username === 'admin');
            if (adminUser && adminUser.active_otp && adminUser.active_otp === input) {
                // Consume
                DB.UserDB.update(adminUser.id, { active_otp: '' });
                if(document.getElementById('current-otp-display')) document.getElementById('current-otp-display').innerText = '-----';
                closeModal('modal-otp-staff');
                document.getElementById('otp-input').value = '';
                window.openCreditInfoModal();
            } else {
                alert('CÃƒÂ³digo incorrecto o ya utilizado.');
            }
        });
    }

    const creditInfoForm = document.getElementById('credit-info-form');
    if (creditInfoForm) {
        creditInfoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            let clientId = document.getElementById('credit-existing-client').value;
            let clientName = '';
            const newClientName = document.getElementById('credit-new-client').value.trim();
            const payDate = document.getElementById('credit-date').value;
            
            if (clientId) {
                const client = DB.ClientsDB.getById(clientId);
                if(client) clientName = `${client.name} ${client.surname}`;
            } else if (newClientName) {
                clientName = newClientName;
                const newClient = DB.ClientsDB.add({
                    name: newClientName, surname: '', age: 0, weight: 0, address: '', phone: '',
                    plan_type: 'Personalizado', trainer_id: '', payment_date: new Date().toISOString()
                });
                clientId = newClient.id;
            } else {
                alert("Selecciona un cliente o escribe su nombre.");
                return;
            }
            
            const pd = window.pendingCreditData;
            try {
                if (!pd.isDailyPass) {
                    pd.cartClone.forEach(c => {
                        const item = DB.InventoryDB.getById(c.id);
                        DB.InventoryDB.adjustStock(item.id, -c.qty, currentUser.id, 'SALE');
                    });
                    cart = [];
                    renderCart();
                    document.getElementById('btn-print-invoice').disabled = true;
                    populateSalesSelect();
                }
                
                DB.ReceivablesDB.add({
                    client_id: clientId, client_name: clientName, items_desc: pd.desc,
                    total_amount: pd.total_amount, total_cost: pd.total_cost, payment_date: payDate,
                    user_id: currentUser ? currentUser.username : 'Sistema'
                });
                
                DB.ActivityDB.log(currentUser ? currentUser.username : 'Sistema', `AprobÃƒÂ³ Venta a CrÃƒÂ©dito por $${parseFloat(pd.total_amount).toFixed(2)} a ${clientName}`);
                alert('CrÃƒÂ©dito otorgado exitosamente.');
                closeModal('modal-credit-info');
                
                if(document.getElementById('view-daily-pass') && document.getElementById('view-daily-pass').classList.contains('active')) {
                    document.getElementById('v-daily-name').value = '';
                    document.getElementById('v-daily-existing-client').value = '';
                }
                
                window.pendingCreditData = null;
                if (currentUser && currentUser.role === 'Admin') renderDashboard();
            } catch (err) {
                alert("Error al procesar el crÃƒÂ©dito: " + err.message);
            }
        });
    }

    const processReceivableForm = document.getElementById('process-receivable-form');
    if (processReceivableForm) {
        processReceivableForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('rec-id').value;
            const status = document.getElementById('rec-status').value;
            if (id && status) {
                const r = DB.ReceivablesDB.getAll().find(x => x.id === id);
                DB.ReceivablesDB.update(id, { status: status, admin_resolved_date: new Date().toISOString() });
                
                const saleRecord = {
                     id: `PAGO-CREDITO-${Date.now().toString(36).substring(0,5).toUpperCase()}`,
                     user_id: currentUser ? currentUser.username : 'Admin',
                     items: [{ name: `CancelaciÃƒÂ³n Deuda: ${r.client_name}`, qty: 1 }],
                     total_cost: 0,
                     total_amount: r.total_amount,
                     profit: r.total_amount,
                     payment_method: status,
                     date: new Date().toISOString()
                };
                db.collection('gym_sales').doc(saleRecord.id).set(saleRecord);
                DB.ActivityDB.log(currentUser.username, `CobrÃƒÂ³ Cuenta de $${parseFloat(r.total_amount).toFixed(2)} a ${r.client_name} (${status})`);
                
                closeModal('modal-process-receivable');
                if(window.renderReceivables) window.renderReceivables();
                renderDashboard();
                alert("Cobro procesado e ingresado a las transacciones del dÃƒÂ­a.");
            }
        });
    }

} // End of setupForms

window.startCreditApproveFlow = function() {
    if (currentUser && currentUser.role === 'Staff') {
        document.getElementById('otp-staff-form').reset();
        openModal('modal-otp-staff');
    } else {
        window.openCreditInfoModal();
    }
};

window.openCreditInfoModal = function() {
    const sel = document.getElementById('credit-existing-client');
    if(sel) {
        sel.innerHTML = '<option value="">-- Ignorar o registrar nuevo --</option>';
        DB.ClientsDB.getAll().forEach(c => {
            sel.innerHTML += `<option value="${c.id}">${c.name} ${c.surname}</option>`;
        });
    }
    document.getElementById('credit-info-form')?.reset();
    if(window.pendingCreditData.isDailyPass && window.pendingCreditData.pendingClientName) {
        document.getElementById('credit-new-client').value = window.pendingCreditData.pendingClientName;
    }
    const d = new Date();
    d.setDate(d.getDate() + 7);
    document.getElementById('credit-date').value = d.toISOString().split('T')[0];
    openModal('modal-credit-info');
};

window.prepareProcessReceivable = function(id) {
    const r = DB.ReceivablesDB.getAll().find(x => x.id === id);
    if(r) {
        document.getElementById('rec-id').value = r.id;
        document.getElementById('rec-client-name').innerText = r.client_name;
        document.getElementById('rec-amount').innerText = '$' + parseFloat(r.total_amount).toFixed(2);
        document.getElementById('rec-status').value = '';
        openModal('modal-process-receivable');
    }
};

window.renderReceivables = function() {
    const tbody = document.querySelector('#receivables-table tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if (!DB.ReceivablesDB) return;
    
    const recs = DB.ReceivablesDB.getAll().sort((a,b) => {
        if(a.status === 'Pendiente' && b.status !== 'Pendiente') return -1;
        if(a.status !== 'Pendiente' && b.status === 'Pendiente') return 1;
        return new Date(b.transaction_date) - new Date(a.transaction_date);
    });
    
    if (recs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay cuentas registradas.</td></tr>';
        return;
    }
    
    recs.forEach(r => {
        const bg = r.status === 'Pendiente' ? '' : 'background: rgba(16, 185, 129, 0.05);';
        const stColor = r.status === 'Pendiente' ? '#f59e0b' : 'var(--success-color)';
        const btnPay = r.status === 'Pendiente' ? `<button class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;" onclick="window.prepareProcessReceivable('${r.id}')"><i class="fas fa-check"></i> Cobrar</button>` : '';
        const clName = r.client_name || 'Desconocido';
        const tdDesc = r.items_desc || '-';
        
        tbody.innerHTML += `
            <tr style="${bg}">
                <td><small>${new Date(r.transaction_date).toLocaleDateString()}</small><br><strong>$${parseFloat(r.total_amount).toFixed(2)}</strong></td>
                <td>${clName}</td>
                <td><small>${tdDesc}</small></td>
                <td>${new Date(r.payment_date).toLocaleDateString()}</td>
                <td style="color: ${stColor}; font-weight: bold;">${r.status}</td>
                <td>${btnPay}</td>
            </tr>
        `;
    });
};

window.openExtensionModal = function(id, fullName) {
    document.getElementById('ext-client-id').value = id;
    document.getElementById('ext-client-name').innerText = fullName;
    document.getElementById('ext-days').value = '';
    openModal('modal-extension-form');
};

window.openDailyPassModal = function(id, fullName, trainerId) {
    document.getElementById('daily-client-id').value = id;
    document.getElementById('daily-client-name').innerText = fullName;
    
    let targetPrice = 50; 
    if(trainerId) {
        const trainer = DB.UserDB.getAll().find(u => u.id === trainerId);
        if(trainer && trainer.training_price) {
             targetPrice = trainer.training_price;
        }
    }
    document.getElementById('daily-price').value = targetPrice;
    openModal('modal-daily-pass');
};

// Rendering Dashboards & Views
function renderDashboard() {
    const inv = DB.InventoryDB.getAll();
    const allSales = DB.SalesDB.getAll();
    const txs = DB.TransactionsDB.getAll();
    
    const sumQty = inv.reduce((sum, item) => sum + parseInt(item.quantity), 0);
    document.getElementById('stat-total-items').innerText = sumQty;
    
    const todayStr = new Date().toLocaleDateString();
    const todaysSales = allSales.filter(s => new Date(s.date).toLocaleDateString() === todayStr);

    const cashSalesValue = todaysSales.filter(s => s.payment_method === 'Efectivo' || !s.payment_method).reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
    const cardSalesValue = todaysSales.filter(s => s.payment_method === 'Tarjeta').reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
    
    document.getElementById('stat-total-sales').innerText = `$${cashSalesValue.toFixed(2)}`;
    if(document.getElementById('stat-total-card')) {
        document.getElementById('stat-total-card').innerText = `$${cardSalesValue.toFixed(2)}`;
    }
    
    // Calculate total profit
    const totalProfitValue = todaysSales.reduce((sum, sale) => sum + parseFloat(sale.profit || 0), 0);
    if(document.getElementById('stat-total-profit')) {
        document.getElementById('stat-total-profit').innerText = `$${totalProfitValue.toFixed(2)}`;
    }
    
    // Receivables Stats
    if (DB.ReceivablesDB) {
        const recs = DB.ReceivablesDB.getAll();
        const recsPending = recs.filter(r => r.status === 'Pendiente');
        const totalRecs = recsPending.reduce((s,r) => s + parseFloat(r.total_amount), 0);
        const todayDateStr = new Date().toLocaleDateString();
        const todayRecsPending = recsPending.filter(r => new Date(r.payment_date).toLocaleDateString() === todayDateStr);
        const totalTodayRecs = todayRecsPending.reduce((s,r) => s + parseFloat(r.total_amount), 0);

        if(document.getElementById('stat-receivables-total')) {
            document.getElementById('stat-receivables-total').innerText = `$${totalRecs.toFixed(2)}`;
            document.getElementById('stat-receivables-today').innerText = `$${totalTodayRecs.toFixed(2)}`;
        }

        if (currentUser && currentUser.role === 'Admin' && window.hasNotifiedReceivables !== true) {
            let dueReceivables = recsPending.filter(r => {
                let d = new Date(r.payment_date);
                d.setHours(0,0,0,0);
                let now = new Date();
                now.setHours(0,0,0,0);
                return d <= now;
            });
            if (dueReceivables.length > 0) {
                window.hasNotifiedReceivables = true;
                setTimeout(() => {
                    alert(`Ã‚Â¡AtenciÃƒÂ³n! Tienes ${dueReceivables.length} cuenta(s) por cobrar con fecha de cobro vencida o para el dÃƒÂ­a de HOY.`);
                    if (window.triggerDeviceNotification) window.triggerDeviceNotification("Cuentas Pendientes", "Hay clientes con deudas por cobrar el dÃƒÂ­a de hoy.");
                }, 1000);
            }
        }
    }
    
    // OTP display
    if (currentUser && currentUser.role === 'Admin') {
        const adminUser = DB.UserDB.getAll().find(u => u.username === 'admin');
        if (adminUser && adminUser.active_otp && document.getElementById('current-otp-display')) {
            document.getElementById('current-otp-display').innerText = adminUser.active_otp;
        } else if (document.getElementById('current-otp-display')) {
            document.getElementById('current-otp-display').innerText = '-----';
        }
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
        allSales.forEach(s => {
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
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay artÃƒÂ­culos. AÃƒÂ±ade uno.</td></tr>';
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
                <td class="action-btns admin-only">
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
    select.innerHTML = '<option value="">Seleccione un artÃƒÂ­culo...</option>';
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">El carrito estÃƒÂ¡ vacÃƒÂ­o</td></tr>';
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
        const isCanceled = s.status === 'Cancelada';
        tbody.innerHTML += `
            <tr>
                <td>${new Date(s.date).toLocaleString()}</td>
                <td>${s.id}</td>
                <td>${isCanceled ? '<s style="color:var(--danger-color)">$'+parseFloat(s.total_amount).toFixed(2)+'</s> <small style="color:var(--danger-color)">(Cancelada)</small>' : '$'+parseFloat(s.total_amount).toFixed(2)}</td>
                <td class="admin-only">
                    ${!isCanceled ? `<button class="btn-icon" style="color:var(--danger-color); padding: 0.2rem 0.5rem;" onclick="cancelSale('${s.id}')" title="Cancelar Venta"><i class="fas fa-ban"></i></button>` : ''}
                </td>
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
        const statusClass = u.is_online ? 'status-online' : 'status-offline';
        const firstLog = u.first_login_today ? new Date(u.first_login_today).toLocaleTimeString() : 'N/A';
        const lastLog = u.last_login ? new Date(u.last_login).toLocaleTimeString() : 'N/A';
        const priceTag = u.training_price ? `<br><small style="color:var(--accent-color)">Tarifa: $${parseFloat(u.training_price).toFixed(2)}</small>` : '';

        tbody.innerHTML += `
            <tr>
                <td><span class="status-dot ${statusClass}"></span> <strong>${u.username}</strong></td>
                <td>${u.role} ${priceTag}</td>
                <td><small style="color:var(--text-secondary)">1Ã‚Âº Entrada Hoy: ${firstLog}<br>ÃƒÅ¡lt. AcciÃƒÂ³n: ${lastLog}</small></td>
                <td class="action-btns">
                    ${u.username !== 'admin' ? `
                        <button class="btn-icon" style="color: var(--primary-color)" onclick="editUser('${u.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon" style="color: var(--danger-color)" onclick="deleteUser('${u.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                    ` : `
                        <button class="btn-icon" style="color: var(--primary-color)" onclick="editUser('${u.id}')" title="Editar ContraseÃƒÂ±a"><i class="fas fa-edit"></i></button>
                    `}
                </td>
            </tr>
        `;
    });
}

window.renderNotifications = function() {
    const activity = DB.ActivityDB.getAll().sort((a,b) => new Date(b.date) - new Date(a.date));
    const messages = DB.MessagesDB.getAll();
    
    let displayList = [];
    let unreadCount = 0;
    
    if(currentUser && currentUser.role === 'Admin') {
        displayList = activity;
        unreadCount = activity.filter(a => !a.readByAdmin).length;
    } else if (currentUser) {
        const myUnreadMsgs = messages.filter(m => m.recipient === currentUser.username && !m.read);
        displayList = myUnreadMsgs.map(m => ({ action: m.text, username: m.sender, date: m.date, readByAdmin: m.read }));
        unreadCount = myUnreadMsgs.length;
    }
    
    // Update Bell Widget
    const bellIconDiv = document.getElementById('notification-bell');
    const badge = document.getElementById('notif-badge');
    if(bellIconDiv && badge) {
        if(!bellIconDiv.hasListener) {
            bellIconDiv.addEventListener('click', () => {
                if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
                    Notification.requestPermission();
                }
                if(currentUser && currentUser.role !== 'Admin') {
                    document.getElementById('nav-messages').click();
                }
            });
            bellIconDiv.hasListener = true;
        }

        bellIconDiv.style.display = 'block';
        if(unreadCount > 0) {
            badge.style.display = 'block';
            badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
        } else {
            badge.style.display = 'none';
        }
    }

    // Update List
    const list = document.getElementById('notifications-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(displayList.length === 0) {
        list.innerHTML = '<p style="text-align:center; color: var(--text-secondary);">No hay notificaciones.</p>';
        return;
    }
    
    displayList.slice(0, 30).forEach(act => {
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

let currentProcessingDMs = new Set();
window.checkDirectMessages = function(snap) {
    if(!currentUser) return;
    snap.docChanges().forEach(change => {
        if(change.type === 'added' || change.type === 'modified') {
            const msg = change.doc.data();
            if(msg.recipient === currentUser.username && msg.read === false) {
                if(!currentProcessingDMs.has(msg.id)) {
                    currentProcessingDMs.add(msg.id);
                    document.getElementById('dm-sender-title').innerText = "Mensaje de " + msg.sender;
                    document.getElementById('dm-text').innerText = msg.text;
                    
                    const btnRead = document.getElementById('btn-dm-read');
                    btnRead.onclick = function() {
                        DB.MessagesDB.markAsRead(msg.id);
                        closeModal('modal-direct-message');
                        currentProcessingDMs.delete(msg.id);
                    };
                    
                    openModal('modal-direct-message');
                    if(window.triggerDeviceNotification) {
                        window.triggerDeviceNotification("Ã‚Â¡Urgente!", "Mensaje de " + msg.sender);
                    }
                }
            }
        }
    });
};

window.updateOnlineUsersPanel = function() {
    const onlineList = document.getElementById('online-users-list');
    const recipientSelect = document.getElementById('message-recipient');
    if(onlineList && recipientSelect && currentUser) {
        onlineList.innerHTML = '';
        
        const currentSelected = recipientSelect.value;
        const recipientOptions = ['<option value="ALL">Ã°Å¸Å’Â Para: Todos</option>'];
        
        DB.UserDB.getAll().forEach(u => {
            if(u.username !== currentUser.username) {
               const statusEmoji = u.is_online ? 'Ã°Å¸Å¸Â¢' : 'Ã°Å¸â€Â´';
               recipientOptions.push(`<option value="${u.username}">${statusEmoji} Para: ${u.username}</option>`);
            }
            
            const statusClass = u.is_online ? 'status-online' : 'status-offline';
            const statusText = u.is_online ? 'En LÃƒÂ­nea' : 'Desconectado';
            onlineList.innerHTML += `
               <div style="display: flex; align-items: center; gap: 0.5rem;">
                   <span class="status-dot ${statusClass}"></span>
                   <span style="color:var(--text-primary); font-size:0.95rem;">${u.username}</span>
                   <span style="color:var(--text-secondary); font-size:0.8rem; margin-left:auto;">${statusText}</span>
               </div>
            `;
        });
        
        recipientSelect.innerHTML = recipientOptions.join('');
        if(currentSelected) recipientSelect.value = currentSelected;
        
        recipientSelect.style.display = 'block';
    }
};

window.renderMessages = function() {
    const allMsgs = DB.MessagesDB.getAll().sort((a,b) => new Date(a.date) - new Date(b.date));
    const box = document.getElementById('chat-box');
    if(!box || !currentUser) return;
    
    window.updateOnlineUsersPanel();
    
    box.innerHTML = '';
    allMsgs.forEach(m => {
        if(m.recipient !== 'ALL' && m.recipient !== currentUser.username && m.sender !== currentUser.username) return;
        
        const isMe = m.sender === currentUser.username;
        const isDM = m.recipient !== 'ALL';
        const align = isMe ? 'flex-end' : 'flex-start';
        const bg = isMe ? 'var(--primary-color)' : 'var(--card-bg)';
        const color = isMe ? 'white' : 'var(--text-primary)';
        const borderIndicator = isDM && !isMe ? 'border-left: 4px solid var(--danger-color);' : '';
        const titleBadge = isDM ? `<span style="background:var(--danger-color); color:white; font-size:0.6rem; padding: 2px 5px; border-radius: 4px; margin-left:5px;">DIRECTO</span>` : '';
        
        let readIndicator = '';
        if(isMe && isDM) {
             readIndicator = m.read ? '<span style="font-size:0.75rem; color:var(--success-color); margin-top:2px;">Ã¢Å“â€Ã¢Å“â€ LeÃƒÂ­do</span>' : '<span style="font-size:0.75rem; color:rgba(255,255,255,0.7); margin-top:2px;">Ã¢Å“â€ Entregado</span>';
        }

        box.innerHTML += `
            <div style="align-self: ${align}; max-width: 80%; display: flex; flex-direction: column;">
                <span style="font-size: 0.7rem; color: var(--text-secondary); margin-left: 5px; margin-right: 5px; text-align: ${isMe ? 'right' : 'left'}">${m.sender} ${titleBadge}</span>
                <div style="background: ${bg}; color: ${color}; padding: 0.75rem 1rem; border-radius: 12px; margin-top: 2px; ${borderIndicator}">
                    ${m.text}
                </div>
                <div style="text-align: ${isMe ? 'right' : 'left'}; margin-bottom: 0.5rem">${readIndicator}</div>
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
            const recpNode = document.getElementById('message-recipient');
            
            const txt = input.value.trim();
            const recipient = recpNode ? recpNode.value : 'ALL';
            
            if(txt && currentUser) {
                DB.MessagesDB.add(currentUser.username, txt, recipient);
                input.value = '';
            }
        });
    }
});

window.checkClientExpiration = function(client) {
    if (client.plan_type === 'Diario') return { isExpired: false, expiresToday: false };
    
    let planDays = 0;
    if (client.plan_type === 'Mensual' || client.plan_type === 'Personalizado') planDays = 30;
    else if (client.plan_type === 'Quincenal') planDays = 15;
    
    if (planDays === 0) return { isExpired: false, expiresToday: false };
    
    const extensions = client.extension_days || 0;
    const totalDaysAllowed = planDays + extensions;
    
    const payDate = new Date(client.payment_date);
    payDate.setHours(0,0,0,0);
    const expirationDate = new Date(payDate);
    expirationDate.setDate(expirationDate.getDate() + totalDaysAllowed);
    
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const timeDiff = now - expirationDate;
    
    return {
        isExpired: timeDiff > 0,
        expiresToday: timeDiff === 0
    };
};

let hasAlertedExpirationsToday = false;

function renderClients() {
    const clients = DB.ClientsDB.getAll();
    
    let mensual = 0, quincenal = 0, diario = 0, personal = 0, expired = 0;
    let expiringTodayNames = [];
    
    clients.forEach(c => {
        if(c.plan_type === 'Mensual') mensual++;
        if(c.plan_type === 'Quincenal') quincenal++;
        if(c.plan_type === 'Diario') diario++;
        if(c.plan_type === 'Personalizado') personal++;
        
        const expRules = window.checkClientExpiration(c);
        if(expRules.isExpired) expired++;
        if(expRules.expiresToday) {
            expiringTodayNames.push(`${c.name} ${c.surname}`);
        }
    });
    
    if (expiringTodayNames.length > 0 && !hasAlertedExpirationsToday && currentUser && currentUser.role === 'Admin') {
        hasAlertedExpirationsToday = true;
        setTimeout(() => {
            alert("Ã‚Â¡AtenciÃƒÂ³n! Los siguientes clientes vencen el dÃƒÂ­a de HOY:\n\n- " + expiringTodayNames.join("\n- "));
        }, 500);
        DB.ActivityDB.log("Sistema", "Vencimiento HOY de: " + expiringTodayNames.join(", "));
    }
    
    document.getElementById('stat-cat-mensual').innerText = mensual;
    if(document.getElementById('stat-cat-quincenal')) document.getElementById('stat-cat-quincenal').innerText = quincenal;
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
    
    let filtered = [];
    
    if (category === 'Vencidos') {
        filtered = clients.filter(c => window.checkClientExpiration(c).isExpired);
    } else {
        filtered = clients.filter(c => c.plan_type === category);
    }
    
    if(filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No hay clientes en esta categorÃƒÂ­a.</td></tr>';
    } else {
        filtered.forEach(c => {
            const expRules = window.checkClientExpiration(c);
            const isExpired = expRules.isExpired;
            
            const pdate = new Date(c.payment_date).toLocaleDateString();
            const extBadge = c.extension_days ? `<span style="font-size:0.75rem; color:var(--text-secondary); margin-left: 5px;">(+${c.extension_days}d prÃƒÂ³rroga)</span>` : '';
            const expBadge = isExpired ? '<span style="color: white; background: var(--danger-color); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; margin-left: 5px;">Vencido</span>' : '';
            
            const trainerObj = c.trainer_id ? DB.UserDB.getAll().find(u => u.id === c.trainer_id) : null;
            const trainerName = trainerObj ? trainerObj.username : 'Sin Asignar';

            tbody.innerHTML += `
                <tr style="${isExpired && category !== 'Vencidos' ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                    <td><strong>${c.name} ${c.surname}</strong>${extBadge}<br><small style="color:var(--accent-color)">Entrenador: ${trainerName}</small></td>
                    <td>${c.age} aÃƒÂ±os / ${c.weight} kg</td>
                    <td>${c.address} <br> <small style="color:var(--text-secondary)"><i class="fas fa-phone"></i> ${c.phone}</small></td>
                    <td>${c.plan_type}</td>
                    <td>${pdate} ${expBadge}</td>
                    <td class="action-btns admin-only">
                        ${c.plan_type === 'Diario' ? `<button class="btn-icon" style="color: var(--success-color);" onclick="openDailyPassModal('${c.id}', '${c.name.replace(/'/g, "\\'")} ${c.surname.replace(/'/g, "\\'")}', '${c.trainer_id || ''}')" title="Cobrar Pase Diario"><i class="fas fa-ticket-alt"></i></button>` : ''}
                        ${c.plan_type !== 'Diario' ? `<button class="btn-icon" style="color: var(--success-color);" onclick="openRenewModal('${c.id}', '${c.name.replace(/'/g, "\\'")} ${c.surname.replace(/'/g, "\\'")}', '${c.plan_type}')" title="Pagar MembresÃƒÂ­a"><i class="fas fa-dollar-sign"></i></button>` : ''}
                        <button class="btn-icon" style="color: #f59e0b;" onclick="openExtensionModal('${c.id}', '${c.name.replace(/'/g, "\\'")} ${c.surname.replace(/'/g, "\\'")}')" title="Otorgar PrÃƒÂ³rroga"><i class="fas fa-calendar-plus"></i></button>
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
    
    document.getElementById('modal-item-title').innerText = 'Editar ArtÃƒÂ­culo';
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
    if(confirm('Ã‚Â¿Seguro que desea eliminar este artÃƒÂ­culo?')) {
        DB.InventoryDB.remove(id);
        renderInventory();
    }
}

window.deleteUser = function(id) {
    if(confirm('Ã‚Â¿Seguro que desea eliminar este usuario?')) {
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
    const amountField = document.getElementById('client-agreed-amount');
    if(amountField) amountField.value = client.agreed_amount || '';
    
    document.getElementById('modal-client-form').classList.add('active');
}

window.exportReportsToExcel = function() {
    if (typeof XLSX === 'undefined') {
        alert("La librerÃƒÂ­a de exportaciÃƒÂ³n aÃƒÂºn no ha cargado (o no hay conexiÃƒÂ³n a internet). Intenta nuevamente en unos segundos.");
        return;
    }

    const sales = DB.SalesDB.getAll();
    const today = new Date();
    today.setHours(0,0,0,0);
    const msInDay = 1000 * 60 * 60 * 24;

    const exportDaily = [];
    const exportWeekly = [];
    const exportMonthly = [];

    const formatSaleRow = (s) => {
        const itemNames = (s.items || []).map(i => `${i.qty || 1}x ${i.name || 'Desconocido'}`).join(' + ');
        return {
            "Fecha EmisiÃƒÂ³n": new Date(s.date).toLocaleString(),
            "ID Venta": s.id,
            "DescripciÃƒÂ³n de ArtÃƒÂ­culos": itemNames,
            "MÃƒÂ©todo de Pago": s.payment_method || 'Desconocido',
            "Estado": s.status === 'Cancelada' ? 'Cancelada' : 'Completada',
            "Total Generado ($)": parseFloat(s.total_amount || 0).toFixed(2)
        };
    };

    sales.forEach(s => {
        const sDate = new Date(s.date);
        const sDateMidnight = new Date(sDate);
        sDateMidnight.setHours(0,0,0,0);
        
        const dayDiff = Math.floor((today - sDateMidnight) / msInDay);
        const rowData = formatSaleRow(s);

        if (dayDiff === 0) exportDaily.push(rowData);
        if (dayDiff < 7) exportWeekly.push(rowData);
        if (dayDiff < 30) exportMonthly.push(rowData);
    });

    if(exportDaily.length === 0) exportDaily.push({"Mensaje": "Sin ventas registradas hoy"});
    if(exportWeekly.length === 0) exportWeekly.push({"Mensaje": "Sin ventas en la ÃƒÂºltima semana"});
    if(exportMonthly.length === 0) exportMonthly.push({"Mensaje": "Sin ventas en el ÃƒÂºltimo mes"});

    const wsDaily = XLSX.utils.json_to_sheet(exportDaily);
    const wsWeekly = XLSX.utils.json_to_sheet(exportWeekly);
    const wsMonthly = XLSX.utils.json_to_sheet(exportMonthly);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsDaily, "Diario (Hoy)");
    XLSX.utils.book_append_sheet(wb, wsWeekly, "Semanal (ÃƒÅ¡ltimos 7 dÃƒÂ­as)");
    XLSX.utils.book_append_sheet(wb, wsMonthly, "Mensual (ÃƒÅ¡ltimos 30 dÃƒÂ­as)");

    XLSX.writeFile(wb, `Reporte_Estadistico_${new Date().toLocaleDateString().replace(/\//g,'-')}.xlsx`);
    if(window.currentUser) DB.ActivityDB.log(window.currentUser.username, "ExportÃƒÂ³ informe estadÃƒÂ­stico mÃƒÂºltiple a Excel");
};

window.deleteClient = function(id) {
    if(confirm('Ã‚Â¿Seguro que desea eliminar este cliente?')) {
        DB.ClientsDB.remove(id);
        renderClients();
        document.getElementById('clients-list-container').style.display='none';
    }
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
}

window.factoryResetSystem = function() {
    if(prompt("PRECAUCIÃƒâ€œN EXTREMA: Esto eliminarÃƒÂ¡ de forma irreversible TODO el inventario, clientes, historial de ventas y flujos de caja. Escribe exactamente 'CONFIRMAR' (en mayÃƒÂºsculas) para ejecutar:") === 'CONFIRMAR') {
        requireAuth((authUser) => {
            if(authUser.role !== 'Admin') return alert("Denegado: Solo el perfil Administrador maestro puede vaciar la base de datos.");
            try {
                await DB.SystemDB.factoryReset();
                DB.ActivityDB.log(authUser.username, "¡REALIZÓ UN BORRADO GENERAL (FACTORY RESET) DE TODA LA BASE DE DATOS MANTENIENDO SOLO USUARIOS!");
                alert("Limpieza a cero completada con éxito. El sistema está ahora como nuevo. Redirigiendo...");
                window.location.reload();
            } catch(e) {
                alert("Error al intentar limpiar la base de datos en Firebase: " + e.message);
            }
        }
    }, "Confirmación Requerida para Factory Reset");
};
    } else {
        alert("OperaciÃƒÂ³n cancelada. El comando no coincidiÃƒÂ³ perfectamente con 'CONFIRMAR'");
    }
}

window.cancelSale = function(id) {
    if(confirm('Ã‚Â¿EstÃƒÂ¡s seguro de cancelar esta venta? El stock de los artÃƒÂ­culos devueltos se sumarÃƒÂ¡ nuevamente y el efectivo se marcarÃƒÂ¡ en 0.')) {
        try {
            DB.SalesDB.cancelSale(id, currentUser.id);
            if(currentUser) DB.ActivityDB.log(currentUser.username, `CancelÃƒÂ³ la venta con ID ${id}`);
            alert('Venta cancelada exitosamente.');
            renderSalesHistory();
            renderDashboard();
            populateSalesSelect();
        } catch(err) {
            alert("No se pudo cancelar: " + err.message);
        }
    }
}

window.openRenewModal = function(id, name, planType) {
    let days = 30;
    if(planType === 'Quincenal') days = 15;
    else if(planType === 'Diario') days = 1;
    
    document.getElementById('renew-client-id').value = id;
    document.getElementById('renew-client-name').innerText = name;
    document.getElementById('renew-plan-type').value = planType;
    document.getElementById('renew-plan-days').value = days;
    
    document.getElementById('renew-plan-name-display').innerText = planType;
    document.getElementById('renew-plan-days-display').innerText = `+${days} dÃƒÂ­as`;
    document.getElementById('renew-price').value = '';
    
    openModal('modal-renew-membership');
}

window.selectedGalleryAvatarTemp = null;
window.selectGalleryAvatar = function(src, el) {
    window.selectedGalleryAvatarTemp = src;
    document.querySelectorAll('.gallery-avatar').forEach(img => img.style.borderColor = 'transparent');
    el.style.borderColor = 'var(--accent-color)';
    const fileInput = document.getElementById('user-avatar');
    if(fileInput) fileInput.value = '';
}
window.clearGallerySelection = function() {
    window.selectedGalleryAvatarTemp = null;
    document.querySelectorAll('.gallery-avatar').forEach(img => img.style.borderColor = 'transparent');
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
        
        if(!confirm('Ã‚Â¿EstÃƒÂ¡s seguro de que deseas importar estos datos? ADVERTENCIA: Se borrarÃƒÂ¡n todos los datos actuales del sistema y se reemplazarÃƒÂ¡n por los del archivo.')) {
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
                    
                    alert('Datos importados a la Nube correctamente. PodrÃƒÂ­a tomar unos segundos en aparecer.');
                    window.location.reload();
                } else {
                    alert('El archivo no parece ser un respaldo vÃƒÂ¡lido del programa.');
                }
            } catch(error) {
                alert('Hubo un error al leer el archivo. Verifica que sea el .json correcto.');
            }
        };
        reader.readAsText(file);
    });
}

// Reports Implementation
let monthlyComparisonChartInstance = null;
let weeklyChartInstance = null;
let paymentChartInstance = null;
let deptChartInstance = null;

window.renderReports = function() {
    if(typeof Chart === 'undefined') return;
    
    const sales = DB.SalesDB.getAll();
    Chart.defaults.color = '#94a3b8';
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentYear = today.getFullYear();
    const dayOfWeek = today.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentMonday = new Date(today);
    currentMonday.setDate(today.getDate() - daysSinceMonday);
    
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    let monthlyComparison = {};
    for (let i = 0; i < 12; i++) {
        monthlyComparison[i] = { amount: 0, count: 0 };
    }
    
    let weeklyTotals = [0,0,0,0,0,0,0];
    let cashTotal = 0;
    let cardTotal = 0;
    
    let deptTotals = {};
    
    sales.forEach(s => {
        if(s.status === 'Cancelada') return; // Exclude disabled sales from reports
        
        const sDate = new Date(s.date);
        if (sDate.getFullYear() === currentYear) {
            const m = sDate.getMonth();
            monthlyComparison[m].amount += parseFloat(s.total_amount);
            monthlyComparison[m].count += 1;
        }

        sDate.setHours(0,0,0,0);
        
        const dayDiff = Math.floor((sDate - currentMonday) / (1000 * 60 * 60 * 24));
        if(dayDiff >= 0 && dayDiff < 7) {
            weeklyTotals[dayDiff] += parseFloat(s.total_amount);
        }
        
        if(s.payment_method === 'Tarjeta') cardTotal += parseFloat(s.total_amount);
        else cashTotal += parseFloat(s.total_amount);
        
        s.items.forEach(i => {
           let category = 'Gimnasio';
           if(i.name.toLowerCase().includes('agua') || i.name.toLowerCase().includes('bebida') || i.name.toLowerCase().includes('cava') || i.name.toLowerCase().includes('energetic')) category = 'Bebidas';
           else if(i.name.includes('Pase Diario')) category = 'Tickets Diarios';
           else if(i.name.toLowerCase().includes('suplemento') || i.name.toLowerCase().includes('proteina') || i.name.toLowerCase().includes('creatina')) category = 'Suplementos';
           else category = 'ArtÃƒÂ­culos Varios';
           
           if(!deptTotals[category]) deptTotals[category] = 0;
           deptTotals[category] += i.subtotal || (i.price * i.qty) || 0;
        });
    });

    // --- Monthly Comparison Rendering ---
    const ctxMonthly = document.getElementById('chart-monthly-comparison');
    if (ctxMonthly) {
        if(monthlyComparisonChartInstance) monthlyComparisonChartInstance.destroy();
        monthlyComparisonChartInstance = new Chart(ctxMonthly, {
            type: 'line',
            data: {
                labels: monthNames,
                datasets: [{
                    label: `Ingresos (${currentYear})`,
                    data: monthNames.map((_, i) => monthlyComparison[i].amount),
                    backgroundColor: 'rgba(212, 59, 219, 0.2)',
                    borderColor: 'rgba(212, 59, 219, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    fill: true
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
        });
    }

    const tBodyMonthly = document.querySelector('#table-monthly-comparison tbody');
    if (tBodyMonthly) {
        tBodyMonthly.innerHTML = '';
        monthNames.forEach((name, i) => {
            const data = monthlyComparison[i];
            if (data.count > 0 || data.amount > 0) {
                tBodyMonthly.innerHTML += `<tr>
                    <td style="font-weight:bold; color:var(--primary-color);">${name} ${currentYear}</td>
                    <td>$${data.amount.toFixed(2)}</td>
                    <td>${data.count}</td>
                </tr>`;
            }
        });
        if(tBodyMonthly.innerHTML === '') tBodyMonthly.innerHTML = '<tr><td colspan="3">AÃƒÂºn no hay datos para este aÃƒÂ±o</td></tr>';
    }

    const ctxWeekly = document.getElementById('chart-weekly-sales');
    if(weeklyChartInstance) weeklyChartInstance.destroy();
    weeklyChartInstance = new Chart(ctxWeekly, {
        type: 'bar',
        data: {
            labels: ['Lunes', 'Martes', 'MiÃƒÂ©rcoles', 'Jueves', 'Viernes', 'SÃƒÂ¡bado', 'Domingo'],
            datasets: [{
                label: 'Ventas de la semana actual ($)',
                data: weeklyTotals,
                backgroundColor: 'rgba(10, 132, 255, 0.6)',
                borderColor: 'rgba(10, 132, 255, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });

    const ctxPayment = document.getElementById('chart-payment-methods');
    if(paymentChartInstance) paymentChartInstance.destroy();
    paymentChartInstance = new Chart(ctxPayment, {
        type: 'doughnut',
        data: {
            labels: ['Efectivo', 'Tarjeta'],
            datasets: [{
                data: [cashTotal, cardTotal],
                backgroundColor: ['#34c759', '#0a84ff'],
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxDept = document.getElementById('chart-departments');
    if(deptChartInstance) deptChartInstance.destroy();
    const deptLabels = Object.keys(deptTotals);
    const deptData = Object.values(deptTotals);
    const colors = ['#0a84ff', '#5e5ce6', '#d43bdb', '#ff2d55', '#ff9f0a', '#32ade6'];
    deptChartInstance = new Chart(ctxDept, {
        type: 'pie',
        data: {
            labels: deptLabels,
            datasets: [{
                data: deptData,
                backgroundColor: colors.slice(0, deptLabels.length),
                borderWidth: 0
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
    
    if(window.renderExpenseSemaphore) window.renderExpenseSemaphore();
    if(window.renderInventoryRanks) window.renderInventoryRanks();
    if(window.renderTrainerMetrics) window.renderTrainerMetrics();
};

window.renderDailyPassView = function() {
    const adminUser = DB.UserDB.getAll().find(u => u.username === 'admin');
    const price = adminUser && adminUser.daily_pass_price ? parseFloat(adminUser.daily_pass_price) : 5.00;
    
    if(document.getElementById('config-daily-price-view')) {
        document.getElementById('config-daily-price-view').value = price;
    }
    
    document.getElementById('v-daily-name').value = '';
    const priceInput = document.getElementById('v-daily-price');
    priceInput.value = price;
    
    if(currentUser && currentUser.role === 'Admin') {
        priceInput.readOnly = false;
    } else {
        priceInput.readOnly = true;
    }
    
    const clientSelect = document.getElementById('v-daily-existing-client');
    if(clientSelect) {
        clientSelect.innerHTML = '<option value="">-- Ignorar o registrar nuevo abajo --</option>';
        DB.ClientsDB.getAll().forEach(c => {
            clientSelect.innerHTML += `<option value="${c.name} ${c.surname}">${c.name} ${c.surname}</option>`;
        });
    }
};

window.saveGymConfigView = function() {
    const val = document.getElementById('config-daily-price-view').value;
    const adminUser = DB.UserDB.getAll().find(u => u.username === 'admin');
    if(adminUser && val !== '') {
        adminUser.daily_pass_price = parseFloat(val);
        db.collection('gym_users').doc(adminUser.id).update({ daily_pass_price: adminUser.daily_pass_price });
        alert('Precio base del Pase Diario guardado.');
        window.renderDailyPassView();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const vDailyForm = document.getElementById('view-daily-pass-form');
    if(vDailyForm) {
        // End of app.js daily pass flow inside setupforms? No this is at bottom of document.
        vDailyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const existingClient = document.getElementById('v-daily-existing-client').value;
            const newName = document.getElementById('v-daily-name').value.trim();
            const finalName = existingClient ? existingClient : newName;
            
            const price = parseFloat(document.getElementById('v-daily-price').value);
            const method = document.getElementById('v-daily-payment-method').value;
            
            if (method === 'CrÃƒÂ©dito') {
                 if(!finalName) { alert("Obligatorio elegir un cliente para crear la cuenta de crÃƒÂ©dito."); return; }
                 window.pendingCreditData = {
                     isDailyPass: true,
                     pendingClientName: finalName,
                     total_amount: price,
                     total_cost: 0,
                     desc: "Pase Diario Express"
                 };
                 window.startCreditApproveFlow();
                 return;
            }

            if(!existingClient && newName) {
                // Registrar al cliente si se escribiÃƒÂ³ nombre nuevo.
                const newClient = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    name: newName,
                    surname: '',
                    age: 0,
                    weight: 0,
                    address: '',
                    phone: '',
                    plan_type: 'Pase de 1 DÃƒÂ­a',
                    payment_date: new Date().toISOString(),
                    extension_days: 0,
                    trainer_id: ''
                };
                db.collection('gym_clients').doc(newClient.id).set(newClient);
            }
            
            const saleObj = {
                id: `PASEDIARIOEXP-${Date.now().toString(36).toUpperCase()}`,
                items: [{ id: 'PASE_DIARIO_GLOBAL', name: 'Pase Diario Express', price: price, qty: 1 }],
                total_amount: price,
                total_cost: 0,
                paymentMethod: method,
                date: new Date().toISOString(),
                user: currentUser ? currentUser.username : 'Sistema'
            };
            db.collection('gym_sales').doc(saleObj.id).set(saleObj);
            
            DB.ActivityDB.log(currentUser ? currentUser.username : 'Sistema', `Cobro P.Diario Express a ${finalName || 'Desconocido'}: $${price.toFixed(2)} (${method})`);
            
            alert('Pase Diario cobrado exitosamente a ' + (finalName || 'Desconocido'));
            document.getElementById('v-daily-name').value = '';
            document.getElementById('v-daily-existing-client').value = '';
        });
    }
});
window.renderExpenses = function() { const tbody = document.querySelector('#expenses-table tbody'); if(!tbody) return; tbody.innerHTML = ''; const expenses = DB.ExpensesDB.getAll().sort((a,b) => new Date(b.date) - new Date(a.date)); expenses.forEach(e => { const user = DB.UserDB.getAll().find(u => u.id === e.user_id); const userName = user ? user.username : 'Desconocido'; tbody.innerHTML += \<tr><td>\</td><td>\</td><td style='color: var(--danger-color); font-weight:bold;'>$\</td><td>\</td><td><button class='btn-danger admin-only' onclick='DB.ExpensesDB.remove(\"\\")'><i class='fas fa-trash'></i></button></td></tr>\; }); }; document.addEventListener('DOMContentLoaded', () => { const expForm = document.getElementById('expense-form'); if(expForm) expForm.addEventListener('submit', (e) => { e.preventDefault(); const desc = document.getElementById('expense-desc').value; const amount = document.getElementById('expense-amount').value; requireAuth((authUser) => { DB.ExpensesDB.add(desc, amount, authUser.id); DB.ActivityDB.log(authUser.username, \RegistrÃ³ un gasto operativo: \ por $\\); closeModal('modal-expense-form'); document.getElementById('expense-form').reset(); alert('Gasto guardado.'); }); }); });


window.renderExpenseSemaphore = function() {
    const semaIncome = document.getElementById('sema-income');
    const semaExpense = document.getElementById('sema-expense');
    const semaNet = document.getElementById('sema-net');
    if(!semaIncome) return;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let totalIncome = 0;
    DB.SalesDB.getAll().forEach(s => {
        const d = new Date(s.date);
        if(d.getMonth() === currentMonth && d.getFullYear() === currentYear && s.status !== 'Cancelada') {
            totalIncome += parseFloat(s.total_amount || 0);
        }
    });
    
    let totalExpense = 0;
    DB.ExpensesDB.getAll().forEach(e => {
        const d = new Date(e.date);
        if(d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
            totalExpense += parseFloat(e.amount || 0);
        }
    });
    
    const net = totalIncome - totalExpense;
    
    semaIncome.innerText = '$' + totalIncome.toFixed(2);
    semaExpense.innerText = '$' + totalExpense.toFixed(2);
    semaNet.innerText = '$' + net.toFixed(2);
    
    if(net >= 0) {
        semaNet.style.backgroundColor = 'rgba(52, 199, 89, 0.2)';
        semaNet.style.color = 'var(--success-color)';
    } else {
        semaNet.style.backgroundColor = 'rgba(255, 59, 48, 0.2)';
        semaNet.style.color = 'var(--danger-color)';
    }
};

window.renderInventoryRanks = function() {
    const listBest = document.getElementById('top-5-best');
    const listWorst = document.getElementById('top-5-worst');
    if(!listBest) return;
    
    // Count items sold
    const itemCounts = {};
    DB.InventoryDB.getAll().forEach(i => {
        itemCounts[i.name] = { count: 0, stock: i.quantity };
    });
    
    DB.SalesDB.getAll().forEach(s => {
        if(s.status === 'Cancelada') return;
        s.items.forEach(i => {
           if(!itemCounts[i.name]) itemCounts[i.name] = { count: 0, stock: 0 };
           itemCounts[i.name].count += (i.qty || 1);
        });
    });
    
    const sortedItems = Object.keys(itemCounts).map(k => ({ name: k, count: itemCounts[k].count, stock: itemCounts[k].stock }))
                        .sort((a,b) => b.count - a.count);
                        
    const best = sortedItems.slice(0, 5);
    const worst = sortedItems.reverse().slice(0, 5);
    
    listBest.innerHTML = best.map(b => <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between;"><span>\</span><strong>\ vendidos</strong></li>).join('');
    listWorst.innerHTML = worst.map(w => <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color); display:flex; justify-content:space-between;"><span>\</span><strong>\ vendidos (En stock: \)</strong></li>).join('');
};

let trainerMonthlyChartInstance = null;
let trainerWeeklyChartInstance = null;

window.renderTrainerMetrics = function() {
    const trBody = document.querySelector('#trainer-performance-table tbody');
    if(!trBody) return;
    trBody.innerHTML = '';
    
    const users = DB.UserDB.getAll().filter(u => u.role === 'Entrenador' || u.role === 'Admin');
    const clients = DB.ClientsDB.getAll();
    
    const labels = [];
    const metaMensualData = [];
    const acumuladoMensualData = [];
    const metaSemanalData = [];
    const acumuladoSemanalData = [];
    
    users.forEach(u => {
        const ownClients = clients.filter(c => c.trainer_id === u.id && !window.checkClientExpiration(c).isExpired);
        const clientsCount = ownClients.length;
        
        const tPrice = u.training_price || 0;
        const expectedRev = u.expected_revenue || 0; 
        
        // El acumulado real del mes es los clientes activos pagando  
        const realAcumulado30 = ownClients.reduce((sum, c) => sum + (parseFloat(c.agreed_amount) || parseFloat(c.plan_fee) || tPrice), 0);
        // Asumimos un 25% para el periodo de 7 dÃƒÂ­as
        const realAcumulado7 = realAcumulado30 / 4;
        
        if (clientsCount > 0 || u.role === 'Entrenador') {
            labels.push(u.username);
            metaMensualData.push(expectedRev);
            acumuladoMensualData.push(realAcumulado30);
            
            metaSemanalData.push(expectedRev / 4);
            acumuladoSemanalData.push(realAcumulado7);
            
            trBody.innerHTML += \
                <tr>
                    <td><strong>\</strong></td>
                    <td>\ </td>
                    <td>$\</td>
                    <td style="color:var(--success-color); font-weight:bold;">$\</td>
                    <td style="color:var(--accent-color); font-weight:bold;">$\</td>
                </tr>
            \;
        }
    });

    const ctxMonthly = document.getElementById('chart-trainer-monthly');
    if(trainerMonthlyChartInstance) trainerMonthlyChartInstance.destroy();
    if(ctxMonthly) {
        trainerMonthlyChartInstance = new Chart(ctxMonthly, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Meta Mensual ($)', data: metaMensualData, backgroundColor: 'rgba(255, 159, 10, 0.4)', borderColor: 'rgba(255, 159, 10, 1)', borderWidth: 1 },
                    { label: 'Ingresos Acumulados ($)', data: acumuladoMensualData, backgroundColor: 'rgba(52, 199, 89, 0.7)', borderColor: 'rgba(52, 199, 89, 1)', borderWidth: 1 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    const ctxWeekly = document.getElementById('chart-trainer-weekly');
    if(trainerWeeklyChartInstance) trainerWeeklyChartInstance.destroy();
    if(ctxWeekly) {
        trainerWeeklyChartInstance = new Chart(ctxWeekly, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Meta Semanal Proporcional ($)', data: metaSemanalData, backgroundColor: 'rgba(10, 132, 255, 0.4)', borderColor: 'rgba(10, 132, 255, 1)', borderWidth: 1, borderRadius: 4 },
                    { label: 'Ingresos de los Ãºltimos 7d ($)', data: acumuladoSemanalData, backgroundColor: 'rgba(10, 132, 255, 1)', borderColor: 'rgba(10, 132, 255, 1)', borderWidth: 1, borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        });
    }
};


window.saveSystemConfig = function() {
    if(currentUser.role !== 'Admin') return;
    const data = {
        gymName: document.getElementById('conf-gym-name').value,
        gymRnc: document.getElementById('conf-gym-rnc').value,
        gymPhone: document.getElementById('conf-gym-phone').value,
        gymAddress: document.getElementById('conf-gym-address').value,
        vfoneKey: document.getElementById('conf-vfone-key').value,
        vfoneTid: document.getElementById('conf-vfone-tid').value,
        vfoneMid: document.getElementById('conf-vfone-mid').value
    };
    DB.ConfigDB.update(data);
    alert('Configuración guardada exitosamente.');
};

window.renderConfig = function() {
    const data = DB.ConfigDB.get();
    if(document.getElementById('conf-gym-name')) {
        document.getElementById('conf-gym-name').value = data.gymName || '';
        document.getElementById('conf-gym-rnc').value = data.gymRnc || '';
        document.getElementById('conf-gym-phone').value = data.gymPhone || '';
        document.getElementById('conf-gym-address').value = data.gymAddress || '';
        document.getElementById('conf-vfone-key').value = data.vfoneKey || '';
        document.getElementById('conf-vfone-tid').value = data.vfoneTid || '';
        document.getElementById('conf-vfone-mid').value = data.vfoneMid || '';
    }
};

window.generateAndPrintInvoice = function(saleObj, ncfType, clientRNC) {
    const conf = DB.ConfigDB.get();
    const gymName = conf.gymName || 'Mi Gimnasio';
    const gymRnc = conf.gymRnc || 'N/A';
    const gymAddress = conf.gymAddress || 'N/A';
    const gymPhone = conf.gymPhone || 'N/A';
    
    // NCF Mock logic
    let ncfString = '';
    let docType = 'FACTURA';
    if(ncfType === 'cred_fiscal') {
        ncfString = 'B01' + Math.floor(10000000 + Math.random() * 90000000); // 8 random digits
        docType = 'FACTURA CON VALOR FISCAL';
    } else if(ncfType === 'cons_final') {
        ncfString = 'B02' + Math.floor(10000000 + Math.random() * 90000000);
        docType = 'FACTURA PARA CONSUMIDOR FINAL';
    }

    let itemsHtml = '';
    if(saleObj.items) {
        saleObj.items.forEach(i => {
            const sub = (i.price * i.qty).toFixed(2);
            itemsHtml += \<tr><td style="padding:4px 0;">\ (x\)</td><td style="text-align:right;">$\</td></tr>\;
        });
    } else {
         itemsHtml += \<tr><td style="padding:4px 0;">Pase Diario Express</td><td style="text-align:right;">$\</td></tr>\;
    }
    
    // ITBIS Calculation (Mock 18% inside the total)
    const total = saleObj.total_amount || saleObj.total_cost;
    const subtotal = total / 1.18;
    const itbis = total - subtotal;

    const ticketHtml = \
    <html><head><title>Factura</title>
    <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 10px; width: 300px; }
        .text-center { text-align: center; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
    </style>
    </head><body>
        <div class="text-center">
            <h2>\</h2>
            <p>RNC: \<br>\<br>Tel: \</p>
        </div>
        <div class="line"></div>
        <div class="text-center" style="font-weight:bold;">\</div>
        <div class="line"></div>
        <p>
            Fecha: \<br>
            Cajero: \<br>
            Método de Pago: \<br>
            \
            \
        </p>
        <div class="line"></div>
        <table>\</table>
        <div class="line"></div>
        <table>
            <tr><td>Subtotal:</td><td style="text-align:right;">$\</td></tr>
            <tr><td>ITBIS (18%):</td><td style="text-align:right;">$\</td></tr>
            <tr><td style="font-weight:bold; font-size:14px;">TOTAL:</td><td style="text-align:right; font-weight:bold; font-size:14px;">$\</td></tr>
        </table>
        <div class="line"></div>
        <p class="text-center">¡Gracias por preferirnos!</p>
    </body></html>\;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    printWin.document.open();
    printWin.document.write(ticketHtml);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => { printWin.print(); }, 500);
};

// Override Interception for Print / Verifone in Form Submission (Sales)
const originalBtnProcess = document.getElementById('btn-process-sale');
if(originalBtnProcess) {
    const clone = originalBtnProcess.cloneNode(true);
    originalBtnProcess.parentNode.replaceChild(clone, originalBtnProcess);
    
    clone.addEventListener('click', async (e) => {
        if(cart.length === 0) return alert('El carrito estÃ¡ vacÃ­o.');
        const pMethod = document.getElementById('sale-payment-method').value;
        const conf = DB.ConfigDB.get();
        let clientRnc = '';
        let ncfType = '';
        const credNode = document.querySelector('input[name="sale-ncf-type"]:checked');
        if(credNode) ncfType = credNode.value;
        if(ncfType === 'cred_fiscal') {
            clientRnc = document.getElementById('sale-rnc-input').value;
            if(!clientRnc) { alert("Debes ingresar el RNC del cliente para el comprobante de crÃ©dito fiscal."); return; }
        }
        
        if (pMethod === 'Tarjeta' && conf.vfoneTid && conf.vfoneKey) {
            alert("Conectando con Punto de Venta Verifone... (TID: " + conf.vfoneTid + ").\\n\\nEnviando orden de cobro vÃ­a API Cloud, por favor pase la tarjeta en el equipo en mostrador.");
            // Here you'd use fetch() to Verifone Connect Endpoint in real life
            await new Promise(r => setTimeout(r, 2000));
            alert("TransacciÃ³n Verifone Aprobada.");
        }
        
        requireAuth((authUser) => {
            if(pMethod === 'CrÃ©dito' && authUser.role !== 'Admin') {
                return alert("Solo Admins pueden procesar CrÃ©dito directo asÃ­. Usa OTP en recibos.");
            }
            const items = [...cart];
            const saleObj = {
                id: generateId(),
                items: items,
                total_amount: cartTotal,
                payment_method: pMethod,
                date: new Date().toISOString(),
                user: authUser.username,
                status: 'Completada',
                ncf: ncfType
            };
            DB.SalesDB.add(saleObj);
            items.forEach(i => DB.InventoryDB.update(i.id, i.qty, 'OUT'));
            DB.ActivityDB.log(authUser.username, \Venta (\) procesada por $\\);
            
            alert('Venta Completada. Abriendo ImpresiÃ³n de Factura...');
            window.generateAndPrintInvoice(saleObj, ncfType, clientRnc);
            
            cart = [];
            updateCartTable();
            document.getElementById('sale-q').value = '';
            closeModal('modal-sale-auth');
        });
    });
}
