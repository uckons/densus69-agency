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
    return { calculate, breakdown, invoice, formula: 'Gross - ((Safety + Admin Fee Client) x TRX) - Lain-lain - Denda - Cash Advance - Agent Fee' };
});
