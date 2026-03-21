-- Migration to consolidate PostgreSQL tables and Elasticsearch index into Supabase

-- company table
CREATE TABLE IF NOT EXISTS company (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    size INTEGER,
    overview TEXT,
    specialties TEXT,
    website VARCHAR(255),
    industry VARCHAR(255),
    linkedin VARCHAR(255),
    acec_chapter VARCHAR(255),
    street VARCHAR(512),
    city VARCHAR(255),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    client_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- client table
CREATE TABLE IF NOT EXISTS client (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255),
    location VARCHAR(255),
    experience VARCHAR(1024),
    company_id INT,
    verified BOOLEAN DEFAULT false,
    linkedin VARCHAR(255),
    active_status VARCHAR(50) DEFAULT 'Active',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_client_company FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_client_company_id ON client(company_id);
CREATE INDEX IF NOT EXISTS idx_client_email ON client(email);
CREATE INDEX IF NOT EXISTS idx_client_last_name ON client(last_name);

-- communication table
CREATE TABLE IF NOT EXISTS communication (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'phone')),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    reference_id VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_communication_client FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_communication_client_id ON communication(client_id);

-- campaign table
CREATE TABLE IF NOT EXISTS campaign (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    reference_id VARCHAR(255) UNIQUE,
    description TEXT,
    spreadsheet_id VARCHAR(255) NOT NULL,
    spreadsheet_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- verification_codes table
CREATE TABLE IF NOT EXISTS verification_codes (
    email VARCHAR(255) PRIMARY KEY,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- freelancer table (replacing Elasticsearch pe_linkedin index)
CREATE TABLE IF NOT EXISTS freelancer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(512),
    about TEXT,
    current_position TEXT,
    experience TEXT,
    education TEXT,
    license TEXT,
    state VARCHAR(100),
    location_name VARCHAR(512),
    linkedin_url VARCHAR(512),
    -- Create a generated TSVECTOR column for full-text search
    fts tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(about, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(current_position, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(experience, '')), 'D') ||
        setweight(to_tsvector('english', coalesce(education, '')), 'D') ||
        setweight(to_tsvector('english', coalesce(license, '')), 'D')
    ) STORED
);

-- Index the TSVECTOR column for fast searches
CREATE INDEX IF NOT EXISTS idx_freelancer_fts ON freelancer USING GIN (fts);
-- Keep state index for filtering
CREATE INDEX IF NOT EXISTS idx_freelancer_state ON freelancer(state);
