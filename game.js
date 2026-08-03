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

const JAPAN_BOUNDS = [
    { minLat: 31.0, maxLat: 34.0, minLng: 129.5, maxLng: 132.0 }, // 九州
];

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

    map = L.map('map').setView([36.0, 138.0], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 画面サイズ変更時（スマホ回転時等）にマップサイズを再計算
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

function getRandomJapanLatLng() {
    const box = JAPAN_BOUNDS[Math.floor(Math.random() * JAPAN_BOUNDS.length)];
    const lat = box.minLat + Math.random() * (box.maxLat - box.minLat);
    const lng = box.minLng + Math.random() * (box.maxLng - box.minLng);
    return { lat, lng };
}

function fetchRandomStreetView(callback) {
    const randomLoc = getRandomJapanLatLng();
    streetViewService.getPanorama(
        {
            location: randomLoc,
            radius: 50000,
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
    map.setView([36.0, 138.0], 5);

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

        // 描画ずれ防止
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
    const score = Math.round(5000 * Math.exp(-distanceKm / 300));
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
