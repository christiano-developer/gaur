#!/bin/bash

# GAUR Enhanced Police Cyber Patrolling System
# Startup script for macOS M2 MacBook

set -e

echo "============================================================"
echo "GAUR Enhanced Police Cyber Patrolling System"
echo "Phase 1: Core Infrastructure Startup"
echo "============================================================"

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "❌ Conda not found. Please install Miniconda or Anaconda."
    exit 1
fi

# Check if gaur environment exists
if ! conda env list | grep -q "gaur"; then
    echo "❌ Conda environment 'gaur' not found."
    echo "Please run: conda create -n gaur python=3.11"
    exit 1
fi

# Check PostgreSQL
if ! brew services list | grep -q "postgresql@15.*started"; then
    echo "⚠️  PostgreSQL not running. Starting PostgreSQL..."
    brew services start postgresql@15
    sleep 3
fi

# Check if database exists
if ! psql -l | grep -q "gaur_police_db"; then
    echo "⚠️  Database 'gaur_police_db' not found. Creating database..."
    createdb gaur_police_db
fi

echo "✅ Prerequisites check completed"
echo ""

# Create necessary directories
mkdir -p logs evidence exports

# Create .env from example if needed
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "📝 Created .env file from template"
        echo "⚠️  Please edit .env with your API keys and credentials"
        echo ""
    else
        echo "❌ .env.example not found"
        exit 1
    fi
fi

# Activate conda environment and start system
echo "🚀 Starting GAUR system..."
echo "Activating conda environment 'gaur'..."

# Use conda activate in a way that works in scripts
eval "$(conda shell.bash hook)"
conda activate gaur

# Verify environment
echo "Python version: $(python --version)"
echo "Environment: $(conda info --envs | grep '*' | awk '{print $1}')"
echo ""

# Start the system
echo "🔧 Initializing GAUR Enhanced System..."
python start_gaur.py

echo ""
echo "============================================================"
echo "GAUR System Startup Complete"
echo "============================================================"