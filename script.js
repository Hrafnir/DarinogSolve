/* Version: #22 */

// === GLOBALE VARIABLER ===
let map;
let currentMapMarker;
let userPositionMarker;
let mapElement; 
let currentTeamData = null; 
let audioContext; 
// let proximityBeepIntervalId = null; // FJERNES
let isGpsAudioEnabled = false;
let gpsAudioVolume = 0.7; 
let mapPositionWatchId = null;   
let previousDistanceToTarget = null;
let finishMarker = null;
let hasPlayedTargetReachedSound = false; // NY: For å unngå gjentatt trudelutt

// === GLOBAL KONFIGURASJON ===
// ... (TOTAL_POSTS, POST_LOCATIONS, START_LOCATION, FINISH_LOCATION som i versjon #21) ...
const TOTAL_POSTS = 8; 
const POST_LOCATIONS = [ { lat: 60.79604180682737, lng: 10.670735066773602, title: "Test Post 1", name: "Teststed 1 (Midlertidig)"}, { lat: 60.79640262601723, lng: 10.670890901998973, title: "Test Post 2", name: "Teststed 2 (Midlertidig)"}, { lat: 60.80072782302861, lng: 10.644889579638045, title: "Post 3", name: "På den lengste benken"}, { lat: 60.80048329479234, lng: 10.643492818098643, title: "Post 4", name: "Ved informasjonstavlen"}, { lat: 60.80045228531585, lng: 10.642988549931982, title: "Post 5", name: "Ved flaggstangen"}, { lat: 60.7998031467142, lng: 10.643149576741504, title: "Post 6", name: "Ved sykkelstativet"}, { lat: 60.7990979034987, lng: 10.64366234869697, title: "Post 7", name: "Ved steinmuren"}, { lat: 60.79974498905187, lng: 10.64269195029222, title: "Post 8", name: "Ved hovedinngangen til området"} ];
const START_LOCATION = { lat: 60.801211826268066, lng: 10.645566533162912, title: "Start Rebus" };
const FINISH_LOCATION = { lat: 60.80140295692265, lng: 10.643869988530302, title: "MÅL: Hovedinngang Kafe" };


// === GOOGLE MAPS API CALLBACK ===
// ... (window.initMap som i versjon #21) ...
window.initMap = function() { mapElement = document.getElementById('dynamic-map-container'); if (!mapElement) { setTimeout(window.initMap, 500); return; } const mapStyles = [ { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] } ]; map = new google.maps.Map(mapElement, { center: START_LOCATION, zoom: 17, mapTypeId: google.maps.MapTypeId.SATELLITE, styles: mapStyles, disableDefaultUI: false, streetViewControl: false, fullscreenControl: true, mapTypeControlOptions: { style: google.maps.MapTypeControlStyle.DROPDOWN_MENU, mapTypeIds: [google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID] } }); new google.maps.Marker({ position: START_LOCATION, map: map, title: START_LOCATION.title }); if (currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) { const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex]; updateMapMarker(currentPostGlobalId, false); } else if (currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) { updateMapMarker(null, true); } if (currentTeamData || isGpsAudioEnabled) { startContinuousUserPositionUpdate(); } console.log("Google Map initialisert via window.initMap"); }

// === GLOBALE KARTFUNKSJONER ===
// ... (updateMapMarker, clearMapMarker, clearFinishMarker, handleGeolocationError som i versjon #21) ...
function updateMapMarker(postGlobalId, isFinalTarget = false) { if (!map) { console.warn("Kart ikke initialisert for updateMapMarker."); return; } clearMapMarker(); clearFinishMarker(); let location; let markerTitle; let markerIconUrl; if (isFinalTarget) { location = FINISH_LOCATION; markerTitle = FINISH_LOCATION.title; markerIconUrl = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'; finishMarker = new google.maps.Marker({ position: { lat: location.lat, lng: location.lng }, map: map, title: markerTitle, animation: google.maps.Animation.DROP, icon: { url: markerIconUrl } }); } else { if (!postGlobalId || postGlobalId < 1 || postGlobalId > POST_LOCATIONS.length) { return; } location = POST_LOCATIONS[postGlobalId - 1]; markerTitle = `Neste: ${location.name || location.title}`; markerIconUrl = 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'; currentMapMarker = new google.maps.Marker({ position: { lat: location.lat, lng: location.lng }, map: map, title: markerTitle, animation: google.maps.Animation.DROP, icon: { url: markerIconUrl } }); } if(location) { map.panTo({ lat: location.lat, lng: location.lng }); if (map.getZoom() < 17) map.setZoom(17); } }
function clearMapMarker() { if (currentMapMarker) { currentMapMarker.setMap(null); currentMapMarker = null; } }
function clearFinishMarker() { if (finishMarker) { finishMarker.setMap(null); finishMarker = null; } }
function handleGeolocationError(error) { let msg = "Posisjonsfeil: "; switch (error.code) { case error.PERMISSION_DENIED: msg += "Nektet."; break; case error.POSITION_UNAVAILABLE: msg += "Utilgjengelig."; break; case error.TIMEOUT: msg += "Timeout."; break; default: msg += "Ukjent."; } console.warn(msg); }


// === GPS AUDIO HJELP & KARTPOSISJON FUNKSJONER ===
function initializeAudioContext() { if (!audioContext) { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } }

function playSound(frequency, duration, volume, type = 'sine', startTimeOffset = 0) {
    if (!audioContext || !isGpsAudioEnabled) return; // Pip kun hvis GPS lyd er på
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startTimeOffset / 1000);
    const actualVolume = document.getElementById('gps-audio-volume-slider') ? document.getElementById('gps-audio-volume-slider').valueAsNumber : volume;
    gainNode.gain.setValueAtTime(actualVolume * 0.4, audioContext.currentTime + startTimeOffset / 1000); // Justert gain
    oscillator.start(audioContext.currentTime + startTimeOffset / 1000);
    oscillator.stop(audioContext.currentTime + (startTimeOffset + duration) / 1000);
}

function playTargetReachedChime() {
    if (!audioContext || !isGpsAudioEnabled) return;
    const vol = gpsAudioVolumeSlider ? gpsAudioVolumeSlider.valueAsNumber : gpsAudioVolume;
    // Trudelutt (f.eks. C-E-G)
    playSound(523.25, 150, vol, 'triangle', 0);    // C5
    playSound(659.25, 150, vol, 'triangle', 150);  // E5
    playSound(783.99, 200, vol, 'triangle', 300);  // G5
    // Fem raske høyfrekvente pip
    let delay = 550;
    for (let i = 0; i < 5; i++) {
        playSound(1200, 80, vol, 'sine', delay + i * 120);
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) { /* ... (som før) ... */ const R = 6371e3; const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180; const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180; const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2); const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); return R * c; }

function updateUserPositionOnMap(position) { /* ... (som i versjon #21) ... */ if (!map) return; const userPos = { lat: position.coords.latitude, lng: position.coords.longitude }; if (userPositionMarker) { userPositionMarker.setPosition(userPos); } else { userPositionMarker = new google.maps.Marker({ position: userPos, map: map, title: "Din Posisjon", icon: { path: google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#1976D2", fillOpacity: 1, strokeWeight: 2, strokeColor: "white" } }); } }

function handlePositionUpdate(position) { 
    updateUserPositionOnMap(position); 
    if (isGpsAudioEnabled) { 
        updateProximitySoundLogic(position); // Omdøpt for klarhet
    }
}

function updateProximitySoundLogic(position) { 
    if (!currentTeamData || currentTeamData.completedPostsCount >= TOTAL_POSTS) {
        previousDistanceToTarget = null; 
        hasPlayedTargetReachedSound = true; // Sørg for at trudelutt ikke spilles hvis vi allerede er ferdige
        return;
    }
    const userLat = position.coords.latitude; const userLng = position.coords.longitude;
    const nextPostIndexInSequence = currentTeamData.currentPostArrayIndex;
    if (nextPostIndexInSequence >= currentTeamData.postSequence.length) { previousDistanceToTarget = null; return; }
    const nextPostGlobalId = currentTeamData.postSequence[nextPostIndexInSequence];
    if (nextPostGlobalId === undefined || nextPostGlobalId < 1 || nextPostGlobalId > POST_LOCATIONS.length) {
        previousDistanceToTarget = null; return;
    }
    const targetLocation = POST_LOCATIONS[nextPostGlobalId - 1];
    const currentDistance = calculateDistance(userLat, userLng, targetLocation.lat, targetLocation.lng);
    
    console.log(`Avstand til Post ${nextPostGlobalId} (${targetLocation.name}): ${currentDistance.toFixed(0)}m`);
    const gpsVol = gpsAudioVolumeSlider ? gpsAudioVolumeSlider.valueAsNumber : gpsAudioVolume;

    // Sjekk for ankomst (innenfor 5 meter)
    if (currentDistance <= 5) {
        if (!hasPlayedTargetReachedSound) {
            console.log("Innenfor 5 meter! Spiller trudelutt.");
            playTargetReachedChime();
            hasPlayedTargetReachedSound = true; // Spill kun én gang per post-ankomst
        }
        previousDistanceToTarget = currentDistance; // Oppdater forrige avstand
        return; // Ikke spill retningspip når så nær
    } else {
        // Hvis vi var innenfor 5m og nå er utenfor, resett flagget slik at trudelutt kan spilles neste gang
        if (hasPlayedTargetReachedSound && currentDistance > 6) { // > 6 for litt hysterese
             hasPlayedTargetReachedSound = false;
        }
    }
    
    // Retningspiping (kun hvis > 5m og forrige avstand finnes)
    if (previousDistanceToTarget !== null && currentDistance > 5) {
        const distanceChangeThreshold = 1; // Minste endring i meter for å trigge lyd

        if (currentDistance < previousDistanceToTarget - distanceChangeThreshold) { // Nærmere
            console.log("Nærmere!");
            playSound(1000, 80, gpsVol, 'sawtooth', 0); // Pip 1
            playSound(1000, 80, gpsVol, 'sawtooth', 120); // Pip 2 (litt forsinket)
        } else if (currentDistance > previousDistanceToTarget + distanceChangeThreshold) { // Lenger unna
            console.log("Lenger unna!");
            playSound(400, 250, gpsVol, 'square'); // Ett dystert pip
        }
        // Hvis ingen signifikant endring, ingen lyd
    }
    previousDistanceToTarget = currentDistance;
}

// Funksjoner for å starte/stoppe den felles posisjonsovervåkingen
function startContinuousUserPositionUpdate() { /* ... (som i versjon #21) ... */ const toggleGpsAudioButton = document.getElementById('toggle-gps-audio-button'); if (!navigator.geolocation) { console.warn("Geolocation ikke støttet."); isGpsAudioEnabled = false; if(toggleGpsAudioButton) toggleGpsAudioButton.textContent = "🛰️ GPS Av"; localStorage.setItem('rebusGpsAudioEnabled', false); return; } if (mapPositionWatchId !== null) return; initializeAudioContext(); console.log("Starter kontinuerlig GPS posisjonssporing for kart og pip."); previousDistanceToTarget = null; mapPositionWatchId = navigator.geolocation.watchPosition( handlePositionUpdate, (error) => { handleGeolocationError(error); stopContinuousUserPositionUpdate(); if(toggleGpsAudioButton) toggleGpsAudioButton.textContent = "🛰️ GPS Feil"; isGpsAudioEnabled = false; localStorage.setItem('rebusGpsAudioEnabled', false); }, { enableHighAccuracy: true, maximumAge: 3000, timeout: 7000 } ); }
function stopContinuousUserPositionUpdate() { /* ... (som i versjon #21) ... */ if (proximityBeepIntervalId) { clearInterval(proximityBeepIntervalId); proximityBeepIntervalId = null; } if (mapPositionWatchId !== null) { navigator.geolocation.clearWatch(mapPositionWatchId); mapPositionWatchId = null; console.log("Stoppet kontinuerlig GPS sporing for kart og pip."); } previousDistanceToTarget = null; hasPlayedTargetReachedSound = false; }


document.addEventListener('DOMContentLoaded', () => {
    // ... (HTML element referanser og KONFIGURASJON som i versjon #21) ...
    const teamCodeInput = document.getElementById('team-code-input'); const startWithTeamCodeButton = document.getElementById('start-with-team-code-button'); const teamCodeFeedback = document.getElementById('team-code-feedback'); const pages = document.querySelectorAll('#rebus-content .page'); const unlockPostButtons = document.querySelectorAll('.unlock-post-btn'); const checkTaskButtons = document.querySelectorAll('.check-task-btn'); const tabButtons = document.querySelectorAll('.tab-button'); const tabContents = document.querySelectorAll('.tab-content'); const devResetButtons = document.querySelectorAll('.dev-reset-button'); const backgroundAudio = document.getElementById('background-audio'); const playPauseButton = document.getElementById('play-pause-button'); const muteUnmuteButton = document.getElementById('mute-unmute-button'); const volumeSlider = document.getElementById('volume-slider'); const toggleGpsAudioButton = document.getElementById('toggle-gps-audio-button'); const gpsAudioVolumeSlider = document.getElementById('gps-audio-volume-slider');
    const TEAM_CONFIG = { "SKIPPER": { name: "Team Skipper", startPostId: "post-1-page", postSequence: [1, 2, 3, 4, 5, 6, 7, 8] }, "KOWALSKI": { name: "Team Kowalski", startPostId: "post-3-page", postSequence: [3, 4, 5, 6, 7, 8, 1, 2] }, "RICO": { name: "Team Rico", startPostId: "post-5-page", postSequence: [5, 6, 7, 8, 1, 2, 3, 4] }, "MENIG": { name: "Team Menig", startPostId: "post-7-page", postSequence: [7, 8, 1, 2, 3, 4, 5, 6] } };
    const POST_UNLOCK_CODES = { post1: "SKATT", post2: "KART", post3: "KOMPASS", post4: "EVENTYR", post5: "MYSTERIE", post6: "HEMMELIG", post7: "OPPDRAG", post8: "FINN" };
    const CORRECT_TASK_ANSWERS = { post1: "KART", post2: "JACK BLACK", post3: "TRYMSKODE", post4: "KLOKKA", post5: "GROOT", post6: "NÅL", post7: "BLÅ", post8: "SVAMP" };

    // === KJERNEFUNKSJONER (DOM-avhengige) ===
    function setupGpsAudioControls() { /* ... (som i versjon #21) ... */ if (!toggleGpsAudioButton || !gpsAudioVolumeSlider) { console.warn("GPS lydkontroll-elementer mangler."); const gpsControlsDiv = document.getElementById('gps-audio-controls'); if(gpsControlsDiv) gpsControlsDiv.style.display = 'none'; return; } const savedGpsAudioEnabled = localStorage.getItem('rebusGpsAudioEnabled') === 'true'; const savedGpsAudioVolume = localStorage.getItem('rebusGpsAudioVolume'); isGpsAudioEnabled = savedGpsAudioEnabled; if (savedGpsAudioVolume !== null) { gpsAudioVolume = parseFloat(savedGpsAudioVolume); gpsAudioVolumeSlider.value = gpsAudioVolume; } else { gpsAudioVolumeSlider.value = gpsAudioVolume; } toggleGpsAudioButton.textContent = isGpsAudioEnabled ? "🛰️ GPS På" : "🛰️ GPS Av"; if (isGpsAudioEnabled && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) { startContinuousUserPositionUpdate(); } toggleGpsAudioButton.addEventListener('click', () => { isGpsAudioEnabled = !isGpsAudioEnabled; toggleGpsAudioButton.textContent = isGpsAudioEnabled ? "🛰️ GPS På" : "🛰️ GPS Av"; localStorage.setItem('rebusGpsAudioEnabled', isGpsAudioEnabled); if (isGpsAudioEnabled && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) { startContinuousUserPositionUpdate(); } else { stopContinuousUserPositionUpdate(); if (!isGpsAudioEnabled) { /* Hvis GPS lyd er skrudd AV, stopp også pip-intervallet eksplisitt */ if (proximityBeepIntervalId) { clearInterval(proximityBeepIntervalId); proximityBeepIntervalId = null; } } } }); gpsAudioVolumeSlider.addEventListener('input', () => { gpsAudioVolume = gpsAudioVolumeSlider.valueAsNumber; localStorage.setItem('rebusGpsAudioVolume', gpsAudioVolume); }); }
    // ... (resten av script.js fra Versjon #21, ingen endringer i de følgende funksjonene for denne oppdateringen)
    // (setupMusicControls, updatePageText, showRebusPage, showTabContent, saveState, loadState, clearState, resetPageUI, resetAllPostUIs, initializeTeam, handlePostUnlock, handleTaskCheck, updateUIAfterLoad, og alle event listeners og initialisering)
    function setupMusicControls() { if (!backgroundAudio || !playPauseButton || !muteUnmuteButton || !volumeSlider) { console.warn("Musikk-kontroll elementer mangler."); if(document.getElementById('music-controls')) document.getElementById('music-controls').style.display = 'none'; return; } const savedVolume = localStorage.getItem('rebusMusicVolume'); const savedMuted = localStorage.getItem('rebusMusicMuted') === 'true'; if (savedVolume !== null) { backgroundAudio.volume = parseFloat(savedVolume); volumeSlider.value = parseFloat(savedVolume); } else { backgroundAudio.volume = 0.5; volumeSlider.value = 0.5; } backgroundAudio.muted = savedMuted; muteUnmuteButton.textContent = savedMuted ? '🔇' : '🔊'; playPauseButton.addEventListener('click', () => { if (backgroundAudio.paused) { backgroundAudio.play().then(() => playPauseButton.textContent = '⏸️').catch(e => console.error("Play feil:", e.name, e.message)); } else { backgroundAudio.pause(); playPauseButton.textContent = '▶️'; } }); muteUnmuteButton.addEventListener('click', () => { backgroundAudio.muted = !backgroundAudio.muted; muteUnmuteButton.textContent = backgroundAudio.muted ? '🔇' : '🔊'; localStorage.setItem('rebusMusicMuted', backgroundAudio.muted); }); volumeSlider.addEventListener('input', () => { backgroundAudio.volume = volumeSlider.value; localStorage.setItem('rebusMusicVolume', volumeSlider.value); if (backgroundAudio.muted && backgroundAudio.volume > 0) { backgroundAudio.muted = false; muteUnmuteButton.textContent = '🔊'; localStorage.setItem('rebusMusicMuted', false); } }); backgroundAudio.load(); backgroundAudio.addEventListener('canplaythrough', () => { console.log("Musikk kan spilles."); if (backgroundAudio.paused) { backgroundAudio.play().then(() => { if (playPauseButton) playPauseButton.textContent = '⏸️'; }).catch(e => { console.warn('Autoplay forhindret:', e.name, e.message); if (playPauseButton) playPauseButton.textContent = '▶️'; }); } }); backgroundAudio.addEventListener('error', (e) => { console.error("Audio feil:", backgroundAudio.error); if (playPauseButton) playPauseButton.textContent = '⚠️'; let errText = "Feil med musikk."; if (backgroundAudio.error) { switch (backgroundAudio.error.code) { case 1: errText += " Avbrutt."; break; case 2: errText += " Nettverk."; break; case 3: errText += " Dekoding."; break; case 4: errText += " Format/kilde."; break; default: errText += " Ukjent."; } } console.error(errText); }); }
    function updatePageText(pageElement, teamPostNumber, globalPostId) { const titleElement = pageElement.querySelector('.post-title-placeholder'); const introElement = pageElement.querySelector('.post-intro-placeholder'); if (titleElement) { titleElement.textContent = `Lagets ${teamPostNumber}. Post: Finn Ankomstkoden! 🗝️`; } if (introElement) { const postDetails = POST_LOCATIONS[globalPostId -1]; let postName = postDetails ? postDetails.name : `Post ${globalPostId}`; introElement.textContent = `Dere har nådd deres ${teamPostNumber}. post i rebusløpet, som er ved ${postName}. Se dere rundt og finn ankomstkoden for å låse opp oppgaven!`; if (teamPostNumber === TOTAL_POSTS) { if(titleElement) titleElement.textContent = `Lagets Siste Post: Finn Ankomstkoden! 🏁`; introElement.textContent = `Dette er deres siste post før det store målet! Finn ankomstkoden ved ${postName} for å løse den siste oppgaven.`; } } }
    function showRebusPage(pageId) { pages.forEach(page => page.classList.remove('visible')); const nextPageElement = document.getElementById(pageId); if (nextPageElement) { nextPageElement.classList.add('visible'); const container = document.querySelector('.container'); if (container) window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' }); if (currentTeamData && pageId.startsWith('post-')) { const globalPostNum = parseInt(pageId.split('-')[1]); const teamPostNum = currentTeamData.postSequence.indexOf(globalPostNum) + 1; updatePageText(nextPageElement, teamPostNum, globalPostNum); } resetPageUI(pageId); } else { console.error("Side ikke funnet:", pageId); clearState(); showRebusPage('intro-page'); } }
    function showTabContent(tabId) { tabContents.forEach(content => content.classList.remove('visible')); const nextContent = document.getElementById(tabId + '-content'); if (nextContent) nextContent.classList.add('visible'); else console.error("Tab-innhold ikke funnet:", tabId + '-content'); tabButtons.forEach(button => { button.classList.remove('active'); if (button.getAttribute('data-tab') === tabId) button.classList.add('active'); }); }
    function saveState() { if (currentTeamData) localStorage.setItem('activeTeamData', JSON.stringify(currentTeamData)); else localStorage.removeItem('activeTeamData'); }
    function loadState() { const savedData = localStorage.getItem('activeTeamData'); if (savedData) { try { currentTeamData = JSON.parse(savedData); if (!currentTeamData || typeof currentTeamData.completedPostsCount === 'undefined' || !currentTeamData.postSequence || !currentTeamData.unlockedPosts) { clearState(); return false; } return true; } catch (e) { clearState(); return false; } } currentTeamData = null; return false; }
    function clearState() { localStorage.removeItem('activeTeamData'); currentTeamData = null; resetAllPostUIs(); clearMapMarker(); clearFinishMarker(); if (userPositionMarker) { userPositionMarker.setMap(null); userPositionMarker = null; } stopContinuousUserPositionUpdate(); }
    function resetPageUI(pageId) { if (pageId === 'intro-page' || pageId === 'finale-page') return; const postNumberMatch = pageId.match(/post-(\d+)-page/); if (!postNumberMatch) return; const postNum = postNumberMatch[1]; const unlockSection = document.querySelector(`#post-${postNum}-page .post-unlock-section`); const taskSection = document.querySelector(`#post-${postNum}-page .post-task-section`); const unlockInput = document.getElementById(`post-${postNum}-unlock-input`); const unlockButton = document.querySelector(`#post-${postNum}-page .unlock-post-btn`); const unlockFeedback = document.getElementById(`feedback-unlock-${postNum}`); const taskInput = document.getElementById(`post-${postNum}-task-input`); const taskButton = document.querySelector(`#post-${postNum}-page .check-task-btn`); const taskFeedback = document.getElementById(`feedback-task-${postNum}`); const isPostUnlocked = currentTeamData?.unlockedPosts?.[`post${postNum}`]; const isTaskCompleted = currentTeamData?.completedGlobalPosts?.[`post${postNum}`]; if (unlockSection && taskSection) { if (isTaskCompleted) { unlockSection.style.display = 'none'; taskSection.style.display = 'block'; if (taskInput) { taskInput.disabled = true; } if (taskButton) taskButton.disabled = true; if (taskFeedback) { taskFeedback.textContent = 'Oppgave fullført!'; taskFeedback.className = 'feedback success'; } } else if (isPostUnlocked) { unlockSection.style.display = 'none'; taskSection.style.display = 'block'; if (taskInput) { taskInput.disabled = false; taskInput.value = ''; } if (taskButton) taskButton.disabled = false; if (taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; } } else { unlockSection.style.display = 'block'; taskSection.style.display = 'none'; if (unlockInput) { unlockInput.disabled = false; unlockInput.value = ''; } if (unlockButton) unlockButton.disabled = false; if (unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; } } } }
    function resetAllPostUIs() { for (let i = 1; i <= TOTAL_POSTS; i++) { const unlockSection = document.querySelector(`#post-${i}-page .post-unlock-section`); const taskSection = document.querySelector(`#post-${i}-page .post-task-section`); const unlockInput = document.getElementById(`post-${i}-unlock-input`); const unlockButton = document.querySelector(`#post-${i}-page .unlock-post-btn`); const unlockFeedback = document.getElementById(`feedback-unlock-${i}`); const taskInput = document.getElementById(`post-${i}-task-input`); const taskButton = document.querySelector(`#post-${i}-page .check-task-btn`); const taskFeedback = document.getElementById(`feedback-task-${i}`); if(unlockSection) unlockSection.style.display = 'block'; if(taskSection) taskSection.style.display = 'none'; if(unlockInput) { unlockInput.value = ''; unlockInput.disabled = false; } if(unlockButton) unlockButton.disabled = false; if(unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; } if(taskInput) { taskInput.value = ''; taskInput.disabled = false; } if(taskButton) taskButton.disabled = false; if(taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; } const titlePlaceholder = document.querySelector(`#post-${i}-page .post-title-placeholder`); if(titlePlaceholder) titlePlaceholder.textContent = "Neste Post: Finn Ankomstkoden! 🗝️"; const introPlaceholder = document.querySelector(`#post-${i}-page .post-intro-placeholder`); if(introPlaceholder) introPlaceholder.textContent = "Finn ankomstkoden på stedet for å låse opp oppgaven."; } if(teamCodeInput) teamCodeInput.value = ''; if(teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback';} }
    function initializeTeam(teamCode) { const teamKey = teamCode.trim().toUpperCase(); const config = TEAM_CONFIG[teamKey]; teamCodeFeedback.className = 'feedback'; teamCodeFeedback.textContent = ''; if (config) { currentTeamData = { ...config, id: teamKey, currentPostArrayIndex: 0, completedPostsCount: 0, completedGlobalPosts: {}, unlockedPosts: {} }; saveState(); resetAllPostUIs(); clearFinishMarker(); if (backgroundAudio && backgroundAudio.paused) { backgroundAudio.play().then(() => { if (playPauseButton) playPauseButton.textContent = '⏸️'; }).catch(e => console.warn("Musikk auto-start feilet:", e.name, e.message)); } const firstPostInSequence = currentTeamData.postSequence[0]; showRebusPage(`post-${firstPostInSequence}-page`); if (map) updateMapMarker(firstPostInSequence, false); else console.warn("Kart ikke klart ved lagstart for å sette markør."); startContinuousUserPositionUpdate(); console.log(`Team ${currentTeamData.name} startet! Deres ${currentTeamData.currentPostArrayIndex + 1}. post (globalt: ${firstPostInSequence})`); } else { teamCodeFeedback.textContent = 'Ugyldig lagkode!'; teamCodeFeedback.classList.add('error', 'shake'); setTimeout(() => teamCodeFeedback.classList.remove('shake'), 400); if (teamCodeInput) { teamCodeInput.classList.add('shake'); setTimeout(() => teamCodeInput.classList.remove('shake'), 400); teamCodeInput.focus(); teamCodeInput.select(); } } }
    function handlePostUnlock(postNum, userAnswer) { const unlockInput = document.getElementById(`post-${postNum}-unlock-input`); const feedbackElement = document.getElementById(`feedback-unlock-${postNum}`); const correctUnlockCode = POST_UNLOCK_CODES[`post${postNum}`]; feedbackElement.className = 'feedback'; feedbackElement.textContent = ''; if (!userAnswer) { feedbackElement.textContent = 'Skriv kodeordet!'; feedbackElement.classList.add('error', 'shake'); unlockInput.classList.add('shake'); setTimeout(() => { feedbackElement.classList.remove('shake'); unlockInput.classList.remove('shake'); }, 400); return; } if (userAnswer === correctUnlockCode.toUpperCase() || userAnswer === 'ÅPNE') { feedbackElement.textContent = 'Post låst opp! Her er oppgaven:'; feedbackElement.classList.add('success'); if (unlockInput) unlockInput.disabled = true; document.querySelector(`#post-${postNum}-page .unlock-post-btn`).disabled = true; if (!currentTeamData.unlockedPosts) currentTeamData.unlockedPosts = {}; currentTeamData.unlockedPosts[`post${postNum}`] = true; saveState(); setTimeout(() => { resetPageUI(`post-${postNum}-page`); }, 800); } else { feedbackElement.textContent = 'Feil kodeord. Prøv igjen!'; feedbackElement.classList.add('error', 'shake'); unlockInput.classList.add('shake'); setTimeout(() => { feedbackElement.classList.remove('shake'); unlockInput.classList.remove('shake'); }, 400); unlockInput.focus(); unlockInput.select(); } }
    function handleTaskCheck(postNum, userAnswer) { const taskInput = document.getElementById(`post-${postNum}-task-input`); const feedbackElement = document.getElementById(`feedback-task-${postNum}`); let correctTaskAnswer = CORRECT_TASK_ANSWERS[`post${postNum}`]; let alternativeAnswers = []; if (postNum === "2") { alternativeAnswers.push("STEVE"); } else if (postNum === "6") { alternativeAnswers.push("SYNÅL"); } feedbackElement.className = 'feedback'; feedbackElement.textContent = ''; if (!userAnswer) { feedbackElement.textContent = 'Svar på oppgaven!'; feedbackElement.classList.add('error', 'shake'); if(taskInput) taskInput.classList.add('shake'); setTimeout(() => { feedbackElement.classList.remove('shake'); if(taskInput) taskInput.classList.remove('shake'); }, 400); return; } const isCorrectMain = (userAnswer === correctTaskAnswer.toUpperCase()); const isCorrectAlternative = alternativeAnswers.some(alt => userAnswer === alt.toUpperCase()); const isFasit = (userAnswer === 'FASIT'); if (isCorrectMain || isCorrectAlternative || isFasit) { feedbackElement.textContent = isFasit ? 'FASIT godkjent!' : 'Helt riktig! 👍'; feedbackElement.classList.add('success'); if (taskInput) taskInput.disabled = true; const taskButton = document.querySelector(`#post-${postNum}-page .check-task-btn`); if(taskButton) taskButton.disabled = true; if (!currentTeamData.completedGlobalPosts[`post${postNum}`]) { currentTeamData.completedGlobalPosts[`post${postNum}`] = true; currentTeamData.completedPostsCount++; } currentTeamData.currentPostArrayIndex++; saveState(); hasPlayedTargetReachedSound = false; /* Nullstill for neste post */ if (currentTeamData.completedPostsCount < TOTAL_POSTS) { if (currentTeamData.currentPostArrayIndex < currentTeamData.postSequence.length) { const nextPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex]; setTimeout(() => { showRebusPage(`post-${nextPostGlobalId}-page`); if (map) updateMapMarker(nextPostGlobalId, false); }, 1200); } else { console.warn("Færre enn TOTAL_POSTS, men ingen flere i sekvens. Viser finale."); setTimeout(() => { showRebusPage('finale-page'); if (map) updateMapMarker(null, true); stopContinuousUserPositionUpdate(); }, 1200); } } else { setTimeout(() => { showRebusPage('finale-page'); if (map) updateMapMarker(null, true); stopContinuousUserPositionUpdate(); }, 1200); } } else { feedbackElement.textContent = 'Hmm, prøv igjen!'; feedbackElement.classList.add('error', 'shake'); if(taskInput) { taskInput.classList.add('shake'); setTimeout(() => { taskInput.classList.remove('shake'); }, 400); taskInput.focus(); taskInput.select(); } setTimeout(() => { feedbackElement.classList.remove('shake'); }, 400); } }
    function updateUIAfterLoad() { if (!currentTeamData) { resetAllPostUIs(); return; } for (let i = 1; i <= TOTAL_POSTS; i++) { resetPageUI(`post-${i}-page`); } }
    
    if (startWithTeamCodeButton) { startWithTeamCodeButton.addEventListener('click', () => { initializeTeam(teamCodeInput.value); }); } 
    if (teamCodeInput) { teamCodeInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') { event.preventDefault(); if (startWithTeamCodeButton) startWithTeamCodeButton.click(); } }); }
    unlockPostButtons.forEach(button => { button.addEventListener('click', () => { const postNum = button.getAttribute('data-post'); const unlockInput = document.getElementById(`post-${postNum}-unlock-input`); handlePostUnlock(postNum, unlockInput.value.trim().toUpperCase()); }); });
    checkTaskButtons.forEach(button => { button.addEventListener('click', () => { const postNum = button.getAttribute('data-post'); const taskInput = document.getElementById(`post-${postNum}-task-input`); handleTaskCheck(postNum, taskInput.value.trim().toUpperCase()); }); });
    document.querySelectorAll('input[type="text"]').forEach(input => { input.addEventListener('keypress', function(event) { if (event.key === 'Enter') { event.preventDefault(); if (this.id === 'team-code-input') { if(startWithTeamCodeButton) startWithTeamCodeButton.click(); } else if (this.id.includes('-unlock-input')) { const postNum = this.id.split('-')[1]; const unlockButton = document.querySelector(`.unlock-post-btn[data-post="${postNum}"]`); if (unlockButton && !unlockButton.disabled) unlockButton.click(); } else if (this.id.includes('-task-input')) { const postNum = this.id.split('-')[1]; const taskButton = document.querySelector(`.check-task-btn[data-post="${postNum}"]`); if (taskButton && !taskButton.disabled) taskButton.click(); } } }); });
    tabButtons.forEach(button => { button.addEventListener('click', () => { const tabId = button.getAttribute('data-tab'); showTabContent(tabId); if (tabId === 'map' && map && currentTeamData) { if (currentTeamData.completedPostsCount < TOTAL_POSTS) { const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex]; const postLocation = POST_LOCATIONS[currentPostGlobalId - 1]; let bounds = new google.maps.LatLngBounds(); if (postLocation) bounds.extend(postLocation); if (userPositionMarker && userPositionMarker.getPosition()) bounds.extend(userPositionMarker.getPosition()); if (!bounds.isEmpty()) { map.fitBounds(bounds); if (map.getZoom() > 17) map.setZoom(17); if (postLocation && (!userPositionMarker || !userPositionMarker.getPosition())) { map.panTo(postLocation); map.setZoom(17); } } else if (postLocation) { map.panTo(postLocation); map.setZoom(17); } } else { map.panTo(FINISH_LOCATION); map.setZoom(17); } } }); });
    devResetButtons.forEach(button => { button.addEventListener('click', () => { if (confirm("Nullstille? (Test)")) { clearState(); showRebusPage('intro-page'); if (teamCodeInput) { teamCodeInput.value = ''; teamCodeInput.disabled = false; } if (teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback'; } if (startWithTeamCodeButton) startWithTeamCodeButton.disabled = false; } }); });
    
    setupMusicControls(); 
    setupGpsAudioControls(); 
    if (loadState()) { 
        showTabContent('rebus');
        if (currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            showRebusPage('finale-page'); if (map) updateMapMarker(null, true); 
        } else if (currentTeamData) {
            const currentExpectedPostId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            if (typeof currentExpectedPostId === 'undefined') {
                if(currentTeamData.completedPostsCount >= TOTAL_POSTS) { showRebusPage('finale-page'); if(map) updateMapMarker(null, true); }
                else { clearState(); showRebusPage('intro-page'); }
            } else {
                showRebusPage(`post-${currentExpectedPostId}-page`); 
            }
        } else { 
            clearState(); showRebusPage('intro-page');
        }
        updateUIAfterLoad(); 
        if(currentTeamData) {
            console.log(`Gjenopprettet tilstand for Team ${currentTeamData.name}.`);
            if (isGpsAudioEnabled && currentTeamData.completedPostsCount < TOTAL_POSTS && typeof google !== 'undefined' && google.maps && map) { 
                startContinuousUserPositionUpdate();
            }
        }
    } else {
        showTabContent('rebus'); showRebusPage('intro-page'); resetAllPostUIs(); 
    }

});
/* Version: #22 */
