const db = require('../config/database');

const Photo = {
  // Create a new photo
  create: async (photoData) => {
    const {
      model_id, file_path, file_name,
      is_cover = false, caption, display_order = 0
    } = photoData;

    const query = `
      INSERT INTO photos (
        model_id, file_path, file_name, is_cover, caption, display_order
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const params = [model_id, file_path, file_name, is_cover, caption, display_order];
    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Find photo by ID
  findById: async (id) => {
    const query = 'SELECT * FROM photos WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find all photos for a model
  findByModelId: async (modelId) => {
    const query = `
      SELECT * FROM photos 
      WHERE model_id = $1 
      ORDER BY display_order ASC, created_at DESC
    `;
    const result = await db.query(query, [modelId]);
    return result.rows;
  },

  // Find cover photo for a model
  findCoverByModelId: async (modelId) => {
    const query = `
      SELECT * FROM photos 
      WHERE model_id = $1 AND is_cover = true
      LIMIT 1
    `;
    const result = await db.query(query, [modelId]);
    return result.rows[0];
  },

  // Find all photos
  findAll: async (filters = {}) => {
    let query = `
      SELECT p.*, m.full_name as model_name
      FROM photos p
      LEFT JOIN models m ON p.model_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.model_id) {
      query += ` AND p.model_id = $${paramCount}`;
      params.push(filters.model_id);
      paramCount++;
    }

    if (filters.is_cover !== undefined) {
      query += ` AND p.is_cover = $${paramCount}`;
      params.push(filters.is_cover);
      paramCount++;
    }

    query += ' ORDER BY p.display_order ASC, p.created_at DESC';

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

  // Update photo
  update: async (id, photoData) => {
    const { file_path, file_name, is_cover, caption, display_order } = photoData;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (file_path !== undefined) {
      updates.push(`file_path = $${paramCount}`);
      params.push(file_path);
      paramCount++;
    }

    if (file_name !== undefined) {
      updates.push(`file_name = $${paramCount}`);
      params.push(file_name);
      paramCount++;
    }

    if (is_cover !== undefined) {
      updates.push(`is_cover = $${paramCount}`);
      params.push(is_cover);
      paramCount++;
    }

    if (caption !== undefined) {
      updates.push(`caption = $${paramCount}`);
      params.push(caption);
      paramCount++;
    }

    if (display_order !== undefined) {
      updates.push(`display_order = $${paramCount}`);
      params.push(display_order);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `
      UPDATE photos 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Set as cover photo (unset others for the same model)
  setCover: async (id, modelId) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Unset all cover photos for this model
      await client.query(
        'UPDATE photos SET is_cover = false WHERE model_id = $1',
        [modelId]
      );

      // Set this photo as cover
      const result = await client.query(
        'UPDATE photos SET is_cover = true WHERE id = $1 RETURNING *',
        [id]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Update display order
  updateDisplayOrder: async (id, displayOrder) => {
    const query = `
      UPDATE photos 
      SET display_order = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [displayOrder, id]);
    return result.rows[0];
  },

  // Reorder photos for a model
  reorder: async (photoOrders) => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      for (const { id, display_order } of photoOrders) {
        await client.query(
          'UPDATE photos SET display_order = $1 WHERE id = $2',
          [display_order, id]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  // Delete photo
  delete: async (id) => {
    const query = 'DELETE FROM photos WHERE id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Delete all photos for a model
  deleteByModelId: async (modelId) => {
    const query = 'DELETE FROM photos WHERE model_id = $1 RETURNING *';
    const result = await db.query(query, [modelId]);
    return result.rows;
  },

  // Count photos for a model
  countByModelId: async (modelId) => {
    const query = 'SELECT COUNT(*) as count FROM photos WHERE model_id = $1';
    const result = await db.query(query, [modelId]);
    return parseInt(result.rows[0].count);
  },

  // Get total count
  count: async () => {
    const query = 'SELECT COUNT(*) as count FROM photos';
    const result = await db.query(query);
    return parseInt(result.rows[0].count);
  },

  // Find photos with model details
  findWithModelDetails: async (filters = {}) => {
    let query = `
      SELECT 
        p.*,
        m.full_name as model_name,
        m.status as model_status
      FROM photos p
      INNER JOIN models m ON p.model_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.model_id) {
      query += ` AND p.model_id = $${paramCount}`;
      params.push(filters.model_id);
      paramCount++;
    }

    query += ' ORDER BY p.display_order ASC, p.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  }
};

module.exports = Photo;
