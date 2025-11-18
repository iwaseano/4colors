const fs = require('fs');
const turf = require('@turf/turf');

// GeoJSONを読み込み
const data = JSON.parse(fs.readFileSync('C:/Users/owner/Documents/project/world/4color/public/tokyo23.geojson', 'utf8'));

console.log('東京23区の隣接関係分析\n');

const overlapsOnly = [];
const touches = [];

// 全ての区の組み合わせをチェック
for (let i = 0; i < data.features.length; i++) {
  for (let j = i + 1; j < data.features.length; j++) {
    const ward1 = data.features[i];
    const ward2 = data.features[j];
    
    const name1 = ward1.properties.N03_004;
    const name2 = ward2.properties.N03_004;
    
    try {
      const isTouching = turf.booleanTouches(ward1, ward2);
      const isOverlapping = turf.booleanOverlap(ward1, ward2);
      
      if (isTouching) {
        touches.push(name1 + ' - ' + name2);
      }
      
      // 重なっているが接触していない（データエラー）
      if (isOverlapping && !isTouching) {
        overlapsOnly.push(name1 + ' - ' + name2);
      }
    } catch (e) {
      // エラーは無視
    }
  }
}

console.log('真の隣接関係 (booleanTouches): ' + touches.length + '組');
console.log('データ重複のみ (Overlap but not Touch): ' + overlapsOnly.length + '組\n');

if (overlapsOnly.length > 0) {
  console.log('【問題のある組み合わせ】データが重なっているが境界線は接触していない:');
  overlapsOnly.forEach(pair => console.log('  - ' + pair));
}

console.log('\n【参考】真の隣接関係の一部:');
touches.slice(0, 10).forEach(pair => console.log('  - ' + pair));
