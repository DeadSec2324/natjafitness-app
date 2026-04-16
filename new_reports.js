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
        const realAcumulado30 = clientsCount * tPrice;
        // Asumimos un 25% para el periodo de 7 dÃ­as
        const realAcumulado7 = (clientsCount * tPrice) / 4;
        
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
                    { label: 'Ingresos de los últimos 7d ($)', data: acumuladoSemanalData, backgroundColor: 'rgba(10, 132, 255, 1)', borderColor: 'rgba(10, 132, 255, 1)', borderWidth: 1, borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
        });
    }
};
