const db = require('../config/database');
const Payroll = require('../public/js/payroll');
const { cents } = require('../utils/receipts');
const ensure = require('../database/payroll-schema');
const { randomUUID } = require('node:crypto');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const respondError = (res, error) => res.status(error.status || (error.code === '23505' ? 409 : 500)).json({ success: false, message: error.status ? error.message : error.code === '23505' ? 'Permintaan pembayaran sudah tercatat. Muat ulang riwayat pembayaran.' : 'Gagal memproses pembayaran' });

exports.list = async (req, res) => {
    try {
        await ensure();
        const tx = (await db.query('SELECT * FROM transactions WHERE id=$1', [req.params.id])).rows[0];
        if (!tx) throw fail('Transaksi tidak ditemukan', 404);
        const result = await db.query(`SELECT p.*, TO_CHAR(payment_date, 'YYYY-MM-DD') AS receipt_date
            FROM client_payments p WHERE transaction_id=$1 ORDER BY created_at DESC, id DESC`, [tx.id]);
        const invoice = Payroll.invoice(tx).total;
        const paid = result.rows.filter(p => !p.voided_at).reduce((sum, p) => sum + cents(p.amount), 0) / 100;
        res.json({ success: true, data: { transaction: tx, invoice, paid, outstanding: Math.max(cents(invoice) - cents(paid), 0) / 100, payments: result.rows } });
    } catch (error) { respondError(res, error); }
};

exports.create = async (req, res) => {
    let client;
    try {
        await ensure();
        const { amount, payment_date, method = 'transfer', reference = '', notes = '' } = req.body;
        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0 || value > 9999999999.99 || Math.abs(value * 100 - cents(value)) > 0.0001) throw fail('Nominal pembayaran harus positif, maksimal dua angka desimal');
        if (!/^\d{4}-\d{2}-\d{2}$/.test(payment_date || '') || Number.isNaN(new Date(payment_date).getTime()) || new Date(payment_date).toISOString().slice(0, 10) !== payment_date || payment_date > today()) throw fail('Tanggal pembayaran harus valid dan tidak boleh di masa depan');
        if (!['transfer', 'cash', 'other'].includes(method)) throw fail('Metode pembayaran tidak valid');
        if (String(reference).length > 150 || String(notes).length > 1000) throw fail('Referensi atau catatan terlalu panjang');
        const key = req.body.request_key || randomUUID();
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) throw fail('ID permintaan pembayaran tidak valid');
        client = await db.pool.connect();
        await client.query('BEGIN');
        const tx = (await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id])).rows[0];
        if (!tx) throw fail('Transaksi tidak ditemukan', 404);
        const duplicate = (await client.query("SELECT *, TO_CHAR(payment_date, 'YYYY-MM-DD') AS receipt_date FROM client_payments WHERE request_key=$1", [key])).rows[0];
        if (duplicate) {
            if (duplicate.transaction_id !== tx.id || cents(duplicate.amount) !== cents(value) || duplicate.receipt_date !== payment_date || duplicate.method !== method || duplicate.reference !== String(reference).trim() || duplicate.notes !== String(notes).trim() || duplicate.voided_at) throw fail('ID permintaan sudah dipakai untuk pembayaran lain', 409);
            await client.query('COMMIT');
            return res.json({ success: true, data: duplicate });
        }
        const paid = (await client.query('SELECT COALESCE(SUM(amount),0) AS total FROM client_payments WHERE transaction_id=$1 AND voided_at IS NULL', [tx.id])).rows[0].total;
        if (cents(value) > cents(Payroll.invoice(tx).total) - cents(paid)) throw fail('Pembayaran melebihi sisa tagihan', 409);
        const result = await client.query(`INSERT INTO client_payments(transaction_id,amount,payment_date,method,reference,notes,request_key,created_by)
            VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [tx.id,value,payment_date,method,String(reference).trim(),String(notes).trim(),key,req.user.userId || req.user.id || null]);
        await client.query('COMMIT');
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        respondError(res, error);
    } finally { client?.release(); }
};

exports.void = async (req, res) => {
    let client;
    try {
        await ensure();
        const reason = String(req.body.reason || '').trim();
        if (!reason || reason.length > 500) throw fail('Isi alasan pembatalan, maksimal 500 karakter');
        client = await db.pool.connect();
        await client.query('BEGIN');
        await client.query('SELECT id FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id]);
        const payment = (await client.query('SELECT * FROM client_payments WHERE id=$1 AND transaction_id=$2 FOR UPDATE', [req.params.paymentId,req.params.id])).rows[0];
        if (!payment) throw fail('Pembayaran tidak ditemukan', 404);
        if (!payment.voided_at) await client.query('UPDATE client_payments SET voided_at=NOW(),voided_by=$1,void_reason=$2 WHERE id=$3', [req.user.userId || req.user.id || null,reason,payment.id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        respondError(res, error);
    } finally { client?.release(); }
};
