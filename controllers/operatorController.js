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
