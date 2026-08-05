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

// 宗像市風・激似引っ掛け＆本物混ざり20連発リスト
const MUNAKATA_LOCATIONS = [
    // --- 【ニュータウン系（日の里・自由ヶ丘・青葉台・赤間ハイツ感）】 ---
    { lat: 35.725812, lng: 140.155421, hint: "千葉県ユーカリが丘（日の里そっくりの昭和〜平成ニュータウン）" },
    { lat: 34.908512, lng: 135.195412, hint: "兵庫県三田市（坂道と戸建ての並びが自由ヶ丘・赤間ハイツ）" },
    { lat: 34.781204, lng: 135.002154, hint: "兵庫県西宮名塩（斜面住宅地と緑の交わりが日の里東地区）" },
    { lat: 35.812451, lng: 139.521045, hint: "埼玉県所沢市（青葉台や舞の里あたりの閑静な街並み）" },
    { lat: 33.521451, lng: 130.512410, hint: "福岡県筑紫野市光が丘（筑前エリア独特の住宅街のレンガ風擁壁）" },
    { lat: 34.698512, lng: 135.784125, hint: "奈良県生駒市（傾斜のある新興住宅地のカーブ）" },

    // --- 【ロードサイド・商業地系（くりえいと・国道3号線バイパス感）】 ---
    { lat: 32.861245, lng: 130.795123, hint: "熊本県菊陽町（くりえいとの大型モール・駐車場・郊外店舗感）" },
    { lat: 33.315412, lng: 130.551241, hint: "福岡県久留米市上津（国道3号線沿いのデジャヴ景色）" },
    { lat: 33.821045, lng: 130.684120, hint: "福岡県八幡西区本城（バイパス沿いのロードサイド店舗網）" },
    { lat: 33.584120, lng: 130.485124, hint: "福岡県糟屋郡粕屋町（巨大商業施設周辺の道路と空の広さ）" },

    // --- 【海沿い・海岸線系（神湊・さつき松原・鐘崎感）】 ---
    { lat: 34.071253, lng: 130.892154, hint: "山口県下関市吉見（神湊〜さつき松原の松林と防波堤・海の距離感）" },
    { lat: 33.621451, lng: 130.201451, hint: "福岡県糸島市志摩（神湊〜勝浦海岸周辺の防風林と海岸道路）" },
    { lat: 33.385124, lng: 129.551241, hint: "長崎県平戸市（鐘崎漁港周辺の古い漁村の路地と港の雰囲気）" },
    { lat: 34.385120, lng: 131.185412, hint: "山口県長門市仙崎（地島や大島の港周辺に酷似した雰囲気）" },

    // --- 【のどかな田園・歴史地区・学園都市系（吉武・山田・教育大前感）】 ---
    { lat: 33.351241, lng: 130.621451, hint: "福岡県小郡市（吉武や赤木周辺の溜め池と田んぼ・山並み）" },
    { lat: 33.654120, lng: 130.685124, hint: "福岡県宮若市（山田地区や田島周辺ののどかな山裾の集落）" },
    { lat: 33.501245, lng: 130.551241, hint: "福岡県太宰府市（宗像大社周辺の緑豊かな旧道沿い）" },
    { lat: 33.585124, lng: 130.221451, hint: "福岡県西区九大学研都市周辺（教育大〜赤間駅周辺の学生街・マンション群）" },

    // --- 【本物の宗像市（たまに本物を混ぜて困惑させる）】 ---
    { lat: 33.795406, lng: 130.528106, hint: "福岡県宗像市日の里（本物の日の里）" },
    { lat: 33.831012, lng: 130.514210, hint: "福岡県宗像市田島（本物の宗像大社近く）" }
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
                // 万が一読み込み失敗時は再試行
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
    const scale = 2.0;
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

    if (currentRound >= 7) {
        nextBtn.textContent = '最終結果を見る';
    }
}

function handleNextRound() {
    if (currentRound >= 7) {
        resultText.innerHTML = `
            <h2>ゲームクリア！</h2>
            <p>宗像マスター度: <strong>${totalScore} / 35000 pt</strong></p>
        `;
        nextBtn.style.display = 'none';
        return;
    }
    currentRound++;
    document.getElementById('round').textContent = currentRound;
    loadRound();
}
