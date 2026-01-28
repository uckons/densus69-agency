const db = require('../config/database');

const Job = {
  // Create a new job
  create: async (jobData) => {
    const {
      title, description, client_name, client_contact,
      job_date, payment_offered, status = 'open'
    } = jobData;

    const query = `
      INSERT INTO jobs (
        title, description, client_name, client_contact,
        job_date, payment_offered, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [
      title, description, client_name, client_contact,
      job_date, payment_offered, status
    ];

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Find job by ID
  findById: async (id) => {
    const query = 'SELECT * FROM jobs WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find job with booking details
  findByIdWithBookings: async (id) => {
    const query = `
      SELECT 
        j.*,
        json_agg(
          json_build_object(
            'booking_id', b.id,
            'model_id', b.model_id,
            'model_name', m.full_name,
            'status', b.status,
            'booking_date', b.booking_date,
            'payment_amount', b.payment_amount
          )
        ) FILTER (WHERE b.id IS NOT NULL) as bookings
      FROM jobs j
      LEFT JOIN bookings b ON j.id = b.job_id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE j.id = $1
      GROUP BY j.id
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find all jobs with filters
  findAll: async (filters = {}) => {
    let query = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.client_name) {
      query += ` AND client_name ILIKE $${paramCount}`;
      params.push(`%${filters.client_name}%`);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND job_date >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND job_date <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    if (filters.min_payment !== undefined) {
      query += ` AND payment_offered >= $${paramCount}`;
      params.push(filters.min_payment);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ' ORDER BY job_date DESC, created_at DESC';

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

  // Find open jobs
  findOpen: async () => {
    const query = `
      SELECT * FROM jobs 
      WHERE status = 'open' 
      ORDER BY job_date ASC, created_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // Find jobs by status
  findByStatus: async (status) => {
    const query = `
      SELECT * FROM jobs 
      WHERE status = $1 
      ORDER BY job_date DESC, created_at DESC
    `;
    const result = await db.query(query, [status]);
    return result.rows;
  },

  // Find upcoming jobs
  findUpcoming: async (days = 30) => {
    const query = `
      SELECT * FROM jobs 
      WHERE job_date >= CURRENT_DATE 
        AND job_date <= CURRENT_DATE + INTERVAL '${days} days'
        AND status IN ('open', 'assigned')
      ORDER BY job_date ASC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // Update job
  update: async (id, jobData) => {
    const {
      title, description, client_name, client_contact,
      job_date, payment_offered, status
    } = jobData;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      params.push(title);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount++;
    }

    if (client_name !== undefined) {
      updates.push(`client_name = $${paramCount}`);
      params.push(client_name);
      paramCount++;
    }

    if (client_contact !== undefined) {
      updates.push(`client_contact = $${paramCount}`);
      params.push(client_contact);
      paramCount++;
    }

    if (job_date !== undefined) {
      updates.push(`job_date = $${paramCount}`);
      params.push(job_date);
      paramCount++;
    }

    if (payment_offered !== undefined) {
      updates.push(`payment_offered = $${paramCount}`);
      params.push(payment_offered);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `
      UPDATE jobs 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Update job status
  updateStatus: async (id, status) => {
    const query = `
      UPDATE jobs 
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  },

  // Delete job
  delete: async (id) => {
    const query = 'DELETE FROM jobs WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Count jobs
  count: async (filters = {}) => {
    let query = 'SELECT COUNT(*) as count FROM jobs WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND job_date >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND job_date <= $${paramCount}`;
      params.push(filters.end_date);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  },

  // Get job statistics
  getStats: async () => {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        AVG(payment_offered) as avg_payment,
        SUM(payment_offered) FILTER (WHERE status = 'completed') as total_paid
      FROM jobs
    `;
    const result = await db.query(query);
    return result.rows[0];
  },

  // Get jobs with booking count
  findAllWithBookingCount: async (filters = {}) => {
    let query = `
      SELECT 
        j.*,
        COUNT(b.id) as booking_count
      FROM jobs j
      LEFT JOIN bookings b ON j.id = b.job_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND j.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    query += ' GROUP BY j.id ORDER BY j.job_date DESC, j.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  },

  // Search jobs
  search: async (searchTerm, filters = {}) => {
    let query = `
      SELECT * FROM jobs 
      WHERE (title ILIKE $1 OR description ILIKE $1 OR client_name ILIKE $1)
    `;
    const params = [`%${searchTerm}%`];
    let paramCount = 2;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    query += ' ORDER BY job_date DESC, created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  }
};

module.exports = Job;
