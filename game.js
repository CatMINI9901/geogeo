let currentRound = 1;
let totalScore = 0;
let currentLoc = null;
let guessLatLng = null;
let guessMarker = null;
let actualMarker = null;
let line = null;
let map;
let panorama;
let streetViewService;
let geocoder;

const guessBtn = document.getElementById('guess-btn');
const nextBtn = document.getElementById('next-btn');
const resultOverlay = document.getElementById('result');
const resultText = document.getElementById('result-text');
const loadingOverlay = document.getElementById('loading');

// 宗像市エリア設定
// 宗像市エリア設定
const MUNAKATA_CONFIG = {
    center: [33.805, 130.540],
    zoom: 12,
    // 宗像市内に極力収まる座標枠（陸地メイン）
    bounds: [
        { minLat: 33.745, maxLat: 33.855, minLng: 130.500, maxLng: 130.590 }, // 本土側メイン（赤間・東郷・吉武・神湊）
        { minLat: 33.885, maxLat: 33.910, minLng: 130.415, maxLng: 130.445 }  // 大島エリア
    ]
};

function getRandomLatLng() {
    const box = MUNAKATA_CONFIG.bounds[Math.floor(Math.random() * MUNAKATA_CONFIG.bounds.length)];
    const lat = box.minLat + Math.random() * (box.maxLat - box.minLat);
    const lng = box.minLng + Math.random() * (box.maxLng - box.minLng);
    return { lat, lng };
}

function fetchRandomStreetView(callback) {
    const randomLoc = getRandomLatLng();
    // 境界をまたがないよう検索半径を 1,500m に縮小
    const radius = 1500;

    streetViewService.getPanorama(
        {
            location: randomLoc,
            radius: radius,
            source: google.maps.StreetViewSource.OUTDOOR
        },
        (data, status) => {
            if (status === google.maps.StreetViewStatus.OK) {
                const latLng = data.location.latLng;

                // Reverse Geocoding で厳密に宗像市か判定
                geocoder.geocode({ location: latLng, language: 'ja' }, (results, geocodeStatus) => {
                    if (geocodeStatus === "OK" && results[0]) {
                        const isMunakata = checkIsMunakata(results[0]);

                        if (isMunakata) {
                            const addressName = results[0].formatted_address.replace(/^日本[、,]\s*/, '');
                            callback(data, addressName);
                        } else {
                            // 宗像市外（福津市や岡垣町など）だった場合は再検索
                            fetchRandomStreetView(callback);
                        }
                    } else {
                        fetchRandomStreetView(callback);
                    }
                });
            } else {
                fetchRandomStreetView(callback);
            }
        }
    );
}

/**
 * Geocodingの結果から「宗像市」が含まれているかを厳密にチェックする関数
 */
function checkIsMunakata(geocodeResult) {
    // 1. address_components から市区町村名を確認
    if (geocodeResult.address_components) {
        for (const component of geocodeResult.address_components) {
            if (component.long_name.includes("宗像市") || component.short_name.includes("宗像市")) {
                return true;
            }
        }
    }
    // 2. 整形済み住所文字列のチェック（バックアップ）
    if (geocodeResult.formatted_address && geocodeResult.formatted_address.includes("宗像市")) {
        return true;
    }

    return false;
}

function loadRound() {
    if (guessMarker) map.removeLayer(guessMarker);
    if (actualMarker) map.removeLayer(actualMarker);
    if (line) map.removeLayer(line);
    guessMarker = null;
    actualMarker = null;
    line = null;
    guessLatLng = null;

    guessBtn.disabled = true;
    guessBtn.style.display = 'block';
    nextBtn.style.display = 'none';
    resultOverlay.style.display = 'none';
    loadingOverlay.style.display = 'flex';

    map.setView(MUNAKATA_CONFIG.center, MUNAKATA_CONFIG.zoom);

    fetchRandomStreetView((data, addressName) => {
        const latLng = data.location.latLng;
        currentLoc = {
            lat: latLng.lat(),
            lng: latLng.lng(),
            name: addressName
        };

        panorama.setPano(data.location.pano);
        panorama.setPov({ heading: 0, pitch: 0 });
        loadingOverlay.style.display = 'none';

        map.invalidateSize();
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 地球の半径 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 市内限定向けにスコア計算の減衰パラメータをタイトに調整（scale = 3.0）
function calculateScore(distanceKm) {
    const scale = 3.0; // 3km離れると大幅失点
    const score = Math.round(5000 * Math.exp(-distanceKm / scale));
    return Math.max(0, score);
}

function handleGuess() {
    if (!guessLatLng) return;

    const actualLatLng = [currentLoc.lat, currentLoc.lng];
    const distance = calculateDistance(guessLatLng.lat, guessLatLng.lng, currentLoc.lat, currentLoc.lng);
    const roundScore = calculateScore(distance);
    totalScore += roundScore;

    actualMarker = L.marker(actualLatLng).addTo(map);
    line = L.polyline([guessLatLng, actualLatLng], { color: '#e74c3c', weight: 3, dashArray: '6, 8' }).addTo(map);
    map.fitBounds(L.latLngBounds([guessLatLng, actualLatLng]), { padding: [30, 30] });

    document.getElementById('score').textContent = totalScore;
    
    // m（メートル）か km（キロメートル）かを見やすく表示分け
    const distanceStr = distance < 1.0 
        ? `${Math.round(distance * 1000)} m` 
        : `${Math.round(distance * 100) / 100} km`;

    resultText.innerHTML = `
        <p><strong>正解: ${currentLoc.name}</strong></p>
        <p>誤差: <strong>${distanceStr}</strong></p>
        <p>獲得スコア: <strong>+${roundScore} pt</strong></p>
    `;
    resultOverlay.style.display = 'block';

    guessBtn.style.display = 'none';
    nextBtn.style.display = 'block';

    if (currentRound >= 5) {
        nextBtn.textContent = '最終結果を見る';
    }
}

function handleNextRound() {
    if (currentRound >= 5) {
        resultText.innerHTML = `
            <h2>ゲームクリア！</h2>
            <p>宗像マスター度: <strong>${totalScore} / 25000 pt</strong></p>
        `;
        nextBtn.style.display = 'none';
        return;
    }
    currentRound++;
    document.getElementById('round').textContent = currentRound;
    loadRound();
}
