# SLOPEGUARD AI

**AI-Based Early Warning & Landslide Risk Monitoring System for North Eastern Region (NER)**

![SLOPEGUARD AI Logo](./public/logo.png)

## Overview
SLOPEGUARD AI is an advanced AI/ML powered landslide risk monitoring, forecasting, and early warning system designed specifically for high-risk zones in the North Eastern Region of India.

### Key Features
- **GIS Risk Mapping**: Real-time interactive map layers displaying critical, high, moderate, and low risk zones.
- **3D Terrain & Rainfall Simulation**: Dynamic 3D slope rendering with live rainfall particle simulations.
- **AI Risk Analytics**: Predictive ML scoring incorporating precipitation, soil saturation, slope steepness, historical telemetry, and satellite indicators.
- **Hugging Face Vision AI Screening**: Backend-only Hugging Face Image Analysis (`google/vit-base-patch16-224`) for hazard image classification without client-side API key exposure.
- **Citizen Hazard Reporting**: Geo-tagged evidence submission with real-time AI image screening ("Possible landslide detected. Awaiting official verification").
- **Authority Command Center**: Automated risk notifications, task assignments, and field officer dispatch workflows.

## AI & Image Screening Architecture

### Backend Hugging Face Vision Integration
- **Service Location**: `server/services/huggingfaceImageService.js`
- **Security**: The Hugging Face API key is strictly maintained in backend server environment variables (`HUGGINGFACE_API_KEY`) and is never sent to or stored in client-side code.
- **Human Verification Policy**: AI screening results are advisory. Images are flagged with `requiresHumanVerification: true` and classified into standardized hazard categories (`POSSIBLE_LANDSLIDE`, `POSSIBLE_ROAD_BLOCKAGE`, `POSSIBLE_WATER_SEEPAGE`, `POSSIBLE_CRACK`, `NORMAL_LANDSCAPE`, `IRRELEVANT`).
- **Offline & Fallback Support**: If the Hugging Face API or external ML service is unconfigured or unreachable, the system safely records `UNAVAILABLE` / `offline` status and allows citizen report submissions for manual authority inspection without displaying hardcoded or simulated numbers.

## Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Leaflet / React-Leaflet, Three.js / React Three Fiber
- **Backend**: Node.js, Express, MongoDB / Native Storage, Server-Sent Events (SSE), Axios
- **AI / ML**: Hugging Face Inference API (`google/vit-base-patch16-224`), Python Flask / XGBoost ML Microservice

## Environment Setup

Copy `.env.example` to `.env` or set environment variables in your deployment platform (e.g., Render, Vercel):

```bash
# Server Environment
PORT=4000
JWT_SECRET=your_jwt_secret_key
MONGO_URL=mongodb://127.0.0.1:27017/landslide

# Hugging Face Vision API (Backend Only)
HUGGINGFACE_API_KEY=hf_your_huggingface_access_token
HUGGINGFACE_IMAGE_MODEL=google/vit-base-patch16-224
HUGGINGFACE_API_URL=https://api-inference.huggingface.co/models/

# External ML Service (Optional)
ML_SERVICE_URL=http://127.0.0.1:5000
```

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   cd server && npm install
   ```

2. **Start Backend Server**:
   ```bash
   npm run server
   # or from server directory: node index.js
   ```

3. **Start Frontend Development Server**:
   ```bash
   npm run dev
   ```

4. **Production Build**:
   ```bash
   npm run build
   ```
