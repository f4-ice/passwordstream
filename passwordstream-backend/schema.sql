-- schema.sql
-- Run this script in PostgreSQL to initialize the database tables

-- We use uuid-ossp for unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for user authentication and encrypted asymmetric private keys
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    -- We only store a standard bcrypt hash of the derived Auth Key (NOT the master password)
    auth_key_hash VARCHAR(255) NOT NULL,
    
    -- Asymmetric sharing keys; private material is encrypted by the browser
    public_rsa_key TEXT,
    encrypted_private_rsa_key TEXT,
    public_ecdsa_key TEXT,
    encrypted_private_ecdsa_key TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing encrypted vault items (consolidated payload)
CREATE TABLE vault_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- The entire payload (title, username, password, notes) is encrypted into a single JSON string by the client
    encrypted_payload TEXT NOT NULL,
    
    -- The IV (Initialization Vector) used by the client for AES-GCM decryption
    iv VARCHAR(32) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast vault lookups by user
CREATE INDEX idx_vault_items_user_id ON vault_items(user_id);

-- Table for client-encrypted password sharing
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    encrypted_payload TEXT NOT NULL, -- Versioned AES-GCM envelope; AES key wrapped with receiver RSA key
    signature TEXT NOT NULL,         -- Signed with sender's ECDSA private key
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
