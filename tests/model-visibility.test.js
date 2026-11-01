const {test}=require('node:test');const assert=require('node:assert/strict');
const Visibility=require('../utils/model-visibility');
const confidential={rate:730123.45,model_rate:730123.45,gross_amount:1460246.90,admin_fee:4567,safety_fee:10000,other_deduction:1000,agent_fee_flat:8000,payment_offered:987654.32,payment_amount:987654.32,private_future_fee:123456};
test('profile and public serializers never include financial fields, including future fields',()=>{
 for(const fn of [Visibility.profile,Visibility.publicProfile,Visibility.job,Visibility.booking]){
  const result=fn({...confidential,id:1,full_name:'Model'});
  for(const key of Object.keys(confidential))assert.ok(!(key in result),key);
 }
});
test('model earnings expose model salary and own deductions without client financials',()=>{
 assert.deepEqual(Visibility.transaction({...confidential,id:4,transaction_day:'2026-10-27',transaction_count:2,salary_rate:180000,model_gross_amount:360000,agent_fee_amount:60000,fine:10000,cash_advance:20000,net_amount:270000}),{id:4,transaction_date:'2026-10-27',transaction_count:2,salary_rate:180000,model_gross_amount:360000,agent_fee:60000,fine:10000,cash_advance:20000,refund:0,model_bonus:0,net_rate:135000,net_amount:270000});
});
test('nested booking jobs cannot expose client offers',()=>{
 const result=Visibility.booking({id:1,payment_amount:123456,job:{...confidential,id:5,title:'Job'}});
 assert.equal(result.job.title,'Job');assert.ok(!('payment_amount' in result));assert.ok(!('payment_offered' in result.job));
});

test('assigned model entries on public jobs expose names without embedded rates',()=>{
 const result=Visibility.job({id:1,assigned_models:[{id:2,full_name:'Model',rate:730123.45,agent_fee_flat:8000}]});
 assert.deepEqual(result.assigned_models,[{id:2,full_name:'Model'}]);
});
