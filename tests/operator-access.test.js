const {test}=require('node:test');
const assert=require('node:assert/strict');
const {isAdmin,isModel,isTransactionStaff}=require('../middleware/auth');

function check(guard,role) {
    let next=false,status;
    const res={status(code){status=code;return this;},json(){return this;}};
    guard({user:role?{role}:undefined},res,()=>{next=true;});
    return {next,status};
}
test('operators can manage transactions while master administration stays admin-only',()=>{
    for(const role of ['admin','operator'])assert.equal(check(isTransactionStaff,role).next,true);
    for(const role of ['model','client',undefined])assert.equal(check(isTransactionStaff,role).status,403);
    assert.equal(check(isAdmin,'operator').status,403);
    assert.equal(check(isModel,'operator').status,403);
    assert.equal(check(isAdmin,'admin').next,true);
});
