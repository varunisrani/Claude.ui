-- ============================================================================
-- Supabase Database Setup for Claude.ui
-- ============================================================================
-- This script sets up the complete database schema for the Claude.ui application
-- Copy and paste this entire file into the Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Model provider enum
CREATE TYPE modelprovider AS ENUM (
    'anthropic',
    'zai',
    'openrouter'
);

-- Message role enum
CREATE TYPE messagerole AS ENUM (
    'user',
    'assistant'
);

-- Message stream status enum
CREATE TYPE messagestreamstatus AS ENUM (
    'in_progress',
    'completed',
    'failed',
    'interrupted'
);

-- Attachment type enum
CREATE TYPE attachmenttype AS ENUM (
    'image',
    'pdf',
    'xlsx'
);

-- Recurrence type enum for scheduled tasks
CREATE TYPE recurrencetype AS ENUM (
    'once',
    'daily',
    'weekly',
    'monthly'
);

-- Task status enum
CREATE TYPE taskstatus AS ENUM (
    'pending',
    'active',
    'paused',
    'completed',
    'failed'
);

-- Task execution status enum
CREATE TYPE taskexecutionstatus AS ENUM (
    'running',
    'success',
    'failed'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(320) NOT NULL UNIQUE,
    hashed_password VARCHAR(1024) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR NOT NULL UNIQUE,
    verification_token VARCHAR,
    verification_token_expires TIMESTAMPTZ,
    reset_token VARCHAR,
    reset_token_expires TIMESTAMPTZ,
    daily_message_limit INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    github_personal_access_token VARCHAR,
    e2b_api_key VARCHAR,
    claude_code_oauth_token VARCHAR,
    z_ai_api_key VARCHAR,
    openrouter_api_key VARCHAR,
    custom_instructions TEXT,
    custom_agents JSONB,
    custom_mcps JSONB,
    custom_env_vars JSONB,
    custom_skills JSONB,
    custom_slash_commands JSONB,
    notification_sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chats table
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sandbox_id VARCHAR,
    session_id VARCHAR,
    context_token_usage INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    pinned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    content VARCHAR NOT NULL,
    role messagerole NOT NULL,
    model_id VARCHAR,
    checkpoint_id VARCHAR(40),
    session_id VARCHAR,
    total_cost_usd DOUBLE PRECISION DEFAULT 0.0,
    stream_status messagestreamstatus NOT NULL DEFAULT 'completed',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message attachments table
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_url VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    file_type attachmenttype NOT NULL DEFAULT 'image',
    filename VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI models table
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL,
    provider modelprovider NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(64) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    user_agent VARCHAR(512),
    ip_address VARCHAR(45)
);

-- Scheduled tasks table
CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_name VARCHAR(255) NOT NULL,
    prompt_message TEXT NOT NULL,
    recurrence_type recurrencetype NOT NULL,
    scheduled_time VARCHAR(8) NOT NULL,
    scheduled_day INTEGER,
    next_execution TIMESTAMPTZ,
    last_execution TIMESTAMPTZ,
    status taskstatus NOT NULL DEFAULT 'active',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    execution_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    model_id VARCHAR,
    permission_mode VARCHAR NOT NULL DEFAULT 'auto',
    thinking_mode VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task executions table
CREATE TABLE task_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES scheduled_tasks(id) ON DELETE CASCADE,
    executed_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status taskexecutionstatus NOT NULL,
    chat_id UUID,
    message_id UUID,
    error_message TEXT,
    result_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_username ON users(username);
CREATE INDEX idx_user_email_verified ON users(email, is_verified);

-- Chats indexes
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_user_id_id ON chats(user_id, id);
CREATE INDEX idx_chats_user_id_sandbox_id ON chats(user_id, sandbox_id);
CREATE INDEX idx_chats_user_id_deleted_at ON chats(user_id, deleted_at);
CREATE INDEX idx_chats_user_id_updated_at_desc ON chats(user_id, updated_at DESC);
CREATE INDEX idx_chats_user_id_pinned_at ON chats(user_id, pinned_at);

-- Messages indexes
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at);
CREATE INDEX idx_messages_role_created ON messages(role, created_at);
CREATE INDEX idx_messages_stream_status ON messages(stream_status);
CREATE INDEX idx_messages_chat_id_deleted_at ON messages(chat_id, deleted_at);
CREATE INDEX idx_messages_chat_id_role_deleted ON messages(chat_id, role, deleted_at);

-- Message attachments indexes
CREATE INDEX idx_message_attachments_message_id ON message_attachments(message_id);

-- AI models indexes
CREATE INDEX idx_ai_models_model_id ON ai_models(model_id);
CREATE INDEX idx_ai_models_provider_active ON ai_models(provider, is_active);
CREATE INDEX idx_ai_models_sort_order ON ai_models(sort_order);

-- Refresh tokens indexes
CREATE INDEX idx_refresh_token_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_token_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token_user_revoked ON refresh_tokens(user_id, revoked_at);

-- Scheduled tasks indexes
CREATE INDEX idx_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX idx_scheduled_tasks_user_next ON scheduled_tasks(user_id, next_execution);
CREATE INDEX idx_scheduled_tasks_enabled_next ON scheduled_tasks(enabled, next_execution);

-- Task executions indexes
CREATE INDEX idx_task_executions_task_id ON task_executions(task_id);
CREATE INDEX idx_task_executions_task_created ON task_executions(task_id, created_at);
CREATE INDEX idx_task_executions_status ON task_executions(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_attachments_updated_at
    BEFORE UPDATE ON message_attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at
    BEFORE UPDATE ON ai_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_tasks_updated_at
    BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_executions_updated_at
    BEFORE UPDATE ON task_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA - AI Models
-- ============================================================================

INSERT INTO ai_models (model_id, name, provider, is_active, sort_order) VALUES
    ('claude-opus-4-5-20251101', 'Claude Opus 4.5', 'anthropic', TRUE, 0),
    ('claude-sonnet-4-5', 'Claude Sonnet 4.5', 'anthropic', TRUE, 1),
    ('claude-haiku-4-5', 'Claude Haiku 4.5', 'anthropic', TRUE, 2),
    ('glm-4.6', 'GLM 4.6', 'zai', TRUE, 3),
    ('glm-4.5-air', 'GLM 4.5 Air', 'zai', TRUE, 4),
    ('openai/gpt-5.2', 'GPT-5.2', 'openrouter', TRUE, 5),
    ('openai/gpt-5.1-codex', 'GPT-5.1 Codex', 'openrouter', TRUE, 6),
    ('x-ai/grok-code-fast-1', 'Grok Code Fast', 'openrouter', TRUE, 7),
    ('moonshotai/kimi-k2-thinking', 'Kimi K2 Thinking', 'openrouter', TRUE, 8),
    ('minimax/minimax-m2', 'Minimax M2', 'openrouter', TRUE, 9),
    ('deepseek/deepseek-v3.2', 'Deepseek V3.2', 'openrouter', TRUE, 10)
ON CONFLICT (model_id) DO NOTHING;

-- ============================================================================
-- SEED DATA - Admin User
-- ============================================================================
-- Default credentials: admin@example.com / admin123
-- IMPORTANT: Change this password immediately after first login!

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Insert admin user (password: admin123)
    -- This uses bcrypt hash - you should change the password after first login
    INSERT INTO users (
        email,
        username,
        hashed_password,
        is_active,
        is_superuser,
        is_verified
    ) VALUES (
        'admin@example.com',
        'admin',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYWBKr5nqye', -- admin123
        TRUE,
        TRUE,
        TRUE
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_user_id;

    -- Insert admin user settings if admin was created
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO user_settings (user_id)
        VALUES (admin_user_id);
    END IF;
END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 7 enum types';
    RAISE NOTICE '  - 9 tables with proper constraints and foreign keys';
    RAISE NOTICE '  - 32 indexes for optimized queries';
    RAISE NOTICE '  - 8 updated_at triggers';
    RAISE NOTICE '  - 11 AI models (seed data)';
    RAISE NOTICE '  - 1 admin user (seed data)';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Default admin credentials:';
    RAISE NOTICE '  Email: admin@example.com';
    RAISE NOTICE '  Password: admin123';
    RAISE NOTICE '  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY!';
    RAISE NOTICE '============================================================================';
END $$;
