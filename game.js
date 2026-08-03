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
const regionSelect = document.getElementById('region-select');

// --- 47都道府県の緯度経度範囲と初期中心点 ---
const PREFECTURES = {
    japan: { name: "日本全国", center: [36.0, 138.0], zoom: 5, bounds: [{ minLat: 26.0, maxLat: 45.5, minLng: 127.5, maxLng: 145.0 }] },
    hokkaido: { name: "北海道", center: [43.064, 141.347], zoom: 7, bounds: [{ minLat: 41.4, maxLat: 45.5, minLng: 139.7, maxLng: 145.8 }] },
    aomori: { name: "青森県", center: [40.824, 140.740], zoom: 8, bounds: [{ minLat: 40.2, maxLat: 41.5, minLng: 139.5, maxLng: 141.7 }] },
    iwate: { name: "岩手県", center: [39.703, 141.152], zoom: 8, bounds: [{ minLat: 38.7, maxLat: 40.4, minLng: 140.6, maxLng: 142.1 }] },
    miyagi: { name: "宮城県", center: [38.268, 140.871], zoom: 9, bounds: [{ minLat: 37.7, maxLat: 39.0, minLng: 140.3, maxLng: 141.7 }] },
    akita: { name: "秋田県", center: [39.718, 140.102], zoom: 8, bounds: [{ minLat: 38.9, maxLat: 40.5, minLng: 139.7, maxLng: 140.8 }] },
    yamagata: { name: "山形県", center: [38.240, 140.363], zoom: 9, bounds: [{ minLat: 37.7, maxLat: 39.1, minLng: 139.5, maxLng: 140.6 }] },
    fukushima: { name: "福島県", center: [37.750, 140.467], zoom: 8, bounds: [{ minLat: 36.8, maxLat: 37.9, minLng: 139.2, maxLng: 141.0 }] },
    ibaraki: { name: "茨城県", center: [36.341, 140.446], zoom: 9, bounds: [{ minLat: 35.7, maxLat: 36.9, minLng: 139.7, maxLng: 140.8 }] },
    tochigi: { name: "栃木県", center: [36.565, 139.883], zoom: 9, bounds: [{ minLat: 36.2, maxLat: 37.1, minLng: 139.3, maxLng: 140.3 }] },
    gunma: { name: "群馬県", center: [36.390, 139.060], zoom: 9, bounds: [{ minLat: 36.0, maxLat: 37.1, minLng: 138.4, maxLng: 139.6 }] },
    saitama: { name: "埼玉県", center: [35.856, 139.648], zoom: 9, bounds: [{ minLat: 35.7, maxLat: 36.3, minLng: 138.7, maxLng: 139.9 }] },
    chiba: { name: "千葉県", center: [35.604, 140.123], zoom: 9, bounds: [{ minLat: 34.9, maxLat: 36.1, minLng: 139.7, maxLng: 140.9 }] },
    tokyo: { name: "東京都", center: [35.689, 139.691], zoom: 10, bounds: [{ minLat: 35.5, maxLat: 35.9, minLng: 138.9, maxLng: 139.9 }] },
    kanagawa: { name: "神奈川県", center: [35.447, 139.642], zoom: 10, bounds: [{ minLat: 35.1, maxLat: 35.7, minLng: 138.9, maxLng: 139.8 }] },
    niigata: { name: "新潟県", center: [37.902, 139.023], zoom: 8, bounds: [{ minLat: 36.7, maxLat: 38.5, minLng: 137.6, maxLng: 139.9 }] },
    toyama: { name: "富山県", center: [36.695, 137.211], zoom: 9, bounds: [{ minLat: 36.3, maxLat: 36.9, minLng: 136.7, maxLng: 137.8 }] },
    ishikawa: { name: "石川県", center: [36.594, 136.625], zoom: 9, bounds: [{ minLat: 36.0, maxLat: 37.8, minLng: 136.2, maxLng: 137.4 }] },
    fukui: { name: "福井県", center: [36.065, 136.221], zoom: 9, bounds: [{ minLat: 35.4, maxLat: 36.3, minLng: 135.4, maxLng: 136.8 }] },
    yamanashi: { name: "山梨県", center: [35.663, 138.568], zoom: 9, bounds: [{ minLat: 35.2, maxLat: 35.9, minLng: 138.2, maxLng: 139.1 }] },
    nagano: { name: "長野県", center: [36.651, 138.181], zoom: 8, bounds: [{ minLat: 35.2, maxLat: 37.0, minLng: 137.3, maxLng: 138.8 }] },
    gifu: { name: "岐阜県", center: [35.391, 136.722], zoom: 8, bounds: [{ minLat: 35.1, maxLat: 36.5, minLng: 136.2, maxLng: 137.6 }] },
    shizuoka: { name: "静岡県", center: [34.976, 138.383], zoom: 9, bounds: [{ minLat: 34.5, maxLat: 35.6, minLng: 137.4, maxLng: 139.1 }] },
    aichi: { name: "愛知県", center: [35.180, 136.906], zoom: 9, bounds: [{ minLat: 34.5, maxLat: 35.4, minLng: 136.6, maxLng: 137.8 }] },
    mie: { name: "三重県", center: [34.730, 136.508], zoom: 9, bounds: [{ minLat: 33.7, maxLat: 35.2, minLng: 135.8, maxLng: 136.9 }] },
    shiga: { name: "滋賀県", center: [35.004, 135.868], zoom: 9, bounds: [{ minLat: 34.8, maxLat: 35.7, minLng: 135.8, maxLng: 136.4 }] },
    kyoto: { name: "京都府", center: [35.021, 135.755], zoom: 9, bounds: [{ minLat: 34.7, maxLat: 35.8, minLng: 134.8, maxLng: 136.1 }] },
    osaka: { name: "大阪府", center: [34.686, 135.520], zoom: 10, bounds: [{ minLat: 34.2, maxLat: 35.0, minLng: 135.0, maxLng: 135.7 }] },
    hyogo: { name: "兵庫県", center: [34.691, 135.183], zoom: 9, bounds: [{ minLat: 34.1, maxLat: 35.7, minLng: 134.2, maxLng: 135.5 }] },
    nara: { name: "奈良県", center: [34.685, 135.832], zoom: 9, bounds: [{ minLat: 33.8, maxLat: 34.8, minLng: 135.5, maxLng: 136.2 }] },
    wakayama: { name: "和歌山県", center: [34.226, 135.167], zoom: 9, bounds: [{ minLat: 33.4, maxLat: 34.4, minLng: 135.0, maxLng: 136.0 }] },
    tottori: { name: "鳥取県", center: [35.503, 134.238], zoom: 9, bounds: [{ minLat: 35.1, maxLat: 35.6, minLng: 133.1, maxLng: 134.4 }] },
    shimane: { name: "島根県", center: [35.472, 133.050], zoom: 9, bounds: [{ minLat: 34.3, maxLat: 36.3, minLng: 131.6, maxLng: 133.4 }] },
    okayama: { name: "岡山県", center: [34.661, 133.935], zoom: 9, bounds: [{ minLat: 34.3, maxLat: 35.3, minLng: 133.3, maxLng: 134.4 }] },
    hiroshima: { name: "広島県", center: [34.396, 132.459], zoom: 9, bounds: [{ minLat: 34.0, maxLat: 35.1, minLng: 132.0, maxLng: 133.5 }] },
    yamaguchi: { name: "山口県", center: [34.185, 131.471], zoom: 9, bounds: [{ minLat: 33.7, maxLat: 34.6, minLng: 130.8, maxLng: 132.2 }] },
    tokushima: { name: "徳島県", center: [34.065, 134.559], zoom: 9, bounds: [{ minLat: 33.5, maxLat: 34.3, minLng: 133.6, maxLng: 134.8 }] },
    kagawa: { name: "香川県", center: [34.340, 134.043], zoom: 10, bounds: [{ minLat: 34.0, maxLat: 34.5, minLng: 133.4, maxLng: 134.4 }] },
    ehime: { name: "愛媛県", center: [33.841, 132.765], zoom: 9, bounds: [{ minLat: 32.9, maxLat: 34.3, minLng: 132.0, maxLng: 133.7 }] },
    kochi: { name: "高知県", center: [33.559, 133.531], zoom: 9, bounds: [{ minLat: 32.7, maxLat: 33.9, minLng: 132.4, maxLng: 134.3 }] },
    fukuoka: { name: "福岡県", center: [33.606, 130.418], zoom: 9, bounds: [{ minLat: 33.0, maxLat: 33.9, minLng: 130.0, maxLng: 131.2 }] },
    saga: { name: "佐賀県", center: [33.249, 130.298], zoom: 10, bounds: [{ minLat: 32.9, maxLat: 33.6, minLng: 129.7, maxLng: 130.6 }] },
    nagasaki: { name: "長崎県", center: [32.744, 129.873], zoom: 9, bounds: [{ minLat: 32.5, maxLat: 34.7, minLng: 128.6, maxLng: 130.4 }] },
    kumamoto: { name: "熊本県", center: [32.789, 130.741], zoom: 9, bounds: [{ minLat: 32.0, maxLat: 33.2, minLng: 129.9, maxLng: 131.3 }] },
    oita: { name: "大分県", center: [33.238, 131.612], zoom: 9, bounds: [{ minLat: 32.7, maxLat: 33.7, minLng: 130.8, maxLng: 132.1 }] },
    miyazaki: { name: "宮崎県", center: [31.911, 131.423], zoom: 8, bounds: [{ minLat: 31.3, maxLat: 32.8, minLng: 130.7, maxLng: 131.9 }] },
    kagoshima: { name: "鹿児島県", center: [31.560, 130.558], zoom: 8, bounds: [{ minLat: 30.9, maxLat: 32.3, minLng: 129.9, maxLng: 131.3 }] },
    okinawa: { name: "沖縄県", center: [26.212, 127.681], zoom: 9, bounds: [{ minLat: 26.0, maxLat: 27.0, minLng: 127.5, maxLng: 128.3 }] }
};

let currentRegionKey = 'japan';

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

    const region = PREFECTURES[currentRegionKey];
    map = L.map('map').setView(region.center, region.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    window.addEventListener('resize', () => {
        setTimeout(() => map.invalidateSize(), 200);
    });

    if (regionSelect) {
        regionSelect.addEventListener('change', (e) => {
            currentRegionKey = e.target.value;
            currentRound = 1;
            totalScore = 0;
            document.getElementById('round').textContent = currentRound;
            document.getElementById('score').textContent = totalScore;
            
            const newRegion = PREFECTURES[currentRegionKey];
            map.setView(newRegion.center, newRegion.zoom);
            loadRound();
        });
    }

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

function getRandomLatLng() {
    const region = PREFECTURES[currentRegionKey];
    const box = region.bounds[Math.floor(Math.random() * region.bounds.length)];
    const lat = box.minLat + Math.random() * (box.maxLat - box.minLat);
    const lng = box.minLng + Math.random() * (box.maxLng - box.minLng);
    return { lat, lng };
}

function fetchRandomStreetView(callback) {
    const randomLoc = getRandomLatLng();
    const radius = currentRegionKey === 'japan' ? 50000 : 15000;

    streetViewService.getPanorama(
        {
            location: randomLoc,
            radius: radius,
            source: google.maps.StreetViewSource.OUTDOOR
        },
        (data, status) => {
            if (status === google.maps.StreetViewStatus.OK) {
                callback(data);
            } else {
                fetchRandomStreetView(callback);
            }
        }
    );
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

    const region = PREFECTURES[currentRegionKey];
    map.setView(region.center, region.zoom);

    fetchRandomStreetView((data) => {
        const latLng = data.location.latLng;
        currentLoc = {
            lat: latLng.lat(),
            lng: latLng.lng(),
            name: "住所取得中..."
        };

        geocoder.geocode({ location: latLng, language: 'ja' }, (results, status) => {
            if (status === "OK" && results[0]) {
                const formatted = results[0].formatted_address.replace(/^日本[、,]\s*/, '');
                currentLoc.name = formatted;
            } else {
                currentLoc.name = `北緯 ${currentLoc.lat.toFixed(3)}°, 東経 ${currentLoc.lng.toFixed(3)}°`;
            }
        });

        panorama.setPano(data.location.pano);
        panorama.setPov({ heading: 0, pitch: 0 });
        loadingOverlay.style.display = 'none';

        map.invalidateSize();
    });
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
    const scale = currentRegionKey === 'japan' ? 300 : 20;
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
    resultText.innerHTML = `
        <p><strong>正解: ${currentLoc.name}</strong></p>
        <p>誤差: <strong>${Math.round(distance * 10) / 10} km</strong></p>
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
            <p>最終スコア: <strong>${totalScore} / 25000 pt</strong></p>
        `;
        nextBtn.style.display = 'none';
        return;
    }
    currentRound++;
    document.getElementById('round').textContent = currentRound;
    loadRound();
}
