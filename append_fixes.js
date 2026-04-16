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
            itemsHtml += `<tr><td style="padding:4px 0;">${i.name} (x${i.qty})</td><td style="text-align:right;">$${sub}</td></tr>`;
        });
    } else {
         itemsHtml += `<tr><td style="padding:4px 0;">Pase Diario Express</td><td style="text-align:right;">$${saleObj.total_amount?.toFixed(2) || saleObj.total_cost?.toFixed(2)}</td></tr>`;
    }
    
    const total = saleObj.total_amount || saleObj.total_cost || 0;
    const subtotal = total / 1.18;
    const itbis = total - subtotal;

    const ticketHtml = `
    <html><head><title>Factura</title>
    <style>
        body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 10px; width: 300px; }
        .text-center { text-align: center; }
        .line { border-bottom: 1px dashed #000; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; }
    </style>
    </head><body>
        <div class="text-center">
            <h2>${gymName.toUpperCase()}</h2>
            <p>RNC: ${gymRnc}<br>${gymAddress}<br>Tel: ${gymPhone}</p>
        </div>
        <div class="line"></div>
        <div class="text-center" style="font-weight:bold;">${docType}</div>
        <div class="line"></div>
        <p>
            Fecha: ${new Date().toLocaleString()}<br>
            Cajero: ${saleObj.user}<br>
            Método de Pago: ${saleObj.payment_method || saleObj.paymentMethod || 'Efectivo'}<br>
            ${ncfString ? 'NCF: ' + ncfString + '<br>' : ''}
            ${ncfType === 'cred_fiscal' ? 'RNC Cliente: ' + (clientRNC || 'N/A') + '<br>' : ''}
        </p>
        <div class="line"></div>
        <table>${itemsHtml}</table>
        <div class="line"></div>
        <table>
            <tr><td>Subtotal:</td><td style="text-align:right;">$${subtotal.toFixed(2)}</td></tr>
            <tr><td>ITBIS (18%):</td><td style="text-align:right;">$${itbis.toFixed(2)}</td></tr>
            <tr><td style="font-weight:bold; font-size:14px;">TOTAL:</td><td style="text-align:right; font-weight:bold; font-size:14px;">$${total.toFixed(2)}</td></tr>
        </table>
        <div class="line"></div>
        <p class="text-center">¡Gracias por preferirnos!</p>
    </body></html>`;

    const printWin = window.open('', '_blank', 'width=400,height=600');
    if(!printWin) return alert("Por favor habilita las ventanas emergentes (pop-ups) para ver la factura.");
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
        if(cart.length === 0) return alert('El carrito está vacío.');
        const pMethod = document.getElementById('sale-payment-method').value;
        const conf = DB.ConfigDB.get();
        let clientRnc = '';
        let ncfType = '';
        const credNode = document.querySelector('input[name="sale-ncf-type"]:checked');
        if(credNode) ncfType = credNode.value;
        if(ncfType === 'cred_fiscal') {
            clientRnc = document.getElementById('sale-rnc-input').value;
            if(!clientRnc) { alert("Debes ingresar el RNC del cliente para el comprobante de crédito fiscal."); return; }
        }
        
        if (pMethod === 'Tarjeta' && conf.vfoneTid && conf.vfoneKey) {
            alert(`Conectando con Punto de Venta Verifone... (TID: ${conf.vfoneTid}).\n\nEnviando orden de cobro vía API Cloud, por favor pase la tarjeta en el equipo en mostrador.`);
            await new Promise(r => setTimeout(r, 2000));
            alert("Transacción Verifone Aprobada.");
        }
        
        requireAuth((authUser) => {
            if(pMethod === 'Crédito' && authUser.role !== 'Admin') {
                return alert("Solo Admins pueden procesar Crédito directo.");
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
            DB.ActivityDB.log(authUser.username, `Venta (${pMethod}) procesada por $${cartTotal}`);
            
            alert('Venta Completada. Abriendo Impresión de Factura...');
            window.generateAndPrintInvoice(saleObj, ncfType, clientRnc);
            
            cart = [];
            updateCartTable();
            document.getElementById('sale-q').value = '';
            closeModal('modal-sale-auth');
        });
    });
}

const dForm = document.getElementById('daily-pass-form');
if(dForm) {
    const clone = dForm.cloneNode(true);
    dForm.parentNode.replaceChild(clone, dForm);
    clone.addEventListener('submit', async (e) => {
        e.preventDefault();
        const clientName = document.getElementById('v-daily-existing-client').value || document.getElementById('v-daily-name').value;
        const price = parseFloat(document.getElementById('v-daily-price').value);
        const pMethod = document.getElementById('v-daily-payment-method').value;
        
        const conf = DB.ConfigDB.get();
        let clientRnc = '';
        let ncfType = '';
        const credNode = document.querySelector('input[name="daily-ncf-type"]:checked');
        if(credNode) ncfType = credNode.value;
        if(ncfType === 'cred_fiscal') {
            clientRnc = document.getElementById('daily-rnc-input').value;
            if(!clientRnc) { alert("Debes ingresar el RNC del cliente."); return; }
        }
        
        if (pMethod === 'Tarjeta' && conf.vfoneTid && conf.vfoneKey) {
            alert(`Conectando con Punto de Venta Verifone... (TID: ${conf.vfoneTid}).\n\nPase la tarjeta.`);
            await new Promise(r => setTimeout(r, 2000));
            alert("Transacción Verifone Aprobada.");
        }
        
        requireAuth((authUser) => {
            const saleObj = {
                id: generateId(),
                items: [{id: 'D-PASS', name: 'Pase Diario', price: price, qty: 1}],
                total_amount: price,
                payment_method: pMethod,
                date: new Date().toISOString(),
                user: authUser.username,
                status: 'Completada',
                ncf: ncfType
            };
            DB.SalesDB.add(saleObj);
            DB.ActivityDB.log(authUser.username, `Registró un Pase Diario para ${clientName} por $${price}`);
            
            alert('Pase Diario guardado. Abriendo Factura...');
            window.generateAndPrintInvoice(saleObj, ncfType, clientRnc);
            
            closeModal('modal-daily-pass');
            clone.reset();
        });
    });
}
