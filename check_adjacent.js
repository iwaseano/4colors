const fs = require('fs');
const turf = require('@turf/turf');

// GeoJSONを読み込み
const data = JSON.parse(fs.readFileSync('C:/Users/owner/Documents/project/world/4color/public/tokyo23.geojson', 'utf8'));

// 江戸川区と葛飾区を抽出
const edogawa = data.features.find(f => f.properties.N03_004 === '江戸川区');
const katsushika = data.features.find(f => f.properties.N03_004 === '葛飾区');

console.log('江戸川区:', edogawa.properties.N03_004);
console.log('葛飾区:', katsushika.properties.N03_004);

// 隣接判定
const touches = turf.booleanTouches(edogawa, katsushika);
const overlaps = turf.booleanOverlap(edogawa, katsushika);
const intersects = turf.booleanIntersects(edogawa, katsushika);

console.log('\n判定結果:');
console.log('  booleanTouches (境界が接触):', touches);
console.log('  booleanOverlap (重なり):', overlaps);
console.log('  booleanIntersects (交差/接触):', intersects);

// 実際に交差部分を計算
try {
  const intersection = turf.intersect(edogawa, katsushika);
  if (intersection) {
    console.log('  交差部分の型:', intersection.geometry.type);
    console.log('  交差部分が存在します');
  } else {
    console.log('  交差部分はありません');
  }
} catch (e) {
  console.log('  交差計算エラー:', e.message);
}

// 境界ボックスを確認
const bbox1 = turf.bbox(edogawa);
const bbox2 = turf.bbox(katsushika);
console.log('\n江戸川区 境界ボックス:', bbox1);
console.log('葛飾区 境界ボックス:', bbox2);
