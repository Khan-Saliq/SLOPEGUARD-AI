# Giri Raksha — Deployment & Production Guide

This guide provides step-by-step instructions to deploy **Giri Raksha — AI-Based Landslide Risk Monitoring and Early Warning System** publicly and securely across **Vercel** (Frontend) and **Render** (Backend API & Python ML Service).

---

## 🏗️ Deployment Architecture

```
[ Public Users / Citizens / Admins ]
                 │
                 ▼ (Public HTTPS Link)
        ┌──────────────────┐
        │  Vercel Frontend │ (React 18 + Vite SPA)
        └────────┬─────────┘
                 │
                 ▼ (REST APIs & SSE Streams over HTTPS)
        ┌──────────────────┐
        │  Render Backend  │ (Node.js + Express API on Port 4000)
        └────┬────────┬────┘
             │        │
             │        ▼ (Predict Batch REST Calls)
             │   ┌──────────────────┐
             │   │ Render ML Engine │ (Python Flask + XGBoost ML on Port 5000)
             │   └──────────────────┘
             ▼
        ┌──────────────────┐
        │  MongoDB Atlas   │ (Cloud Database)
        └──────────────────┘
```

---

## 1. 🚀 Backend & ML Service Deployment (Render)

### Step A: Deploy Python Flask ML Service on Render
1. Sign in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository (`Giri-Raksha`).
4. Set the following fields:
   * **Name**: `giri-raksha-ml`
   * **Root Directory**: (Leave blank or `ml_service`)
   * **Environment**: `Python 3`
   * **Build Command**: `pip install -r ml_service/requirements.txt`
   * **Start Command**: `python ml_service/app.py`
5. Click **Create Web Service**.
6. Once deployed, note down your ML Service URL (e.g. `https://giri-raksha-ml.onrender.com`).

---

### Step B: Deploy Node.js Backend API on Render
1. In Render Dashboard, click **New +** → **Web Service**.
2. Connect your GitHub repository.
3. Set the following fields:
   * **Name**: `giri-raksha-api`
   * **Root Directory**: `server`
   * **Environment**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node index.js`
4. Under **Environment Variables**, click **Add Environment Variable**:
   * `PORT` = `4000`
   * `NODE_ENV` = `production`
   * `JWT_SECRET` = (Click Generate or enter a secret random 32-char string)
   * `MONGO_URL` = `your_mongodb_atlas_connection_string` (e.g. `mongodb+srv://...`)
   * `ML_SERVICE_URL` = `https://giri-raksha-ml.onrender.com` (Your deployed ML service URL from Step A)
   * `CORS_ORIGIN` = `*` (or your Vercel frontend URL once deployed)
5. Click **Create Web Service**.
6. Once deployed, note down your Backend API URL (e.g. `https://giri-raksha-api.onrender.com`).

---

## 2. ⚡ Frontend Deployment (Vercel)

1. Sign in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`Giri-Raksha`).
4. Configure Project Settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `./` (Root directory of the repo)
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   * `VITE_API_URL` = `https://giri-raksha-api.onrender.com` (Your deployed Render backend URL)
6. Click **Deploy**.
7. Vercel will generate your live public link (e.g. `https://giri-raksha.vercel.app`).

---

## 🔒 Security & Public Access Verification

* ✅ **Public Accessibility**: Anyone with the Vercel link can access the Landing Page, Citizen Portal, Report Hazard page, and Safe Evacuation Routes.
* 🔒 **Admin Protection**: Admin Command Center (`/dashboard`, `/map`, `/analytics`, `/roads`) remains strictly protected by JWT authentication & role-based middleware (`requireRole('authority')`).
* 🔑 **Secrets Isolation**: All database connection strings, JWT secrets, and API keys are stored in Render/Vercel Environment Variables — zero hardcoded credentials in source code.
