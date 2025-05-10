/* Version: #16 */
document.addEventListener('DOMContentLoaded', () => {
    // === HTML ELEMENT REFERENCES ===
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
    const mapElement = document.getElementById('dynamic-map-container');

    // NYE: GPS Audio Hjelp Elementer
    const toggleGpsAudioButton = document.getElementById('toggle-gps-audio-button');
    const gpsAudioVolumeSlider = document.getElementById('gps-audio-volume-slider');

    // === GOOGLE MAPS VARIABLES ===
    let map;
    let currentMapMarker;
    let userPositionMarker;

    // === GPS AUDIO HJELP VARIABLER ===
    let audioContext; // For Web Audio API
    let proximityBeepIntervalId = null; // Holder ID for setInterval for piping
    let isGpsAudioEnabled = false;
    let gpsAudioVolume = 0.7; // Default volum for pip, matcher slider
    let positionWatchId = null; // ID for navigator.geolocation.watchPosition

    // === KONFIGURASJON ===
    const TOTAL_POSTS = 8;
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

    const TEAM_CONFIG = {
        "SKIPPER": { name: "Team Skipper", startPostId: "post-1-page", postSequence: [1, 2, 3, 4, 5, 6, 7, 8] },
        "KOWALSKI": { name: "Team Kowalski", startPostId: "post-3-page", postSequence: [3, 4, 5, 6, 7, 8, 1, 2] },
        "RICO": { name: "Team Rico", startPostId: "post-5-page", postSequence: [5, 6, 7, 8, 1, 2, 3, 4] },
        "MENIG": { name: "Team Menig", startPostId: "post-7-page", postSequence: [7, 8, 1, 2, 3, 4, 5, 6] }
    };
    const POST_UNLOCK_CODES = { /* ... (som før) ... */
        post1: "SKATT", post2: "KART", post3: "KOMPASS", post4: "EVENTYR",
        post5: "MYSTERIE", post6: "HEMMELIG", post7: "OPPDRAG", post8: "FINN"
    };
    const CORRECT_TASK_ANSWERS = { /* ... (som før, med Jack Black/Steve og Groot) ... */
        post1: "KART", post2: "JACK BLACK", post3: "TRYMSKODE", post4: "KLOKKA",
        post5: "GROOT", post6: "NÅL", post7: "BLÅ", post8: "SVAMP"
    };

    let currentTeamData = null;
    
    // === GOOGLE MAPS FUNKSJONER ===
    // ... (initMap, updateMapMarker, clearMapMarker, showUserPosition, handleGeolocationError som i versjon #15) ...
    // (Ingen endringer i disse Google Maps-spesifikke funksjonene for denne oppdateringen)
    window.initMap = function() { /* ... (som i versjon #15) ... */ 
        if (!mapElement) { console.error("Kart-element #dynamic-map-container ikke funnet."); return; }
        const mapStyles = [ { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] } ];
        map = new google.maps.Map(mapElement, {
            center: START_LOCATION, zoom: 17, mapTypeId: google.maps.MapTypeId.SATELLITE, 
            styles: mapStyles, // Eller bruk din mapId: 'c6a4f7dc5c6423aa4e76e70d',
            disableDefaultUI: false, streetViewControl: false, fullscreenControl: true,
            mapTypeControlOptions: { style: google.maps.MapTypeControlStyle.DROPDOWN_MENU, mapTypeIds: [google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID] }
        });
        new google.maps.Marker({ position: START_LOCATION, map: map, title: START_LOCATION.title });
        new google.maps.Marker({ 
            position: FINISH_LOCATION, map: map, title: FINISH_LOCATION.title, 
            icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' }
        });
        if (currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
            const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            updateMapMarker(currentPostGlobalId);
        } else if (currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) { clearMapMarker(); }
        showUserPosition(); // Viser brukerposisjon, men starter ikke piping ennå
    }
    function updateMapMarker(postGlobalId) { /* ... (som i versjon #15) ... */ 
        if (!map) { console.warn("Kart ikke initialisert."); return; }
        if (postGlobalId < 1 || postGlobalId > POST_LOCATIONS.length) { console.error("Ugyldig post ID:", postGlobalId); clearMapMarker(); return; }
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
    function clearMapMarker() { if (currentMapMarker) { currentMapMarker.setMap(null); currentMapMarker = null; } }
    function showUserPosition() { /* ... (som i versjon #15, uten endringer) ... */ 
        if (!map) { console.warn("Kart ikke klar for brukerposisjon."); return; }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                    if (userPositionMarker) userPositionMarker.setMap(null);
                    userPositionMarker = new google.maps.Marker({
                        position: userPos, map: map, title: "Din Posisjon",
                        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#4285F4", fillOpacity: 1, strokeWeight: 2, strokeColor: "white" }
                    });
                    console.log("Brukerposisjon vist (enkeltvisning):", userPos);
                }, handleGeolocationError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else { console.warn("Geolocation støttes ikke."); }
    }
    function handleGeolocationError(error) { /* ... (som i versjon #15) ... */ 
        let msg = "Posisjonsfeil: ";
        switch (error.code) {
            case error.PERMISSION_DENIED: msg += "Nektet."; break;
            case error.POSITION_UNAVAILABLE: msg += "Utilgjengelig."; break;
            case error.TIMEOUT: msg += "Timeout."; break;
            default: msg += "Ukjent.";
        }
        console.warn(msg);
    }

    // === GPS AUDIO HJELP FUNKSJONER ===
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

        oscillator.type = 'sine'; // Sinusbølge for et rent pip
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime); // Frekvens i Hz (A5)
        gainNode.gain.setValueAtTime(volume * 0.5, audioContext.currentTime); // Juster maks gain for pip

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration / 1000); // Varighet i millisekunder
    }

    function calculateDistance(lat1, lon1, lat2, lon2) { // Haversine formula
        const R = 6371e3; // Jordens radius i meter
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Avstand i meter
    }

    function updateProximityBeeps(position) {
        if (!isGpsAudioEnabled || !currentTeamData || currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            stopProximityBeeps();
            return;
        }

        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const nextPostIndexInSequence = currentTeamData.currentPostArrayIndex;
        const nextPostGlobalId = currentTeamData.postSequence[nextPostIndexInSequence];
        
        if (nextPostGlobalId === undefined || nextPostGlobalId < 1 || nextPostGlobalId > POST_LOCATIONS.length) {
            stopProximityBeeps();
            return;
        }

        const targetLocation = POST_LOCATIONS[nextPostGlobalId - 1];
        const distance = calculateDistance(userLat, userLng, targetLocation.lat, targetLocation.lng);
        console.log(`Avstand til Post ${nextPostGlobalId}: ${distance.toFixed(0)}m`);

        let beepInterval = 0;
        let beepFrequency = 880; // Standard A5
        let beepDuration = 100;  // ms

        if (distance <= 5) {
            beepInterval = 300; // Veldig raskt
            beepFrequency = 1200;
            beepDuration = 80;
        } else if (distance <= 10) {
            beepInterval = 600;
            beepFrequency = 1000;
        } else if (distance <= 25) {
            beepInterval = 1000;
        } else if (distance <= 50) {
            beepInterval = 2000;
        } else if (distance <= 100) {
            beepInterval = 3500;
        }

        if (proximityBeepIntervalId) {
            clearInterval(proximityBeepIntervalId);
            proximityBeepIntervalId = null;
        }

        if (beepInterval > 0) {
            playBeep(beepFrequency, beepDuration, gpsAudioVolumeSlider.valueAsNumber); // Bruk aktuell slider verdi
            proximityBeepIntervalId = setInterval(() => {
                playBeep(beepFrequency, beepDuration, gpsAudioVolumeSlider.valueAsNumber);
            }, beepInterval);
        }
    }

    function startProximityBeeps() {
        if (!navigator.geolocation) {
            console.warn("Geolocation ikke støttet, kan ikke starte nærhetspip.");
            isGpsAudioEnabled = false;
            if(toggleGpsAudioButton) toggleGpsAudioButton.textContent = "🛰️ GPS Av";
            return;
        }
        if (positionWatchId !== null) { // Allerede i gang
            return;
        }
        initializeAudioContext(); // Sørg for at AudioContext er klar
        
        console.log("Starter GPS posisjonssporing for nærhetspip.");
        positionWatchId = navigator.geolocation.watchPosition(
            updateProximityBeeps, // Kaller denne hver gang posisjonen oppdateres
            (error) => {
                handleGeolocationError(error);
                stopProximityBeeps(); // Stopp hvis det er feil med sporingen
                if(toggleGpsAudioButton) toggleGpsAudioButton.textContent = "🛰️ GPS Feil";
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
    }

    function stopProximityBeeps() {
        if (proximityBeepIntervalId) {
            clearInterval(proximityBeepIntervalId);
            proximityBeepIntervalId = null;
        }
        if (positionWatchId !== null) {
            navigator.geolocation.clearWatch(positionWatchId);
            positionWatchId = null;
            console.log("Stoppet GPS posisjonssporing.");
        }
    }

    function setupGpsAudioControls() {
        if (!toggleGpsAudioButton || !gpsAudioVolumeSlider) {
            console.warn("GPS lydkontroll-elementer mangler.");
            if(document.getElementById('gps-audio-controls')) document.getElementById('gps-audio-controls').style.display = 'none';
            return;
        }

        // Last lagrede preferanser
        const savedGpsAudioEnabled = localStorage.getItem('rebusGpsAudioEnabled') === 'true';
        const savedGpsAudioVolume = localStorage.getItem('rebusGpsAudioVolume');

        isGpsAudioEnabled = savedGpsAudioEnabled;
        if (savedGpsAudioVolume !== null) {
            gpsAudioVolume = parseFloat(savedGpsAudioVolume);
            gpsAudioVolumeSlider.value = gpsAudioVolume;
        } else {
            gpsAudioVolumeSlider.value = gpsAudioVolume; // Default
        }
        
        toggleGpsAudioButton.textContent = isGpsAudioEnabled ? "🛰️ GPS På" : "🛰️ GPS Av";
        if (isGpsAudioEnabled && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
            startProximityBeeps(); // Start hvis den var på og spillet er i gang
        }

        toggleGpsAudioButton.addEventListener('click', () => {
            isGpsAudioEnabled = !isGpsAudioEnabled;
            toggleGpsAudioButton.textContent = isGpsAudioEnabled ? "🛰️ GPS På" : "🛰️ GPS Av";
            localStorage.setItem('rebusGpsAudioEnabled', isGpsAudioEnabled);
            if (isGpsAudioEnabled && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
                startProximityBeeps();
            } else {
                stopProximityBeeps();
            }
        });

        gpsAudioVolumeSlider.addEventListener('input', () => {
            gpsAudioVolume = gpsAudioVolumeSlider.valueAsNumber;
            localStorage.setItem('rebusGpsAudioVolume', gpsAudioVolume);
            // Trenger ikke gjøre noe mer her, playBeep vil bruke den nye verdien
        });
    }


    // === KJERNEFUNKSJONER (Oppdateringer for GPS lyd) ===
    function initializeTeam(teamCode) {
        // ... (som før)
        const teamKey = teamCode.trim().toUpperCase();
        const config = TEAM_CONFIG[teamKey];
        teamCodeFeedback.className = 'feedback'; teamCodeFeedback.textContent = '';
        if (config) {
            currentTeamData = { 
                ...config, id: teamKey, currentPostArrayIndex: 0, completedPostsCount: 0, 
                completedGlobalPosts: {}, unlockedPosts: {}
            };
            saveState();
            resetAllPostUIs(); 
            if (backgroundAudio && backgroundAudio.paused) {
                backgroundAudio.play().then(() => { if (playPauseButton) playPauseButton.textContent = '⏸️'; })
                                  .catch(e => console.warn("Musikk auto-start feilet:", e.name, e.message));
            }
            const firstPostInSequence = currentTeamData.postSequence[0];
            showRebusPage(`post-${firstPostInSequence}-page`);
            updateMapMarker(firstPostInSequence); 
            showUserPosition(); 
            if (isGpsAudioEnabled) { // Start beeps for første post hvis aktivert
                startProximityBeeps();
            }
            console.log(`Team ${currentTeamData.name} startet! Post: ${firstPostInSequence}`);
        } else {
            teamCodeFeedback.textContent = 'Ugyldig lagkode!'; teamCodeFeedback.classList.add('error', 'shake');
            setTimeout(() => teamCodeFeedback.classList.remove('shake'), 400);
            if (teamCodeInput) { teamCodeInput.classList.add('shake'); setTimeout(() => teamCodeInput.classList.remove('shake'), 400); teamCodeInput.focus(); teamCodeInput.select(); }
        }
    }
    
    function handleTaskCheck(postNum, userAnswer) {
        // ... (som før)
        const taskInput = document.getElementById(`post-${postNum}-task-input`);
        const feedbackElement = document.getElementById(`feedback-task-${postNum}`);
        let correctTaskAnswer = CORRECT_TASK_ANSWERS[`post${postNum}`];
        let alternativeAnswers = []; 
        if (postNum === "2") { alternativeAnswers.push("STEVE"); } 
        else if (postNum === "6") { alternativeAnswers.push("SYNÅL"); }
        feedbackElement.className = 'feedback'; feedbackElement.textContent = '';
        if (!userAnswer) { /* ... feilhåndtering ... */ 
            feedbackElement.textContent = 'Svar på oppgaven!'; feedbackElement.classList.add('error', 'shake');
            if(taskInput) taskInput.classList.add('shake');
            setTimeout(() => { feedbackElement.classList.remove('shake'); if(taskInput) taskInput.classList.remove('shake'); }, 400);
            return;
        }
        const isCorrectMain = (userAnswer === correctTaskAnswer.toUpperCase());
        const isCorrectAlternative = alternativeAnswers.some(alt => userAnswer === alt.toUpperCase());
        const isFasit = (userAnswer === 'FASIT');
        if (isCorrectMain || isCorrectAlternative || isFasit) {
            /* ... suksesshåndtering ... */
            feedbackElement.textContent = isFasit ? 'FASIT godkjent!' : 'Helt riktig! 👍';
            feedbackElement.classList.add('success');
            if (taskInput) taskInput.disabled = true;
            const taskButton = document.querySelector(`#post-${postNum}-page .check-task-btn`);
            if(taskButton) taskButton.disabled = true;

            if (!currentTeamData.completedGlobalPosts[`post${postNum}`]) {
                currentTeamData.completedGlobalPosts[`post${postNum}`] = true;
                currentTeamData.completedPostsCount++;
            }
            currentTeamData.currentPostArrayIndex++; 
            saveState();
            if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
                if (currentTeamData.currentPostArrayIndex < currentTeamData.postSequence.length) {
                    const nextPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
                    setTimeout(() => {
                        showRebusPage(`post-${nextPostGlobalId}-page`);
                        updateMapMarker(nextPostGlobalId); 
                        // Posisjonssporing (updateProximityBeeps) vil automatisk sikte mot ny post
                    }, 1200);
                } else { /* ... håndter feil i sekvens ... */ 
                    console.warn("Færre enn TOTAL_POSTS, men ingen flere i sekvens. Viser finale.");
                    setTimeout(() => { showRebusPage('finale-page'); clearMapMarker(); stopProximityBeeps(); }, 1200);
                }
            } else { // Alle poster fullført
                setTimeout(() => { showRebusPage('finale-page'); clearMapMarker(); stopProximityBeeps(); }, 1200);
            }
        } else { /* ... feilhåndtering ... */ 
            feedbackElement.textContent = 'Hmm, prøv igjen!'; feedbackElement.classList.add('error', 'shake');
            if(taskInput) {
                taskInput.classList.add('shake');
                setTimeout(() => { taskInput.classList.remove('shake'); }, 400);
                taskInput.focus(); 
                taskInput.select();
            }
            setTimeout(() => { feedbackElement.classList.remove('shake'); }, 400);
        }
    }

    function clearState() {
        // ... (som før)
        localStorage.removeItem('activeTeamData');
        currentTeamData = null;
        resetAllPostUIs();
        clearMapMarker(); 
        if (userPositionMarker) { userPositionMarker.setMap(null); userPositionMarker = null; }
        stopProximityBeeps(); // Stopp også piping ved reset
        // Vurder å resette isGpsAudioEnabled og knappetekst her også, eller la localStorage styre
        // isGpsAudioEnabled = false;
        // if(toggleGpsAudioButton) toggleGpsAudioButton.textContent = "🛰️ GPS Av";
        // localStorage.setItem('rebusGpsAudioEnabled', false);
    }
    
    // === INITIALIZATION ===
    setupMusicControls(); 
    setupGpsAudioControls(); // NYTT: Sett opp GPS lydkontroller

    // ... (Resten av initialiseringen som i versjon #15) ...
    // ... (showRebusPage, showTabContent, saveState, loadState, etc.) ...
    // ... (updateUIAfterLoad, alle event listeners) ...
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
            // Hvis GPS lyd var på og spillet er i gang, start sporing
            if (isGpsAudioEnabled && currentTeamData.completedPostsCount < TOTAL_POSTS) {
                startProximityBeeps();
            }
        }
    } else {
        showTabContent('rebus'); showRebusPage('intro-page'); resetAllPostUIs(); 
    }

    // === EVENT LISTENERS (resten som før, men sørg for at de er her) ===
    if (startWithTeamCodeButton) { startWithTeamCodeButton.addEventListener('click', () => { initializeTeam(teamCodeInput.value); }); } 
    if (teamCodeInput) { teamCodeInput.addEventListener('keypress', function(event) { if (event.key === 'Enter') { event.preventDefault(); if (startWithTeamCodeButton) startWithTeamCodeButton.click(); } }); }
    unlockPostButtons.forEach(button => { button.addEventListener('click', () => { const postNum = button.getAttribute('data-post'); const unlockInput = document.getElementById(`post-${postNum}-unlock-input`); handlePostUnlock(postNum, unlockInput.value.trim().toUpperCase()); }); });
    checkTaskButtons.forEach(button => { button.addEventListener('click', () => { const postNum = button.getAttribute('data-post'); const taskInput = document.getElementById(`post-${postNum}-task-input`); handleTaskCheck(postNum, taskInput.value.trim().toUpperCase()); }); });
    document.querySelectorAll('input[type="text"]').forEach(input => { input.addEventListener('keypress', function(event) { if (event.key === 'Enter') { event.preventDefault(); if (this.id === 'team-code-input') { if(startWithTeamCodeButton) startWithTeamCodeButton.click(); } else if (this.id.includes('-unlock-input')) { const postNum = this.id.split('-')[1]; const unlockButton = document.querySelector(`.unlock-post-btn[data-post="${postNum}"]`); if (unlockButton && !unlockButton.disabled) unlockButton.click(); } else if (this.id.includes('-task-input')) { const postNum = this.id.split('-')[1]; const taskButton = document.querySelector(`.check-task-btn[data-post="${postNum}"]`); if (taskButton && !taskButton.disabled) taskButton.click(); } } }); });
    tabButtons.forEach(button => { button.addEventListener('click', () => { const tabId = button.getAttribute('data-tab'); showTabContent(tabId); if (tabId === 'map' && map && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) { const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex]; const postLocation = POST_LOCATIONS[currentPostGlobalId - 1]; let bounds = new google.maps.LatLngBounds(); if (postLocation) bounds.extend(postLocation); if (userPositionMarker && userPositionMarker.getPosition()) bounds.extend(userPositionMarker.getPosition()); if (!bounds.isEmpty()) { map.fitBounds(bounds); if (map.getZoom() > 17) map.setZoom(17); if (postLocation && (!userPositionMarker || !userPositionMarker.getPosition())) { map.panTo(postLocation); map.setZoom(17); } } else if (postLocation) { map.panTo(postLocation); map.setZoom(17); } } }); });
    devResetButtons.forEach(button => { button.addEventListener('click', () => { if (confirm("Nullstille? (Test)")) { clearState(); showRebusPage('intro-page'); if (teamCodeInput) { teamCodeInput.value = ''; teamCodeInput.disabled = false; } if (teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback'; } if (startWithTeamCodeButton) startWithTeamCodeButton.disabled = false; } }); });
    // (showRebusPage, showTabContent, saveState, loadState, resetPageUI, resetAllPostUIs, handlePostUnlock, updateUIAfterLoad, setupMusicControls er definert tidligere i denne filen)

});
/* Version: #16 */
