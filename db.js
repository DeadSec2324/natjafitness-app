const firebaseConfig = {
  apiKey: "AIzaSyDToM4s0ynM9fe65j8qD_qEchWDZSkAffk",
  authDomain: "natjafitness.firebaseapp.com",
  projectId: "natjafitness",
  storageBucket: "natjafitness.firebasestorage.app",
  messagingSenderId: "556076704420",
  appId: "1:556076704420:web:2cac88f4233ed1870afc31",
  measurementId: "G-4XLPN5VKFV"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// In-memory synced data
let localData = {
    gym_users: [],
    gym_inventory: [],
    gym_transactions: [],
    gym_sales: [],
    gym_clients: [],
    gym_activity: [],
    gym_messages: []
};

// Listeners for realtime update
db.collection('gym_users').onSnapshot(snap => {
    localData.gym_users = snap.docs.map(doc => doc.data());
    // Seed admin if empty
    if(snap.empty) {
        const defaultUser = {
            id: generateId(),
            username: 'admin',
            password: 'admin', 
            role: 'Admin',
            is_online: false,
            last_login: null,
            first_login_today: null
        };
        db.collection('gym_users').doc(defaultUser.id).set(defaultUser);
    }
    if(window.renderUsers && document.getElementById('view-users') && document.getElementById('view-users').classList.contains('active')) {
        window.renderUsers();
    }
});

db.collection('gym_inventory').onSnapshot(snap => {
    localData.gym_inventory = snap.docs.map(doc => doc.data());
    if(window.renderInventory && document.getElementById('view-inventory') && document.getElementById('view-inventory').classList.contains('active')) window.renderInventory();
    if(window.renderDashboard && document.getElementById('view-dashboard') && document.getElementById('view-dashboard').classList.contains('active')) window.renderDashboard();
    if(window.renderSales && document.getElementById('view-sales') && document.getElementById('view-sales').classList.contains('active')) window.populateSalesSelect();
});

db.collection('gym_transactions').onSnapshot(snap => {
    localData.gym_transactions = snap.docs.map(doc => doc.data());
    if(window.renderDashboard && document.getElementById('view-dashboard') && document.getElementById('view-dashboard').classList.contains('active')) window.renderDashboard();
});

db.collection('gym_sales').onSnapshot(snap => {
    localData.gym_sales = snap.docs.map(doc => doc.data());
    if(window.renderSalesHistory && document.getElementById('view-sales') && document.getElementById('view-sales').classList.contains('active')) window.renderSalesHistory();
    if(window.renderDashboard && document.getElementById('view-dashboard') && document.getElementById('view-dashboard').classList.contains('active')) window.renderDashboard();
});

db.collection('gym_clients').onSnapshot(snap => {
    localData.gym_clients = snap.docs.map(doc => doc.data());
    if(window.renderClients && document.getElementById('view-clients') && document.getElementById('view-clients').classList.contains('active')) {
        window.renderClients();
        const activeCat = document.getElementById('client-category-title') ? document.getElementById('client-category-title').innerText.replace('Visualizando: ', '') : '';
        if(activeCat && activeCat !== 'Categoría') {
            window.showClientsCategory(activeCat);
        }
    }
});

let isInitialActivityLoad = true;
db.collection('gym_activity').onSnapshot(snap => {
    localData.gym_activity = snap.docs.map(doc => doc.data());
    
    if(!isInitialActivityLoad && window.triggerDeviceNotification) {
        snap.docChanges().forEach(change => {
            if(change.type === 'added') {
                window.triggerDeviceNotification("🔔 Actualización del Gym", change.doc.data().action);
            }
        });
    }
    isInitialActivityLoad = false;

    if(window.renderNotifications) window.renderNotifications();
});

db.collection('gym_messages').onSnapshot(snap => {
    localData.gym_messages = snap.docs.map(doc => doc.data());
    if(window.renderMessages && document.getElementById('view-messages') && document.getElementById('view-messages').classList.contains('active')) window.renderMessages();
});

// Helpers
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// User methods
const UserDB = {
    login: (username, password) => {
        return localData.gym_users.find(u => u.username === username && u.password === password) || null;
    },
    getAll: () => localData.gym_users,
    add: (user) => {
        if(localData.gym_users.some(u => u.username === user.username)) throw new Error("El usuario ya existe");
        const newUser = { 
            id: generateId(), 
            username: user.username, 
            password: user.password, 
            role: user.role,
            training_price: Number(user.training_price) || 0,
            is_online: false,
            last_login: null,
            first_login_today: null
        };
        db.collection('gym_users').doc(newUser.id).set(newUser);
        return newUser;
    },
    update: (id, updates) => {
        db.collection('gym_users').doc(id).update(updates);
    },
    remove: (id) => {
        db.collection('gym_users').doc(id).delete();
    }
};

// Inventory Methods
const InventoryDB = {
    getAll: () => localData.gym_inventory,
    getById: (id) => localData.gym_inventory.find(i => i.id === id),
    add: (item) => {
        const newItem = { 
            id: generateId(), 
            name: item.name, 
            description: item.description, 
            quantity: Number(item.quantity) || 0,
            cost_price: Number(item.cost_price) || 0,
            price: Number(item.price) || 0
        };
        db.collection('gym_inventory').doc(newItem.id).set(newItem);
        return newItem;
    },
    update: (id, updates) => {
        db.collection('gym_inventory').doc(id).update(updates);
    },
    remove: (id) => {
        db.collection('gym_inventory').doc(id).delete();
    },
    adjustStock: (id, amount, userId, type) => {
        const item = InventoryDB.getById(id);
        if (!item) throw new Error("Artículo no encontrado");
        
        const newQty = Number(item.quantity) + Number(amount);
        if (newQty < 0) throw new Error("Stock insuficiente");
        
        db.collection('gym_inventory').doc(id).update({ quantity: newQty });
        
        // Log transaction
        const tx = {
            id: generateId(),
            item_id: id,
            item_name: item.name,
            user_id: userId,
            type: type, // 'IN', 'OUT', 'SALE'
            quantity: Math.abs(amount),
            date: new Date().toISOString()
        };
        db.collection('gym_transactions').doc(tx.id).set(tx);
    }
};

// Sales Methods
const SalesDB = {
    getAll: () => localData.gym_sales,
    processSale: (userId, cartItems, paymentMethod = 'Efectivo') => {
        let totalAmount = 0;
        let totalCost = 0;
        
        let itemNames = cartItems.map(c => c.name.replace(/\s+/g, '')).join('-');
        if (itemNames.length > 20) itemNames = itemNames.substring(0, 20);
        const saleId = `${itemNames.toUpperCase()}-${generateId().substring(0,5).toUpperCase()}`;
        
        for (const cartItem of cartItems) {
            const item = InventoryDB.getById(cartItem.id);
            if (!item) throw new Error(`El artículo ${cartItem.name} no se encuentra.`);
            if (item.quantity < cartItem.qty) throw new Error(`Stock insuficiente para ${item.name}.`);
        }
        
        for (const cartItem of cartItems) {
            const item = InventoryDB.getById(cartItem.id);
            InventoryDB.adjustStock(item.id, -cartItem.qty, userId, 'SALE');
            totalAmount += (item.price * cartItem.qty);
            totalCost += ((item.cost_price || 0) * cartItem.qty);
        }
        
        const saleRecord = {
            id: saleId,
            user_id: userId,
            items: cartItems,
            total_cost: totalCost,
            total_amount: totalAmount,
            profit: totalAmount - totalCost,
            payment_method: paymentMethod,
            date: new Date().toISOString()
        };
        db.collection('gym_sales').doc(saleRecord.id).set(saleRecord);
        return saleRecord;
    },
    registerDailyPass: (userId, clientName, price, paymentMethod) => {
        const saleRecord = {
            id: `PASEDIARIO-${generateId().substring(0,5).toUpperCase()}`,
            user_id: userId,
            items: [{ name: `Pase Diario: ${clientName}`, qty: 1 }],
            total_cost: 0,
            total_amount: Number(price),
            profit: Number(price),
            payment_method: paymentMethod,
            date: new Date().toISOString()
        };
        db.collection('gym_sales').doc(saleRecord.id).set(saleRecord);
        return saleRecord;
    }
};

const TransactionsDB = {
    getAll: () => localData.gym_transactions
};

// Clients Methods
const ClientsDB = {
    getAll: () => localData.gym_clients,
    getById: (id) => localData.gym_clients.find(c => c.id === id),
    add: (client) => {
        const newClient = {
            id: generateId(),
            name: client.name,
            surname: client.surname,
            age: client.age,
            weight: client.weight,
            address: client.address,
            phone: client.phone,
            plan_type: client.plan_type,
            trainer_id: client.trainer_id || "",
            payment_date: client.payment_date || new Date().toISOString(),
            extension_days: 0
        };
        db.collection('gym_clients').doc(newClient.id).set(newClient);
        return newClient;
    },
    update: (id, updates) => {
        db.collection('gym_clients').doc(id).update(updates);
    },
    remove: (id) => {
        db.collection('gym_clients').doc(id).delete();
    }
};

// Activity Methods
const ActivityDB = {
    getAll: () => localData.gym_activity,
    log: (username, action) => {
        const item = {
            id: generateId(),
            username,
            action,
            date: new Date().toISOString(),
            readByAdmin: false
        };
        db.collection('gym_activity').doc(item.id).set(item);
    },
    markAllRead: () => {
        localData.gym_activity.filter(a => !a.readByAdmin).forEach(a => {
            db.collection('gym_activity').doc(a.id).update({ readByAdmin: true });
        });
    }
};

// Messages Methods
const MessagesDB = {
    getAll: () => localData.gym_messages,
    add: (senderName, text) => {
        const msg = {
            id: generateId(),
            sender: senderName,
            text: text,
            date: new Date().toISOString()
        };
        db.collection('gym_messages').doc(msg.id).set(msg);
    }
};

window.DB = {
    UserDB,
    InventoryDB,
    SalesDB,
    TransactionsDB,
    ClientsDB,
    ActivityDB,
    MessagesDB
};
