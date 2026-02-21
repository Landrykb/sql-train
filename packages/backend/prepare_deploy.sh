#!/bin/bash
# Prepare backend for deployment by bundling required data from frontend
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"

echo "==> Copying datasets..."
mkdir -p "$SCRIPT_DIR/data/datasets"
cp -r "$FRONTEND_DIR/public/datasets/"* "$SCRIPT_DIR/data/datasets/"

echo "==> Copying cases..."
mkdir -p "$SCRIPT_DIR/data/cases"
cp -r "$FRONTEND_DIR/cases/"* "$SCRIPT_DIR/data/cases/"

echo "==> Done! Backend is ready for deployment."
