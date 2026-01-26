const db = require('../config/database');

const Complaint = {
  // Create a new complaint
  create: async (complaintData) => {
    const {
      customer_name, customer_email, customer_phone,
      complaint_type, description, booking_id, status = 'pending'
    } = complaintData;

    const query = `
      INSERT INTO complaints (
        customer_name, customer_email, customer_phone,
        complaint_type, description, booking_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [
      customer_name, customer_email, customer_phone,
      complaint_type, description, booking_id, status
    ];

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Find complaint by ID
  findById: async (id) => {
    const query = `
      SELECT 
        c.*,
        b.id as booking_id,
        j.title as job_title,
        m.full_name as model_name
      FROM complaints c
      LEFT JOIN bookings b ON c.booking_id = b.id
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE c.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Find all complaints with filters
  findAll: async (filters = {}) => {
    let query = `
      SELECT 
        c.*,
        b.id as booking_id,
        j.title as job_title,
        m.full_name as model_name
      FROM complaints c
      LEFT JOIN bookings b ON c.booking_id = b.id
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND c.status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.complaint_type) {
      query += ` AND c.complaint_type = $${paramCount}`;
      params.push(filters.complaint_type);
      paramCount++;
    }

    if (filters.booking_id) {
      query += ` AND c.booking_id = $${paramCount}`;
      params.push(filters.booking_id);
      paramCount++;
    }

    if (filters.customer_email) {
      query += ` AND c.customer_email = $${paramCount}`;
      params.push(filters.customer_email);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND c.created_at >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND c.created_at <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (c.customer_name ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    query += ' ORDER BY c.created_at DESC';

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

  // Find complaints by status
  findByStatus: async (status) => {
    const query = `
      SELECT 
        c.*,
        b.id as booking_id,
        j.title as job_title,
        m.full_name as model_name
      FROM complaints c
      LEFT JOIN bookings b ON c.booking_id = b.id
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE c.status = $1
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query, [status]);
    return result.rows;
  },

  // Find pending complaints
  findPending: async () => {
    const query = `
      SELECT 
        c.*,
        b.id as booking_id,
        j.title as job_title,
        m.full_name as model_name
      FROM complaints c
      LEFT JOIN bookings b ON c.booking_id = b.id
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at ASC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // Find complaints by booking ID
  findByBookingId: async (bookingId) => {
    const query = `
      SELECT c.*
      FROM complaints c
      WHERE c.booking_id = $1
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query, [bookingId]);
    return result.rows;
  },

  // Find complaints by customer email
  findByCustomerEmail: async (email) => {
    const query = `
      SELECT 
        c.*,
        b.id as booking_id,
        j.title as job_title,
        m.full_name as model_name
      FROM complaints c
      LEFT JOIN bookings b ON c.booking_id = b.id
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE c.customer_email = $1
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query, [email]);
    return result.rows;
  },

  // Find complaints by type
  findByType: async (complaintType) => {
    const query = `
      SELECT 
        c.*,
        b.id as booking_id,
        j.title as job_title,
        m.full_name as model_name
      FROM complaints c
      LEFT JOIN bookings b ON c.booking_id = b.id
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE c.complaint_type = $1
      ORDER BY c.created_at DESC
    `;
    const result = await db.query(query, [complaintType]);
    return result.rows;
  },

  // Update complaint
  update: async (id, complaintData) => {
    const {
      customer_name, customer_email, customer_phone,
      complaint_type, description, booking_id, status, admin_response
    } = complaintData;

    const updates = [];
    const params = [];
    let paramCount = 1;

    if (customer_name !== undefined) {
      updates.push(`customer_name = $${paramCount}`);
      params.push(customer_name);
      paramCount++;
    }

    if (customer_email !== undefined) {
      updates.push(`customer_email = $${paramCount}`);
      params.push(customer_email);
      paramCount++;
    }

    if (customer_phone !== undefined) {
      updates.push(`customer_phone = $${paramCount}`);
      params.push(customer_phone);
      paramCount++;
    }

    if (complaint_type !== undefined) {
      updates.push(`complaint_type = $${paramCount}`);
      params.push(complaint_type);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      params.push(description);
      paramCount++;
    }

    if (booking_id !== undefined) {
      updates.push(`booking_id = $${paramCount}`);
      params.push(booking_id);
      paramCount++;
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }

    if (admin_response !== undefined) {
      updates.push(`admin_response = $${paramCount}`);
      params.push(admin_response);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    params.push(id);
    const query = `
      UPDATE complaints 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  },

  // Update complaint status
  updateStatus: async (id, status) => {
    const query = `
      UPDATE complaints 
      SET status = $1,
          resolved_at = CASE WHEN $1 = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  },

  // Resolve complaint with response
  resolve: async (id, adminResponse) => {
    const query = `
      UPDATE complaints 
      SET status = 'resolved',
          admin_response = $1,
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [adminResponse, id]);
    return result.rows[0];
  },

  // Add admin response
  addResponse: async (id, adminResponse) => {
    const query = `
      UPDATE complaints 
      SET admin_response = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await db.query(query, [adminResponse, id]);
    return result.rows[0];
  },

  // Delete complaint
  delete: async (id) => {
    const query = 'DELETE FROM complaints WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  },

  // Count complaints
  count: async (filters = {}) => {
    let query = 'SELECT COUNT(*) as count FROM complaints WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }

    if (filters.complaint_type) {
      query += ` AND complaint_type = $${paramCount}`;
      params.push(filters.complaint_type);
      paramCount++;
    }

    if (filters.booking_id) {
      query += ` AND booking_id = $${paramCount}`;
      params.push(filters.booking_id);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  },

  // Get complaint statistics
  getStats: async () => {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(DISTINCT complaint_type) as unique_types,
        COUNT(DISTINCT customer_email) as unique_customers,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
      FROM complaints
    `;
    const result = await db.query(query);
    return result.rows[0];
  },

  // Get complaints by type summary
  getTypesSummary: async () => {
    const query = `
      SELECT 
        complaint_type,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved
      FROM complaints
      WHERE complaint_type IS NOT NULL
      GROUP BY complaint_type
      ORDER BY count DESC
    `;
    const result = await db.query(query);
    return result.rows;
  },

  // Get recent complaints
  findRecent: async (limit = 10) => {
    const query = `
      SELECT 
        c.*,
        b.id as booking_id,
        j.title as job_title,
        m.full_name as model_name
      FROM complaints c
      LEFT JOIN bookings b ON c.booking_id = b.id
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      ORDER BY c.created_at DESC
      LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
  },

  // Get unresolved complaints older than N days
  findStale: async (days = 7) => {
    const query = `
      SELECT 
        c.*,
        b.id as booking_id,
        j.title as job_title,
        m.full_name as model_name,
        EXTRACT(DAY FROM (CURRENT_TIMESTAMP - c.created_at)) as days_old
      FROM complaints c
      LEFT JOIN bookings b ON c.booking_id = b.id
      LEFT JOIN jobs j ON b.job_id = j.id
      LEFT JOIN models m ON b.model_id = m.id
      WHERE c.status = 'pending'
        AND c.created_at < CURRENT_TIMESTAMP - INTERVAL '${days} days'
      ORDER BY c.created_at ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }
};

module.exports = Complaint;
