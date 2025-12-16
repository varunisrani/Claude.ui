# Supabase Migration Plan - Complete Database Setup

## Overview

This document provides a complete step-by-step guide to migrate the Claude.ui PostgreSQL database to Supabase.

**Total Tables:** 9
**Total Enum Types:** 7
**Total Indexes:** 30+

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com → Sign up/Login
2. Click "New Project"
3. Choose organization, name: `claude-ui`
4. Set database password (**SAVE THIS!**)
5. Select region closest to you (recommended: same as Railway)
6. Click "Create new project"
7. Wait for project to be provisioned (~2 minutes)

### Get Connection String

1. Go to **Project Settings** → **Database**
2. Find "Connection string" → **URI** format
3. Copy the connection string:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Important URLs:**
- Direct connection: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- Pooled connection (recommended): `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

---

## Step 2: Create Enum Types

Run these SQL commands in **Supabase SQL Editor** (Dashboard → SQL Editor → New Query):

```sql
-- ============================================
-- ENUM TYPES
-- ============================================

-- Model Provider Enum
CREATE TYPE modelprovider AS ENUM ('anthropic', 'zai', 'openrouter');

-- Message Role Enum
CREATE TYPE messagerole AS ENUM ('user', 'assistant');

-- Message Stream Status Enum
CREATE TYPE messagestreamstatus AS ENUM ('in_progress', 'completed', 'failed', 'interrupted');

-- Attachment Type Enum
CREATE TYPE attachmenttype AS ENUM ('image', 'pdf', 'xlsx');

-- Recurrence Type Enum (for scheduled tasks)
CREATE TYPE recurrencetype AS ENUM ('once', 'daily', 'weekly', 'monthly');

-- Task Status Enum
CREATE TYPE taskstatus AS ENUM ('pending', 'active', 'paused', 'completed', 'failed');

-- Task Execution Status Enum
CREATE TYPE taskexecutionstatus AS ENUM ('running', 'success', 'failed');
```

---

## Step 3: Create Extension for UUID

```sql
-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Step 4: Create Tables

### 4.1 Users Table

```sql
-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(320) NOT NULL,
    hashed_password VARCHAR(1024) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    username VARCHAR(255) NOT NULL,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMPTZ,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    daily_message_limit INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_username_key UNIQUE (username)
);

-- Indexes for users
CREATE UNIQUE INDEX ix_users_email ON users(email);
CREATE UNIQUE INDEX ix_users_username ON users(username);
CREATE INDEX idx_user_email_verified ON users(email, is_verified);
```

### 4.2 User Settings Table

```sql
-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    github_personal_access_token TEXT,
    e2b_api_key TEXT,
    claude_code_oauth_token TEXT,
    z_ai_api_key TEXT,
    openrouter_api_key TEXT,
    custom_instructions TEXT,
    custom_agents JSONB,
    custom_mcps JSONB,
    custom_env_vars JSONB,
    custom_skills JSONB,
    custom_slash_commands JSONB,
    notification_sound_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

-- Note: API keys are stored encrypted in the application layer
-- Consider using Supabase Vault for additional security in production
```

### 4.3 Chats Table

```sql
-- ============================================
-- CHATS TABLE
-- ============================================
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sandbox_id VARCHAR(255),
    session_id VARCHAR(255),
    context_token_usage INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    pinned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chats
CREATE INDEX ix_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_user_id_id ON chats(user_id, id);
CREATE INDEX idx_chats_user_id_sandbox_id ON chats(user_id, sandbox_id);
CREATE INDEX idx_chats_user_id_deleted_at ON chats(user_id, deleted_at);
CREATE INDEX idx_chats_user_id_updated_at_desc ON chats(user_id, updated_at DESC);
CREATE INDEX idx_chats_user_id_pinned_at ON chats(user_id, pinned_at);
```

### 4.4 Messages Table

```sql
-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role messagerole NOT NULL,
    model_id VARCHAR(255),
    checkpoint_id VARCHAR(40),
    session_id VARCHAR(255),
    total_cost_usd DOUBLE PRECISION DEFAULT 0.0,
    stream_status messagestreamstatus NOT NULL DEFAULT 'completed',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX ix_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at);
CREATE INDEX idx_messages_role_created ON messages(role, created_at);
CREATE INDEX idx_messages_stream_status ON messages(stream_status);
CREATE INDEX idx_messages_chat_id_deleted_at ON messages(chat_id, deleted_at);
CREATE INDEX idx_messages_chat_id_role_deleted ON messages(chat_id, role, deleted_at);
```

### 4.5 Message Attachments Table

```sql
-- ============================================
-- MESSAGE ATTACHMENTS TABLE
-- ============================================
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type attachmenttype NOT NULL DEFAULT 'image',
    filename VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for message_attachments
CREATE INDEX ix_message_attachments_message_id ON message_attachments(message_id);
```

### 4.6 AI Models Table

```sql
-- ============================================
-- AI MODELS TABLE
-- ============================================
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    provider modelprovider NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ai_models_model_id_key UNIQUE (model_id)
);

-- Indexes for ai_models
CREATE UNIQUE INDEX ix_ai_models_model_id ON ai_models(model_id);
CREATE INDEX idx_ai_models_provider_active ON ai_models(provider, is_active);
CREATE INDEX idx_ai_models_sort_order ON ai_models(sort_order);
```

### 4.7 Refresh Tokens Table

```sql
-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(64) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    user_agent VARCHAR(512),
    ip_address VARCHAR(45),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for refresh_tokens
CREATE INDEX ix_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_token_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token_user_revoked ON refresh_tokens(user_id, revoked_at);
```

### 4.8 Scheduled Tasks Table

```sql
-- ============================================
-- SCHEDULED TASKS TABLE
-- ============================================
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
    enabled BOOLEAN NOT NULL DEFAULT true,
    execution_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    model_id VARCHAR(255),
    permission_mode VARCHAR(50) NOT NULL DEFAULT 'auto',
    thinking_mode VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for scheduled_tasks
CREATE INDEX ix_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX ix_scheduled_tasks_next_execution ON scheduled_tasks(next_execution);
CREATE INDEX idx_scheduled_tasks_user_next ON scheduled_tasks(user_id, next_execution);
CREATE INDEX idx_scheduled_tasks_enabled_next ON scheduled_tasks(enabled, next_execution);
```

### 4.9 Task Executions Table

```sql
-- ============================================
-- TASK EXECUTIONS TABLE
-- ============================================
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for task_executions
CREATE INDEX ix_task_executions_task_id ON task_executions(task_id);
CREATE INDEX idx_task_executions_task_created ON task_executions(task_id, created_at);
CREATE INDEX idx_task_executions_status ON task_executions(status);
```

---

## Step 5: Create Updated_at Trigger Function

```sql
-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_attachments_updated_at BEFORE UPDATE ON message_attachments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON ai_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refresh_tokens_updated_at BEFORE UPDATE ON refresh_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON scheduled_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_executions_updated_at BEFORE UPDATE ON task_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Step 6: Seed Initial Data

### 6.1 Seed AI Models

```sql
-- ============================================
-- SEED AI MODELS
-- ============================================
INSERT INTO ai_models (model_id, name, provider, is_active, sort_order) VALUES
    ('claude-opus-4-5-20251101', 'Claude Opus 4.5', 'anthropic', true, 0),
    ('claude-sonnet-4-5', 'Claude Sonnet 4.5', 'anthropic', true, 1),
    ('claude-haiku-4-5', 'Claude Haiku 4.5', 'anthropic', true, 2),
    ('glm-4.6', 'GLM 4.6', 'zai', true, 3),
    ('glm-4.5-air', 'GLM 4.5 Air', 'zai', true, 4),
    ('openai/gpt-5.2', 'GPT-5.2', 'openrouter', true, 5),
    ('openai/gpt-5.1-codex', 'GPT-5.1 Codex', 'openrouter', true, 6),
    ('x-ai/grok-code-fast-1', 'Grok Code Fast', 'openrouter', true, 7),
    ('moonshotai/kimi-k2-thinking', 'Kimi K2 Thinking', 'openrouter', true, 8),
    ('minimax/minimax-m2', 'Minimax M2', 'openrouter', true, 9),
    ('deepseek/deepseek-v3.2', 'Deepseek V3.2', 'openrouter', true, 10)
ON CONFLICT (model_id) DO NOTHING;
```

### 6.2 Seed Admin User

```sql
-- ============================================
-- SEED ADMIN USER
-- ============================================
-- Password: admin123 (bcrypt hash)
-- You should change this immediately after deployment!

DO $$
DECLARE
    admin_id UUID;
BEGIN
    -- Insert admin user if not exists
    INSERT INTO users (
        email,
        hashed_password,
        is_active,
        is_superuser,
        is_verified,
        username
    ) VALUES (
        'admin@example.com',
        -- This is bcrypt hash of 'admin123' - CHANGE IN PRODUCTION!
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4c6nO2H.C3qxCkHK',
        true,
        true,
        true,
        'admin'
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_id;

    -- If admin was inserted, create settings
    IF admin_id IS NOT NULL THEN
        INSERT INTO user_settings (user_id, notification_sound_enabled)
        VALUES (admin_id, true);
    END IF;
END $$;
```

**⚠️ IMPORTANT:** The password hash above is for `admin123`. Generate a new hash for production:

```python
# Python command to generate bcrypt hash
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
print(pwd_context.hash("your-secure-password"))
```

---

## Step 7: Disable Row Level Security (Development)

For initial development, disable RLS to simplify setup:

```sql
-- Disable RLS on all tables (for development only!)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions DISABLE ROW LEVEL SECURITY;
```

---

## Step 8: Update Backend Configuration

### 8.1 Environment Variables for Railway

Update these in Railway dashboard:

```env
# Supabase PostgreSQL Connection (use pooled connection for better performance)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require

# Or direct connection (for migrations)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

### 8.2 Connection Pool Settings

Supabase has connection limits based on your plan:

| Plan | Direct Connections | Pooled Connections |
|------|-------------------|-------------------|
| Free | 60 | 200 |
| Pro | 100 | 400 |

Update `/backend/app/db/session.py` pool settings if needed:

```python
# For Supabase Free tier, reduce pool size
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,        # Reduced from 30
    max_overflow=5,      # Reduced from 20
    pool_recycle=3600,
    pool_timeout=120,
    echo=False,
)
```

---

## Step 9: Verify Setup

### 9.1 Check Tables Created

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected output:
```
ai_models
chats
message_attachments
messages
refresh_tokens
scheduled_tasks
task_executions
user_settings
users
```

### 9.2 Check Enum Types

```sql
SELECT typname FROM pg_type WHERE typtype = 'e';
```

Expected output:
```
attachmenttype
messagerole
messagestreamstatus
modelprovider
recurrencetype
taskexecutionstatus
taskstatus
```

### 9.3 Check Seed Data

```sql
-- Check AI models
SELECT model_id, name, provider FROM ai_models ORDER BY sort_order;

-- Check admin user
SELECT email, username, is_superuser FROM users WHERE is_superuser = true;
```

---

## Step 10: Test Connection from Railway

1. Deploy backend to Railway with new `DATABASE_URL`
2. Check Railway logs for successful database connection
3. Test health endpoint: `https://your-api.railway.app/health`
4. Test API docs: `https://your-api.railway.app/docs`

---

## Complete SQL Script (All-in-One)

For convenience, here's everything in one script. Copy and run in Supabase SQL Editor:

```sql
-- ============================================
-- CLAUDE.UI SUPABASE MIGRATION SCRIPT
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum Types
CREATE TYPE modelprovider AS ENUM ('anthropic', 'zai', 'openrouter');
CREATE TYPE messagerole AS ENUM ('user', 'assistant');
CREATE TYPE messagestreamstatus AS ENUM ('in_progress', 'completed', 'failed', 'interrupted');
CREATE TYPE attachmenttype AS ENUM ('image', 'pdf', 'xlsx');
CREATE TYPE recurrencetype AS ENUM ('once', 'daily', 'weekly', 'monthly');
CREATE TYPE taskstatus AS ENUM ('pending', 'active', 'paused', 'completed', 'failed');
CREATE TYPE taskexecutionstatus AS ENUM ('running', 'success', 'failed');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(320) NOT NULL UNIQUE,
    hashed_password VARCHAR(1024) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    username VARCHAR(255) NOT NULL UNIQUE,
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMPTZ,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    daily_message_limit INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_email_verified ON users(email, is_verified);

-- User Settings Table
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    github_personal_access_token TEXT,
    e2b_api_key TEXT,
    claude_code_oauth_token TEXT,
    z_ai_api_key TEXT,
    openrouter_api_key TEXT,
    custom_instructions TEXT,
    custom_agents JSONB,
    custom_mcps JSONB,
    custom_env_vars JSONB,
    custom_skills JSONB,
    custom_slash_commands JSONB,
    notification_sound_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chats Table
CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sandbox_id VARCHAR(255),
    session_id VARCHAR(255),
    context_token_usage INTEGER NOT NULL DEFAULT 0,
    deleted_at TIMESTAMPTZ,
    pinned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_user_id_id ON chats(user_id, id);
CREATE INDEX idx_chats_user_id_sandbox_id ON chats(user_id, sandbox_id);
CREATE INDEX idx_chats_user_id_deleted_at ON chats(user_id, deleted_at);
CREATE INDEX idx_chats_user_id_updated_at_desc ON chats(user_id, updated_at DESC);
CREATE INDEX idx_chats_user_id_pinned_at ON chats(user_id, pinned_at);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    role messagerole NOT NULL,
    model_id VARCHAR(255),
    checkpoint_id VARCHAR(40),
    session_id VARCHAR(255),
    total_cost_usd DOUBLE PRECISION DEFAULT 0.0,
    stream_status messagestreamstatus NOT NULL DEFAULT 'completed',
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_chat_id_created_at ON messages(chat_id, created_at);
CREATE INDEX idx_messages_role_created ON messages(role, created_at);
CREATE INDEX idx_messages_stream_status ON messages(stream_status);
CREATE INDEX idx_messages_chat_id_deleted_at ON messages(chat_id, deleted_at);
CREATE INDEX idx_messages_chat_id_role_deleted ON messages(chat_id, role, deleted_at);

-- Message Attachments Table
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type attachmenttype NOT NULL DEFAULT 'image',
    filename VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_message_attachments_message_id ON message_attachments(message_id);

-- AI Models Table
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    provider modelprovider NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ai_models_provider_active ON ai_models(provider, is_active);
CREATE INDEX idx_ai_models_sort_order ON ai_models(sort_order);

-- Refresh Tokens Table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(64) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    user_agent VARCHAR(512),
    ip_address VARCHAR(45),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ix_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_token_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token_user_revoked ON refresh_tokens(user_id, revoked_at);

-- Scheduled Tasks Table
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
    enabled BOOLEAN NOT NULL DEFAULT true,
    execution_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    model_id VARCHAR(255),
    permission_mode VARCHAR(50) NOT NULL DEFAULT 'auto',
    thinking_mode VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_scheduled_tasks_user_id ON scheduled_tasks(user_id);
CREATE INDEX ix_scheduled_tasks_next_execution ON scheduled_tasks(next_execution);
CREATE INDEX idx_scheduled_tasks_user_next ON scheduled_tasks(user_id, next_execution);
CREATE INDEX idx_scheduled_tasks_enabled_next ON scheduled_tasks(enabled, next_execution);

-- Task Executions Table
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_task_executions_task_id ON task_executions(task_id);
CREATE INDEX idx_task_executions_task_created ON task_executions(task_id, created_at);
CREATE INDEX idx_task_executions_status ON task_executions(status);

-- Updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_attachments_updated_at BEFORE UPDATE ON message_attachments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_models_updated_at BEFORE UPDATE ON ai_models FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_refresh_tokens_updated_at BEFORE UPDATE ON refresh_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON scheduled_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_executions_updated_at BEFORE UPDATE ON task_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS (for development)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE task_executions DISABLE ROW LEVEL SECURITY;

-- Seed AI Models
INSERT INTO ai_models (model_id, name, provider, is_active, sort_order) VALUES
    ('claude-opus-4-5-20251101', 'Claude Opus 4.5', 'anthropic', true, 0),
    ('claude-sonnet-4-5', 'Claude Sonnet 4.5', 'anthropic', true, 1),
    ('claude-haiku-4-5', 'Claude Haiku 4.5', 'anthropic', true, 2),
    ('glm-4.6', 'GLM 4.6', 'zai', true, 3),
    ('glm-4.5-air', 'GLM 4.5 Air', 'zai', true, 4),
    ('openai/gpt-5.2', 'GPT-5.2', 'openrouter', true, 5),
    ('openai/gpt-5.1-codex', 'GPT-5.1 Codex', 'openrouter', true, 6),
    ('x-ai/grok-code-fast-1', 'Grok Code Fast', 'openrouter', true, 7),
    ('moonshotai/kimi-k2-thinking', 'Kimi K2 Thinking', 'openrouter', true, 8),
    ('minimax/minimax-m2', 'Minimax M2', 'openrouter', true, 9),
    ('deepseek/deepseek-v3.2', 'Deepseek V3.2', 'openrouter', true, 10)
ON CONFLICT (model_id) DO NOTHING;

-- Seed Admin User (password: admin123 - CHANGE THIS!)
DO $$
DECLARE
    admin_id UUID;
BEGIN
    INSERT INTO users (email, hashed_password, is_active, is_superuser, is_verified, username)
    VALUES ('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4c6nO2H.C3qxCkHK', true, true, true, 'admin')
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO admin_id;

    IF admin_id IS NOT NULL THEN
        INSERT INTO user_settings (user_id, notification_sound_enabled) VALUES (admin_id, true);
    END IF;
END $$;

-- Done!
SELECT 'Migration completed successfully!' as status;
```

---

## Troubleshooting

### Common Issues

1. **"relation already exists"** - Tables already created. Drop and recreate or skip.
2. **"type already exists"** - Enum types exist. Safe to ignore.
3. **Connection refused** - Check if using pooled vs direct connection URL.
4. **SSL required** - Add `?sslmode=require` to connection string.

### Reset Database (Development Only)

```sql
-- ⚠️ DANGER: This drops all data!
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

---

## Next Steps

After completing Supabase setup:
1. ✅ Step 1: Supabase PostgreSQL - **DONE**
2. ⬜ Step 2: Upstash Redis
3. ⬜ Step 3: Railway Backend
4. ⬜ Step 4: Vercel Frontend
5. ⬜ Step 5: Post-deployment configuration
