const db = require('../config/database');

exports.showProfile = async (req, res) => {
    try {
        const result = await db.query('SELECT id, email, role, created_at FROM users WHERE id=$1', [req.user.userId || req.user.id]);
        if (!result.rows[0]) return res.status(404).send('Akun tidak ditemukan');
        res.render('operator/profile', {user:result.rows[0]});
    } catch (error) {
        console.error('Operator profile error:', error);
        res.status(500).send('Gagal memuat profil');
    }
};

const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !Number.isNaN(new Date(value).getTime()) && new Date(value).toISOString().slice(0,10) === value;
const ownAgent = async req => (await db.query('SELECT id, full_name FROM agents WHERE user_id=$1', [req.user.userId || req.user.id])).rows[0] || null;
const feeSql = 'COALESCE(t.agent_fee_amount, GREATEST(COALESCE(t.gross_amount,0)-COALESCE(t.admin_fee,0)-COALESCE(t.net_amount,0)+COALESCE(t.refund,0)+COALESCE(t.model_bonus,0),0))';

exports.showEarnings = async (req, res) => {
    try {
        const from = req.query.from || '', to = req.query.to || '';
        if ((from && !validDay(from)) || (to && !validDay(to)) || (from && to && from > to)) return res.status(400).send('Rentang tanggal tidak valid');
        const agent = await ownAgent(req);
        const params = [req.user.userId || req.user.id, from || null, to || null];
        const source = `FROM transactions t JOIN models m ON m.id=t.model_id JOIN agents a ON a.id=m.agent_id
            WHERE a.user_id=$1 AND ($2::date IS NULL OR t.transaction_date >= $2::date) AND ($3::date IS NULL OR t.transaction_date <= $3::date)`;
        const summary = (await db.query(`SELECT COALESCE(SUM(${feeSql}),0) AS total_fee,
            COALESCE(SUM(t.transaction_count),0) AS total_trx, COUNT(*) AS records ${source}`, params)).rows[0];
        const rows = (await db.query(`SELECT t.id, TO_CHAR(t.transaction_date,'YYYY-MM-DD') AS day,
            m.full_name AS model_name, t.transaction_count, ${feeSql} AS fee ${source}
            ORDER BY t.transaction_date DESC,t.id DESC LIMIT 200`, params)).rows;
        res.render('operator/earnings', {user:req.user,agent,summary,rows,from,to});
    } catch (error) {
        console.error('Operator earnings error:',error);
        res.status(500).send('Gagal memuat pendapatan');
    }
};

exports.showModels = async (req, res) => {
    try {
        const agent = await ownAgent(req);
        const models = (await db.query(`SELECT m.id,m.full_name,m.status,m.phone,g.grade_name
            FROM models m JOIN agents a ON a.id=m.agent_id LEFT JOIN model_grades g ON g.id=m.grade_id
            WHERE a.user_id=$1 ORDER BY m.full_name,m.id`, [req.user.userId || req.user.id])).rows;
        res.render('operator/models', {user:req.user,agent,models});
    } catch (error) {
        console.error('Operator models error:',error);
        res.status(500).send('Gagal memuat model binaan');
    }
};

exports.showModel = async (req, res) => {
    if (!/^[1-9][0-9]*$/.test(req.params.id) || !Number.isSafeInteger(Number(req.params.id))) return res.status(404).send('Model tidak ditemukan');
    try {
        const model = (await db.query(`SELECT m.id,m.full_name,m.phone,m.gender,m.height,m.weight,m.measurements,
            m.experience_level,m.bio,m.status,m.salary_rate,m.agent_fee_flat,g.grade_name
            FROM models m JOIN agents a ON a.id=m.agent_id LEFT JOIN model_grades g ON g.id=m.grade_id
            WHERE m.id=$1 AND a.user_id=$2`, [req.params.id,req.user.userId || req.user.id])).rows[0];
        if (!model) return res.status(404).send('Model tidak ditemukan');
        const photos = (await db.query('SELECT file_path,caption FROM photos WHERE model_id=$1 ORDER BY is_cover DESC,display_order,id', [model.id])).rows
            .filter(photo => /^\/?uploads\//.test(photo.file_path || ''))
            .map(photo => ({...photo,file_path:'/'+photo.file_path.replace(/^\//,'')}));
        res.render('operator/model-detail', {user:req.user,model,photos});
    } catch (error) {
        console.error('Operator model profile error:',error);
        res.status(500).send('Gagal memuat profil model');
    }
};
