-- Database initialization script for Densus69 Modeling Agency

-- Create database (run this separately if needed)
-- CREATE DATABASE modeling_agency;

-- Connect to database
-- \c modeling_agency;

-- Drop tables if they exist (for fresh start)
DROP TABLE IF EXISTS complaints CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS models CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'model');
CREATE TYPE model_status AS ENUM ('vacant', 'working');
CREATE TYPE job_status AS ENUM ('open', 'assigned', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE complaint_status AS ENUM ('pending', 'resolved');

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'model',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Models table
CREATE TABLE models (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(20),
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    measurements VARCHAR(50),
    address TEXT,
    experience_level VARCHAR(50),
    bio TEXT,
    status model_status DEFAULT 'vacant',
    rate DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photos table
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    is_cover BOOLEAN DEFAULT false,
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_count INTEGER NOT NULL,
    model_rate DECIMAL(10,2) NOT NULL,
    admin_fee DECIMAL(10,2) DEFAULT 50000,
    gross_amount DECIMAL(10,2) NOT NULL,
    net_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Jobs table
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    client_name VARCHAR(255),
    client_contact VARCHAR(100),
    job_date TIMESTAMP,
    payment_offered DECIMAL(10,2),
    status job_status DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
    status booking_status DEFAULT 'pending',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completion_date TIMESTAMP,
    payment_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Complaints table
CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    complaint_type VARCHAR(100),
    description TEXT NOT NULL,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    status complaint_status DEFAULT 'pending',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_models_user_id ON models(user_id);
CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_photos_model_id ON photos(model_id);
CREATE INDEX idx_transactions_model_id ON transactions(model_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_bookings_model_id ON bookings(model_id);
CREATE INDEX idx_bookings_job_id ON bookings(job_id);
CREATE INDEX idx_complaints_status ON complaints(status);

-- Create default admin user (password: admin123)
-- Password hash for 'admin123' with bcrypt salt rounds 10
INSERT INTO users (email, password, role) 
VALUES ('admin@densus69.com', '$2a$10$ZqXZ3K3Z3Z3Z3Z3Z3Z3Z3uGF.8nJ0J0J0J0J0J0J0J0J0J0J0J0J0', 'admin');

-- Note: The actual password hash will be generated when first admin registers
-- For testing, you'll need to register an admin user through the application

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_models_updated_at BEFORE UPDATE ON models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
