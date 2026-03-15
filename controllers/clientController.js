const db = require('../config/database');

async function ensureClientsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      client_name VARCHAR(255) UNIQUE NOT NULL,
      address TEXT,
      contact_name VARCHAR(255),
      contact_phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

exports.getClients = async (req, res) => {
  try {
    await ensureClientsTable();
    const result = await db.query('SELECT * FROM clients ORDER BY client_name ASC');
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get clients error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.createClient = async (req, res) => {
  try {
    await ensureClientsTable();
    const { client_name, address, contact_name, contact_phone } = req.body;
    if (!client_name) {
      return res.status(400).json({ success: false, message: 'client_name wajib diisi' });
    }

    const result = await db.query(
      `INSERT INTO clients (client_name, address, contact_name, contact_phone)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [String(client_name).trim(), address || null, contact_name || null, contact_phone || null]
    );

    return res.json({ success: true, message: 'Client berhasil ditambahkan', data: result.rows[0] });
  } catch (error) {
    console.error('Create client error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateClient = async (req, res) => {
  try {
    await ensureClientsTable();
    const { id } = req.params;
    const { client_name, address, contact_name, contact_phone } = req.body;
    if (!client_name) {
      return res.status(400).json({ success: false, message: 'client_name wajib diisi' });
    }

    const result = await db.query(
      `UPDATE clients
       SET client_name = $1,
           address = $2,
           contact_name = $3,
           contact_phone = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [String(client_name).trim(), address || null, contact_name || null, contact_phone || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client tidak ditemukan' });
    }

    return res.json({ success: true, message: 'Client berhasil diupdate', data: result.rows[0] });
  } catch (error) {
    console.error('Update client error:', error);
    return res.status(500).json({ success: false, message: error.message });
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
    return res.status(500).json({ success: false, message: error.message });
  }
};
