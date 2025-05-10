/* Version: #12 */
document.addEventListener('DOMContentLoaded', () => {
    // === HTML ELEMENT REFERENCES ===
    const teamCodeInput = document.getElementById('team-code-input');
    const startWithTeamCodeButton = document.getElementById('start-with-team-code-button');
    const teamCodeFeedback = document.getElementById('team-code-feedback');

    const pages = document.querySelectorAll('#rebus-content .page');
    const checkButtons = document.querySelectorAll('.check-answer-btn');
    const allInputs = document.querySelectorAll('input[type="text"]');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const devResetButtons = document.querySelectorAll('.dev-reset-button');

    const backgroundAudio = document.getElementById('background-audio');
    const playPauseButton = document.getElementById('play-pause-button');
    const muteUnmuteButton = document.getElementById('mute-unmute-button');
    const volumeSlider = document.getElementById('volume-slider');
    
    const mapElement = document.getElementById('dynamic-map-container');

    // === GOOGLE MAPS VARIABLES ===
    let map;
    let currentMapMarker;
    let userPositionMarker; 

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

    const CORRECT_CODES = {
        post1: "4", post2: "GRØNN", post3: "R", post4: "OVAL",
        post5: "3", post6: "SYKKEL", post7: "SEMENT", post8: "VENSTRE"
    };

    let currentTeamData = null;
    
    // === GOOGLE MAPS FUNKSJONER ===
    window.initMap = function() {
        if (!mapElement) {
            console.error("Kart-element #dynamic-map-container ikke funnet.");
            return;
        }
        map = new google.maps.Map(mapElement, {
            center: START_LOCATION,
            zoom: 16,
            mapId: 'c6a4f7dc5c6423aa4e76e70d' // DIN MAP ID ER SATT INN HER
            // Hvis du ikke vil bruke cloud styling, kommenter ut mapId og bruk styles:
            /*
            styles: [ 
                { featureType: "poi", stylers: [{ visibility: "off" }] },
                // Flere stiler her for å fjerne andre ting om nødvendig
            ]
            */
        });

        new google.maps.Marker({ position: START_LOCATION, map: map, title: START_LOCATION.title });
        new google.maps.Marker({ position: FINISH_LOCATION, map: map, title: FINISH_LOCATION.title, icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }});

        if (currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
            const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            updateMapMarker(currentPostGlobalId);
        } else if (currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            clearMapMarker();
        }
        showUserPosition();
    }

    function updateMapMarker(postGlobalId) {
        if (!map) { console.warn("Kart ikke initialisert."); return; }
        if (postGlobalId < 1 || postGlobalId > POST_LOCATIONS.length) { console.error("Ugyldig post ID:", postGlobalId); clearMapMarker(); return; }
        const location = POST_LOCATIONS[postGlobalId - 1];
        clearMapMarker();
        currentMapMarker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: location.title + " (Neste Post!)",
            animation: google.maps.Animation.DROP,
            icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
        });
        map.panTo({ lat: location.lat, lng: location.lng });
    }

    function clearMapMarker() {
        if (currentMapMarker) { currentMapMarker.setMap(null); currentMapMarker = null; }
    }

    // === GPS / BRUKERPOSISJON FUNKSJONER ===
    function showUserPosition() {
        if (!map) { console.warn("Kart ikke klar for brukerposisjon."); return; }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userPos = { lat: position.coords.latitude, lng: position.coords.longitude };
                    if (userPositionMarker) userPositionMarker.setMap(null);
                    userPositionMarker = new google.maps.Marker({
                        position: userPos,
                        map: map,
                        title: "Din Posisjon",
                        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: "#4285F4", fillOpacity: 1, strokeWeight: 2, strokeColor: "white" }
                    });
                    console.log("Brukerposisjon vist:", userPos);
                },
                handleGeolocationError,
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            console.warn("Geolocation støttes ikke av denne nettleseren.");
        }
    }

    function handleGeolocationError(error) {
        let errorMessage = "Feil ved henting av posisjon: ";
        switch (error.code) {
            case error.PERMISSION_DENIED: errorMessage += "Bruker nektet."; break;
            case error.POSITION_UNAVAILABLE: errorMessage += "Utilgjengelig."; break;
            case error.TIMEOUT: errorMessage += "Timeout."; break;
            default: errorMessage += "Ukjent feil.";
        }
        console.warn(errorMessage);
    }

    // === KJERNEFUNKSJONER ===
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
                currentTeamData = JSON.parse(savedData);
                if (!currentTeamData || typeof currentTeamData.completedPostsCount === 'undefined' || !currentTeamData.postSequence) {
                    clearState(); return false;
                }
                return true;
            } catch (e) { clearState(); return false; }
        }
        currentTeamData = null; return false;
    }

    function clearState() {
        localStorage.removeItem('activeTeamData');
        currentTeamData = null;
        resetAllPostUIs();
        clearMapMarker(); 
        if (userPositionMarker) { userPositionMarker.setMap(null); userPositionMarker = null; }
    }
    
    function resetPageUI(pageId) {
        if (pageId === 'intro-page' || pageId === 'finale-page') return;
        const postNumberMatch = pageId.match(/post-(\d+)-page/);
        if (!postNumberMatch) return;
        const postNumberGlobal = postNumberMatch[1];
        const inputEl = document.getElementById(`post-${postNumberGlobal}-input`);
        const btnEl = document.querySelector(`.check-answer-btn[data-post="${postNumberGlobal}"]`);
        const feedbackEl = document.getElementById(`feedback-${postNumberGlobal}`);
        const completed = currentTeamData?.completedGlobalPosts?.[`post${postNumberGlobal}`];
        if (inputEl) { inputEl.disabled = !!completed; if (!completed) inputEl.value = ''; }
        if (btnEl) btnEl.disabled = !!completed;
        if (feedbackEl) {
            if (completed) { feedbackEl.textContent = 'Fullført!'; feedbackEl.className = 'feedback success'; }
            else { feedbackEl.textContent = ''; feedbackEl.className = 'feedback'; }
        }
    }
    
    function resetAllPostUIs() {
        for (let i = 1; i <= TOTAL_POSTS; i++) {
            const inputEl = document.getElementById(`post-${i}-input`);
            const btnEl = document.querySelector(`.check-answer-btn[data-post="${i}"]`);
            const feedbackEl = document.getElementById(`feedback-${i}`);
            if (inputEl) { inputEl.disabled = false; inputEl.value = ''; }
            if (btnEl) btnEl.disabled = false;
            if (feedbackEl) { feedbackEl.textContent = ''; feedbackEl.className = 'feedback'; }
        }
        if(teamCodeInput) teamCodeInput.value = '';
        if(teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback';}
    }

    function initializeTeam(teamCode) {
        const teamKey = teamCode.trim().toUpperCase();
        const config = TEAM_CONFIG[teamKey];
        teamCodeFeedback.className = 'feedback'; teamCodeFeedback.textContent = '';
        if (config) {
            currentTeamData = { ...config, id: teamKey, currentPostArrayIndex: 0, completedPostsCount: 0, completedGlobalPosts: {} };
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
            console.log(`Team ${currentTeamData.name} startet! Post: ${firstPostInSequence}`);
        } else {
            teamCodeFeedback.textContent = 'Ugyldig lagkode!'; teamCodeFeedback.classList.add('error', 'shake');
            setTimeout(() => teamCodeFeedback.classList.remove('shake'), 400);
            if (teamCodeInput) { teamCodeInput.classList.add('shake'); setTimeout(() => teamCodeInput.classList.remove('shake'), 400); teamCodeInput.focus(); teamCodeInput.select(); }
        }
    }

    function handleCorrectAnswer(postNumberGlobal) {
        if (!currentTeamData) { showRebusPage('intro-page'); return; }
        if (!currentTeamData.completedGlobalPosts[`post${postNumberGlobal}`]) {
            currentTeamData.completedGlobalPosts[`post${postNumberGlobal}`] = true;
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
                }, 1200);
            } else {
                console.warn("Færre enn TOTAL_POSTS, men ingen flere i sekvens. Viser finale.");
                setTimeout(() => { showRebusPage('finale-page'); clearMapMarker(); }, 1200);
            }
        } else {
            setTimeout(() => { showRebusPage('finale-page'); clearMapMarker(); }, 1200);
        }
    }

    function updateUIAfterLoad() {
        if (!currentTeamData || !currentTeamData.completedGlobalPosts) { resetAllPostUIs(); return; }
        for (let i = 1; i <= TOTAL_POSTS; i++) {
            const postKey = `post${i}`;
            const inputEl = document.getElementById(`post-${i}-input`);
            const btnEl = document.querySelector(`.check-answer-btn[data-post="${i}"]`);
            const feedbackEl = document.getElementById(`feedback-${i}`);
            const isCompleted = currentTeamData.completedGlobalPosts[postKey];
            if (inputEl) inputEl.disabled = !!isCompleted;
            if (btnEl) btnEl.disabled = !!isCompleted;
            if (feedbackEl) {
                if (isCompleted) { feedbackEl.textContent = 'Fullført!'; feedbackEl.className = 'feedback success'; }
                else { feedbackEl.textContent = ''; feedbackEl.className = 'feedback'; }
            }
        }
    }

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
    
    if (startWithTeamCodeButton) {
        startWithTeamCodeButton.addEventListener('click', () => { initializeTeam(teamCodeInput.value); });
    } 
    if (teamCodeInput) {
        teamCodeInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') { event.preventDefault(); if (startWithTeamCodeButton) startWithTeamCodeButton.click(); }
        });
    }
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTabContent(tabId);
            if (tabId === 'map' && map && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
                const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
                const postLocation = POST_LOCATIONS[currentPostGlobalId - 1];
                let bounds = new google.maps.LatLngBounds();
                if (postLocation) bounds.extend(postLocation);
                if (userPositionMarker && userPositionMarker.getPosition()) bounds.extend(userPositionMarker.getPosition());
                
                if (!bounds.isEmpty()) { // Sjekk om bounds har noen punkter
                    map.fitBounds(bounds);
                    if (map.getZoom() > 17) map.setZoom(17); // Unngå for mye zoom
                    // Hvis bare ett punkt i bounds (f.eks. kun postLocation), panorer i stedet for fitBounds
                    if (postLocation && (!userPositionMarker || !userPositionMarker.getPosition())) {
                        map.panTo(postLocation);
                        map.setZoom(17); // Sett en passende zoom for enkeltpunkt
                    }
                } else if (postLocation) { // Fallback hvis bounds er tom, men vi har postLocation
                     map.panTo(postLocation);
                     map.setZoom(17);
                }
            }
        });
    });
    checkButtons.forEach(button => {
        button.addEventListener('click', () => {
            const postNumberGlobal = button.getAttribute('data-post');
            const inputElement = document.getElementById(`post-${postNumberGlobal}-input`);
            const feedbackElement = document.getElementById(`feedback-${postNumberGlobal}`);
            if (!inputElement || !feedbackElement) { return; }
            const userAnswer = inputElement.value.trim().toUpperCase();
            const correctCodeKey = `post${postNumberGlobal}`;
            const correctCode = CORRECT_CODES[correctCodeKey];
            if (correctCode === undefined) { feedbackElement.textContent = 'FEIL: Kode mangler.'; feedbackElement.className = 'feedback error'; return; }
            feedbackElement.className = 'feedback'; feedbackElement.textContent = '';
            if (!userAnswer) {
                feedbackElement.textContent = 'Skriv et svar!'; feedbackElement.classList.add('error', 'shake'); inputElement.classList.add('shake');
                setTimeout(() => { feedbackElement.classList.remove('shake'); inputElement.classList.remove('shake'); }, 400); return;
            }
            if (userAnswer === correctCode.toUpperCase() || userAnswer === 'FASIT') {
                feedbackElement.textContent = userAnswer === 'FASIT' ? 'FASIT godkjent!' : 'Helt riktig! 👍';
                feedbackElement.classList.add('success'); inputElement.disabled = true; button.disabled = true;
                handleCorrectAnswer(postNumberGlobal);
            } else {
                feedbackElement.textContent = 'Hmm, prøv igjen!'; feedbackElement.classList.add('error', 'shake'); inputElement.classList.add('shake');
                setTimeout(() => { feedbackElement.classList.remove('shake'); inputElement.classList.remove('shake'); }, 400);
                inputElement.focus(); inputElement.select();
            }
        });
    });
    allInputs.forEach(input => {
        if (input.id === 'team-code-input') return;
        input.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const postNumber = this.id.split('-')[1];
                const correspondingButton = document.querySelector(`.check-answer-btn[data-post="${postNumber}"]`);
                if (correspondingButton && !correspondingButton.disabled) correspondingButton.click();
            }
        });
    });
    devResetButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (confirm("Nullstille og gå til start? (Test)")) {
                clearState(); showRebusPage('intro-page');
                if (teamCodeInput) { teamCodeInput.value = ''; teamCodeInput.disabled = false; }
                if (teamCodeFeedback) { teamCodeFeedback.textContent = ''; teamCodeFeedback.className = 'feedback'; }
                if (startWithTeamCodeButton) startWithTeamCodeButton.disabled = false;
            }
        });
    });
    
    setupMusicControls(); 
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
        if(currentTeamData) console.log(`Gjenopprettet tilstand for Team ${currentTeamData.name}.`);
    } else {
        showTabContent('rebus'); showRebusPage('intro-page'); resetAllPostUIs(); 
    }

});
/* Version: #12 */
