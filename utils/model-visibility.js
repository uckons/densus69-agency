const Payroll = require('../public/js/payroll');
const pick = (value, keys) => value && Object.fromEntries(keys.filter(key => value[key] !== undefined).map(key => [key, value[key]]));
const profile = value => pick(value, ['id','user_id','model_id','full_name','email','phone','address','date_of_birth','gender','height','weight','measurements','bust_size','waist_size','hip_size','experience_level','bio','status','is_active','photo','cover_photo','created_at','updated_at']);
const publicProfile = value => pick(value, ['id','full_name','height','weight','measurements','gender','experience_level','bio','status','is_active','photo','cover_photo']);
const transaction = value => ({id:value.id,transaction_date:value.transaction_day || value.transaction_date,transaction_count:Number(value.transaction_count || 0),net_rate:Payroll.netRate(value),net_amount:Number(value.net_amount || 0)});
const job = value => value && ({...pick(value, ['id','title','description','client_name','job_date','location','status','created_at','updated_at','assigned_model_count','unassigned_model_count','total_model_count']),
    ...(Array.isArray(value.assigned_models) ? {assigned_models:value.assigned_models.map(model => pick(model,['id','full_name']))} : {})});
const booking = value => value && ({...pick(value,['id','job_id','model_id','status','job_title','client_name','job_date','booking_date','created_at','updated_at']),...(value.job?{job:job(value.job)}:{})});
module.exports={profile,publicProfile,transaction,job,booking};
