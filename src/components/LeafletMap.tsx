import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L, { PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { booleanIntersects } from '@turf/boolean-intersects';

// 4色: 赤・青・緑・黄
const colors = ['#FF4444', '#4488FF', '#44DD44', '#FFDD44'];

interface CountryColors {
  [key: string]: number;
}

type MapType = 'world' | 'tokyo23';

const LeafletMap: React.FC = () => {
  const [countryColors, setCountryColors] = useState<CountryColors>({});
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [mapKey, setMapKey] = useState<number>(0);
  const [geoJsonLayer, setGeoJsonLayer] = useState<L.GeoJSON | null>(null);
  const [checkResult, setCheckResult] = useState<string>('');
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [mapType, setMapType] = useState<MapType>('world');
  const [showMapMenu, setShowMapMenu] = useState<boolean>(false);
  
  // 最新のselectedColorを参照するためのref
  const selectedColorRef = useRef<number>(0);
  
  // selectedColorが変更されたらrefも更新
  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);

  useEffect(() => {
    // 地図データを取得
    let url: string;
    if (mapType === 'world') {
      url = 'https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson';
    } else {
      // 東京23区のGeoJSONデータ（ローカルファイル）
      url = '/tokyo23.geojson';
    }
    
    setGeoData(null); // データ読み込み中は一旦クリア
    
    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data && data.type === 'FeatureCollection') {
          console.log('Loaded GeoJSON data:', data);
          setGeoData(data);
        } else {
          console.error('Invalid GeoJSON format:', data);
        }
      })
      .catch(error => {
        console.error('Error loading GeoJSON:', error);
        // アラートは表示せず、コンソールログのみ
        // データが読み込まれない場合は「読み込み中...」が継続表示される
      });
  }, [mapType]);

  const handleCountryClick = (countryName: string) => {
    setCountryColors(prev => ({
      ...prev,
      [countryName]: selectedColor
    }));
  };

  const getFeatureStyle = (feature?: Feature<Geometry, any>): PathOptions => {
    if (!feature) return {};
    const countryName = feature.properties?.ADMIN || 
                        feature.properties?.name || 
                        feature.properties?.N03_004 || 
                        feature.properties?.N03_003 ||
                        feature.properties?.ward ||
                        feature.properties?.区名 ||
                        feature.properties?.city ||
                        '不明';
    const colorIndex = countryColors[countryName];
    const fillColor = colorIndex !== undefined ? colors[colorIndex] : '#D6D6DA';

    return {
      fillColor: fillColor,
      weight: 1,
      opacity: 1,
      color: '#333',
      fillOpacity: 0.7
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: L.Layer) => {
    try {
      // プロパティ名を柔軟に取得（世界地図と東京23区で異なる）
      const countryName = feature.properties?.ADMIN || 
                          feature.properties?.name || 
                          feature.properties?.N03_004 || 
                          feature.properties?.N03_003 ||
                          feature.properties?.ward ||
                          feature.properties?.区名 ||
                          feature.properties?.city ||
                          '不明';
      
      // レイヤーにカスタムプロパティとして色情報を保存
      // 既存の色情報があれば復元
      const existingColorIndex = countryColors[countryName];
      (layer as any)._currentColorIndex = existingColorIndex;
    
    layer.on({
      click: () => {
        // refから最新のselectedColorを取得
        const currentSelectedColor = selectedColorRef.current;
        
        // 状態を更新
        setCountryColors(prev => {
          const newColors = {
            ...prev,
            [countryName]: currentSelectedColor
          };
          
          // レイヤーに色情報を保存
          (layer as any)._currentColorIndex = currentSelectedColor;
          
          // レイヤーのスタイルを即座に更新
          const fillColor = colors[currentSelectedColor];
          (layer as any).setStyle({
            fillColor: fillColor,
            weight: 1,
            color: '#333',
            fillOpacity: 0.7
          });
          
          return newColors;
        });
      },
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 2,
          color: '#666',
          fillOpacity: 0.9
        });
      },
      mouseout: (e) => {
        const hoverLayer = e.target;
        // レイヤーに保存された色情報を使用
        const colorIndex = (hoverLayer as any)._currentColorIndex;
        const fillColor = colorIndex !== undefined ? colors[colorIndex] : '#D6D6DA';
        hoverLayer.setStyle({
          fillColor: fillColor,
          weight: 1,
          color: '#333',
          fillOpacity: 0.7
        });
      }
    });

    if (countryName) {
      layer.bindTooltip(countryName);
    }
    } catch (error) {
      console.error('Error in onEachFeature:', error, feature);
    }
  };

  const handleReset = () => {
    if (Object.keys(countryColors).length > 0 && !showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    setCountryColors({});
    setCheckResult('');
    setShowResetConfirm(false);
    setMapKey(prev => prev + 1);
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
  };

  const handleMapTypeChange = (newMapType: MapType) => {
    if (Object.keys(countryColors).length > 0) {
      if (!window.confirm('地図を切り替えると、現在の塗り分けがリセットされます。よろしいですか？')) {
        return;
      }
    }
    setMapType(newMapType);
    setCountryColors({});
    setCheckResult('');
    setShowResetConfirm(false);
    setShowMapMenu(false);
    setMapKey(prev => prev + 1);
  };

  const handleCheck = () => {
    if (!geoData) {
      setCheckResult('地図データを読み込み中...');
      return;
    }

    // 隣接国を検出するための処理
    const violations: string[] = [];
    let unpaintedCount = 0;
    
    // 塗られていない国をカウント
    geoData.features.forEach((feature) => {
      const countryName = feature.properties?.ADMIN || 
                          feature.properties?.name || 
                          feature.properties?.N03_004 || 
                          feature.properties?.N03_003 ||
                          feature.properties?.ward ||
                          feature.properties?.区名 ||
                          feature.properties?.city ||
                          '不明';
      if (countryColors[countryName] === undefined) {
        unpaintedCount++;
      }
    });
    
    geoData.features.forEach((feature, index) => {
      const countryName = feature.properties?.ADMIN || 
                          feature.properties?.name || 
                          feature.properties?.N03_004 || 
                          feature.properties?.N03_003 ||
                          feature.properties?.ward ||
                          feature.properties?.区名 ||
                          feature.properties?.city ||
                          '不明';
      const countryColor = countryColors[countryName];
      
      // この国に色が塗られていない場合はスキップ
      if (countryColor === undefined) return;
      
      // 他のすべての国と隣接しているかチェック
      geoData.features.forEach((otherFeature, otherIndex) => {
        if (index >= otherIndex) return; // 同じ国または既にチェック済み
        
        const otherCountryName = otherFeature.properties?.ADMIN || 
                                 otherFeature.properties?.name || 
                                 otherFeature.properties?.N03_004 || 
                                 otherFeature.properties?.N03_003 ||
                                 otherFeature.properties?.ward ||
                                 otherFeature.properties?.区名 ||
                                 otherFeature.properties?.city ||
                                 '不明';
        const otherCountryColor = countryColors[otherCountryName];
        
        // 他の国に色が塗られていない場合はスキップ
        if (otherCountryColor === undefined) return;
        
        // 同じ色の場合、隣接しているかチェック
        if (countryColor === otherCountryColor) {
          if (areCountriesAdjacent(feature, otherFeature)) {
            violations.push(`${countryName} と ${otherCountryName}`);
          }
        }
      });
    });

    // 結果メッセージの生成
    let resultMessage = '';
    const areaLabel = mapType === 'world' ? 'カ国' : '区';
    
    if (unpaintedCount > 0) {
      resultMessage += `未塗装: ${unpaintedCount}${areaLabel}\n`;
    }
    
    if (violations.length === 0) {
      resultMessage += mapType === 'world' ? 
        '✓ 隣接する国に同じ色はありません' : 
        '✓ 隣接する区に同じ色はありません';
    } else {
      resultMessage += mapType === 'world' ?
        `✗ 隣接する国が同じ色です:\n${violations.slice(0, 3).join('\n')}${violations.length > 3 ? `\n...他${violations.length - 3}件` : ''}` :
        `✗ 隣接する区が同じ色です:\n${violations.slice(0, 3).join('\n')}${violations.length > 3 ? `\n...他${violations.length - 3}件` : ''}`;
    }

    setCheckResult(resultMessage);
  };

  // 2つの国が隣接しているかを判定（turf.jsを使用した正確な判定）
  const areCountriesAdjacent = (feature1: Feature, feature2: Feature): boolean => {
    try {
      // turf.jsのbooleanTouchesを使用して、2つのポリゴンが接触しているか判定
      // booleanTouches: 境界線が接触しているがオーバーラップしていない場合true
      // booleanOverlap: 内部が重なっている場合true（島国などで誤判定を避けるため使用しない）
      
      // まず、境界ボックスで事前フィルタリング（パフォーマンス向上）
      const bounds1 = getFeatureBounds(feature1);
      const bounds2 = getFeatureBounds(feature2);
      
      if (!bounds1 || !bounds2) return false;
      
      // 境界ボックスが全く重ならない場合は隣接していない
      const threshold = 0.01; // 緯度経度で0.01度以内
      if (
        bounds1.maxLng + threshold < bounds2.minLng ||
        bounds2.maxLng + threshold < bounds1.minLng ||
        bounds1.maxLat + threshold < bounds2.minLat ||
        bounds2.maxLat + threshold < bounds1.minLat
      ) {
        return false;
      }
      
      // turf.jsで隣接判定
      // データの精度が低いため、booleanIntersects（交差・接触）を使用
      // これにより、境界が正確でなくても実質的な隣接関係を検出できる
      const intersects = booleanIntersects(feature1 as any, feature2 as any);
      
      return intersects;
    } catch (error) {
      // エラーが発生した場合は、従来の境界ボックス判定にフォールバック
      console.warn('turf.js判定エラー、境界ボックス判定を使用:', error);
      const bounds1 = getFeatureBounds(feature1);
      const bounds2 = getFeatureBounds(feature2);
      
      if (!bounds1 || !bounds2) return false;
      
      const threshold = 0.01;
      return !(
        bounds1.maxLng + threshold < bounds2.minLng ||
        bounds2.maxLng + threshold < bounds1.minLng ||
        bounds1.maxLat + threshold < bounds2.minLat ||
        bounds2.maxLat + threshold < bounds1.minLat
      );
    }
  };

  const getFeatureBounds = (feature: Feature): { minLng: number; maxLng: number; minLat: number; maxLat: number } | null => {
    if (!feature.geometry || feature.geometry.type === 'GeometryCollection') return null;
    
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    const processCoordinates = (coords: any) => {
      if (typeof coords[0] === 'number') {
        // [lng, lat] の形式
        minLng = Math.min(minLng, coords[0]);
        maxLng = Math.max(maxLng, coords[0]);
        minLat = Math.min(minLat, coords[1]);
        maxLat = Math.max(maxLat, coords[1]);
      } else {
        // ネストされた配列
        coords.forEach(processCoordinates);
      }
    };
    
    const geom = feature.geometry as any;
    if (geom.coordinates) {
      processCoordinates(geom.coordinates);
    }
    
    return { minLng, maxLng, minLat, maxLat };
  };

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* 地図切り替えメニュー */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
      }}>
        <button
          onClick={() => setShowMapMenu(!showMapMenu)}
          style={{
            padding: '10px 15px',
            backgroundColor: 'white',
            border: '2px solid #333',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          地図切替 {showMapMenu ? '▲' : '▼'}
        </button>
        
        {showMapMenu && (
          <div style={{
            marginTop: '5px',
            backgroundColor: 'white',
            border: '2px solid #333',
            borderRadius: '5px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => handleMapTypeChange('world')}
              style={{
                width: '100%',
                padding: '10px 15px',
                backgroundColor: mapType === 'world' ? '#4ECDC4' : 'white',
                color: mapType === 'world' ? 'white' : '#333',
                border: 'none',
                borderBottom: '1px solid #ddd',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                fontWeight: mapType === 'world' ? 'bold' : 'normal'
              }}
            >
              🌍 世界地図
            </button>
            <button
              onClick={() => handleMapTypeChange('tokyo23')}
              style={{
                width: '100%',
                padding: '10px 15px',
                backgroundColor: mapType === 'tokyo23' ? '#4ECDC4' : 'white',
                color: mapType === 'tokyo23' ? 'white' : '#333',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left',
                fontWeight: mapType === 'tokyo23' ? 'bold' : 'normal'
              }}
            >
              🗼 東京23区
            </button>
          </div>
        )}
      </div>

      {/* コントロールパネル */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        textAlign: 'center',
        maxWidth: '250px'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>四色問題</h3>
        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#666' }}>
          色を選んで国をクリック
        </p>
        
        {/* カラーパレット */}
        <div style={{ margin: '12px 0', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', justifyContent: 'center' }}>
          {colors.map((color, index) => (
            <button
              key={index}
              onClick={() => setSelectedColor(index)}
              style={{
                width: '100%',
                height: '45px',
                backgroundColor: color,
                border: selectedColor === index ? '3px solid #333' : '2px solid #ccc',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title={`色 ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={handleCheck}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4ECDC4',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '13px',
            width: '100%',
            marginBottom: '5px',
            fontWeight: 'bold'
          }}
        >
          判定
        </button>

        {!showResetConfirm ? (
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#333',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '13px',
              width: '100%'
            }}
          >
            リセット
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '5px', marginTop: '0' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '8px 16px',
                backgroundColor: '#FF4444',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '50%',
                fontWeight: 'bold'
              }}
            >
              削除
            </button>
            <button
              onClick={handleCancelReset}
              style={{
                padding: '8px 16px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '50%'
              }}
            >
              キャンセル
            </button>
          </div>
        )}

        {checkResult && (
          <div style={{
            marginTop: '10px',
            padding: '8px',
            backgroundColor: checkResult.startsWith('✓') ? '#d4edda' : '#f8d7da',
            border: `1px solid ${checkResult.startsWith('✓') ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '5px',
            fontSize: '11px',
            color: checkResult.startsWith('✓') ? '#155724' : '#721c24',
            whiteSpace: 'pre-line',
            textAlign: 'left'
          }}>
            {checkResult}
          </div>
        )}

        <div style={{ fontSize: '10px', color: '#999', marginTop: '8px' }}>
          {mapType === 'world' ? 'ホイール:ズーム / ドラッグ:移動' : 'ホイール:ズームイン・アウト'}
        </div>
      </div>

      {/* 地図 */}
      {geoData ? (
        <MapContainer
          key={mapKey}
          center={mapType === 'world' ? [36, 138] : [35.6895, 139.6917]}
          zoom={mapType === 'world' ? 5 : 11}
          minZoom={mapType === 'world' ? 2 : 10}
          maxZoom={mapType === 'world' ? 18 : 15}
          style={{ width: '100%', height: '100%' }}
          worldCopyJump={mapType === 'world'}
          maxBounds={mapType === 'tokyo23' ? [[35.5, 139.5], [35.85, 139.95]] : undefined}
          maxBoundsViscosity={mapType === 'tokyo23' ? 1.0 : 0}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            noWrap={false}
          />
          <GeoJSON
            ref={(layer) => setGeoJsonLayer(layer)}
            data={geoData}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />
        </MapContainer>
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: '#666'
        }}>
          読み込み中...
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
