const { test } = require('node:test');
const assert = require('node:assert/strict');
const Payroll = require('../public/js/payroll');

test('client safety/admin multiply by TRX; other, fine and advance apply once', () => {
    assert.deepEqual(Payroll.calculate({ transaction_count: 3, model_rate: 500000,
        safety_fee: 10000, client_admin_fee: 5000, other_deduction: 25000,
        fine: 20000, cash_advance: 50000, agent_fee_per_trx: 20000 }),
    { gross: 1500000, safety: 30000, admin: 15000, other: 25000, fine: 20000, cash: 50000, agent: 60000, refund:0,net: 1300000 });
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
    {gross: 400000, safety: 0, admin: 0, other: 0, fine: 50000, cash: 0, agent: 40000, refund:0,net: 310000});
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

test('period payroll includes both dates, combines clients, and selects model ID rather than duplicate names', () => {
    const rows = [
        {id:1,model_id:11,model_name:'Same Name',client_name:'A',transaction_day:'2026-10-01',transaction_date:'2026-09-30T17:00:00Z',transaction_count:2,gross_amount:500000,safety_fee:10000,client_admin_fee:10000,agent_fee_amount:60000,fine:0,net_amount:400000},
        {id:2,model_id:11,model_name:'Same Name',client_name:'B',transaction_day:'2026-10-31',transaction_count:1,gross_amount:300000,safety_fee:5000,client_admin_fee:5000,other_deduction:10000,fine:20000,cash_advance:30000,agent_fee_amount:20000,net_amount:210000},
        {id:3,model_id:12,model_name:'Same Name',transaction_day:'2026-10-15',transaction_count:1,gross_amount:900000,net_amount:900000},
        {id:4,model_id:11,transaction_day:'2026-11-01',transaction_count:1,gross_amount:900000,net_amount:900000}
    ];
    const result=Payroll.period(rows,'11','2026-10-01','2026-10-31');
    assert.deepEqual(result.rows.map(row=>row.id),[1,2]);
    assert.equal(result.count,3);
    assert.deepEqual(result.totals,{gross:800000,safety:25000,admin:25000,other:10000,fine:20000,cash:30000,agent:80000,refund:0,net:610000});
});
test('period payroll rejects reversed or invalid dates and missing model, and returns no rows for empty periods', () => {
    assert.throws(()=>Payroll.period([],11,'2026-10-31','2026-10-01'),/Tanggal akhir/);
    assert.throws(()=>Payroll.period([],11,'2026-02-31','2026-03-01'),/valid/);
    assert.throws(()=>Payroll.period([],'','2026-10-01','2026-10-31'),/Pilih model/);
    assert.equal(Payroll.period([],11,'2026-10-01','2026-10-31').rows.length,0);
});
test('an explicit rate correction recalculates invoice/payroll using saved client and agent rates', () => {
    const stored = {transaction_count:2,model_rate:250000,safety_fee:10000,client_admin_fee:10000,other_deduction:0,fine:0,cash_advance:0,agent_fee_per_trx:30000};
    const corrected = {...stored,model_rate:230000};
    assert.equal(Payroll.calculate(corrected).gross,460000);
    assert.equal(Payroll.calculate(corrected).net,360000);
    assert.equal(Payroll.invoice(corrected).total,420000);
    assert.equal(stored.model_rate,250000);
});
test('rate correction can expose overpayment without changing the amount received', () => {
    const tx={transaction_count:2,model_rate:230000,safety_fee:10000,client_admin_fee:10000,amount_paid:460000};
    assert.deepEqual(Payroll.balance(tx),{invoice:420000,paid:460000,outstanding:0,overpaid:40000});
    assert.equal(tx.amount_paid,460000);
    assert.deepEqual(Payroll.balance({...tx,amount_paid:200000}),{invoice:420000,paid:200000,outstanding:220000,overpaid:0});
});
test('negative invoice with no actual receipt does not fabricate an overpayment', () => {
    assert.equal(Payroll.balance({transaction_count:1,model_rate:10000,other_deduction:20000,amount_paid:0}).overpaid,0);
});
test('custom model salary is independent of client rates and client deductions',()=>{
 const data={transaction_count:2,model_rate:250000,salary_rate:180000,safety_fee:10000,client_admin_fee:10000,other_deduction:5000,fine:10000,cash_advance:20000,agent_fee_per_trx:30000};
 assert.equal(Payroll.calculate(data).net,270000);
 assert.equal(Payroll.calculate({...data,model_rate:230000,safety_fee:70000,client_admin_fee:60000,other_deduction:100000}).net,270000);
 assert.deepEqual(Payroll.modelPay({...data,gross_amount:500000,model_gross_amount:360000,agent_fee_amount:60000,net_amount:270000}),{gross:360000,rate:180000,agent:60000,fine:10000,cash:20000,refund:0,net:270000});
});
test('historical model gross is reconstructed from stored net and own deductions, not current master rate',()=>{
 assert.deepEqual(Payroll.modelPay({transaction_count:2,gross_amount:999999,admin_fee:0,fine:10000,cash_advance:20000,agent_fee_amount:60000,net_amount:270000}),{gross:360000,rate:180000,agent:60000,fine:10000,cash:20000,refund:0,net:270000});
});

test('refund increases model net once without changing client invoice or gross', () => {
 const input={transaction_count:2,model_rate:250000,salary_rate:180000,safety_fee:10000,client_admin_fee:10000,agent_fee_per_trx:30000,fine:10000,cash_advance:20000,refund:15000.25};
 const totals=Payroll.calculate(input);
 assert.equal(totals.net,285000.25);
 assert.equal(totals.refund,15000.25);
 assert.equal(Payroll.invoice(input).total,460000);
 const tx={...input,gross_amount:totals.gross,net_amount:totals.net,agent_fee_amount:totals.agent};
 assert.equal(Payroll.modelPay(tx).gross,360000);
 const {salary_rate,...legacy}=tx;
 assert.equal(Payroll.modelPay(legacy).gross,360000);
 const period=Payroll.period([{...tx,model_id:1,transaction_day:'2026-11-01'}],1,'2026-11-01','2026-11-01');
 assert.equal(period.totals.refund,15000.25);
 assert.equal(period.totals.net,285000.25);
});
