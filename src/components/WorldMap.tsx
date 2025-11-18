import React, { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup
} from 'react-simple-maps';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// 4色: 赤・青・緑・黄
const colors = ['#FF4444', '#4488FF', '#44DD44', '#FFDD44'];

interface CountryColors {
  [key: string]: number;
}

const WorldMap: React.FC = () => {
  const [countryColors, setCountryColors] = useState<CountryColors>({});
  const [selectedColor, setSelectedColor] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.5);
  const [center, setCenter] = useState<[number, number]>([138, -36]);

  const handleCountryClick = (geo: any) => {
    const countryId = geo.rsmKey;
    setCountryColors(prev => ({
      ...prev,
      [countryId]: selectedColor
    }));
  };

  const handleZoomIn = () => {
    if (zoom >= 8) return;
    setZoom(zoom * 1.5);
  };

  const handleZoomOut = () => {
    if (zoom <= 1) return;
    setZoom(zoom / 1.5);
  };

  const handleReset = () => {
    setZoom(1.5);
    setCenter([138, -36]);
  };

  const handleMoveEnd = (position: any) => {
    setZoom(position.zoom);
    // 経度を-180から180の範囲に正規化してループ表現
    let lon = position.coordinates[0];
    while (lon > 180) lon -= 360;
    while (lon < -180) lon += 360;
    setCenter([lon, position.coordinates[1]]);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>4色問題マップ</h1>
        <p>国をクリックして色を塗りましょう。隣接する国は異なる色にする必要があります。</p>
        
        {/* カラーパレット */}
        <div style={{ margin: '20px 0', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {colors.map((color, index) => (
            <button
              key={index}
              onClick={() => setSelectedColor(index)}
              style={{
                width: '60px',
                height: '60px',
                backgroundColor: color,
                border: selectedColor === index ? '4px solid #333' : '2px solid #ccc',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title={`色 ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCountryColors({})}
          style={{
            padding: '10px 20px',
            backgroundColor: '#333',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginBottom: '20px',
            marginRight: '10px'
          }}
        >
          色をリセット
        </button>

        {/* ズームコントロール */}
        <div style={{ display: 'inline-block', marginBottom: '20px' }}>
          <button
            onClick={handleZoomIn}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4ECDC4',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '5px'
            }}
          >
            ズームイン (+)
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              padding: '10px 20px',
              backgroundColor: '#FF6B6B',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '5px'
            }}
          >
            ズームアウト (-)
          </button>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            地図をリセット
          </button>
        </div>
        <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
          ヒント: マウスホイールでズーム、ドラッグで移動できます
        </div>
      </div>

      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 147
        }}
        style={{
          width: '100%',
          height: 'auto'
        }}
      >
        <ZoomableGroup
          zoom={zoom}
          center={center}
          onMoveEnd={handleMoveEnd}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const colorIndex = countryColors[geo.rsmKey];
                const fillColor = colorIndex !== undefined ? colors[colorIndex] : '#D6D6DA';
                
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onClick={() => handleCountryClick(geo)}
                    style={{
                      default: {
                        fill: fillColor,
                        stroke: '#333',
                        strokeWidth: 0.5,
                        outline: 'none'
                      },
                      hover: {
                        fill: fillColor === '#D6D6DA' ? '#F5F4F6' : fillColor,
                        stroke: '#333',
                        strokeWidth: 1,
                        outline: 'none',
                        cursor: 'pointer'
                      },
                      pressed: {
                        fill: fillColor,
                        stroke: '#333',
                        strokeWidth: 1,
                        outline: 'none'
                      }
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};

export default WorldMap;
