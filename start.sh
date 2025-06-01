#!/bin/bash

echo "🚛 Starting DHL Warehouse Scheduler..."

# Kill any existing processes
pkill -f "node server.js" 2>/dev/null || true
pkill -f "python.*http.server" 2>/dev/null || true

# Start backend
echo "📡 Starting backend server..."
cd backend
node server.js &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

echo "✅ DHL Warehouse Scheduler is running!"
echo ""
echo "📱 Access the application:"
echo "   🌐 Main Application: http://localhost:5000"
echo "   🔧 API Health Check: http://localhost:5000/api/health"
echo ""
echo "🔑 Admin Credentials:"
echo "   Username: admin"
echo "   Password: dhl2025"
echo ""
echo "📋 Features:"
echo "   ✓ Dashboard (TV Display)"
echo "   ✓ Event Creation Form"
echo "   ✓ Admin Panel"
echo "   ✓ Real-time Updates"
echo "   ✓ CSV Export"
echo ""
echo "Press Ctrl+C to stop the server"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping DHL Warehouse Scheduler..."
    kill $BACKEND_PID 2>/dev/null || true
    pkill -f "node server.js" 2>/dev/null || true
    echo "✅ Stopped successfully"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Open browser after delay
(sleep 5 && (
    if command -v firefox &> /dev/null; then
        firefox "http://localhost:5000" &> /dev/null &
    elif command -v chromium &> /dev/null; then
        chromium "http://localhost:5000" &> /dev/null &
    elif command -v google-chrome &> /dev/null; then
        google-chrome "http://localhost:5000" &> /dev/null &
    else
        echo "💡 Open http://localhost:5000 in your browser"
    fi
)) &

# Wait for backend process
wait $BACKEND_PID
