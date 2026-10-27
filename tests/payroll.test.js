const { test } = require('node:test');
const assert = require('node:assert/strict');
const Payroll = require('../public/js/payroll');

test('client safety/admin multiply by TRX; other, fine and advance apply once', () => {
    assert.deepEqual(Payroll.calculate({ transaction_count: 3, model_rate: 500000,
        safety_fee: 10000, client_admin_fee: 5000, other_deduction: 25000,
        fine: 20000, cash_advance: 50000, agent_fee_per_trx: 20000 }),
    { gross: 1500000, safety: 30000, admin: 15000, other: 25000, fine: 20000, cash: 50000, agent: 60000, net: 1300000 });
});
test('zero agent fee is not confused with client deductions', () => {
    const tx = { transaction_count: 2, gross_amount: 200000, net_amount: 100000,
        safety_fee: 10000, client_admin_fee: 5000, other_deduction: 10000,
        fine: 20000, cash_advance: 40000, agent_fee_total: 0 };
    assert.equal(Payroll.breakdown(tx).agent, 0);
    assert.equal(Payroll.breakdown(tx).fine, 20000);
});
test('legacy rows retain recorded fine, commission and net', () => {
    assert.deepEqual(Payroll.breakdown({transaction_count: 2, gross_amount: 400000,
        admin_fee: 50000, net_amount: 310000}),
    {gross: 400000, safety: 0, admin: 0, other: 0, fine: 50000, cash: 0, agent: 40000, net: 310000});
});
test('exact formula retains a negative balance instead of hiding an advance shortfall', () => {
    assert.equal(Payroll.calculate({transaction_count: 1, model_rate: 100000, cash_advance: 150000}).net, -50000);
});
test('rounds decimal money at each deduction to cents', () => {
    const result = Payroll.calculate({transaction_count: 3, model_rate: 100.10,
        safety_fee: 1.25, client_admin_fee: 0.50, other_deduction: 0.10,
        fine: 0.20, cash_advance: 0.30, agent_fee_per_trx: 2.05});
    assert.equal(result.net, 288.30);
});
test('client invoice subtracts only client deductions and ignores model payroll deductions', () => {
    const tx = { transaction_count: 2, model_rate: 250000, safety_fee: 10000,
        client_admin_fee: 10000, other_deduction: 15000,
        fine: 30000, cash_advance: 50000, agent_fee_amount: 60000, net_amount: 305000 };
    assert.deepEqual(Payroll.invoice(tx), {gross: 500000, safety: 20000, admin: 20000, other: 15000, total: 445000});
    assert.equal(Payroll.invoice({...tx, fine: 999999, cash_advance: 999999, agent_fee_amount: 999999}).total, 445000);
});
test('legacy admin fee is not treated as a client deduction on an invoice', () => {
    assert.equal(Payroll.invoice({transaction_count: 2, model_rate: 250000, admin_fee: 50000}).total, 500000);
});
