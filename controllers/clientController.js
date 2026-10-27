const db = require('../config/database');

const ensureClientsTable = require('../database/payroll-schema');

function parseDeductions(body) {
  const values = ['safety_fee', 'admin_fee', 'other_deduction'].map(name => Number(body[name] ?? 0));
  if (values.some(value => !Number.isFinite(value) || value < 0 || value > 9999999999.99)) {
    const error = new Error('Potongan client harus berupa angka nol atau lebih (maksimal 9.999.999.999,99)');
    error.status = 400;
    throw error;
  }
  return values;
}

exports.getClients = async (req, res) => {
  try {
    await ensureClientsTable();
    const result = await db.query('SELECT * FROM clients ORDER BY client_name ASC');
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get clients error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.createClient = async (req, res) => {
  try {
    await ensureClientsTable();
    const { client_name, address, contact_name, contact_phone } = req.body;
    const deductions = parseDeductions(req.body);
    if (!String(client_name || '').trim()) {
      return res.status(400).json({ success: false, message: 'client_name wajib diisi' });
    }

    const result = await db.query(
      `INSERT INTO clients (client_name, address, contact_name, contact_phone, safety_fee, admin_fee, other_deduction)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [String(client_name).trim(), address || null, contact_name || null, contact_phone || null, ...deductions]
    );

    return res.json({ success: true, message: 'Client berhasil ditambahkan', data: result.rows[0] });
  } catch (error) {
    console.error('Create client error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    await ensureClientsTable();
    const { id } = req.params;
    const { client_name, address, contact_name, contact_phone } = req.body;
    const existing = await db.query('SELECT * FROM clients WHERE id = $1', [id]);
    const deductions = parseDeductions({ ...existing.rows[0], ...req.body });
    if (!String(client_name || '').trim()) {
      return res.status(400).json({ success: false, message: 'client_name wajib diisi' });
    }

    const result = await db.query(
      `UPDATE clients
       SET client_name = $1,
           address = $2,
           contact_name = $3,
           contact_phone = $4,
           safety_fee = $5, admin_fee = $6, other_deduction = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [String(client_name).trim(), address || null, contact_name || null, contact_phone || null, ...deductions, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Client berhasil diupdate', data: result.rows[0] });
  } catch (error) {
    console.error('Update client error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

exports.deleteClient = async (req, res) => {
  try {
    await ensureClientsTable();
    const { id } = req.params;
    const result = await db.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client tidak ditemukan' });
    }
    return res.json({ success: true, message: 'Client berhasil dihapus' });
  } catch (error) {
    console.error('Delete client error:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};
