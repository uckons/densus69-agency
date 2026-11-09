const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Payroll = require('../public/js/payroll');
const fixtures = [
    { id: 1, model_id: 7, model_name: 'Model', transaction_day: '2026-11-01', transaction_count: 3, salary_rate: 100000, model_gross_amount: 300000, agent_fee_amount: 30000, fine: 10000, cash_advance: 20000, refund: 5000, model_bonus: 5000, net_amount: 250000 },
    { id: 2, model_id: 7, model_name: 'Model', transaction_day: '2026-11-02', transaction_count: 1, net_amount: -5000 }
];
function pdf(capture) {
    return { money: value => Number(value || 0), date: value => value, download: capture, preview: capture };
}
function privateSlip(report) {
    const text = JSON.stringify(report);
    assert.doesNotMatch(text, /agent|fee|kotor|gross/i);
    assert.match(text, /Gaji Model per TRX/);
}
test('single payslip uses salary rate minus agent fee per TRX without exposing gross or fees in preview and download', () => {
    const template = fs.readFileSync('views/admin/transactions.ejs', 'utf8');
    const code = template.slice(template.indexOf('    function exportTransactionPdf('), template.indexOf('    function updateEditPayrollPreview('));
    for (const tx of fixtures) {
        let report;
        const context = { Payroll, lastTransactionDetail: { tx }, SkyPdf: pdf(value => { report = value; }) };
        vm.createContext(context);
        vm.runInContext(code, context);
        for (const mode of ['preview', 'download']) {
            context.exportTransactionPdf(mode);
            privateSlip(report);
            assert.equal(report.sections[0].rows[1][1], Payroll.payslipPay(tx).rate);
            assert.equal(report.sections[0].totals[1], tx.net_amount);
            const rows = report.sections[0].rows;
            assert.equal(rows[2][1], Payroll.payslipPay(tx).base);
            assert.deepEqual(Array.from(rows.slice(3), row => row[0]), ['Denda', 'Cash Advance', 'Refund', 'Bonus Model']);
            if (tx.id === 1) {
                assert.equal(rows[1][1], 90000);
                assert.equal(rows[2][1], 270000);
                assert.deepEqual(Array.from(rows.slice(3), row => row[1]), ['-10000', '-20000', '+5000', '+5000']);
            }
        }
    }
});
test('period payslip retains recorded totals, weighted net rate and negative earnings with visible adjustments and no fee details', () => {
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, { value: '', addEventListener(event, handler) { this[event] = handler; } });
        return elements.get(id);
    };
    let report;
    const context = { Payroll, allTransactions: fixtures, document: { getElementById: element }, window: {}, SkyPdf: pdf(value => { report = value; }), showToast: message => assert.fail(message) };
    element('payrollPeriodModel').value = '7';
    element('payrollPeriodFrom').value = '2026-11-01';
    element('payrollPeriodTo').value = '2026-11-02';
    vm.runInNewContext(fs.readFileSync('public/js/payroll-period.js', 'utf8'), context);
    element('payrollPeriodForm').submit({ preventDefault() {} });
    privateSlip(report);
    assert.equal(report.sections[0].rows[1][1], 265000 / 4);
    assert.equal(report.sections[0].totals[1], 245000);
    assert.match(JSON.stringify(report), /Denda/);
    assert.match(JSON.stringify(report), /Cash Advance/);
    assert.match(JSON.stringify(report), /Refund/);
    assert.match(JSON.stringify(report), /Bonus Model/);
    assert.equal(report.sections[1].rows[1][1], -5000);
    assert.equal(report.sections[1].rows[1][4], -5000);
    assert.equal(report.sections[1].totals[4], 245000);
});
