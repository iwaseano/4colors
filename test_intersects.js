const fs = require('fs');
const turf = require('@turf/turf');

const data = JSON.parse(fs.readFileSync('C:/Users/owner/Documents/project/world/4color/public/tokyo23.geojson', 'utf8'));

const intersects = [];

for (let i = 0; i < data.features.length; i++) {
  for (let j = i + 1; j < data.features.length; j++) {
    const ward1 = data.features[i];
    const ward2 = data.features[j];
    
    const name1 = ward1.properties.N03_004;
    const name2 = ward2.properties.N03_004;
    
    try {
      if (turf.booleanIntersects(ward1, ward2)) {
        intersects.push(name1 + ' - ' + name2);
      }
    } catch (e) {}
  }
}

console.log('booleanIntersectsで検出された隣接関係: ' + intersects.length + '組');
console.log('\n最初の20組:');
intersects.slice(0, 20).forEach(pair => console.log('  - ' + pair));