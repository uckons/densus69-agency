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
                    rows: [['Gross', pdf.money(totals.gross)], ['Safety', '-' + pdf.money(totals.safety)],
                        ['Admin Fee Client', '-' + pdf.money(totals.admin)], ['Lain-lain', '-' + pdf.money(totals.other)],
                        ['Denda', '-' + pdf.money(totals.fine)], ['Cash Advance', '-' + pdf.money(totals.cash)], ['Agent Fee', '-' + pdf.money(totals.agent)]],
                    totals: ['PENDAPATAN BERSIH MODEL', pdf.money(totals.net)]
                }, {
                    title: 'Rincian Transaksi', columns: ['Tanggal / Client / Grade', 'TRX', 'Gross', 'Potongan', 'Bersih'], numeric: [1,2,3,4],
                    rows: rows.map(tx => {
                        const values = Payroll.breakdown(tx);
                        const deductions = values.safety + values.admin + values.other + values.fine + values.cash + values.agent;
                        return [pdf.date(tx.transaction_day || tx.transaction_date) + '\n' + (tx.client_name || '-') + '\n' + (tx.model_grade_name || '-') + '\nRate: ' + pdf.money(tx.model_rate), tx.transaction_count, pdf.money(values.gross), pdf.money(deductions), pdf.money(values.net)];
                    }),
                    totals: ['TOTAL', count, pdf.money(totals.gross), pdf.money(totals.safety + totals.admin + totals.other + totals.fine + totals.cash + totals.agent), pdf.money(totals.net)]
                }],
                signatures: ['Finance', 'Model']
            });
        } catch (error) { showToast(error.message || 'Slip gaji gagal dibuat.', 'error'); }
    });
})();
