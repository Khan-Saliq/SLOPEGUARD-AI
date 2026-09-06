#!/bin/bash

# SlopeGuard AI - Complete System Startup Script

echo "=========================================="
echo "SlopeGuard AI - Starting All Services"
echo "=========================================="

# Check if ports are available
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Port $1 is already in use"
        return 1
    else
        echo "✓ Port $1 is available"
        return 0
    fi
}

echo ""
echo "Checking ports..."
check_port 3000 # Frontend
check_port 4000 # Backend
check_port 5000 # ML Risk Service
check_port 5001 # ML Vision Service

echo ""
echo "=========================================="
echo "Starting Backend Server (Port 4000)..."
echo "=========================================="
cd server
node index.js &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

echo ""
echo "=========================================="
echo "Starting ML Risk Service (Port 5000)..."
echo "=========================================="
cd ../ml_service
python app.py &
ML_RISK_PID=$!
echo "ML Risk Service started with PID: $ML_RISK_PID"

echo ""
echo "=========================================="
echo "Starting ML Vision Service (Port 5001)..."
echo "=========================================="
python vision_app.py &
ML_VISION_PID=$!
echo "ML Vision Service started with PID: $ML_VISION_PID"

echo ""
echo "=========================================="
echo "Starting Frontend (Port 5173)..."
echo "=========================================="
cd ..
npm run dev:frontend &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "✅ All Services Started Successfully!"
echo "=========================================="
echo ""
echo "Service Status:"
echo "  Backend API:      http://localhost:4000"
echo "  ML Risk Service:  http://localhost:5000"
echo "  ML Vision API:    http://localhost:5001"
echo "  Frontend:         http://localhost:5173"
echo ""
echo "Process IDs:"
echo "  Backend:     $BACKEND_PID"
echo "  ML Risk:     $ML_RISK_PID"
echo "  ML Vision:   $ML_VISION_PID"
echo "  Frontend:    $FRONTEND_PID"
echo ""
echo "To stop all services, run:"
echo "  kill $BACKEND_PID $ML_RISK_PID $ML_VISION_PID $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=========================================="

# Wait for all background processes
wait
