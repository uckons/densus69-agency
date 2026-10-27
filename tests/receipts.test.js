const {test}=require('node:test');
const assert=require('node:assert/strict');
const {summarize}=require('../utils/receipts');
test('an invoice is not automatically treated as cash received',()=>{
 const result=summarize([{transaction_day:'2026-10-24',invoice_amount:460000,outstanding:460000}],[]);
 assert.equal(result.totalRevenue,0);assert.equal(result.totalInvoiced,460000);assert.equal(result.outstanding,460000);
});
test('cash uses receipt date even when the invoice belongs to an earlier period',()=>{
 const result=summarize([{transaction_day:'2026-09-01',invoice_amount:460000,outstanding:260000}],
 [{receipt_date:'2026-10-27',amount:200000},{receipt_date:'2026-09-02',amount:100000}],'2026-10-01','2026-10-31');
 assert.equal(result.totalRevenue,200000);assert.equal(result.totalInvoiced,0);assert.equal(result.receiptCount,1);
});
test('partial receipts and exact decimal totals keep outstanding separate',()=>{
 const result=summarize([{transaction_day:'2026-10-27',invoice_amount:100.30,outstanding:0.10}],
 [{receipt_date:'2026-10-27',amount:50.10},{receipt_date:'2026-10-27',amount:50.10}]);
 assert.equal(result.totalRevenue,100.20);assert.equal(result.outstanding,0.10);
});
