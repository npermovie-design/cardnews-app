#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

pip install -r requirements.txt -q

echo "Starting Shorts Factory + Virality System..."
echo "  Shorts Factory: http://127.0.0.1:8000"
echo "  Virality System: http://127.0.0.1:8000/virality"
uvicorn app:app --reload --host 127.0.0.1 --port 8000
