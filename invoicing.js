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
