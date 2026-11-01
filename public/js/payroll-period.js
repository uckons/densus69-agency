(() => {
    const form = document.getElementById('payrollPeriodForm');
    const modelSelect = document.getElementById('payrollPeriodModel');
    const from = document.getElementById('payrollPeriodFrom');
    const to = document.getElementById('payrollPeriodTo');
    const preview = document.getElementById('payrollPeriodPreview');
    const button = document.getElementById('exportPeriodPayroll');
    const money = value => 'Rp ' + Number(value || 0).toLocaleString('id-ID');
    const selection = () => Payroll.period(allTransactions, modelSelect.value, from.value, to.value);
    function refresh() {
        try {
            const data = selection();
            preview.textContent = `${data.rows.length} pencatatan · ${data.count} TRX · Bersih ${money(data.totals.net)}`;
            button.disabled = !data.rows.length;
        } catch (error) { preview.textContent = error.message; button.disabled = true; }
    }
    window.openPayrollPeriod = () => {
        const models = new Map();
        allTransactions.forEach(tx => { if (tx.model_id != null) models.set(String(tx.model_id), tx.model_name || 'Model'); });
        modelSelect.replaceChildren();
        const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Pilih model...'; modelSelect.append(placeholder);
        Array.from(models).sort((a, b) => a[1].localeCompare(b[1])).forEach(([id, name]) => {
            const option = document.createElement('option'); option.value = id;
            option.textContent = Array.from(models.values()).filter(value => value === name).length > 1 ? `${name} (#${id})` : name;
            modelSelect.append(option);
        });
        const selectedName = document.getElementById('modelFilter').value.toLowerCase();
        const matches = Array.from(models).filter(([,name]) => name.toLowerCase() === selectedName);
        if (matches.length === 1) modelSelect.value = matches[0][0];
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
        from.value = document.getElementById('fromDate').value || today.slice(0,7) + '-01';
        to.value = document.getElementById('toDate').value || today;
        document.getElementById('payrollPeriodModal').classList.remove('hidden');
        refresh();
    };
    window.closePayrollPeriod = () => document.getElementById('payrollPeriodModal').classList.add('hidden');
    form.addEventListener('input', refresh);
    form.addEventListener('change', refresh);
    form.addEventListener('submit', event => {
        event.preventDefault();
        try {
            const { rows, totals, count } = selection();
            if (!rows.length) return showToast('Tidak ada transaksi model pada periode tersebut.', 'error');
            const pdf = SkyPdf;
            const name = rows[0].model_name || modelSelect.selectedOptions[0].textContent;
            pdf.download({
                prefix: 'GAJI', title: 'Slip Gaji Model',
                context: `Model: ${name}\nPeriode: ${pdf.date(from.value)} - ${pdf.date(to.value)}\n${rows.length} pencatatan / ${count} TRX`,
                sections: [{
                    title: 'Ringkasan Pendapatan', columns: ['Keterangan', 'Nominal'], numeric: [1],
                    rows: [['Jumlah TRX', count], ['Rata-rata Bersih/TRX', pdf.money(Payroll.netRate({net_amount:totals.net,transaction_count:count}))]],
                    totals: ['PENDAPATAN BERSIH MODEL', pdf.money(totals.net)]
                }, {
                    title: 'Rincian Pendapatan', columns: ['Tanggal', 'Jumlah TRX', 'Rate Bersih/TRX', 'Pendapatan Bersih'], numeric: [1,2,3],
                    rows: rows.map(tx => [pdf.date(tx.transaction_day || tx.transaction_date), tx.transaction_count,
                        pdf.money(Payroll.netRate(tx)), pdf.money(tx.net_amount)]),
                    totals: ['TOTAL', count, pdf.money(Payroll.netRate({net_amount:totals.net,transaction_count:count})), pdf.money(totals.net)]
                }],
                signatures: ['Finance', 'Model']
            });
        } catch (error) { showToast(error.message || 'Slip gaji gagal dibuat.', 'error'); }
    });
})();
