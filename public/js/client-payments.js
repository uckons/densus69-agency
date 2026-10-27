(() => {
    let transactionId = null;
    let requestKey = null;
    const money = n => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
    const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jakarta'}).format(new Date());
    const node = (tag, text, classes = '') => { const el=document.createElement(tag);el.textContent=text;el.className=classes;return el; };
    async function request(url, method='GET', body) {
        const response=await fetch(url,{method,credentials:'include',headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
        const data=await response.json();
        if(!response.ok||!data.success)throw new Error(data.message||'Pembayaran gagal diproses');
        return data.data;
    }
    async function load() {
        const id=transactionId;
        const data=await request(`/api/transactions/${id}/payments`);
        if(id!==transactionId)return;
        document.getElementById('paymentClient').textContent=data.transaction.client_name;
        document.getElementById('paymentInvoice').textContent=money(data.invoice);
        document.getElementById('paymentReceived').textContent=money(data.paid);
        document.getElementById('paymentOutstanding').textContent=money(data.outstanding);
        const form=document.getElementById('clientPaymentForm');form.reset();
        document.getElementById('paymentDate').value=today();
        document.getElementById('paymentDate').max=today();
        document.getElementById('paymentAmount').value=data.outstanding>0?data.outstanding:'';
        document.getElementById('paymentAmount').max=Math.max(data.outstanding,0);
        document.getElementById('saveClientPayment').disabled=data.outstanding<=0;
        requestKey=crypto.randomUUID();
        const history=document.getElementById('paymentHistory');history.replaceChildren();
        if(!data.payments.length)history.append(node('p','Belum ada pembayaran tercatat.','text-gray-500 text-sm'));
        data.payments.forEach(payment=>{
            const row=node('div','','border rounded-lg p-3 space-y-1');
            row.append(node('p',`${payment.receipt_date} · ${money(payment.amount)} · ${payment.method}`,payment.voided_at?'line-through text-gray-400':'font-semibold'));
            if(payment.reference)row.append(node('p',`Referensi: ${payment.reference}`,'text-sm text-gray-600'));
            if(payment.notes)row.append(node('p',payment.notes,'text-sm text-gray-600'));
            if(payment.voided_at)row.append(node('p',`Dibatalkan: ${payment.void_reason}`,'text-sm text-red-600'));
            else {
                const button=node('button','Batalkan pembayaran','text-sm text-red-600');button.type='button';
                button.onclick=async()=>{
                    const reason=prompt('Alasan pembatalan pembayaran (riwayat tetap disimpan):');
                    if(!reason?.trim())return;
                    button.disabled=true;
                    try{await request(`/api/transactions/${id}/payments/${payment.id}/void`,'POST',{reason});await load();showToast('Pembayaran dibatalkan.','success');}
                    catch(error){showToast(error.message,'error');button.disabled=false;}
                };
                row.append(button);
            }
            history.append(row);
        });
        const tx=allTransactions.find(tx=>Number(tx.id)===Number(id));
        if(tx){Object.assign(tx,{invoice_amount:data.invoice,amount_paid:data.paid,outstanding:data.outstanding,payments:data.payments.filter(payment=>!payment.voided_at).map(payment=>({...payment,payment_date:payment.receipt_date}))});applyFilters();}
    }
    window.openClientPayments=async id=>{
        transactionId=id;
        const modal=document.getElementById('clientPaymentsModal');
        document.getElementById('paymentHistory').textContent='Memuat pembayaran...';
        document.getElementById('saveClientPayment').disabled=true;
        modal.classList.remove('hidden');
        try{await load();}catch(error){modal.classList.add('hidden');showToast(error.message,'error');}
    };
    window.closeClientPayments=()=>{transactionId=null;document.getElementById('clientPaymentsModal').classList.add('hidden');};
    document.getElementById('clientPaymentForm').addEventListener('submit',async event=>{
        event.preventDefault();
        const button=document.getElementById('saveClientPayment');if(button.disabled)return;button.disabled=true;
        try{
            await request(`/api/transactions/${transactionId}/payments`,'POST',{
                amount:document.getElementById('paymentAmount').value,payment_date:document.getElementById('paymentDate').value,
                method:document.getElementById('paymentMethod').value,reference:document.getElementById('paymentReference').value,
                notes:document.getElementById('paymentNotes').value,request_key:requestKey
            });
            await load();showToast('Pembayaran berhasil dicatat.','success');
        }catch(error){showToast(error.message,'error');button.disabled=false;}
    });
})();
