/* Version: #14 */
document.addEventListener('DOMContentLoaded', () => {
    // === HTML ELEMENT REFERENCES ===
    const teamCodeInput = document.getElementById('team-code-input');
    const startWithTeamCodeButton = document.getElementById('start-with-team-code-button');
    const teamCodeFeedback = document.getElementById('team-code-feedback');

    const pages = document.querySelectorAll('#rebus-content .page');
    // Knappene hentes nå mer spesifikt
    const unlockPostButtons = document.querySelectorAll('.unlock-post-btn');
    const checkTaskButtons = document.querySelectorAll('.check-task-btn');
    // allInputs vil fortsatt fange opp alle, noe som er greit for Enter-key handler

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

    const POST_LOCATIONS = [ /* ... (som i versjon #13) ... */
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

    const TEAM_CONFIG = { /* ... (som i versjon #13) ... */
        "SKIPPER": { name: "Team Skipper", startPostId: "post-1-page", postSequence: [1, 2, 3, 4, 5, 6, 7, 8] },
        "KOWALSKI": { name: "Team Kowalski", startPostId: "post-3-page", postSequence: [3, 4, 5, 6, 7, 8, 1, 2] },
        "RICO": { name: "Team Rico", startPostId: "post-5-page", postSequence: [5, 6, 7, 8, 1, 2, 3, 4] },
        "MENIG": { name: "Team Menig", startPostId: "post-7-page", postSequence: [7, 8, 1, 2, 3, 4, 5, 6] }
    };

    // NY: Kodeord for å låse opp hver post
    const POST_UNLOCK_CODES = {
        post1: "SKATT",
        post2: "KART",
        post3: "KOMPASS",
        post4: "EVENTYR",
        post5: "MYSTERIE",
        post6: "HEMMELIG",
        post7: "OPPDRAG",
        post8: "FINN"
    };

    // ENDRET: Svar på selve oppgavene (etter at posten er låst opp)
    const CORRECT_TASK_ANSWERS = {
        post1: "KART",
        post2: "MARCUS", // Husk å tilpasse hvis du bruker et annet bilde
        post3: "TRYMSKODE", // Kodeordet Trym gir dem
        post4: "KLOKKA",
        post5: "PIKACHU", // Husk å tilpasse hvis du bruker et annet bilde
        post6: "NÅL", // Eller SYNÅL - vi kan tillate begge
        post7: "BLÅ",   // Husk å tilpasse til din faktiske observasjonsoppgave
        post8: "SVAMP"
    };

    let currentTeamData = null; // Vil også inneholde { unlockedPosts: {post1: true, ...} }
    
    // === GOOGLE MAPS FUNKSJONER ===
    // ... (initMap, updateMapMarker, clearMapMarker, showUserPosition, handleGeolocationError som i versjon #13) ...
    window.initMap = function() {
        if (!mapElement) { console.error("Kart-element #dynamic-map-container ikke funnet."); return; }
        const mapStyles = [ { featureType: "all", elementType: "labels", stylers: [{ visibility: "off" }] } ];
        map = new google.maps.Map(mapElement, {
            center: START_LOCATION, zoom: 17, mapTypeId: google.maps.MapTypeId.SATELLITE, 
            styles: mapStyles, // Eller bruk din mapId: 'c6a4f7dc5c6423aa4e76e70d',
            disableDefaultUI: false, streetViewControl: false, fullscreenControl: true,
            mapTypeControlOptions: { style: google.maps.MapTypeControlStyle.DROPDOWN_MENU, mapTypeIds: [google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.HYBRID] }
        });
        new google.maps.Marker({ position: START_LOCATION, map: map, title: START_LOCATION.title });
        new google.maps.Marker({ position: FINISH_LOCATION, map: map, title: FINISH_LOCATION.title, icon: { url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' }});
        if (currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
            const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            updateMapMarker(currentPostGlobalId);
        } else if (currentTeamData && currentTeamData.completedPostsCount >= TOTAL_POSTS) { clearMapMarker(); }
        showUserPosition();
    }
    function updateMapMarker(postGlobalId) { /* ... (som før) ... */ 
        if (!map) { console.warn("Kart ikke initialisert."); return; }
        if (postGlobalId < 1 || postGlobalId > POST_LOCATIONS.length) { console.error("Ugyldig post ID:", postGlobalId); clearMapMarker(); return; }
        const location = POST_LOCATIONS[postGlobalId - 1];
        clearMapMarker();
        currentMapMarker = new google.maps.Marker({
            position: { lat: location.lat, lng: location.lng }, map: map, title: location.title + " (Neste Post!)",
            animation: google.maps.Animation.DROP, icon: { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png' }
        });
        map.panTo({ lat: location.lat, lng: location.lng });
        if (map.getZoom() < 17) map.setZoom(17);
    }
    function clearMapMarker() { if (currentMapMarker) { currentMapMarker.setMap(null); currentMapMarker = null; } }
    function showUserPosition() { /* ... (som før) ... */ 
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
                    console.log("Brukerposisjon vist:", userPos);
                }, handleGeolocationError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else { console.warn("Geolocation støttes ikke."); }
    }
    function handleGeolocationError(error) { /* ... (som før) ... */ 
        let msg = "Posisjonsfeil: ";
        switch (error.code) {
            case error.PERMISSION_DENIED: msg += "Nektet."; break;
            case error.POSITION_UNAVAILABLE: msg += "Utilgjengelig."; break;
            case error.TIMEOUT: msg += "Timeout."; break;
            default: msg += "Ukjent.";
        }
        console.warn(msg);
    }

    // === KJERNEFUNKSJONER ===
    function showRebusPage(pageId) {
        pages.forEach(page => page.classList.remove('visible'));
        const nextPage = document.getElementById(pageId);
        if (nextPage) {
            nextPage.classList.add('visible');
            const container = document.querySelector('.container');
            if (container) window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
            resetPageUI(pageId); // Viktig for å vise riktig seksjon (unlock/task)
        } else {
            console.error("Side ikke funnet:", pageId); clearState(); showRebusPage('intro-page');
        }
    }

    function showTabContent(tabId) { /* ... (som før) ... */ 
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
                if (!currentTeamData || typeof currentTeamData.completedPostsCount === 'undefined' || !currentTeamData.postSequence || !currentTeamData.unlockedPosts) { // Sjekk også unlockedPosts
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
        const postNum = postNumberMatch[1];
        
        const unlockSection = document.querySelector(`#post-${postNum}-page .post-unlock-section`);
        const taskSection = document.querySelector(`#post-${postNum}-page .post-task-section`);
        const unlockInput = document.getElementById(`post-${postNum}-unlock-input`);
        const unlockButton = document.querySelector(`#post-${postNum}-page .unlock-post-btn`);
        const unlockFeedback = document.getElementById(`feedback-unlock-${postNum}`);
        const taskInput = document.getElementById(`post-${postNum}-task-input`);
        const taskButton = document.querySelector(`#post-${postNum}-page .check-task-btn`);
        const taskFeedback = document.getElementById(`feedback-task-${postNum}`);

        const isPostUnlocked = currentTeamData?.unlockedPosts?.[`post${postNum}`];
        const isTaskCompleted = currentTeamData?.completedGlobalPosts?.[`post${postNum}`];

        if (unlockSection && taskSection) {
            if (isTaskCompleted) { // Oppgave fullført, vis kun oppgaveseksjon som "disabled"
                unlockSection.style.display = 'none';
                taskSection.style.display = 'block';
                if (taskInput) { taskInput.disabled = true; /* taskInput.value = 'Fullført'; Kanskje ikke nødvendig */ }
                if (taskButton) taskButton.disabled = true;
                if (taskFeedback) { taskFeedback.textContent = 'Oppgave fullført!'; taskFeedback.className = 'feedback success'; }
            } else if (isPostUnlocked) { // Post låst opp, men oppgave ikke fullført
                unlockSection.style.display = 'none';
                taskSection.style.display = 'block';
                if (taskInput) { taskInput.disabled = false; taskInput.value = ''; }
                if (taskButton) taskButton.disabled = false;
                if (taskFeedback) { taskFeedback.textContent = ''; taskFeedback.className = 'feedback'; }
            } else { // Post ikke låst opp ennå
                unlockSection.style.display = 'block';
                taskSection.style.display = 'none';
                if (unlockInput) { unlockInput.disabled = false; unlockInput.value = ''; }
                if (unlockButton) unlockButton.disabled = false;
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

            if(unlockSection) unlockSection.style.display = 'block';
            if(taskSection) taskSection.style.display = 'none';
            if(unlockInput) { unlockInput.value = ''; unlockInput.disabled = false; }
            if(unlockButton) unlockButton.disabled = false;
            if(unlockFeedback) { unlockFeedback.textContent = ''; unlockFeedback.className = 'feedback'; }
            if(taskInput) { taskInput.value = ''; taskInput.disabled = false; }
            if(taskButton) taskButton.disabled = false;
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
            currentTeamData = { 
                ...config, 
                id: teamKey, 
                currentPostArrayIndex: 0, 
                completedPostsCount: 0, 
                completedGlobalPosts: {}, // For selve oppgavene
                unlockedPosts: {}        // NY: For å spore opplåste poster
            };
            saveState();
            resetAllPostUIs(); 
            if (backgroundAudio && backgroundAudio.paused) {
                backgroundAudio.play().then(() => { if (playPauseButton) playPauseButton.textContent = '⏸️'; })
                                  .catch(e => console.warn("Musikk auto-start feilet:", e.name, e.message));
            }
            const firstPostInSequence = currentTeamData.postSequence[0];
            showRebusPage(`post-${firstPostInSequence}-page`); // resetPageUI vil håndtere visning av unlock/task
            updateMapMarker(firstPostInSequence); 
            showUserPosition(); 
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
            feedbackElement.textContent = 'Skriv inn kodeordet!';
            feedbackElement.classList.add('error', 'shake');
            unlockInput.classList.add('shake');
            setTimeout(() => { feedbackElement.classList.remove('shake'); unlockInput.classList.remove('shake'); }, 400);
            return;
        }

        if (userAnswer === correctUnlockCode.toUpperCase() || userAnswer === 'ÅPNE') { // 'ÅPNE' som en fasit for opplåsing
            feedbackElement.textContent = 'Post låst opp! Her er oppgaven:';
            feedbackElement.classList.add('success');
            if (unlockInput) unlockInput.disabled = true;
            document.querySelector(`#post-${postNum}-page .unlock-post-btn`).disabled = true;

            currentTeamData.unlockedPosts[`post${postNum}`] = true;
            saveState();
            
            setTimeout(() => {
                resetPageUI(`post-${postNum}-page`); // Viser oppgaveseksjonen
            }, 800);

        } else {
            feedbackElement.textContent = 'Feil kodeord for å låse opp posten. Prøv igjen!';
            feedbackElement.classList.add('error', 'shake');
            unlockInput.classList.add('shake');
            setTimeout(() => { feedbackElement.classList.remove('shake'); unlockInput.classList.remove('shake'); }, 400);
            unlockInput.focus(); unlockInput.select();
        }
    }

    function handleTaskCheck(postNum, userAnswer) {
        const taskInput = document.getElementById(`post-${postNum}-task-input`);
        const feedbackElement = document.getElementById(`feedback-task-${postNum}`);
        let correctTaskAnswer = CORRECT_TASK_ANSWERS[`post${postNum}`];
        let alternativeAnswer = null;

        if (postNum === "6") { // Spesialhåndtering for Post 6 (NÅL/SYNÅL)
            alternativeAnswer = "SYNÅL";
        }

        feedbackElement.className = 'feedback'; feedbackElement.textContent = '';

        if (!userAnswer) {
            feedbackElement.textContent = 'Du må svare på oppgaven!';
            feedbackElement.classList.add('error', 'shake');
            taskInput.classList.add('shake');
            setTimeout(() => { feedbackElement.classList.remove('shake'); taskInput.classList.remove('shake'); }, 400);
            return;
        }

        const isCorrect = (userAnswer === correctTaskAnswer.toUpperCase()) || 
                          (alternativeAnswer && userAnswer === alternativeAnswer.toUpperCase()) ||
                          userAnswer === 'FASIT';

        if (isCorrect) {
            feedbackElement.textContent = userAnswer === 'FASIT' ? 'FASIT godkjent!' : 'Helt riktig! 👍 Bra jobba!';
            feedbackElement.classList.add('success');
            if (taskInput) taskInput.disabled = true;
            document.querySelector(`#post-${postNum}-page .check-task-btn`).disabled = true;

            // Her kaller vi den originale "handleCorrectAnswer" som håndterer progresjon til neste post
            // Dette skjer NÅR selve oppgaven er løst, ikke bare når posten låses opp.
            if (!currentTeamData.completedGlobalPosts[`post${postNum}`]) { // For å unngå dobbelttelling hvis de bruker fasit flere ganger
                currentTeamData.completedGlobalPosts[`post${postNum}`] = true;
                currentTeamData.completedPostsCount++;
            }
            currentTeamData.currentPostArrayIndex++; // Gå til neste i sekvensen
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

        } else {
            feedbackElement.textContent = 'Hmm, det stemmer ikke helt. Prøv igjen!';
            feedbackElement.classList.add('error', 'shake');
            taskInput.classList.add('shake');
            setTimeout(() => { feedbackElement.classList.remove('shake'); taskInput.classList.remove('shake'); }, 400);
            taskInput.focus(); taskInput.select();
        }
    }
    
    function updateUIAfterLoad() { /* ... (som før, men resetPageUI håndterer nå unlock/task state) ... */ 
        if (!currentTeamData) { resetAllPostUIs(); return; } // Hvis ingen lagdata, resettes alt.
        // Gå gjennom alle poster og sett UI basert på lagret tilstand
        for (let i = 1; i <= TOTAL_POSTS; i++) {
            resetPageUI(`post-${i}-page`); // La resetPageUI håndtere logikken
        }
    }

    function setupMusicControls() { /* ... (som før) ... */ 
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
    
    // === EVENT LISTENERS (GENERELT) ===
    if (startWithTeamCodeButton) {
        startWithTeamCodeButton.addEventListener('click', () => { initializeTeam(teamCodeInput.value); });
    } 
    if (teamCodeInput) {
        teamCodeInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') { event.preventDefault(); if (startWithTeamCodeButton) startWithTeamCodeButton.click(); }
        });
    }

    unlockPostButtons.forEach(button => {
        button.addEventListener('click', () => {
            const postNum = button.getAttribute('data-post');
            const unlockInput = document.getElementById(`post-${postNum}-unlock-input`);
            handlePostUnlock(postNum, unlockInput.value.trim().toUpperCase());
        });
    });

    checkTaskButtons.forEach(button => {
        button.addEventListener('click', () => {
            const postNum = button.getAttribute('data-post');
            const taskInput = document.getElementById(`post-${postNum}-task-input`);
            handleTaskCheck(postNum, taskInput.value.trim().toUpperCase());
        });
    });
    
    // Enter-key for alle relevante inputfelt
    document.querySelectorAll('input[type="text"]').forEach(input => {
        input.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (this.id === 'team-code-input') {
                    if(startWithTeamCodeButton) startWithTeamCodeButton.click();
                } else if (this.id.includes('-unlock-input')) {
                    const postNum = this.id.split('-')[1];
                    const unlockButton = document.querySelector(`.unlock-post-btn[data-post="${postNum}"]`);
                    if (unlockButton && !unlockButton.disabled) unlockButton.click();
                } else if (this.id.includes('-task-input')) {
                    const postNum = this.id.split('-')[1];
                    const taskButton = document.querySelector(`.check-task-btn[data-post="${postNum}"]`);
                    if (taskButton && !taskButton.disabled) taskButton.click();
                }
            }
        });
    });

    tabButtons.forEach(button => { /* ... (som før, med bounds-sjekk) ... */ 
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            showTabContent(tabId);
            if (tabId === 'map' && map && currentTeamData && currentTeamData.completedPostsCount < TOTAL_POSTS) {
                const currentPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
                const postLocation = POST_LOCATIONS[currentPostGlobalId - 1];
                let bounds = new google.maps.LatLngBounds();
                if (postLocation) bounds.extend(postLocation);
                if (userPositionMarker && userPositionMarker.getPosition()) bounds.extend(userPositionMarker.getPosition());
                if (!bounds.isEmpty()) { 
                    map.fitBounds(bounds);
                    if (map.getZoom() > 17) map.setZoom(17); 
                    if (postLocation && (!userPositionMarker || !userPositionMarker.getPosition())) { map.panTo(postLocation); map.setZoom(17); }
                } else if (postLocation) { map.panTo(postLocation); map.setZoom(17); }
            }
        });
    });
    
    devResetButtons.forEach(button => { /* ... (som før) ... */ 
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
        } else if (currentTeamData) {
            const currentExpectedPostId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            if (typeof currentExpectedPostId === 'undefined') {
                if(currentTeamData.completedPostsCount >= TOTAL_POSTS) showRebusPage('finale-page');
                else { clearState(); showRebusPage('intro-page'); }
            } else {
                showRebusPage(`post-${currentExpectedPostId}-page`); // resetPageUI vil vise riktig seksjon
            }
        } else { 
            clearState(); showRebusPage('intro-page');
        }
        updateUIAfterLoad(); // Sørger for at UI for alle poster er korrekt
        if(currentTeamData) console.log(`Gjenopprettet tilstand for Team ${currentTeamData.name}.`);
    } else {
        showTabContent('rebus'); showRebusPage('intro-page'); resetAllPostUIs(); 
    }

});
/* Version: #14 */
