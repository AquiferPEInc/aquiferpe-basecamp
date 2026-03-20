-- Communication table for tracking client interactions
CREATE TABLE communication (
    -- Unique auto-incrementing ID
    id SERIAL PRIMARY KEY,

    -- Foreign key reference to client table
    client_id INT NOT NULL,

    -- Type of communication (email or phone)
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'phone')),

    -- Date of communication
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Notes/details about the communication
    notes TEXT,

    -- Optional reference ID (e.g., external system ID)
    reference_id VARCHAR(255) DEFAULT '',

    -- Created date (defaults to current time when row is created)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Last update date (automatically updates when the row is modified)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign key constraint
    CONSTRAINT fk_communication_client
        FOREIGN KEY (client_id)
        REFERENCES client(id)
        ON DELETE CASCADE
);

-- Create index on client_id for faster lookups
CREATE INDEX idx_communication_client_id ON communication(client_id);
