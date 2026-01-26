const db = require('../config/database');

const Booking = {
  // Create a new booking
  create: async (bookingData) => {
    const {
      job_id, model_id, status = 'pending',
      payment_amount, notes
    } = bookingData;

    const query = `
      INSERT INTO bookings (
        job_id, model_id, status, payment_amount, notes
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const params = [job_id, model_id, status, payment_amount, notes];
    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Find booking by ID
  findById: async (id) => {
    const query = `
      SELECT 
        b.*,
        j.title as job_title,
        j.client_name,
        j.job_date,
        m.full_name as model_name,
        m.phone as model_phone
      FROM bookings b
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE b.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find all bookings with filters
  findAll: async (filters = {}) => {
    let query = `
      SELECT 
        b.*,
        j.title as job_title,
        j.client_name,
        j.job_date,
        m.full_name as model_name
      FROM bookings b
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.job_id) {
      query += ` AND b.job_id = $${paramCount}`;
      params.push(filters.job_id);
      paramCount++;
    }

    if (filters.model_id) {
      query += ` AND b.model_id = $${paramCount}`;
      params.push(filters.model_id);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND b.booking_date >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND b.booking_date <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    query += ' ORDER BY b.booking_date DESC, b.created_at DESC';

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

  // Find bookings by job ID
  findByJobId: async (jobId) => {
    const query = `
      SELECT 
        b.*,
        m.full_name as model_name,
        m.phone as model_phone,
        m.status as model_status
      FROM bookings b
      LEFT JOIN models m ON b.model_id = m.id
      WHERE b.job_id = $1
      ORDER BY b.booking_date DESC
    `;
    const result = await db.query(query, [jobId]);
    return result.rows;
  },

  // Find bookings by model ID
  findByModelId: async (modelId) => {
    const query = `
      SELECT 
        b.*,
        j.title as job_title,
        j.client_name,
        j.job_date,
        j.payment_offered
      FROM bookings b
      LEFT JOIN jobs j ON b.job_id = j.id
      WHERE b.model_id = $1
      ORDER BY b.booking_date DESC
    `;
    const result = await db.query(query, [modelId]);
    return result.rows;
  },

  // Find bookings by status
  findByStatus: async (status) => {
    const query = `
      SELECT 
        b.*,
        j.title as job_title,
        j.client_name,
        j.job_date,
        m.full_name as model_name
      FROM bookings b
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE b.status = $1
      ORDER BY b.booking_date DESC
    `;
    const result = await db.query(query, [status]);
    return result.rows;
  },

  // Find pending bookings
  findPending: async () => {
    const query = `
      SELECT 
        b.*,
        j.title as job_title,
        j.client_name,
        j.job_date,
        m.full_name as model_name
      FROM bookings b
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE b.status = 'pending'
      ORDER BY b.booking_date DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // Find upcoming bookings for a model
  findUpcomingByModelId: async (modelId, days = 30) => {
    const query = `
      SELECT 
        b.*,
        j.title as job_title,
        j.client_name,
        j.job_date,
        j.payment_offered
      FROM bookings b
      INNER JOIN jobs j ON b.job_id = j.id
      WHERE b.model_id = $1
        AND j.job_date >= CURRENT_DATE
        AND j.job_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND b.status IN ('confirmed', 'pending')
      ORDER BY j.job_date ASC
    `;
    const result = await db.query(query, [modelId]);
    return result.rows;
  },

  // Update booking
  update: async (id, bookingData) => {
    const {
      job_id, model_id, status, payment_amount,
      completion_date, notes
    } = bookingData;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (job_id !== undefined) {
      updates.push(`job_id = $${paramCount}`);
      params.push(job_id);
      paramCount++;
    }

    if (model_id !== undefined) {
      updates.push(`model_id = $${paramCount}`);
      params.push(model_id);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (payment_amount !== undefined) {
      updates.push(`payment_amount = $${paramCount}`);
      params.push(payment_amount);
      paramCount++;
    }

    if (completion_date !== undefined) {
      updates.push(`completion_date = $${paramCount}`);
      params.push(completion_date);
      paramCount++;
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      params.push(notes);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `
      UPDATE bookings 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Update booking status
  updateStatus: async (id, status) => {
    const query = `
      UPDATE bookings 
      SET status = $1,
          completion_date = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completion_date END
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  },

  // Confirm booking
  confirm: async (id) => {
    const query = `
      UPDATE bookings 
      SET status = 'confirmed'
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Complete booking
  complete: async (id, paymentAmount = null) => {
    let query = `
      UPDATE bookings 
      SET status = 'completed',
          completion_date = CURRENT_TIMESTAMP
    `;
    const params = [];
    let paramCount = 1;

    if (paymentAmount !== null) {
      query += `, payment_amount = $${paramCount}`;
      params.push(paymentAmount);
      paramCount++;
    }

    params.push(id);
    query += ` WHERE id = $${paramCount} RETURNING *`;

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Cancel booking
  cancel: async (id) => {
    const query = `
      UPDATE bookings 
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING *
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Delete booking
  delete: async (id) => {
    const query = 'DELETE FROM bookings WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Check if model has booking for job
  existsByJobAndModel: async (jobId, modelId) => {
    const query = `
      SELECT id FROM bookings 
      WHERE job_id = $1 AND model_id = $2
      LIMIT 1
    `;
    const result = await db.query(query, [jobId, modelId]);
    return result.rows.length > 0;
  },

  // Count bookings
  count: async (filters = {}) => {
    let query = 'SELECT COUNT(*) as count FROM bookings WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.job_id) {
      query += ` AND job_id = $${paramCount}`;
      params.push(filters.job_id);
      paramCount++;
    }

    if (filters.model_id) {
      query += ` AND model_id = $${paramCount}`;
      params.push(filters.model_id);
      paramCount++;
    }

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  },

  // Get booking statistics
  getStats: async () => {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        AVG(payment_amount) as avg_payment,
        SUM(payment_amount) FILTER (WHERE status = 'completed') as total_paid
      FROM bookings
    `;
    const result = await db.query(query);
    return result.rows[0];
  },

  // Get model booking history
  getModelHistory: async (modelId, limit = 10) => {
    const query = `
      SELECT 
        b.*,
        j.title as job_title,
        j.client_name,
        j.job_date
      FROM bookings b
      INNER JOIN jobs j ON b.job_id = j.id
      WHERE b.model_id = $1
      ORDER BY b.booking_date DESC
      LIMIT $2
    `;
    const result = await db.query(query, [modelId, limit]);
    return result.rows;
  },

  // Get job applicants (bookings for a job)
  getJobApplicants: async (jobId) => {
    const query = `
      SELECT 
        b.*,
        m.full_name as model_name,
        m.phone as model_phone,
        m.rate as model_rate,
        m.experience_level,
        p.file_path as cover_photo
      FROM bookings b
      INNER JOIN models m ON b.model_id = m.id
      LEFT JOIN photos p ON m.id = p.model_id AND p.is_cover = true
      WHERE b.job_id = $1
      ORDER BY b.booking_date ASC
    `;
    const result = await db.query(query, [jobId]);
    return result.rows;
  }
};

module.exports = Booking;
