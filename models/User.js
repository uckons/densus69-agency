const db = require('../config/database');

const User = {
  // Create a new user
  create: async (userData) => {
    const { email, password, role = 'model' } = userData;
    const query = `
      INSERT INTO users (email, password, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, role, created_at, updated_at
    `;
    const result = await db.query(query, [email, password, role]);
    return result.rows[0];
  },

  // Find user by ID
  findById: async (id) => {
    const query = 'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find user by email
  findByEmail: async (email) => {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  },

  // Find all users
  findAll: async (filters = {}) => {
    let query = 'SELECT id, email, role, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.role) {
      query += ` AND role = $${paramCount}`;
      params.push(filters.role);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    const result = await db.query(query, params);
    return result.rows;
  },

  // Update user
  update: async (id, userData) => {
    const { email, password, role } = userData;
    const updates = [];
    const params = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      params.push(email);
      paramCount++;
    }

    if (password !== undefined) {
      updates.push(`password = $${paramCount}`);
      params.push(password);
      paramCount++;
    }

    if (role !== undefined) {
      updates.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, role, created_at, updated_at
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Update password
  updatePassword: async (id, hashedPassword) => {
    const query = `
      UPDATE users 
      SET password = $1
      WHERE id = $2
      RETURNING id, email, role
    `;
    const result = await db.query(query, [hashedPassword, id]);
    return result.rows[0];
  },

  // Delete user
  delete: async (id) => {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Count users by role
  countByRole: async (role) => {
    const query = 'SELECT COUNT(*) as count FROM users WHERE role = $1';
    const result = await db.query(query, [role]);
    return parseInt(result.rows[0].count);
  },

  // Get total count
  count: async () => {
    const query = 'SELECT COUNT(*) as count FROM users';
    const result = await db.query(query);
    return parseInt(result.rows[0].count);
  },

  // Check if email exists
  emailExists: async (email, excludeId = null) => {
    let query = 'SELECT id FROM users WHERE email = $1';
    const params = [email];

    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }

    const result = await db.query(query, params);
    return result.rows.length > 0;
  }
};

module.exports = User;
