# Render Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. External Services
Before deploying to Render, ensure you have:

- [ ] **Qdrant Cloud** account and cluster
  - [ ] Cluster URL copied
  - [ ] API key generated
  
- [ ] **Neo4j Aura** account and database
  - [ ] Connection URI copied
  - [ ] Username and password saved
  
- [ ] **Supabase** project created
  - [ ] Project URL copied
  - [ ] Anon key copied
  - [ ] Service role key copied
  - [ ] JWT secret copied
  
- [ ] **Google Gemini** API key
  - [ ] API key generated from https://makersuite.google.com/app/apikey
  
- [ ] **Groq** API key (optional but recommended)
  - [ ] API key generated from https://console.groq.com/

### 2. GitHub Repository
- [ ] Code pushed to GitHub repository
- [ ] Repository is accessible to Render (public or connected)
- [ ] All changes committed and pushed

## 🚀 Render Deployment Steps

### Option A: Using Blueprint (Recommended)

1. [ ] Go to Render Dashboard: https://dashboard.render.com/
2. [ ] Click **"New"** → **"Blueprint"**
3. [ ] Connect GitHub repository: `https://github.com/Snigdha-Gayathri/EKIP`
4. [ ] Render detects `render.yaml` automatically
5. [ ] Click **"Apply"** to create services

### Option B: Manual Setup

#### Backend Service
1. [ ] New → Web Service
2. [ ] Connect repository
3. [ ] Configure:
   - Environment: **Docker**
   - Dockerfile Path: `./backend/Dockerfile`
   - Docker Context: `./backend`
   - Region: **Oregon** (or preferred)
   - Plan: **Free** (or paid)
4. [ ] Set Health Check Path: `/api/v1/health`

#### Frontend Service
1. [ ] New → Static Site
2. [ ] Connect repository
3. [ ] Configure:
   - Build Command: `cd frontend && npm ci && npm run build`
   - Publish Directory: `./frontend/dist`
4. [ ] Add rewrite rule: `/*` → `/index.html`

## 🔐 Environment Variables Setup

### Backend Service (`ekip-backend`)

Go to **Environment** tab and add these variables:

#### Required Variables
```
GEMINI_API_KEY=your-google-gemini-api-key
GROQ_API_KEY=your-groq-api-key
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_PASSWORD=your-neo4j-password
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

#### Optional Variables (with defaults)
```
APP_SECRET_KEY=generate-random-secret-key-here
CORS_ORIGINS=https://your-frontend.onrender.com
NEO4J_USERNAME=neo4j
NEO4J_DATABASE=neo4j
MAX_UPLOAD_SIZE_MB=50
RATE_LIMIT_QUERIES_PER_MINUTE=30
RATE_LIMIT_UPLOADS_PER_HOUR=50
```

### Frontend Service (`ekip-frontend`)

Go to **Environment** tab and add:

```
VITE_API_URL=https://ekip-backend.onrender.com
```

**Note:** Replace `ekip-backend` with your actual backend service name.

## 📊 Post-Deployment Verification

### Backend Health Check
- [ ] Visit: `https://your-backend.onrender.com/api/v1/health`
- [ ] Expected response: `{"status": "healthy", ...}`
- [ ] Visit: `https://your-backend.onrender.com/docs`
- [ ] API documentation loads correctly

### Frontend Check
- [ ] Visit: `https://your-frontend.onrender.com`
- [ ] Dashboard loads without errors
- [ ] Try uploading a test document
- [ ] Try a test query
- [ ] Check browser console for errors

### Database Connections
- [ ] Backend logs show successful Qdrant connection
- [ ] Backend logs show successful Neo4j connection
- [ ] Backend logs show successful Supabase connection
- [ ] No connection errors in logs

## 🐛 Troubleshooting

### If deployment fails with "Port scan timeout":
- [ ] Verify `PORT` environment variable is being used
- [ ] Check if `start.sh` script has execute permissions
- [ ] Review build logs for errors
- [ ] Check health endpoint is responding

### If backend shows "Out of memory":
- [ ] Upgrade to paid plan with more RAM
- [ ] Optimize memory-intensive operations
- [ ] Consider reducing concurrent workers

### If frontend can't reach backend:
- [ ] Verify `VITE_API_URL` is set correctly
- [ ] Check CORS settings in backend
- [ ] Ensure backend is deployed and healthy
- [ ] Check browser console for CORS errors

### If database connections fail:
- [ ] Verify all credentials are correct
- [ ] Check database service is running
- [ ] Ensure IP allowlisting (if required)
- [ ] Check connection strings format

## 🔄 Continuous Deployment

- [ ] Auto-deploy on push to `main` branch enabled
- [ ] Consider setting up staging environment
- [ ] Set up Render notifications (email/Slack)

## 📝 Documentation

- [ ] Update `VITE_API_URL` in frontend after backend deployment
- [ ] Document backend URL for team
- [ ] Document frontend URL for team
- [ ] Share access credentials securely (use secrets manager)

## 🎉 Deployment Complete!

Once all items are checked:
1. Share URLs with your team
2. Monitor logs for first 24 hours
3. Set up monitoring/alerting (optional)
4. Consider upgrading to paid plan for production use

---

**Support:**
- Render Docs: https://render.com/docs
- EKIP Deployment Guide: [DEPLOYMENT.md](DEPLOYMENT.md)
- GitHub Issues: https://github.com/Snigdha-Gayathri/EKIP/issues
