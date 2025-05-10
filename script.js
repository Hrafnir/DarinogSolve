/* Version: #17 */

// === GLOBALE VARIABLER FOR KART ===
let map;
let currentMapMarker;
let userPositionMarker;
let mapElement; // Vil bli satt i DOMContentLoaded

// === KONFIGURASJON FOR KART (Globalt tilgjengelig for initMap) ===
const POST_LOCATIONS = [
    { lat: 60.8007539616181, lng: 10.646227725129991, title: "Post 1" },
    { lat: 60.80017468739349, lng: 10.64510651928592, title: "Post 2" },
    { lat: 60.80072782302861, lng: 10.644889579638045, title: "Post 3" },
    { lat: 60.80048329479234, lng: 10.643492818098643, title: "Post 4" },
    { lat: 60.80045228531585, lng: 10.642988549931982, title: "Post 5" },
    { lat: 60.7998031467142, lng: 10.643149576741504, title: "Post 6" },
    { lat: 60.7990979034987, lng: 10.64366234869697, title: "Post 7" },
    { lat: 60.79974498905187, lng: 10.64269195029222, title: "Post 8" }
];
const START_LOCATION = { lat: 60.801211826268066, lng: 10.645566533162912, title: "Start Rebus" };
const FINISH_LOCATION = { lat: 60.80140295692265, lng: 10.643869988530302, title: "Mål!" };

// === GLOBALE KARTFUNKSJONER ===
// Disse må være globale for at initMap skal kunne kalle dem,
// og for at de skal kunne kalle hverandre utenfor DOMContentLoaded-scopet
// hvis de ikke er avhengige av variabler som kun settes der.

function updateMapMarker(postGlobalId) { 
    if (!map) { console.warn("Kart ikke initialisert for updateMapMarker."); return; }
    if (postGlobalId < 1 || postGlobalId > POST_LOCATIONS.length) { console.error("Ugyldig post ID for kartmarkør:", postGlobalId); clearMapMarker(); return; }
    const location = POST_LOCATIONS[postGlobalId - 1];
    clearMapMarker();
    currentMapMarker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng }, map: map, title: location.title + " (Neste Post!)",
        animation: google.maps.Animation.DROP, 
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' }
    });
    map.panTo({ lat: location.lat, lng: location.lng });
    if (map.getZoom() < 17) map.setZoom(17);
}

function clearMapMarker() { 
    if (currentMapMarker) { currentMapMarker.setMap(null); currentMapMarker = null; } 
}

function handleGeolocationError(error) { 
    let msg = "Posisjonsfeil ved henting: ";
    switch (error.code) {
        case error.PERMISSION_DENIED: msg += "Bruker nektet tillatelse."; break;
        case error.POSITION_UNAVAILABLE: msg += "Posisjonsinformasjon er utilgjengelig."; break;
        case error.TIMEOUT: msg += "Forespørsel om brukerposisjon timet ut."; break;
        default: msg += "En ukjent feil oppstod.";
    }
    console.warn(msg);
}

function showUserPosition() { 
    if (!map) { console.warn("Kart ikke klar for å vise brukerposisjon."); return; }
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                if (userPositionMarker) userPositionMarker.setMap(null);
                userPositionMarker = new google.maps.Marker({
                    position: userPos, map: map, title: "Din Posisjon",
                    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#4285F4", fillOpacity: 1, strokeWeight: 2, strokeColor: "white" }
                });
                console.log("Brukerposisjon vist (enkeltvisning for initMap):", userPos);
            }, 
            handleGeolocationError, // Bruker den globale error handleren
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else { console.warn("Geolocation støttes ikke av denne nettleseren (sjekket i showUserPosition)."); }
}


// === GOOGLE MAPS API CALLBACK ===
window.initMap = function() { 
    mapElement = document.getElementById('dynamic-map-container'); // Hent elementet her, etter at DOM er klar
    if (!mapElement) { 
        console.error("Kart-element #dynamic-map-container ikke funnet under initMap."); 
        // Prøv å vente litt og se om DOM blir klar, dette er en fallback
        setTimeout(window.initMap, 500);
        return;
    }

    const mapStyles = [ { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] } ];
    map = new google.maps.Map(mapElement, {
        center: START_LOCATION, zoom: 17, mapTypeId: google.maps.MapTypeId.SATELLITE, 
        styles: mapStyles, 
        disableDefaultUI: false, streetViewControl: false, fullscreenControl: true,
        mapTypeControlOptions: { style: google.maps.MapTypeControlStyle.DROPDOWN_MENU, mapTypeIds: [google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID] }
    });

    new google.maps.Marker({ position: START_LOCATION, map: map, title: START_LOCATION.title });
    new google.maps.Marker({ 
        position: FINISH_LOCATION, map: map, title: FINISH_LOCATION.title, 
        icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' }
    });
    
    // Sjekk om currentTeamData er definert (kan skje hvis DOMContentLoaded kjører før initMap og setter den)
    // Dette er litt avhengig av lastetider, så vi legger til en sjekk.
    // Den primære oppdateringen av markør skjer nå fra DOMContentLoaded etter loadState.
    if (typeof currentTeamData !== 'undefined' && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
        const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
        updateMapMarker(currentPostGlobalId);
    } else if (typeof currentTeamData !== 'undefined' && currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) { 
        clearMapMarker(); 
    }
    showUserPosition(); // Prøv å vise brukerposisjon når kartet er klart
    console.log("Google Map initialisert via window.initMap");
}


document.addEventListener('DOMContentLoaded', () => {
    // === HTML ELEMENT REFERENCES (hentes etter at DOM er klar) ===
    const teamCodeInput = document.getElementById('team-code-input');
    const startWithTeamCodeButton = document.getElementById('start-with-team-code-button');
    const teamCodeFeedback = document.getElementById('team-code-feedback');

    const pages = document.querySelectorAll('#rebus-content .page');
    const unlockPostButtons = document.querySelectorAll('.unlock-post-btn');
    const checkTaskButtons = document.querySelectorAll('.check-task-btn');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const devResetButtons = document.querySelectorAll('.dev-reset-button');

    const backgroundAudio = document.getElementById('background-audio');
    const playPauseButton = document.getElementById('play-pause-button');
    const muteUnmuteButton = document.getElementById('mute-unmute-button');
    const volumeSlider = document.getElementById('volume-slider');
    // mapElement settes i initMap, men vi kan også referere til den her hvis nødvendig senere
    
    const toggleGpsAudioButton = document.getElementById('toggle-gps-audio-button');
    const gpsAudioVolumeSlider = document.getElementById('gps-audio-volume-slider');

    // === GPS AUDIO HJELP VARIABLER (forblir i DOMContentLoaded da de styrer UI/logikk derfra) ===
    let audioContext; 
    let proximityBeepIntervalId = null; 
    let isGpsAudioEnabled = false;
    let gpsAudioVolume = 0.7; 
    let positionWatchId = null; 

    // === KONFIGURASJON (kun de som ikke trengs globalt av initMap) ===
    const TOTAL_POSTS = 8;
    // POST_LOCATIONS, START_LOCATION, FINISH_LOCATION er nå globale

    const TEAM_CONFIG = {
        "SKIPPER": { name: "Team Skipper", startPostId: "post-1-page", postSequence: [1, 2, 3, 4, 5, 6, 7, 8] },
        "KOWALSKI": { name: "Team Kowalski", startPostId: "post-3-page", postSequence: [3, 4, 5, 6, 7, 8, 1, 2] },
        "RICO": { name: "Team Rico", startPostId: "post-5-page", postSequence: [5, 6, 7, 8, 1, 2, 3, 4] },
        "MENIG": { name: "Team Menig", startPostId: "post-7-page", postSequence: [7, 8, 1, 2, 3, 4, 5, 6] }
    };
    const POST_UNLOCK_CODES = {
        post1: "SKATT", post2: "KART", post3: "KOMPASS", post4: "EVENTYR",
        post5: "MYSTERIE", post6: "HEMMELIG", post7: "OPPDRAG", post8: "FINN"
    };
    const CORRECT_TASK_ANSWERS = {
        post1: "KART", post2: "JACK BLACK", post3: "TRYMSKODE", post4: "KLOKKA",
        post5: "GROOT", post6: "NÅL", post7: "BLÅ", post8: "SVAMP"
    };

    // currentTeamData må være tilgjengelig for initMap, så vi deklarerer den utenfor,
    // men initialiserer den (eller laster den) her.
    // Den er allerede deklarert globalt, så vi bare bruker den.
    // let currentTeamData = null; // FJERN DENNE LINJEN, den er global nå.

    // === GPS AUDIO HJELP FUNKSJONER (de som er avhengige av variabler i DOMContentLoaded) ===
    function initializeAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
    function playBeep(frequency = 880, duration = 100, volume = gpsAudioVolume) {
        if (!audioContext || !isGpsAudioEnabled) return;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(volume * 0.5, audioContext.currentTime); // Bruk den justerte gpsAudioVolume
        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration / 1000);
    }
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; 
        const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180; const Δλ = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; 
    }
    function updateProximityBeeps(position) {
        if (!isGpsAudioEnabled || !currentTeamData || currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            stopProximityBeeps(); return;
        }
        const userLat = position.coords.latitude; const userLng = position.coords.longitude;
        const nextPostIndexInSequence = currentTeamData.currentPostArrayIndex;
        // Sørg for at vi har en gyldig neste post
        if (nextPostIndexInSequence >= currentTeamData.postSequence.length) {
            stopProximityBeeps(); return;
        }
        const nextPostGlobalId = currentTeamData.postSequence[nextPostIndexInSequence];
        if (nextPostGlobalId === undefined || nextPostGlobalId < 1 || nextPostGlobalId > POST_LOCATIONS.length) {
            stopProximityBeeps(); return;
        }
        const targetLocation = POST_LOCATIONS[nextPostGlobalId - 1];
        const distance = calculateDistance(userLat, userLng, targetLocation.lat, targetLocation.lng);
        console.log(`Avstand til Post ${nextPostGlobalId}: ${distance.toFixed(0)}m`);
        let beepInterval = 0; let beepFrequency = 880; let beepDuration = 100;
        if (distance <= 5) { beepInterval = 300; beepFrequency = 1200; beepDuration = 80; } 
        else if (distance <= 10) { beepInterval = 600; beepFrequency = 1000; } 
        else if (distance <= 25) { beepInterval = 1000; } 
        else if (distance <= 50) { beepInterval = 2000; } 
        else if (distance <= 100) { beepInterval = 3500; }
        if (proximityBeepIntervalId) { clearInterval(proximityBeepIntervalId); proximityBeepIntervalId = null; }
        if (beepInterval > 0) {
            playBeep(beepFrequency, beepDuration, gpsAudioVolumeSlider.valueAsNumber); // Bruk aktuell slider verdi
            proximityBeepIntervalId = setInterval(() => {
                playBeep(beepFrequency, beepDuration, gpsAudioVolumeSlider.valueAsNumber);
            }, beepInterval);
        }
    }
    function startProximityBeeps() {
        if (!navigator.geolocation) {
            console.warn("Geolocation ikke støttet."); isGpsAudioEnabled = false;
            if(toggleGpsAudioButton) toggleGpsAudioButton.textContent = "🛰️ GPS Av"; return;
        }
        if (positionWatchId !== null) return; // Allerede i gang
        initializeAudioContext(); // Sørg for at AudioContext er klar
        console.log("Starter GPS posisjonssporing for pip.");
        positionWatchId = navigator.geolocation.watchPosition(
            updateProximityBeeps, 
            (error) => {
                handleGeolocationError(error); // Bruker den globale error handleren
                stopProximityBeeps(); 
                if(toggleGpsAudioButton) toggleGpsAudioButton.textContent = "🛰️ GPS Feil";
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
    }
    function stopProximityBeeps() {
        if (proximityBeepIntervalId) { clearInterval(proximityBeepIntervalId); proximityBeepIntervalId = null; }
        if (positionWatchId !== null) { navigator.geolocation.clearWatch(positionWatchId); positionWatchId = null; console.log("Stoppet GPS sporing."); }
    }
    function setupGpsAudioControls() {
        if (!toggleGpsAudioButton || !gpsAudioVolumeSlider) {
            console.warn("GPS lydkontroll-elementer mangler.");
            if(document.getElementById('gps-audio-controls')) document.getElementById('gps-audio-controls').style.display = 'none';
            return;
        }
        const savedGpsAudioEnabled = localStorage.getItem('rebusGpsAudioEnabled') === 'true';
        const savedGpsAudioVolume = localStorage.getItem('rebusGpsAudioVolume');
        isGpsAudioEnabled = savedGpsAudioEnabled;
        if (savedGpsAudioVolume !== null) { gpsAudioVolume = parseFloat(savedGpsAudioVolume); gpsAudioVolumeSlider.value = gpsAudioVolume; } 
        else { gpsAudioVolumeSlider.value = gpsAudioVolume; } // gpsAudioVolume har default 0.7
        toggleGpsAudioButton.textContent = isGpsAudioEnabled ? "🛰️ GPS På" : "🛰️ GPS Av";
        // Start kun hvis aktivert OG et spill er i gang (currentTeamData finnes)
        if (isGpsAudioEnabled && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) { startProximityBeeps(); }
        
        toggleGpsAudioButton.addEventListener('click', () => {
            isGpsAudioEnabled = !isGpsAudioEnabled;
            toggleGpsAudioButton.textContent = isGpsAudioEnabled ? "🛰️ GPS På" : "🛰️ GPS Av";
            localStorage.setItem('rebusGpsAudioEnabled', isGpsAudioEnabled);
            if (isGpsAudioEnabled && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) { startProximityBeeps(); } 
            else { stopProximityBeeps(); }
        });
        gpsAudioVolumeSlider.addEventListener('input', () => {
            gpsAudioVolume = gpsAudioVolumeSlider.valueAsNumber; // Oppdater den globale variabelen også
            localStorage.setItem('rebusGpsAudioVolume', gpsAudioVolume);
        });
    }

    // === MUSIKK KONTROLL FUNKSJONER ===
    // ... (setupMusicControls som før) ...
    function setupMusicControls() { 
        if (!backgroundAudio || !playPauseButton || !muteUnmuteButton || !volumeSlider) {
            console.warn("Musikk-kontroll elementer mangler.");
            if(document.getElementById('music-controls')) document.getElementById('music-controls').style.display = 'none';
            return;
        }
        const savedVolume = localStorage.getItem('rebusMusicVolume');
        const savedMuted = localStorage.getItem('rebusMusicMuted') === 'true';
        if (savedVolume !== null) {
            backgroundAudio.volume = parseFloat(savedVolume);
            volumeSlider.value = parseFloat(savedVolume);
        } else { backgroundAudio.volume = 0.5; volumeSlider.value = 0.5; }
        backgroundAudio.muted = savedMuted;
        muteUnmuteButton.textContent = savedMuted ? '🔇' : '🔊';
        playPauseButton.addEventListener('click', () => {
            if (backgroundAudio.paused) {
                backgroundAudio.play().then(() => playPauseButton.textContent = '⏸️')
                                  .catch(e => console.error("Play feil:", e.name, e.message));
            } else { backgroundAudio.pause(); playPauseButton.textContent = '▶️'; }
        });
        muteUnmuteButton.addEventListener('click', () => {
            backgroundAudio.muted = !backgroundAudio.muted;
            muteUnmuteButton.textContent = backgroundAudio.muted ? '🔇' : '🔊';
            localStorage.setItem('rebusMusicMuted', backgroundAudio.muted);
        });
        volumeSlider.addEventListener('input', () => {
            backgroundAudio.volume = volumeSlider.value;
            localStorage.setItem('rebusMusicVolume', volumeSlider.value);
            if (backgroundAudio.muted && backgroundAudio.volume > 0) {
                backgroundAudio.muted = false; muteUnmuteButton.textContent = '🔊'; localStorage.setItem('rebusMusicMuted', false);
            }
        });
        backgroundAudio.load(); 
        backgroundAudio.addEventListener('canplaythrough', () => {
            console.log("Musikk kan spilles.");
            if (backgroundAudio.paused) {
                 backgroundAudio.play().then(() => { if (playPauseButton) playPauseButton.textContent = '⏸️'; })
                                   .catch(e => { console.warn('Autoplay forhindret:', e.name, e.message); if (playPauseButton) playPauseButton.textContent = '▶️'; });
            }
        });
        backgroundAudio.addEventListener('error', (e) => {
            console.error("Audio feil:", backgroundAudio.error);
            if (playPauseButton) playPauseButton.textContent = '⚠️'; 
            let errText = "Feil med musikk.";
            if (backgroundAudio.error) {
                switch (backgroundAudio.error.code) {
                    case 1: errText += " Avbrutt."; break;
                    case 2: errText += " Nettverk."; break;
                    case 3: errText += " Dekoding."; break;
                    case 4: errText += " Format/kilde."; break;
                    default: errText += " Ukjent.";
                }
            }
            console.error(errText);
        });
    }

    // === KJERNEFUNKSJONER (fortsetter) ===
    // ... (showRebusPage, showTabContent, saveState, loadState, clearState, resetPageUI, resetAllPostUIs, initializeTeam, handlePostUnlock, handleTaskCheck, updateUIAfterLoad som før, men sørg for at de er her)
    function showRebusPage(pageId) {
        pages.forEach(page => page.classList.remove('visible'));
        const nextPage = document.getElementById(pageId);
        if (nextPage) {
            nextPage.classList.add('visible');
            const container = document.querySelector('.container');
            if (container) window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
            resetPageUI(pageId); 
        } else {
            console.error("Side ikke funnet:", pageId); clearState(); showRebusPage('intro-page');
        }
    }
    function showTabContent(tabId) { 
        tabContents.forEach(content => content.classList.remove('visible'));
        const nextContent = document.getElementById(tabId + '-content');
        if (nextContent) nextContent.classList.add('visible');
        else console.error("Tab-innhold ikke funnet:", tabId + '-content');
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-tab') === tabId) button.classList.add('active');
        });
    }
    function saveState() {
        if (currentTeamData) localStorage.setItem('activeTeamData', JSON.stringify(currentTeamData));
        else localStorage.removeItem('activeTeamData');
    }
    function loadState() {
        const savedData = localStorage.getItem('activeTeamData');
        if (savedData) {
            try {
                currentTeamData = JSON.parse(savedData); // Nå tilordnes den globale currentTeamData
                if (!currentTeamData || typeof currentTeamData.completedPostsCount === 'undefined' || !currentTeamData.postSequence || !currentTeamData.unlockedPosts) { 
                    clearState(); return false;
                }
                return true;
            } catch (e) { clearState(); return false; }
        }
        currentTeamData = null; return false; // Sørg for at den globale er null
    }
    function clearState() {
        localStorage.removeItem('activeTeamData');
        currentTeamData = null; // Nullstill den globale
        resetAllPostUIs();
        clearMapMarker(); 
        if (userPositionMarker) { userPositionMarker.setMap(null); userPositionMarker = null; }
        stopProximityBeeps();
    }
    function resetPageUI(pageId) {
        if (pageId === 'intro-page' || pageId === 'finale-page') return;
        const postNumberMatch = pageId.match(/post-(\d+)-page/);
        if (!postNumberMatch) return;
        const postNum = postNumberMatch[1];
        const unlockSection = document.querySelector(`#post-${postNum}-page .post-unlock-section`);
        const taskSection = document.querySelector(`#post-${postNum}-page .post-task-section`);
        const unlockInput = document.getElementById(`post-${postNum}-unlock-input`);
        const unlockButton = document.querySelector(`#post-${postNum}-page .unlock-post-btn`);
        const unlockFeedback = document.getElementById(`feedback-unlock-${postNum}`);
        const taskInput = document.getElementById(`post-${postNum}-task-input`);
        const taskButton = document.querySelector(`#post-${postNum}-page .check-task-btn`);
        const taskFeedback = document.getElementById(`feedback-task-${postNum}`);
        const isPostUnlocked = currentTeamData?.unlockedPosts?.[`post${postNum}`]; // Bruk global currentTeamData
        const isTaskCompleted = currentTeamData?.completedGlobalPosts?.[`post${postNum}`]; // Bruk global currentTeamData
        if (unlockSection && taskSection) {
            if (isTaskCompleted) { 
                unlockSection.style.display = 'none'; taskSection.style.display = 'block';
                if (taskInput) { taskInput.disabled = true; } if (taskButton) taskButton.disabled = true;
                if (taskFeedback) { taskFeedback.textContent = 'Oppgave fullført!'; taskFeedback.className = 'feedback success'; }
            } else if (isPostUnlocked) { 
                unlockSection.style.display = 'none'; taskSection.style.display = 'block';
                if (taskInput) { taskInput.disabled = false; taskInput.value = ''; } if (taskButton) taskButton.disabled = false;
                if (taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; }
            } else { 
                unlockSection.style.display = 'block'; taskSection.style.display = 'none';
                if (unlockInput) { unlockInput.disabled = false; unlockInput.value = ''; } if (unlockButton) unlockButton.disabled = false;
                if (unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; }
            }
        }
    }
    function resetAllPostUIs() {
        for (let i = 1; i <= TOTAL_POSTS; i++) {
            const unlockSection = document.querySelector(`#post-${i}-page .post-unlock-section`);
            const taskSection = document.querySelector(`#post-${i}-page .post-task-section`);
            const unlockInput = document.getElementById(`post-${i}-unlock-input`);
            const unlockButton = document.querySelector(`#post-${i}-page .unlock-post-btn`);
            const unlockFeedback = document.getElementById(`feedback-unlock-${i}`);
            const taskInput = document.getElementById(`post-${i}-task-input`);
            const taskButton = document.querySelector(`#post-${i}-page .check-task-btn`);
            const taskFeedback = document.getElementById(`feedback-task-${i}`);
            if(unlockSection) unlockSection.style.display = 'block'; if(taskSection) taskSection.style.display = 'none';
            if(unlockInput) { unlockInput.value = ''; unlockInput.disabled = false; } if(unlockButton) unlockButton.disabled = false;
            if(unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; }
            if(taskInput) { taskInput.value = ''; taskInput.disabled = false; } if(taskButton) taskButton.disabled = false;
            if(taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; }
        }
        if(teamCodeInput) teamCodeInput.value = '';
        if(teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback';}
    }
    function initializeTeam(teamCode) {
        const teamKey = teamCode.trim().toUpperCase();
        const config = TEAM_CONFIG[teamKey];
        teamCodeFeedback.className = 'feedback'; teamCodeFeedback.textContent = '';
        if (config) {
            currentTeamData = { ...config, id: teamKey, currentPostArrayIndex: 0, completedPostsCount: 0, completedGlobalPosts: {}, unlockedPosts: {} }; // Bruk global currentTeamData
            saveState(); resetAllPostUIs(); 
            if (backgroundAudio && backgroundAudio.paused) {
                backgroundAudio.play().then(() => { if (playPauseButton) playPauseButton.textContent = '⏸️'; }).catch(e => console.warn("Musikk auto-start feilet:", e.name, e.message));
            }
            const firstPostInSequence = currentTeamData.postSequence[0];
            showRebusPage(`post-${firstPostInSequence}-page`); 
            if (map) updateMapMarker(firstPostInSequence); // Sjekk om kartet er klart
            else console.warn("Kart ikke klart ved lagstart for å sette markør.");
            showUserPosition(); 
            if (isGpsAudioEnabled) { startProximityBeeps(); }
            console.log(`Team ${currentTeamData.name} startet! Post: ${firstPostInSequence}`);
        } else {
            teamCodeFeedback.textContent = 'Ugyldig lagkode!'; teamCodeFeedback.classList.add('error', 'shake');
            setTimeout(() => teamCodeFeedback.classList.remove('shake'), 400);
            if (teamCodeInput) { teamCodeInput.classList.add('shake'); setTimeout(() => teamCodeInput.classList.remove('shake'), 400); teamCodeInput.focus(); teamCodeInput.select(); }
        }
    }
    function handlePostUnlock(postNum, userAnswer) {
        const unlockInput = document.getElementById(`post-${postNum}-unlock-input`);
        const feedbackElement = document.getElementById(`feedback-unlock-${postNum}`);
        const correctUnlockCode = POST_UNLOCK_CODES[`post${postNum}`];
        feedbackElement.className = 'feedback'; feedbackElement.textContent = '';
        if (!userAnswer) {
            feedbackElement.textContent = 'Skriv kodeordet!'; feedbackElement.classList.add('error', 'shake'); unlockInput.classList.add('shake');
            setTimeout(() => { feedbackElement.classList.remove('shake'); unlockInput.classList.remove('shake'); }, 400); return;
        }
        if (userAnswer === correctUnlockCode.toUpperCase() || userAnswer === 'ÅPNE') {
            feedbackElement.textContent = 'Post låst opp! Her er oppgaven:'; feedbackElement.classList.add('success');
            if (unlockInput) unlockInput.disabled = true; document.querySelector(`#post-${postNum}-page .unlock-post-btn`).disabled = true;
            if (!currentTeamData.unlockedPosts) currentTeamData.unlockedPosts = {}; // Sikkerhetssjekk
            currentTeamData.unlockedPosts[`post${postNum}`] = true; saveState();
            setTimeout(() => { resetPageUI(`post-${postNum}-page`); }, 800);
        } else {
            feedbackElement.textContent = 'Feil kodeord. Prøv igjen!'; feedbackElement.classList.add('error', 'shake'); unlockInput.classList.add('shake');
            setTimeout(() => { feedbackElement.classList.remove('shake'); unlockInput.classList.remove('shake'); }, 400); unlockInput.focus(); unlockInput.select();
        }
    }
    function handleTaskCheck(postNum, userAnswer) {
        const taskInput = document.getElementById(`post-${postNum}-task-input`);
        const feedbackElement = document.getElementById(`feedback-task-${postNum}`);
        let correctTaskAnswer = CORRECT_TASK_ANSWERS[`post${postNum}`];
        let alternativeAnswers = []; 
        if (postNum === "2") { alternativeAnswers.push("STEVE"); } else if (postNum === "6") { alternativeAnswers.push("SYNÅL"); }
        feedbackElement.className = 'feedback'; feedbackElement.textContent = '';
        if (!userAnswer) { 
            feedbackElement.textContent = 'Svar på oppgaven!'; feedbackElement.classList.add('error', 'shake'); if(taskInput) taskInput.classList.add('shake');
            setTimeout(() => { feedbackElement.classList.remove('shake'); if(taskInput) taskInput.classList.remove('shake'); }, 400); return;
        }
        const isCorrectMain = (userAnswer === correctTaskAnswer.toUpperCase());
        const isCorrectAlternative = alternativeAnswers.some(alt => userAnswer === alt.toUpperCase());
        const isFasit = (userAnswer === 'FASIT');
        if (isCorrectMain || isCorrectAlternative || isFasit) {
            feedbackElement.textContent = isFasit ? 'FASIT godkjent!' : 'Helt riktig! 👍'; feedbackElement.classList.add('success');
            if (taskInput) taskInput.disabled = true; const taskButton = document.querySelector(`#post-${postNum}-page .check-task-btn`); if(taskButton) taskButton.disabled = true;
            if (!currentTeamData.completedGlobalPosts[`post${postNum}`]) { currentTeamData.completedGlobalPosts[`post${postNum}`] = true; currentTeamData.completedPostsCount++; }
            currentTeamData.currentPostArrayIndex++; saveState();
            if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
                if (currentTeamData.currentPostArrayIndex < currentTeamData.postSequence.length) {
                    const nextPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
                    setTimeout(() => { showRebusPage(`post-${nextPostGlobalId}-page`); if (map) updateMapMarker(nextPostGlobalId); }, 1200);
                } else { 
                    console.warn("Færre enn TOTAL_POSTS, men ingen flere i sekvens. Viser finale.");
                    setTimeout(() => { showRebusPage('finale-page'); clearMapMarker(); stopProximityBeeps(); }, 1200);
                }
            } else { setTimeout(() => { showRebusPage('finale-page'); clearMapMarker(); stopProximityBeeps(); }, 1200); }
        } else { 
            feedbackElement.textContent = 'Hmm, prøv igjen!'; feedbackElement.classList.add('error', 'shake');
            if(taskInput) { taskInput.classList.add('shake'); setTimeout(() => { taskInput.classList.remove('shake'); }, 400); taskInput.focus(); taskInput.select(); }
            setTimeout(() => { feedbackElement.classList.remove('shake'); }, 400);
        }
    }
    function updateUIAfterLoad() { 
        if (!currentTeamData) { resetAllPostUIs(); return; } 
        for (let i = 1; i <= TOTAL_POSTS; i++) { resetPageUI(`post-${i}-page`); }
    }
    
    // === EVENT LISTENERS ===
    if (startWithTeamCodeButton) { startWithTeamCodeButton.addEventListener('click', () => { initializeTeam(teamCodeInput.value); }); } 
    if (teamCodeInput) { teamCodeInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') { event.preventDefault(); if (startWithTeamCodeButton) startWithTeamCodeButton.click(); } }); }
    unlockPostButtons.forEach(button => { button.addEventListener('click', () => { const postNum = button.getAttribute('data-post'); const unlockInput = document.getElementById(`post-${postNum}-unlock-input`); handlePostUnlock(postNum, unlockInput.value.trim().toUpperCase()); }); });
    checkTaskButtons.forEach(button => { button.addEventListener('click', () => { const postNum = button.getAttribute('data-post'); const taskInput = document.getElementById(`post-${postNum}-task-input`); handleTaskCheck(postNum, taskInput.value.trim().toUpperCase()); }); });
    document.querySelectorAll('input[type="text"]').forEach(input => { input.addEventListener('keypress', function(event) { if (event.key === 'Enter') { event.preventDefault(); if (this.id === 'team-code-input') { if(startWithTeamCodeButton) startWithTeamCodeButton.click(); } else if (this.id.includes('-unlock-input')) { const postNum = this.id.split('-')[1]; const unlockButton = document.querySelector(`.unlock-post-btn[data-post="${postNum}"]`); if (unlockButton && !unlockButton.disabled) unlockButton.click(); } else if (this.id.includes('-task-input')) { const postNum = this.id.split('-')[1]; const taskButton = document.querySelector(`.check-task-btn[data-post="${postNum}"]`); if (taskButton && !taskButton.disabled) taskButton.click(); } } }); });
    tabButtons.forEach(button => { button.addEventListener('click', () => { const tabId = button.getAttribute('data-tab'); showTabContent(tabId); if (tabId === 'map' && map && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) { const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex]; const postLocation = POST_LOCATIONS[currentPostGlobalId - 1]; let bounds = new google.maps.LatLngBounds(); if (postLocation) bounds.extend(postLocation); if (userPositionMarker && userPositionMarker.getPosition()) bounds.extend(userPositionMarker.getPosition()); if (!bounds.isEmpty()) { map.fitBounds(bounds); if (map.getZoom() > 17) map.setZoom(17); if (postLocation && (!userPositionMarker || !userPositionMarker.getPosition())) { map.panTo(postLocation); map.setZoom(17); } } else if (postLocation) { map.panTo(postLocation); map.setZoom(17); } } }); });
    devResetButtons.forEach(button => { button.addEventListener('click', () => { if (confirm("Nullstille? (Test)")) { clearState(); showRebusPage('intro-page'); if (teamCodeInput) { teamCodeInput.value = ''; teamCodeInput.disabled = false; } if (teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback'; } if (startWithTeamCodeButton) startWithTeamCodeButton.disabled = false; } }); });
    
    // === INITIALIZATION ===
    setupMusicControls(); // Denne er nå definert
    setupGpsAudioControls(); 
    if (loadState()) { 
        showTabContent('rebus');
        if (currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            showRebusPage('finale-page');
        } else if (currentTeamData) {
            const currentExpectedPostId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            if (typeof currentExpectedPostId === 'undefined') {
                if(currentTeamData.completedPostsCount >= TOTAL_POSTS) showRebusPage('finale-page');
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
            if (isGpsAudioEnabled && currentTeamData.completedPostsCount < TOTAL_POSTS && map) { // Sjekk om kart er klart
                startProximityBeeps();
            }
        }
    } else {
        showTabContent('rebus'); showRebusPage('intro-page'); resetAllPostUIs(); 
    }

});
/* Version: #17 */
