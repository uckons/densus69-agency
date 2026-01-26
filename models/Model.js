const db = require('../config/database');

const Model = {
  // Create a new model
  create: async (modelData) => {
    const {
      user_id, full_name, phone, date_of_birth, gender,
      height, weight, measurements, address, experience_level,
      bio, status = 'vacant', rate = 0, is_active = true
    } = modelData;

    const query = `
      INSERT INTO models (
        user_id, full_name, phone, date_of_birth, gender,
        height, weight, measurements, address, experience_level,
        bio, status, rate, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const params = [
      user_id, full_name, phone, date_of_birth, gender,
      height, weight, measurements, address, experience_level,
      bio, status, rate, is_active
    ];

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Find model by ID
  findById: async (id) => {
    const query = 'SELECT * FROM models WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find model by user ID
  findByUserId: async (userId) => {
    const query = 'SELECT * FROM models WHERE user_id = $1';
    const result = await db.query(query, [userId]);
    return result.rows[0];
  },

  // Find all models with optional filters
  findAll: async (filters = {}) => {
    let query = `
      SELECT m.*, u.email 
      FROM models m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND m.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND m.is_active = $${paramCount}`;
      params.push(filters.is_active);
      paramCount++;
    }

    if (filters.gender) {
      query += ` AND m.gender = $${paramCount}`;
      params.push(filters.gender);
      paramCount++;
    }

    if (filters.min_rate !== undefined) {
      query += ` AND m.rate >= $${paramCount}`;
      params.push(filters.min_rate);
      paramCount++;
    }

    if (filters.max_rate !== undefined) {
      query += ` AND m.rate <= $${paramCount}`;
      params.push(filters.max_rate);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (m.full_name ILIKE $${paramCount} OR m.bio ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ' ORDER BY m.created_at DESC';

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

  // Find active models
  findActive: async () => {
    const query = `
      SELECT m.*, u.email 
      FROM models m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.is_active = true
      ORDER BY m.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // Find available models (vacant status)
  findAvailable: async () => {
    const query = `
      SELECT m.*, u.email 
      FROM models m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.status = 'vacant' AND m.is_active = true
      ORDER BY m.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // Update model
  update: async (id, modelData) => {
    const {
      full_name, phone, date_of_birth, gender, height, weight,
      measurements, address, experience_level, bio, status, rate, is_active
    } = modelData;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount}`);
      params.push(full_name);
      paramCount++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      params.push(phone);
      paramCount++;
    }

    if (date_of_birth !== undefined) {
      updates.push(`date_of_birth = $${paramCount}`);
      params.push(date_of_birth);
      paramCount++;
    }

    if (gender !== undefined) {
      updates.push(`gender = $${paramCount}`);
      params.push(gender);
      paramCount++;
    }

    if (height !== undefined) {
      updates.push(`height = $${paramCount}`);
      params.push(height);
      paramCount++;
    }

    if (weight !== undefined) {
      updates.push(`weight = $${paramCount}`);
      params.push(weight);
      paramCount++;
    }

    if (measurements !== undefined) {
      updates.push(`measurements = $${paramCount}`);
      params.push(measurements);
      paramCount++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      params.push(address);
      paramCount++;
    }

    if (experience_level !== undefined) {
      updates.push(`experience_level = $${paramCount}`);
      params.push(experience_level);
      paramCount++;
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`);
      params.push(bio);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (rate !== undefined) {
      updates.push(`rate = $${paramCount}`);
      params.push(rate);
      paramCount++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      params.push(is_active);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `
      UPDATE models 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Update model status
  updateStatus: async (id, status) => {
    const query = `
      UPDATE models 
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  },

  // Update model rate
  updateRate: async (id, rate) => {
    const query = `
      UPDATE models 
      SET rate = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [rate, id]);
    return result.rows[0];
  },

  // Toggle active status
  toggleActive: async (id) => {
    const query = `
      UPDATE models 
      SET is_active = NOT is_active
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Delete model
  delete: async (id) => {
    const query = 'DELETE FROM models WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Get model with cover photo
  findByIdWithCover: async (id) => {
    const query = `
      SELECT m.*, p.file_path as cover_photo
      FROM models m
      LEFT JOIN photos p ON m.id = p.model_id AND p.is_cover = true
      WHERE m.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Get models with cover photos
  findAllWithCovers: async (filters = {}) => {
    let query = `
      SELECT m.*, u.email, p.file_path as cover_photo
      FROM models m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN photos p ON m.id = p.model_id AND p.is_cover = true
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND m.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND m.is_active = $${paramCount}`;
      params.push(filters.is_active);
      paramCount++;
    }

    query += ' ORDER BY m.created_at DESC';

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

  // Count models
  count: async (filters = {}) => {
    let query = 'SELECT COUNT(*) as count FROM models WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.is_active !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.is_active);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  },

  // Get model statistics
  getStats: async () => {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'vacant') as vacant,
        COUNT(*) FILTER (WHERE status = 'working') as working,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive,
        AVG(rate) as avg_rate
      FROM models
    `;
    const result = await db.query(query);
    return result.rows[0];
  }
};

module.exports = Model;
