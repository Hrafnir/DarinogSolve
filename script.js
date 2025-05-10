/* Version: #10 */
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

    // === GOOGLE MAPS VARIABLES ===
    let map; // Blir Google Map-objektet
    let currentMapMarker; // Holder referansen til den nåværende post-markøren
    const mapElement = document.getElementById('dynamic-map-container');

    // === KONFIGURASJON ===
    const TOTAL_POSTS = 8;

    // Koordinator for postene (lat, lng)
    // REKKERFØLGEN HER MÅ MATCHE POSTNUMMER 1-8
    const POST_LOCATIONS = [
        { lat: 60.8007539616181, lng: 10.646227725129991, title: "Post 1" },    // Post 1
        { lat: 60.80017468739349, lng: 10.64510651928592, title: "Post 2" },    // Post 2
        { lat: 60.80072782302861, lng: 10.644889579638045, title: "Post 3" },    // Post 3
        { lat: 60.80048329479234, lng: 10.643492818098643, title: "Post 4" },    // Post 4
        { lat: 60.80045228531585, lng: 10.642988549931982, title: "Post 5" },    // Post 5
        { lat: 60.7998031467142, lng: 10.643149576741504, title: "Post 6" },    // Post 6
        { lat: 60.7990979034987, lng: 10.64366234869697, title: "Post 7" },    // Post 7
        { lat: 60.79974498905187, lng: 10.64269195029222, title: "Post 8" }     // Post 8
    ];
    // Start og Mål kan legges til her hvis ønskelig for faste markører
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

    // === STATE VARIABLES ===
    let currentTeamData = null;
    
    // === GOOGLE MAPS FUNKSJONER ===
    // Denne funksjonen blir kalt av Google Maps API når det er lastet (pga. callback=initMap i script-taggen)
    window.initMap = function() {
        if (!mapElement) {
            console.error("Kart-elementet #dynamic-map-container ble ikke funnet.");
            return;
        }
        map = new google.maps.Map(mapElement, {
            center: START_LOCATION, // Sentrer kartet på startpunktet
            zoom: 16, // Juster zoom-nivå etter behov
            mapId: 'REBUSLOP_CUSTOM_MAP_ID' // Valgfri: For Cloud-based Maps Styling
        });

        // Valgfritt: Legg til en fast markør for start
        new google.maps.Marker({
            position: START_LOCATION,
            map: map,
            title: START_LOCATION.title,
            // Ikon kan tilpasses her hvis ønskelig
        });
        // Valgfritt: Legg til en fast markør for mål
         new google.maps.Marker({
            position: FINISH_LOCATION,
            map: map,
            title: FINISH_LOCATION.title,
            icon: { // Eksempel på et annet ikon for mål
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
            }
        });

        // Hvis et lag allerede er aktivt når kartet initialiseres, vis deres nåværende post
        if (currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
            const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            updateMapMarker(currentPostGlobalId);
        } else if (currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            // Hvis ferdig, kanskje fjern markør eller vis en spesiell "ferdig"-markør
            clearMapMarker();
        }
    }

    function updateMapMarker(postGlobalId) {
        if (!map) {
            console.warn("Kartet er ikke initialisert ennå. Kan ikke oppdatere markør.");
            return;
        }
        if (postGlobalId < 1 || postGlobalId > POST_LOCATIONS.length) {
            console.error("Ugyldig post ID for kartmarkør:", postGlobalId);
            clearMapMarker(); // Fjern eventuell eksisterende markør
            return;
        }

        const location = POST_LOCATIONS[postGlobalId - 1]; // -1 fordi array er 0-indeksert

        // Fjern forrige markør hvis den finnes
        clearMapMarker();

        // Lag ny markør
        currentMapMarker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: map,
            title: location.title + " (Neste Post!)",
            animation: google.maps.Animation.DROP, // En liten animasjon
            // Du kan bruke et spesielt ikon for neste post
             icon: {
                 url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', // Standard rød prikk
             }
        });

        // Sentrer kartet på den nye markøren
        map.panTo({ lat: location.lat, lng: location.lng });
        // map.setZoom(17); // Valgfritt: juster zoom for å se posten bedre
    }

    function clearMapMarker() {
        if (currentMapMarker) {
            currentMapMarker.setMap(null); // Fjern markøren fra kartet
            currentMapMarker = null;
        }
    }

    // === KJERNEFUNKSJONER (med kartintegrasjon) ===
    // (showRebusPage, showTabContent, saveState, loadState, clearState, resetPageUI, resetAllPostUIs forblir stort sett de samme)
    // Vi må modifisere initializeTeam og handleCorrectAnswer

    function showRebusPage(pageId) {
        pages.forEach(page => page.classList.remove('visible'));
        const nextPage = document.getElementById(pageId);
        if (nextPage) {
            nextPage.classList.add('visible');
            const container = document.querySelector('.container');
            if (container) window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
            resetPageUI(pageId);
        } else {
            console.error("Kunne ikke finne rebus-side med ID:", pageId);
            clearState();
            showRebusPage('intro-page');
        }
    }

    function showTabContent(tabId) {
        tabContents.forEach(content => content.classList.remove('visible'));
        const nextContent = document.getElementById(tabId + '-content');
        if (nextContent) nextContent.classList.add('visible');
        else console.error("Kunne ikke finne tab-innhold med ID:", tabId + '-content');
        
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
        clearMapMarker(); // Tøm også kartmarkøren
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
            if (completed) { feedbackEl.textContent = 'Denne posten er fullført!'; feedbackEl.className = 'feedback success'; }
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
                                  .catch(e => console.warn("Bakgrunnsmusikk auto-start feilet:", e.name, e.message));
            }
            
            const firstPostInSequence = currentTeamData.postSequence[0];
            showRebusPage(`post-${firstPostInSequence}-page`);
            updateMapMarker(firstPostInSequence); // Vis første post på kartet
            console.log(`Team ${currentTeamData.name} startet! Første post: ${firstPostInSequence}`);
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
                    updateMapMarker(nextPostGlobalId); // Oppdater kartet til neste post
                }, 1200);
            } else {
                console.warn("Færre enn TOTAL_POSTS fullført, men ingen flere i sekvens. Viser finale.");
                setTimeout(() => { showRebusPage('finale-page'); clearMapMarker(); }, 1200);
            }
        } else {
            setTimeout(() => { showRebusPage('finale-page'); clearMapMarker(); /* Fjern markør når ferdig */ }, 1200);
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
                if (isCompleted) { feedbackEl.textContent = 'Denne posten er fullført!'; feedbackEl.className = 'feedback success'; }
                else { feedbackEl.textContent = ''; feedbackEl.className = 'feedback'; }
            }
        }
    }

    // === MUSIKK KONTROLL FUNKSJONER ===
    function setupMusicControls() {
        // ... (denne funksjonen forblir som i Versjon #9)
        if (!backgroundAudio || !playPauseButton || !muteUnmuteButton || !volumeSlider) {
            console.warn("Ett eller flere musikk-kontroll elementer mangler.");
            if (backgroundAudio) backgroundAudio.style.display = 'none'; 
            const musicControlsDiv = document.getElementById('music-controls');
            if (musicControlsDiv) musicControlsDiv.style.display = 'none';
            return;
        }

        const savedVolume = localStorage.getItem('rebusMusicVolume');
        const savedMuted = localStorage.getItem('rebusMusicMuted') === 'true';

        if (savedVolume !== null) {
            backgroundAudio.volume = parseFloat(savedVolume);
            volumeSlider.value = parseFloat(savedVolume);
        } else {
            backgroundAudio.volume = 0.5; 
            volumeSlider.value = 0.5;
        }

        backgroundAudio.muted = savedMuted;
        muteUnmuteButton.textContent = savedMuted ? '🔇' : '🔊';

        playPauseButton.addEventListener('click', () => {
            if (backgroundAudio.paused) {
                backgroundAudio.play()
                    .then(() => playPauseButton.textContent = '⏸️')
                    .catch(e => {
                        console.error("Feil ved avspilling av musikk (play):", e.name, e.message);
                    });
            } else {
                backgroundAudio.pause();
                playPauseButton.textContent = '▶️';
            }
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
                backgroundAudio.muted = false;
                muteUnmuteButton.textContent = '🔊';
                localStorage.setItem('rebusMusicMuted', false);
            }
        });
        
        backgroundAudio.load(); 

        backgroundAudio.addEventListener('canplaythrough', () => {
            console.log("Bakgrunnsmusikk kan spilles helt gjennom (event: canplaythrough).");
            if (backgroundAudio.paused) {
                 backgroundAudio.play()
                    .then(() => {
                        if (playPauseButton) playPauseButton.textContent = '⏸️';
                    })
                    .catch(error => {
                        console.warn('Autoplay av bakgrunnsmusikk forhindret (etter canplaythrough):', error.name, error.message);
                        if (playPauseButton) playPauseButton.textContent = '▶️';
                    });
            }
        });

        backgroundAudio.addEventListener('error', (e) => {
            console.error("Feil med audio-elementet (backgroundAudio):", backgroundAudio.error);
            if (playPauseButton) playPauseButton.textContent = '⚠️'; 
            let errText = "En feil oppstod med bakgrunnsmusikken.";
            if (backgroundAudio.error) {
                switch (backgroundAudio.error.code) {
                    case 1 /*MediaError.MEDIA_ERR_ABORTED*/: errText += " Avspilling avbrutt."; break;
                    case 2 /*MediaError.MEDIA_ERR_NETWORK*/: errText += " Nettverksfeil."; break;
                    case 3 /*MediaError.MEDIA_ERR_DECODE*/: errText += " Dekodingsfeil."; break;
                    case 4 /*MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED*/: errText += " Format støttes ikke."; break;
                    default: errText += " Ukjent feil.";
                }
            }
             console.error(errText);
        });
    }

    // === EVENT LISTENERS (GENERELT) ===
    // ... (resten som før)
    if (startWithTeamCodeButton) {
        startWithTeamCodeButton.addEventListener('click', () => {
            initializeTeam(teamCodeInput.value);
        });
    } 
    
    if (teamCodeInput) {
        teamCodeInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (startWithTeamCodeButton) startWithTeamCodeButton.click();
            }
        });
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTabContent(tabId);
            if (tabId === 'map' && map && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
                // Hvis kartet vises og et spill er i gang, panorer til nåværende markør
                const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
                 const location = POST_LOCATIONS[currentPostGlobalId - 1];
                if(location) map.panTo({ lat: location.lat, lng: location.lng });
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

            if (correctCode === undefined) {
                feedbackElement.textContent = 'FEIL: Kode mangler.'; feedbackElement.className = 'feedback error'; return;
            }

            feedbackElement.className = 'feedback'; feedbackElement.textContent = '';

            if (!userAnswer) {
                feedbackElement.textContent = 'Skriv et svar!'; feedbackElement.classList.add('error', 'shake');
                inputElement.classList.add('shake');
                setTimeout(() => { feedbackElement.classList.remove('shake'); inputElement.classList.remove('shake'); }, 400);
                return;
            }

            if (userAnswer === correctCode.toUpperCase() || userAnswer === 'FASIT') {
                feedbackElement.textContent = userAnswer === 'FASIT' ? 'FASIT godkjent!' : 'Helt riktig! 👍';
                feedbackElement.classList.add('success');
                inputElement.disabled = true; button.disabled = true;
                handleCorrectAnswer(postNumberGlobal);
            } else {
                feedbackElement.textContent = 'Hmm, prøv igjen!'; feedbackElement.classList.add('error', 'shake');
                inputElement.classList.add('shake');
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
    
    // === INITIALIZATION ===
    setupMusicControls(); 

    if (loadState()) { 
        showTabContent('rebus');
        if (currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            showRebusPage('finale-page');
            // Ikke nødvendig å oppdatere kartmarkør her siden spillet er over
        } else if (currentTeamData) {
            const currentExpectedPostId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            if (typeof currentExpectedPostId === 'undefined') {
                if(currentTeamData.completedPostsCount >= TOTAL_POSTS) showRebusPage('finale-page');
                else { clearState(); showRebusPage('intro-page'); }
            } else {
                showRebusPage(`post-${currentExpectedPostId}-page`);
                // Kartet vil bli oppdatert av initMap hvis det lastes etter dette,
                // eller vi kan kalle updateMapMarker her hvis kartet allerede er klart.
                // For sikkerhets skyld, la initMap håndtere den første markøren ved lastet state.
            }
        } else { 
            clearState(); showRebusPage('intro-page');
        }
        updateUIAfterLoad();
        if(currentTeamData) console.log(`Gjenopprettet tilstand for Team ${currentTeamData.name}.`);
    } else {
        showTabContent('rebus'); showRebusPage('intro-page'); resetAllPostUIs(); 
    }

}); // Slutt på DOMContentLoaded
/* Version: #10 */
