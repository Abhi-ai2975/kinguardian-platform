#!/bin/bash
# Quick MLflow setup script for AI Agent

echo "Setting up MLflow for AI Agent"
echo "=================================="

# Check if MLflow is installed
if ! python -c "import mlflow" 2>/dev/null; then
    echo "Installing MLflow..."
    pip install mlflow
else
    echo "MLflow already installed"
fi

# Set environment variables
export MLFLOW_TRACKING_URI="http://localhost:5000"
export MLFLOW_EXPERIMENT_NAME="AIAgent"

echo "   Setting environment variables:"
echo "   MLFLOW_TRACKING_URI=$MLFLOW_TRACKING_URI"
echo "   MLFLOW_EXPERIMENT_NAME=$MLFLOW_EXPERIMENT_NAME"

# Create data directory for MLflow
mkdir -p mlruns
echo "Created mlruns directory"

# Start MLflow server
echo "  Starting MLflow server..."
echo "   UI will be available at: http://localhost:5000"
echo "   Press Ctrl+C to stop the server"
echo ""

# Start MLflow UI
mlflow ui --port 5000 --backend-store-uri sqlite:///mlflow.db
