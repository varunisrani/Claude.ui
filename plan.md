# Claude.ui Deployment Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VERCEL                                   │
│                   Frontend (React/Vite)                          │
│                   https://claude-ui.vercel.app                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        RAILWAY                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   FastAPI   │  │   Celery    │  │   Celery    │              │
│  │   Backend   │  │   Worker    │  │    Beat     │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐  ┌─────────────────────────┐
│    SUPABASE     │  │        UPSTASH          │
│   PostgreSQL    │  │         Redis           │
└─────────────────┘  └─────────────────────────┘
```

---

## Deployment Stack (Recommended)

| Component | Platform | Free Tier |
|-----------|----------|-----------|
| Frontend | **Vercel** | Unlimited |
| Backend API | **Railway** | $5 credit/month |
| Celery Worker | **Railway** | Shared with API |
| Celery Beat | **Railway** | Shared with API |
| PostgreSQL | **Supabase** | 500MB free |
| Redis | **Upstash** | 10K commands/day |

---

## Step 1: Setup Supabase (PostgreSQL)

### 1.1 Create Project
1. Go to https://supabase.com → Sign up/Login
2. Click "New Project"
3. Choose organization, name: `claude-ui`
4. Set database password (SAVE THIS!)
5. Select region closest to you
6. Click "Create new project"

### 1.2 Get Connection String
1. Go to Project Settings → Database
2. Find "Connection string" → URI format
3. Copy and replace `[YOUR-PASSWORD]` with your password

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
```

### 1.3 Disable RLS (for simplicity)
- Go to Authentication → Policies
- Disable Row Level Security for now (enable later for production)

---

## Step 2: Setup Upstash (Redis)

### 2.1 Create Database
1. Go to https://upstash.com → Sign up/Login
2. Click "Create Database"
3. Name: `claude-ui-redis`
4. Select region (same as Supabase if possible)
5. Enable TLS (recommended)

### 2.2 Get Connection URL
1. Go to database details
2. Copy "Redis URL" (starts with `rediss://`)

```
REDIS_URL=rediss://default:[PASSWORD]@[HOST]:[PORT]
```

---

## Step 3: Deploy Backend on Railway

### 3.1 Create Railway Project
1. Go to https://railway.app → Sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `varunisrani/Claude.ui`
4. Choose the `backend` folder as root

### 3.2 Configure Environment Variables
Add these in Railway dashboard → Variables:

```env
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Redis
REDIS_URL=rediss://default:[PASSWORD]@[HOST]:[PORT]

# Security
SECRET_KEY=your-super-secret-key-generate-with-openssl-rand-hex-32
ENVIRONMENT=production

# API Keys
ANTHROPIC_API_KEY=sk-ant-xxx (or leave empty if using Z.AI)
Z_AI_API_KEY=your-zai-key
E2B_API_KEY=your-e2b-key

# CORS (update after Vercel deployment)
CORS_ORIGINS=https://your-app.vercel.app,http://localhost:3000
```

### 3.3 Configure Services (3 services needed)

**Service 1: API (web)**
- Root Directory: `/backend`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add custom domain or use Railway's

**Service 2: Celery Worker**
- Root Directory: `/backend`
- Start Command: `celery -A app.tasks.celery_app worker --loglevel=info`

**Service 3: Celery Beat**
- Root Directory: `/backend`
- Start Command: `celery -A app.tasks.celery_app beat --loglevel=info`

### 3.4 Run Migrations
In Railway console:
```bash
python migrate.py
```

---

## Step 4: Deploy Frontend on Vercel

### 4.1 Import Project
1. Go to https://vercel.com → Sign up with GitHub
2. Click "Add New" → "Project"
3. Import `varunisrani/Claude.ui`

### 4.2 Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 4.3 Environment Variables
Add in Vercel dashboard → Settings → Environment Variables:

```env
VITE_API_URL=https://your-railway-api.up.railway.app
VITE_WS_URL=wss://your-railway-api.up.railway.app
```

### 4.4 Deploy
Click "Deploy" and wait for build to complete.

---

## Step 5: Post-Deployment Configuration

### 5.1 Update CORS on Railway
Go back to Railway and update `CORS_ORIGINS`:
```
CORS_ORIGINS=https://claude-ui.vercel.app
```

### 5.2 Seed Admin User
In Railway console:
```bash
python seed_data.py
```

### 5.3 Test the Application
1. Visit your Vercel URL
2. Login with: `admin@example.com` / `admin123`
3. Test chat functionality

---

## Files to Create/Modify

### Already Created:
- `backend/Procfile` ✅
- `backend/railway.json` ✅

### Need to Create:

**`frontend/vercel.json`**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## Cost Estimate (Free Tier)

| Service | Free Limit | Overage Cost |
|---------|------------|--------------|
| Vercel | 100GB bandwidth | $0.15/GB |
| Railway | $5/month credit | $0.000231/min |
| Supabase | 500MB storage | $0.125/GB |
| Upstash | 10K cmd/day | $0.2/100K |

**Monthly Cost**: ~$0-5 for light usage

---

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Update `CORS_ORIGINS` in Railway
2. **Database Connection**: Check Supabase connection string
3. **Redis Connection**: Ensure TLS is enabled (`rediss://` not `redis://`)
4. **Build Fails**: Check Node version (needs 18+)

### Health Check Endpoints:
- API: `https://your-api.railway.app/health`
- Docs: `https://your-api.railway.app/docs`

---

## Alternative: All-in-One Railway Deployment

If you prefer everything on Railway:

1. Create PostgreSQL addon in Railway
2. Create Redis addon in Railway
3. All services share the same project

**Pros**: Simpler management, internal networking
**Cons**: Uses more of $5 credit faster

---

## Quick Start Commands

```bash
# Generate secret key
openssl rand -hex 32

# Test locally before deploy
docker compose up -d

# Push to trigger deployment
git add .
git commit -m "Configure for production"
git push origin main
```
