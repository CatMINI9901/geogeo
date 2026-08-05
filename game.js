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

const MUNAKATA_LOCATIONS = [
    { lat: 33.796220, lng: 130.525296, hint: "日の里（本物）" },
    { lat: 35.725812, lng: 140.155421, hint: "ユーカリが" },
    { lat: 34.071253, lng: 130.892154, hint: "吉見海岸" },
    { lat: 32.861245, lng: 130.795123, hint: "菊陽町" },
    { lat: 34.908512, lng: 135.195412, hint: "ウッディタウン" }
];

// 使用済みの地点を保持する配列
let usedIndices = [];

function initGame() {
    streetViewService = new google.maps.StreetViewService();
    geocoder = new google.maps.Geocoder();

    panorama = new google.maps.StreetViewPanorama(
        document.getElementById('pano'),
        {
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: false,
            showRoadLabels: false,
            motionTracking: false,
            motionTrackingControl: false
        }
    );

    map = L.map('map').setView([33.805, 130.540], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    window.addEventListener('resize', () => {
        setTimeout(() => map.invalidateSize(), 200);
    });

    map.on('click', function(e) {
        if (nextBtn.style.display === 'block') return;

        guessLatLng = e.latlng;
        if (guessMarker) {
            guessMarker.setLatLng(guessLatLng);
        } else {
            guessMarker = L.marker(guessLatLng).addTo(map);
        }
        guessBtn.disabled = false;
    });

    guessBtn.addEventListener('click', handleGuess);
    nextBtn.addEventListener('click', handleNextRound);

    loadRound();
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

    map.setView([33.805, 130.540], 12);

    // 未使用の地点からランダムに選択
    let targetIndex;
    do {
        targetIndex = Math.floor(Math.random() * MUNAKATA_LOCATIONS.length);
    } while (usedIndices.includes(targetIndex) && usedIndices.length < MUNAKATA_LOCATIONS.length);

    usedIndices.push(targetIndex);
    const targetLoc = MUNAKATA_LOCATIONS[targetIndex];

    // 指定座標の最も近いストリートビューを取得
    streetViewService.getPanorama(
        {
            location: { lat: targetLoc.lat, lng: targetLoc.lng },
            radius: 300,
            source: google.maps.StreetViewSource.OUTDOOR
        },
        (data, status) => {
            if (status === google.maps.StreetViewStatus.OK) {
                const latLng = data.location.latLng;

                // 正確な住所文字列を取得
                geocoder.geocode({ location: latLng, language: 'ja' }, (results, geocodeStatus) => {
                    let addressName = targetLoc.hint;
                    if (geocodeStatus === "OK" && results[0]) {
                        addressName = results[0].formatted_address.replace(/^日本[、,]\s*/, '');
                    }

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
            } else {
                // 万が一ストリートビューが見つからなかった場合は別の地点で再試行
                loadRound();
            }
        }
    );
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function calculateScore(distanceKm) {
    const scale = 2.0; // 宗像市内規模に合わせて精度判定を厳格化
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
