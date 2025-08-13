#!/bin/bash

# Marathon Data Update Script
# This script downloads and processes marathon data from Google Sheets

echo "🏃‍♂️ Starting marathon data update..."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Install required Python packages
echo "📦 Installing required packages..."
pip3 install requests

# Run the marathon data update script
echo "🔄 Updating marathon data..."
python3 scripts/update-marathon-data.py

if [ $? -eq 0 ]; then
    echo "✅ Marathon data update completed successfully!"
    echo "📁 Updated file: public/marathons.geojson"
else
    echo "❌ Marathon data update failed!"
    exit 1
fi