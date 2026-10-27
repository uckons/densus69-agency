const db = require('../config/database');
let pending;

// Additive migration: historical amounts are never recalculated or overwritten.
module.exports = function ensurePayrollSchema() {
    if (!pending) pending = (async () => {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("SELECT pg_advisory_xact_lock(690027)");
            await client.query(`CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY, client_name VARCHAR(255) UNIQUE NOT NULL,
                address TEXT, contact_name VARCHAR(255), contact_phone VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
            )`);
            for (const name of ['safety_fee', 'admin_fee', 'other_deduction']) {
                await client.query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${name} NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (${name} >= 0)`);
            }
            for (const name of ['safety_fee', 'client_admin_fee', 'other_deduction', 'cash_advance']) {
                await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ${name} NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (${name} >= 0)`);
            }
            for (const name of ['fine', 'agent_fee_amount', 'agent_fee_per_trx']) {
                await client.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ${name} NUMERIC(12,2) CHECK (${name} >= 0)`);
            }
            await client.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS deduction_version INTEGER NOT NULL DEFAULT 1');
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally { client.release(); }
    })().catch(error => { pending = null; throw error; });
    return pending;
};
