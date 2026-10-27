const db = require('../config/database');
const Payroll = require('../public/js/payroll');
const ensure = require('../database/payroll-schema');
const cents = value => Math.round(Number(value) * 100);
const invoiceSql = (alias = 't') => `(${alias}.transaction_count * ${alias}.model_rate - ${alias}.transaction_count * (COALESCE(${alias}.safety_fee, 0) + COALESCE(${alias}.client_admin_fee, 0)) - COALESCE(${alias}.other_deduction, 0))`;

async function attach(transactions) {
    await ensure();
    const result = await db.query(`SELECT id, transaction_id, amount, TO_CHAR(payment_date, 'YYYY-MM-DD') AS payment_date, method, reference
        FROM client_payments WHERE voided_at IS NULL AND transaction_id = ANY($1::int[]) ORDER BY payment_date, id`, [transactions.map(tx => tx.id)]);
    const byTransaction = new Map();
    for (const payment of result.rows) {
        if (!byTransaction.has(payment.transaction_id)) byTransaction.set(payment.transaction_id, []);
        byTransaction.get(payment.transaction_id).push(payment);
    }
    return transactions.map(tx => {
        const payments = byTransaction.get(tx.id) || [];
        const invoice = Payroll.invoice(tx).total;
        const paid = payments.reduce((total, payment) => total + cents(payment.amount), 0) / 100;
        return { ...tx, payments, invoice_amount: invoice, amount_paid: paid, outstanding: Math.max(cents(invoice) - cents(paid), 0) / 100 };
    });
}

async function all() {
    await ensure();
    const [transactions, payments] = await Promise.all([
        db.query("SELECT *, TO_CHAR(transaction_date, 'YYYY-MM-DD') AS transaction_day FROM transactions"),
        db.query(`SELECT p.*, TO_CHAR(p.payment_date, 'YYYY-MM-DD') AS receipt_date,
            t.model_id, t.client_name, m.full_name AS model_name, g.grade_name
            FROM client_payments p JOIN transactions t ON t.id=p.transaction_id
            LEFT JOIN models m ON m.id=t.model_id LEFT JOIN model_grades g ON g.id=m.grade_id
            WHERE p.voided_at IS NULL ORDER BY p.payment_date, p.id`)
    ]);
    return { transactions: await attach(transactions.rows), payments: payments.rows };
}

function summarize(transactions, payments, start = '', end = '') {
    const selected = transactions.filter(tx => {
        const day = tx.transaction_day || (typeof tx.transaction_date === 'string' ? tx.transaction_date.slice(0, 10) : tx.transaction_date?.toISOString().slice(0, 10));
        return (!start || day >= start) && (!end || day <= end);
    });
    const receipts = payments.filter(p => (!start || p.receipt_date >= start) && (!end || p.receipt_date <= end));
    return {
        totalRevenue: receipts.reduce((sum, p) => sum + cents(p.amount), 0) / 100,
        totalInvoiced: selected.reduce((sum, tx) => sum + cents(tx.invoice_amount), 0) / 100,
        outstanding: selected.reduce((sum, tx) => sum + cents(tx.outstanding), 0) / 100,
        receiptCount: receipts.length, receipts, selected
    };
}
module.exports = { attach, all, summarize, invoiceSql, cents };
