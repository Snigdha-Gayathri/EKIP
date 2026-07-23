# Deployment Guide for EKIP on Render

## Prerequisites

1. A Render account (https://render.com)
2. GitHub repository with your code
3. All required API keys and service credentials

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Connect Your Repository**
   - Go to Render Dashboard
   - Click "New" → "Blueprint"
   - Connect your GitHub repository: `https://github.com/Snigdha-Gayathri/EKIP`
   - Render will automatically detect the `render.yaml` file

2. **Configure Environment Variables**
   
   After the blueprint is created, add these secret environment variables in the Render dashboard for the **ekip-backend** service:

   **Required:**
   - `GOOGLE_API_KEY` - Your Google AI API key
   - `GROQ_API_KEY` - Your Groq API key
   - `QDRANT_URL` - Your Qdrant instance URL
   - `QDRANT_API_KEY` - Your Qdrant API key
   - `NEO4J_URI` - Your Neo4j instance URI
   - `NEO4J_USER` - Neo4j username
   - `NEO4J_PASSWORD` - Neo4j password
   - `SUPABASE_URL` - Supabase project URL
   - `SUPABASE_KEY` - Supabase service key
   - `API_KEYS` - Comma-separated list of valid API keys for your backend

   **Optional:**
   - `JWT_SECRET_KEY` - Secret for JWT token generation (auto-generated if not provided)
   - `MAX_UPLOAD_SIZE_MB` - Maximum file upload size (default: 10)
   - `CHUNK_SIZE` - Text chunk size for embeddings (default: 1000)
   - `CHUNK_OVERLAP` - Overlap between chunks (default: 200)

   For the **ekip-frontend** service:
   - `VITE_API_URL` - URL of your deployed backend (e.g., `https://ekip-backend.onrender.com`)

3. **Deploy**
   - Click "Apply" to deploy both services
   - Wait for the build and deployment to complete

### Option 2: Manual Setup

#### Backend Deployment

1. **Create a New Web Service**
   - Go to Render Dashboard → "New" → "Web Service"
   - Connect your repository
   - Configure:
     - **Name:** `ekip-backend`
     - **Environment:** Docker
     - **Region:** Oregon (or your preferred region)
     - **Branch:** `main`
     - **Dockerfile Path:** `./backend/Dockerfile`
     - **Docker Context:** `./backend`
     - **Plan:** Free (or your preferred plan)

2. **Add Environment Variables** (same as above)

3. **Set Health Check**
   - Health Check Path: `/api/v1/health`

#### Frontend Deployment

1. **Create a New Static Site**
   - Go to Render Dashboard → "New" → "Static Site"
   - Connect your repository
   - Configure:
     - **Name:** `ekip-frontend`
     - **Branch:** `main`
     - **Build Command:** `cd frontend && npm install && npm run build`
     - **Publish Directory:** `./frontend/dist`

2. **Add Environment Variables**
   - `VITE_API_URL`: Your backend URL (e.g., `https://ekip-backend.onrender.com`)

3. **Configure Rewrites**
   - Add rewrite rule: `/*` → `/index.html` (for SPA routing)

## External Services Setup

### 1. Qdrant (Vector Database)

**Option A: Qdrant Cloud (Recommended)**
- Sign up at https://cloud.qdrant.io/
- Create a new cluster
- Copy the cluster URL and API key
- Use these as `QDRANT_URL` and `QDRANT_API_KEY`

**Option B: Self-hosted Qdrant on Render**
- Deploy Qdrant as a separate web service using Docker
- Image: `qdrant/qdrant:latest`
- Expose port: `6333`
- Add persistent disk for data storage

### 2. Neo4j (Graph Database)

**Option A: Neo4j AuraDB (Recommended)**
- Sign up at https://neo4j.com/cloud/aura/
- Create a free AuraDB instance
- Copy the connection URI, username, and password
- Use these as `NEO4J_URI`, `NEO4J_USER`, and `NEO4J_PASSWORD`

**Option B: Self-hosted Neo4j**
- Deploy Neo4j on a separate platform (not recommended on Render free tier)

### 3. Supabase (Authentication & Storage)

**Supabase Cloud**
- Sign up at https://supabase.com/
- Create a new project
- Go to Project Settings → API
- Copy the project URL and service key
- Use these as `SUPABASE_URL` and `SUPABASE_KEY`

## Post-Deployment

### Verify Backend

1. Check health endpoint: `https://your-backend-url.onrender.com/api/v1/health`
2. Access API docs: `https://your-backend-url.onrender.com/docs`

### Verify Frontend

1. Visit your frontend URL: `https://your-frontend-url.onrender.com`
2. Try uploading a document
3. Query the knowledge base

## Troubleshooting

### Backend Issues

**"Port scan timeout" error:**
- Ensure the `PORT` environment variable is properly used in the Dockerfile CMD
- Verify the health check endpoint is responding
- Check logs for startup errors

**Database connection errors:**
- Verify all database credentials are correct
- Check if external services (Qdrant, Neo4j, Supabase) are accessible
- Ensure firewall rules allow connections from Render IPs

**Out of memory:**
- Upgrade to a paid plan with more resources
- Reduce `WEB_CONCURRENCY` if needed
- Optimize memory-intensive operations

### Frontend Issues

**API calls failing:**
- Verify `VITE_API_URL` is set correctly
- Check CORS configuration in backend
- Ensure backend is deployed and healthy

**404 on page refresh:**
- Verify rewrite rule is configured: `/*` → `/index.html`

## Monitoring

- Use Render's built-in logs and metrics
- Set up alerts for service downtime
- Monitor API response times and error rates

## Scaling

- Upgrade to paid plans for:
  - Auto-scaling
  - More memory/CPU
  - Persistent storage
  - Better performance
  - Reduced cold start times

## Cost Optimization

- Free tier limitations:
  - Services spin down after 15 minutes of inactivity
  - Limited build minutes per month
  - No persistent disk on free tier
  
- For production:
  - Use at least Starter plan for always-on services
  - Consider paid tiers for databases
  - Use CDN for static assets

## Security Best Practices

1. **Never commit secrets to Git**
2. **Use environment variables for all sensitive data**
3. **Enable HTTPS (automatic on Render)**
4. **Implement rate limiting** (already configured in backend)
5. **Use strong API keys**
6. **Regularly rotate credentials**
7. **Monitor access logs**

## Continuous Deployment

- Render automatically deploys on push to main branch
- Use preview environments for pull requests
- Set up separate staging environment if needed

## Support

For issues:
1. Check Render logs
2. Review this deployment guide
3. Consult Render documentation: https://render.com/docs
4. Check GitHub repository issues
