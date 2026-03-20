CREATE TABLE company (
    -- Unique auto-incrementing ID
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL UNIQUE,
    -- Removed location as per request
    size INTEGER,
    overview TEXT,
    specialties TEXT,

    -- Website
    website VARCHAR(255),

    -- Industry
    industry VARCHAR(255),

    -- Linkedin URL
    linkedin VARCHAR(255),

    -- ACEC Chapter
    acec_chapter VARCHAR(255),

    -- Address components
    street VARCHAR(512),
    city VARCHAR(255),
    state VARCHAR(100),
    zip_code VARCHAR(20),

    -- Count of associated clients
    client_count INTEGER DEFAULT 0,
    
    -- Created date (defaults to current time when row is created)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Last update date (automatically updates when the row is modified)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Client table for storing individual client information
CREATE TABLE client (
    -- Unique auto-incrementing ID
    id SERIAL PRIMARY KEY,

    -- Client's first name (cannot be null)
    first_name VARCHAR(100) NOT NULL,

    -- Client's last name (cannot be null)
    last_name VARCHAR(100) NOT NULL,

    -- Client's email address (unique, cannot be null)
    email VARCHAR(255) NOT NULL UNIQUE,

    -- Professional title/role
    title VARCHAR(255),

    -- Location (city, state, country)
    location VARCHAR(255),

    -- Years of experience or experience description
    experience VARCHAR(1024),

    -- Foreign key reference to company table
    company_id INT,

    -- Created date (defaults to current time when row is created)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Last update date (automatically updates when the row is modified)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    CONSTRAINT fk_client_company
        FOREIGN KEY (company_id)
        REFERENCES company(id)
        ON DELETE SET NULL
);

-- Create index on company_id for faster joins and lookups
CREATE INDEX idx_client_company_id ON client(company_id);

-- Create index on email for faster lookups (already unique, but index helps with searches)
CREATE INDEX idx_client_email ON client(email);

-- Create index on last_name for name-based searches
CREATE INDEX idx_client_last_name ON client(last_name);