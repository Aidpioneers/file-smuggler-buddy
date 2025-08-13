#!/usr/bin/env python3
"""
Download marathon data from Google Sheets and convert to GeoJSON format.
This script automatically downloads the latest data and updates the public GeoJSON file.
"""

import csv
import json
import os
import requests
import sys
from datetime import datetime

# Google Sheets CSV URL
GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDhMx8shcqFiqMKjLnrC0NNhV3b_kNCyn7FfpT0IYd8gPJf0VnKtgkGSmtJRWzbTaLR1LtSeMnmwny/pub?gid=190506599&single=true&output=csv"

def clean_coordinate(coord_str):
    """Clean and convert coordinate string to float."""
    if not coord_str or coord_str.strip() == '':
        return None
    
    # Replace unicode minus signs with regular minus
    coord_str = coord_str.replace('−', '-')
    
    try:
        return float(coord_str.strip())
    except ValueError:
        return None

def clean_text(text):
    """Clean text by removing extra whitespace and handling encoding."""
    if not text:
        return ""
    
    # Handle common encoding issues
    text = text.replace('â', '-')   # Fix specific "â" character to hyphen
    text = text.replace('Ã©', 'é')  # Fix é character
    text = text.replace('Ã¨', 'è')  # Fix è character  
    text = text.replace('Ã¡', 'á')  # Fix á character
    text = text.replace('Ã­', 'í')  # Fix í character
    text = text.replace('Ã³', 'ó')  # Fix ó character
    text = text.replace('Ã¼', 'ü')  # Fix ü character
    text = text.replace('Ã±', 'ñ')  # Fix ñ character
    text = text.replace('Ã§', 'ç')  # Fix ç character
    text = text.replace('â€™', "'")  # Fix apostrophe
    text = text.replace('â€œ', '"')  # Fix left quote
    text = text.replace('â€', '"')   # Fix right quote
    text = text.replace('â€"', '–')  # Fix en dash
    text = text.replace('â€"', '—')  # Fix em dash
    
    return text.strip()

def parse_date(date_str):
    """Parse date string to ISO format."""
    if not date_str or date_str.strip() == '':
        return None
    
    date_str = date_str.strip()
    
    # Handle various date formats
    try:
        # Try DD/MM/YYYY format first
        if '/' in date_str:
            parts = date_str.split('/')
            if len(parts) == 3:
                day, month, year = parts
                return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
        
        # Try other formats as needed
        return date_str
    except:
        return date_str

def download_and_convert():
    """Download CSV from Google Sheets and convert to GeoJSON."""
    
    print("🏃‍♂️ Starting marathon data download and conversion...")
    print(f"📥 Downloading from: {GOOGLE_SHEET_URL}")
    print("Downloading marathon data from Google Sheets...")
    
    try:
        # Download CSV data
        response = requests.get(GOOGLE_SHEET_URL)
        response.raise_for_status()
        
        # Parse CSV
        csv_content = response.text
        csv_reader = csv.DictReader(csv_content.splitlines())
        
        features = []
        skipped_count = 0
        processed_count = 0
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 since header is row 1
            # Skip if show? is not TRUE
            show_value = row.get('show?', '').strip().upper()
            if show_value != 'TRUE':
                skipped_count += 1
                continue
            
            # Get coordinates
            lat_str = row.get('lat', '').strip()
            lon_str = row.get('lon', '').strip()
            
            lat = clean_coordinate(lat_str)
            lon = clean_coordinate(lon_str)
            
            # Skip if coordinates are invalid
            if lat is None or lon is None:
                skipped_count += 1
                print(f"Row {row_num}: Skipping due to invalid coordinates: lat='{lat_str}', lon='{lon_str}'")
                continue
            
            # Skip if essential fields are missing
            name = clean_text(row.get('Name', ''))
            city = clean_text(row.get('City', ''))
            
            if not name or name == '#REF!' or not city or city == '#REF!':
                skipped_count += 1
                print(f"Row {row_num}: Skipping due to missing/invalid name or city")
                continue
            
            # Create feature
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat]
                },
                "properties": {
                    "name": name,
                    "year": clean_text(row.get('Year', '')),
                    "city": city,
                    "country": clean_text(row.get('ISO3', '')),
                    "type": clean_text(row.get('Full / Half', '')),
                    "date": parse_date(row.get('Date', '')),
                    "availability": clean_text(row.get('Availability', '')),
                    "status": clean_text(row.get('Availability', '')),
                    "landingPage": clean_text(row.get('Landing Page', ''))
                }
            }
            
            features.append(feature)
            processed_count += 1
        
        # Create GeoJSON structure
        geojson = {
            "type": "FeatureCollection",
            "features": features,
            "metadata": {
                "generated": datetime.now().isoformat(),
                "source": "Aid Pioneers Marathon Data",
                "count": len(features)
            }
        }
        
        # Ensure output directory exists
        output_file = "public/marathons.geojson"
        output_dir = os.path.dirname(output_file)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)
            print(f"📁 Created directory: {output_dir}")
        
        # Write to file
        print(f"📝 Writing GeoJSON to: {os.path.abspath(output_file)}")
        with open(output_file, 'w', encoding='utf-8') as geojsonfile:
            json.dump(geojson, geojsonfile, indent=2, ensure_ascii=False)
        
        # Verify file was created
        if os.path.exists(output_file):
            file_size = os.path.getsize(output_file)
            print(f"📁 File created successfully: {output_file} ({file_size} bytes)")
        
        print(f"✅ Marathon data conversion complete!")
        print(f"📊 Processed: {processed_count} marathons")
        print(f"⏭️  Skipped: {skipped_count} records")
        print(f"📁 Output: {output_file}")
        print(f"🕒 Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return True
        
    except requests.RequestException as e:
        print(f"❌ Error downloading data: {e}")
        return False
    except Exception as e:
        print(f"❌ Error processing data: {e}")
        return False

if __name__ == "__main__":
    success = download_and_convert()
    sys.exit(0 if success else 1)