const fs = require('fs');
const path = require('path');

// Read the TypeScript file
const marathonFilePath = path.join(__dirname, '../src/data/marathons.ts');
const outputPath = path.join(__dirname, '../public/marathons.geojson');

console.log('Converting marathon data to GeoJSON...');

try {
  // Read the TypeScript file
  const tsContent = fs.readFileSync(marathonFilePath, 'utf8');
  
  // Extract the JSON data from the TypeScript export
  const jsonMatch = tsContent.match(/marathonData = ({[\s\S]*?}) as const;/);
  
  if (!jsonMatch) {
    throw new Error('Could not find marathonData in TypeScript file');
  }
  
  // Parse the extracted JSON
  const marathonData = JSON.parse(jsonMatch[1]);
  
  // Validate it's a proper GeoJSON
  if (marathonData.type !== 'FeatureCollection' || !Array.isArray(marathonData.features)) {
    throw new Error('Invalid GeoJSON structure');
  }
  
  // Add metadata
  const geojson = {
    ...marathonData,
    metadata: {
      generated: new Date().toISOString(),
      source: 'Aid Pioneers Marathon Data',
      count: marathonData.features.length
    }
  };
  
  // Ensure public directory exists
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  // Write the GeoJSON file
  fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
  
  console.log(`✅ Successfully converted ${marathonData.features.length} marathons to GeoJSON`);
  console.log(`📄 Output saved to: ${outputPath}`);
  
} catch (error) {
  console.error('❌ Error converting to GeoJSON:', error.message);
  process.exit(1);
}