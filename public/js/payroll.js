(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.Payroll = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const amount = value => Math.round(Number(value || 0) * 100) / 100;
    function calculate(data) {
        const count = Number(data.transaction_count);
        const gross = amount(count * Number(data.model_rate));
        const safety = amount(count * Number(data.safety_fee || 0));
        const admin = amount(count * Number(data.client_admin_fee || 0));
        const other = amount(data.other_deduction);
        const fine = amount(data.fine);
        const cash = amount(data.cash_advance);
        const agent = amount(count * Number(data.agent_fee_per_trx || 0));
        return { gross, safety, admin, other, fine, cash, agent, net: amount(gross - safety - admin - other - fine - cash - agent) };
    }
    function breakdown(tx) {
        const fine = Number(tx.fine ?? tx.admin_fee ?? 0);
        const count = Number(tx.transaction_count || 0);
        return {
            gross: Number(tx.gross_amount || 0),
            safety: amount(count * Number(tx.safety_fee || 0)),
            admin: amount(count * Number(tx.client_admin_fee || 0)),
            other: Number(tx.other_deduction || 0), fine, cash: Number(tx.cash_advance || 0),
            agent: Number(tx.agent_fee_total ?? tx.agent_fee_amount ?? Math.max(Number(tx.gross_amount || 0) - Number(tx.admin_fee || 0) - Number(tx.net_amount || 0), 0)),
            net: Number(tx.net_amount || 0)
        };
    }
    function invoice(tx) {
        const count = Number(tx.transaction_count || 0);
        const gross = amount(tx.model_rate == null ? tx.gross_amount : count * Number(tx.model_rate));
        const safety = amount(count * Number(tx.safety_fee || 0));
        const admin = amount(count * Number(tx.client_admin_fee || 0));
        const other = amount(tx.other_deduction);
        return { gross, safety, admin, other, total: amount(gross - safety - admin - other) };
    }
    function netRate(tx) { return Number(tx.transaction_count) > 0 ? amount(Number(tx.net_amount || 0) / Number(tx.transaction_count)) : 0; }
    function balance(tx) {
        const total = invoice(tx).total;
        const paid = amount(tx.amount_paid);
        return { invoice: total, paid, outstanding: amount(Math.max(total - paid, 0)), overpaid: amount(Math.max(paid - Math.max(total, 0), 0)) };
    }
    function period(transactions, modelId, start, end) {
        const validDate = day => /^\d{4}-\d{2}-\d{2}$/.test(day || '') && !Number.isNaN(new Date(day).getTime()) && new Date(day).toISOString().slice(0, 10) === day;
        if (!modelId) throw new Error('Pilih model untuk slip gaji.');
        if (!validDate(start) || !validDate(end)) throw new Error('Isi tanggal awal dan akhir yang valid.');
        if (start > end) throw new Error('Tanggal akhir tidak boleh sebelum tanggal awal.');
        const rows = transactions.filter(tx => {
            const day = tx.transaction_day || String(tx.transaction_date || '').slice(0, 10);
            return String(tx.model_id) === String(modelId) && day >= start && day <= end;
        }).sort((a, b) => String(a.transaction_day || a.transaction_date).localeCompare(String(b.transaction_day || b.transaction_date)) || Number(a.id) - Number(b.id));
        const totals = { gross: 0, safety: 0, admin: 0, other: 0, fine: 0, cash: 0, agent: 0, net: 0 };
        for (const tx of rows) {
            const values = breakdown(tx);
            for (const key of Object.keys(totals)) totals[key] = amount(totals[key] + values[key]);
        }
        return { rows, totals, count: rows.reduce((sum, tx) => sum + Number(tx.transaction_count || 0), 0) };
    }
    return { calculate, breakdown, invoice, balance, period, netRate, formula: 'Gross - ((Safety + Admin Fee Client) x TRX) - Lain-lain - Denda - Cash Advance - Agent Fee' };
});
