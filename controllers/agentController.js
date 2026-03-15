const db = require('../config/database');
const bcrypt = require('bcryptjs');


async function ensureModelAgentColumns() {
  await db.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL');
  await db.query('ALTER TABLE models ADD COLUMN IF NOT EXISTS agent_fee_percent DECIMAL(5,2) DEFAULT 0');
}


// Get all agents
exports.getAllAgents = async (req, res) => {
  try {
    await ensureModelAgentColumns();

    const result = await db.query(`
      SELECT
        a.*, u.email,
        COUNT(DISTINCT m.id) AS managed_models,
        COALESCE(SUM(t.gross_amount), 0) AS total_revenue,
        COALESCE(SUM(t.gross_amount * COALESCE(m.agent_fee_percent, 0) / 100), 0) AS total_agent_fee,
        COALESCE(SUM(t.gross_amount - t.admin_fee - (t.gross_amount * COALESCE(m.agent_fee_percent, 0) / 100)), 0) AS total_model_fee
      FROM agents a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN models m ON m.agent_id = a.id
      LEFT JOIN transactions t ON t.model_id = m.id
      GROUP BY a.id, u.email
      ORDER BY a.created_at DESC
    `);

    res.json({ success: true, agents: result.rows });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single agent
exports.getAgent = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`
      SELECT a.*, u.email
      FROM agents a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    
    res.json({ success: true, agent: result.rows[0] });
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create agent
exports.createAgent = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { email, password, full_name, phone, address, commission_rate, photo } = req.body;
    
    // Validate input
    if (!email || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'Email, password, and full name are required' });
    }
    
    await client.query('BEGIN');
    
    // Check if email already exists
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with 'operator' role
    const userResult = await client.query(
      'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, 'operator']
    );
    
    const userId = userResult.rows[0].id;
    
    // Create agent
    const agentResult = await client.query(
      `INSERT INTO agents (user_id, full_name, phone, address, commission_rate, photo, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')
       RETURNING *`,
      [userId, full_name, phone || null, address || null, commission_rate || 10.00, photo || null]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Agent created successfully', 
      agent: { ...agentResult.rows[0], email } 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create agent error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// Update agent
exports.updateAgent = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { email, password, full_name, phone, address, commission_rate, status, photo } = req.body;
    
    await client.query('BEGIN');
    
    // Get agent's user_id
    const agentResult = await client.query('SELECT user_id FROM agents WHERE id = $1', [id]);
    if (agentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    
    const userId = agentResult.rows[0].user_id;
    
    // Update user email and password if provided
    if (email) {
      let userQuery = 'UPDATE users SET email = $1';
      let userParams = [email];
      
      if (password && password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        userQuery += ', password = $2';
        userParams.push(hashedPassword);
      }
      
      userQuery += ` WHERE id = $${userParams.length + 1}`;
      userParams.push(userId);
      
      await client.query(userQuery, userParams);
    }
    
    // Update agent
    const updateResult = await client.query(
      `UPDATE agents 
       SET full_name = $1, phone = $2, address = $3, commission_rate = $4, status = $5, photo = $6
       WHERE id = $7
       RETURNING *`,
      [full_name, phone, address, commission_rate || 10.00, status || 'active', photo, id]
    );
    
    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      message: 'Agent updated successfully', 
      agent: updateResult.rows[0] 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update agent error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};

// Delete agent
exports.deleteAgent = async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Get agent's user_id
    const agentResult = await client.query('SELECT user_id FROM agents WHERE id = $1', [id]);
    if (agentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }
    
    const userId = agentResult.rows[0].user_id;
    
    // Delete agent (cascade will delete user)
    await client.query('DELETE FROM agents WHERE id = $1', [id]);
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
    
    await client.query('COMMIT');
    
    res.json({ success: true, message: 'Agent deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete agent error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
};


// Get agent performance details
exports.getAgentPerformance = async (req, res) => {
  try {
    await ensureModelAgentColumns();
    const { id } = req.params;

    const agentInfo = await db.query(
      `SELECT a.id, a.full_name, a.commission_rate, u.email
       FROM agents a
       JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [id]
    );

    if (agentInfo.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    const models = await db.query(
      `SELECT m.id, m.full_name, m.rate, COALESCE(m.agent_fee_percent, 0) AS agent_fee_percent,
              COUNT(t.id) AS transaction_count,
              COALESCE(SUM(t.gross_amount), 0) AS revenue,
              COALESCE(SUM(t.gross_amount * COALESCE(m.agent_fee_percent, 0) / 100), 0) AS agent_fee,
              COALESCE(SUM(t.gross_amount - t.admin_fee - (t.gross_amount * COALESCE(m.agent_fee_percent, 0) / 100)), 0) AS model_fee
       FROM models m
       LEFT JOIN transactions t ON t.model_id = m.id
       WHERE m.agent_id = $1
       GROUP BY m.id
       ORDER BY revenue DESC`,
      [id]
    );

    return res.json({
      success: true,
      agent: agentInfo.rows[0],
      models: models.rows,
      summary: {
        totalModels: models.rows.length,
        totalRevenue: models.rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
        totalAgentFee: models.rows.reduce((sum, row) => sum + Number(row.agent_fee || 0), 0),
        totalModelFee: models.rows.reduce((sum, row) => sum + Number(row.model_fee || 0), 0)
      }
    });
  } catch (error) {
    console.error('Get agent performance error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
