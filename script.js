/* Version: #9 */
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

    // === CONFIGURATION ===
    const TOTAL_POSTS = 8;

    const TEAM_CONFIG = {
        "SKIPPER": { name: "Team Skipper", startPostId: "post-1-page", postSequence: [1, 2, 3, 4, 5, 6, 7, 8] },
        "KOWALSKI": { name: "Team Kowalski", startPostId: "post-3-page", postSequence: [3, 4, 5, 6, 7, 8, 1, 2] },
        "RICO": { name: "Team Rico", startPostId: "post-5-page", postSequence: [5, 6, 7, 8, 1, 2, 3, 4] },
        "MENIG": { name: "Team Menig", startPostId: "post-7-page", postSequence: [7, 8, 1, 2, 3, 4, 5, 6] }
    };

    const CORRECT_CODES = {
        post1: "4",
        post2: "GRØNN",
        post3: "R",
        post4: "OVAL",
        post5: "3",
        post6: "SYKKEL",
        post7: "SEMENT",
        post8: "VENSTRE"
    };

    // === STATE VARIABLES ===
    let currentTeamData = null;
    
    // === CORE FUNCTIONS ===

    function showRebusPage(pageId) {
        pages.forEach(page => {
            page.classList.remove('visible');
        });
        const nextPage = document.getElementById(pageId);
        if (nextPage) {
            nextPage.classList.add('visible');
            const container = document.querySelector('.container');
            if (container) {
                 window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
            }
            resetPageUI(pageId);
        } else {
            console.error("Kunne ikke finne rebus-side med ID:", pageId);
            clearState();
            showRebusPage('intro-page');
        }
    }

    function showTabContent(tabId) {
        tabContents.forEach(content => {
            content.classList.remove('visible');
        });
        const nextContent = document.getElementById(tabId + '-content');
        if (nextContent) {
            nextContent.classList.add('visible');
        } else {
            console.error("Kunne ikke finne tab-innhold med ID:", tabId + '-content');
        }
        tabButtons.forEach(button => {
            button.classList.remove('active');
            if (button.getAttribute('data-tab') === tabId) {
                button.classList.add('active');
            }
        });
    }

    function saveState() {
        if (currentTeamData) {
            localStorage.setItem('activeTeamData', JSON.stringify(currentTeamData));
        } else {
            localStorage.removeItem('activeTeamData');
        }
    }

    function loadState() {
        const savedData = localStorage.getItem('activeTeamData');
        if (savedData) {
            try {
                currentTeamData = JSON.parse(savedData);
                if (!currentTeamData || typeof currentTeamData.completedPostsCount === 'undefined' || !currentTeamData.postSequence) {
                    console.warn("Ugyldig lagret state, tømmer.");
                    clearState();
                    return false;
                }
                return true;
            } catch (e) {
                console.error("Feil ved parsing av lagret state:", e);
                clearState();
                return false;
            }
        }
        currentTeamData = null;
        return false;
    }

    function clearState() {
        localStorage.removeItem('activeTeamData');
        currentTeamData = null;
        resetAllPostUIs();
    }
    
    function resetPageUI(pageId) {
        if (pageId === 'intro-page' || pageId === 'finale-page') return;

        const postNumberMatch = pageId.match(/post-(\d+)-page/);
        if (!postNumberMatch) return;
        const postNumberGlobal = postNumberMatch[1];

        const inputElement = document.getElementById(`post-${postNumberGlobal}-input`);
        const buttonElement = document.querySelector(`.check-answer-btn[data-post="${postNumberGlobal}"]`);
        const feedbackElement = document.getElementById(`feedback-${postNumberGlobal}`);

        const isCompletedByTeam = currentTeamData && currentTeamData.completedGlobalPosts && currentTeamData.completedGlobalPosts[`post${postNumberGlobal}`];

        if (inputElement) {
            inputElement.disabled = !!isCompletedByTeam;
            if (!isCompletedByTeam) inputElement.value = '';
        }
        if (buttonElement) {
            buttonElement.disabled = !!isCompletedByTeam;
        }
        if (feedbackElement) {
            if (isCompletedByTeam) {
                feedbackElement.textContent = 'Denne posten er fullført!';
                feedbackElement.className = 'feedback success';
            } else {
                feedbackElement.textContent = '';
                feedbackElement.className = 'feedback';
            }
        }
    }
    
    function resetAllPostUIs() {
        for (let i = 1; i <= TOTAL_POSTS; i++) {
            const inputElement = document.getElementById(`post-${i}-input`);
            const buttonElement = document.querySelector(`.check-answer-btn[data-post="${i}"]`);
            const feedbackElement = document.getElementById(`feedback-${i}`);

            if (inputElement) {
                inputElement.disabled = false;
                inputElement.value = '';
            }
            if (buttonElement) {
                buttonElement.disabled = false;
            }
            if (feedbackElement) {
                feedbackElement.textContent = '';
                feedbackElement.className = 'feedback';
            }
        }
        if(teamCodeInput) teamCodeInput.value = '';
        if(teamCodeFeedback) {
            teamCodeFeedback.textContent = '';
            teamCodeFeedback.className = 'feedback';
        }
    }

    function initializeTeam(teamCode) {
        const teamKey = teamCode.trim().toUpperCase();
        const config = TEAM_CONFIG[teamKey];

        teamCodeFeedback.className = 'feedback';
        teamCodeFeedback.textContent = '';

        if (config) {
            currentTeamData = {
                ...config,
                id: teamKey,
                currentPostArrayIndex: 0,
                completedPostsCount: 0,
                completedGlobalPosts: {}
            };
            saveState();
            resetAllPostUIs(); 

            if (backgroundAudio && backgroundAudio.paused) {
                // backgroundAudio.load(); // Sørg for at kildene er lastet
                backgroundAudio.play().then(() => {
                    if (playPauseButton) playPauseButton.textContent = '⏸️';
                }).catch(e => console.warn("Bakgrunnsmusikk kunne ikke starte automatisk etter lagstart:", e.name, e.message));
            }
            
            const firstPostInSequence = currentTeamData.postSequence[0];
            showRebusPage(`post-${firstPostInSequence}-page`);
            console.log(`Team ${currentTeamData.name} startet! Første post: post-${firstPostInSequence}-page`);
        } else {
            teamCodeFeedback.textContent = 'Ugyldig lagkode. Prøv igjen!';
            teamCodeFeedback.classList.add('error', 'shake');
            setTimeout(() => teamCodeFeedback.classList.remove('shake'), 400);
            teamCodeInput.classList.add('shake');
            setTimeout(() => teamCodeInput.classList.remove('shake'), 400);
            teamCodeInput.focus();
            teamCodeInput.select();
        }
    }

    function handleCorrectAnswer(postNumberGlobal) {
        if (!currentTeamData) {
            console.error("Ingen lagdata funnet ved korrekt svar. Går til intro.");
            showRebusPage('intro-page');
            return;
        }

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
                }, 1200);
            } else {
                console.warn("Fullført færre enn TOTAL_POSTS, men ingen flere poster i sekvensen. Viser finale.");
                setTimeout(() => {
                    showRebusPage('finale-page');
                }, 1200);
            }
        } else {
            setTimeout(() => {
                showRebusPage('finale-page');
            }, 1200);
        }
    }

    function updateUIAfterLoad() {
        if (!currentTeamData || !currentTeamData.completedGlobalPosts) {
            resetAllPostUIs();
            return;
        }
        for (let i = 1; i <= TOTAL_POSTS; i++) {
            const postKey = `post${i}`;
            const inputElement = document.getElementById(`post-${i}-input`);
            const buttonElement = document.querySelector(`.check-answer-btn[data-post="${i}"]`);
            const feedbackElement = document.getElementById(`feedback-${i}`);
            
            const isCompleted = currentTeamData.completedGlobalPosts[postKey];

            if (inputElement) inputElement.disabled = !!isCompleted;
            if (buttonElement) buttonElement.disabled = !!isCompleted;
            if (feedbackElement) {
                if (isCompleted) {
                    feedbackElement.textContent = 'Denne posten er fullført!';
                    feedbackElement.className = 'feedback success';
                } else {
                    feedbackElement.textContent = '';
                    feedbackElement.className = 'feedback';
                }
            }
        }
    }

    // === MUSIKK KONTROLL FUNKSJONER ===
    function setupMusicControls() {
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
                // backgroundAudio.load(); // Kan være nødvendig hvis kilden har endret seg dynamisk, men ikke her.
                backgroundAudio.play()
                    .then(() => playPauseButton.textContent = '⏸️')
                    .catch(e => {
                        console.error("Feil ved avspilling av musikk (play):", e.name, e.message);
                        // alert("Kunne ikke spille musikken. Sjekk at filen audio/background_music.mp3 er korrekt og støttet av nettleseren.");
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
        
        // Viktig: Kall load() ETTER at source-elementene er parset av nettleseren
        // og ETTER at event listeners er satt opp.
        // Dette gir nettleseren beskjed om å laste metadata og sjekke kildene.
        backgroundAudio.load(); 

        backgroundAudio.addEventListener('canplaythrough', () => {
            console.log("Bakgrunnsmusikk kan spilles helt gjennom (event: canplaythrough).");
            // Forsøk autoplay her, men kun hvis den er pauset (for å unngå konflikt med brukerklikk)
            if (backgroundAudio.paused) {
                 backgroundAudio.play()
                    .then(() => {
                        if (playPauseButton) playPauseButton.textContent = '⏸️';
                    })
                    .catch(error => {
                        // Ikke vis alert her, da det kan være vanlig autoplay-blokkering
                        console.warn('Autoplay av bakgrunnsmusikk forhindret (etter canplaythrough):', error.name, error.message);
                        if (playPauseButton) playPauseButton.textContent = '▶️';
                    });
            }
        });

        backgroundAudio.addEventListener('error', (e) => {
            console.error("Feil med audio-elementet (backgroundAudio):", backgroundAudio.error);
            if (playPauseButton) playPauseButton.textContent = '⚠️'; 
            // Vurder å gi en mer spesifikk feilmelding basert på backgroundAudio.error.code hvis mulig
            // 1 = MEDIA_ERR_ABORTED, 2 = MEDIA_ERR_NETWORK, 3 = MEDIA_ERR_DECODE, 4 = MEDIA_ERR_SRC_NOT_SUPPORTED
            let errText = "En feil oppstod med bakgrunnsmusikken.";
            if (backgroundAudio.error) {
                switch (backgroundAudio.error.code) {
                    case MediaError.MEDIA_ERR_ABORTED:
                        errText += " Avspilling avbrutt.";
                        break;
                    case MediaError.MEDIA_ERR_NETWORK:
                        errText += " Nettverksfeil under lasting.";
                        break;
                    case MediaError.MEDIA_ERR_DECODE:
                        errText += " Dekodingsfeil, filen kan være korrupt eller i feil format.";
                        break;
                    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                        errText += " Lydformatet støttes ikke eller filen ble ikke funnet.";
                        break;
                    default:
                        errText += " Ukjent feil.";
                }
            }
             console.error(errText); // Logg den mer detaljerte feilen også
            // alert(errText); // Vurder om alert er for påtrengende
        });
    }


    // === EVENT LISTENERS (GENERELT) ===
    // ... (resten av event listeners som før) ...
    if (startWithTeamCodeButton) {
        startWithTeamCodeButton.addEventListener('click', () => {
            initializeTeam(teamCodeInput.value);
        });
    } else {
        console.error("#start-with-team-code-button ikke funnet!");
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
        });
    });

    checkButtons.forEach(button => {
        button.addEventListener('click', () => {
            const postNumberGlobal = button.getAttribute('data-post');
            const inputElement = document.getElementById(`post-${postNumberGlobal}-input`);
            const feedbackElement = document.getElementById(`feedback-${postNumberGlobal}`);

            if (!inputElement || !feedbackElement) {
                console.error(`Input eller feedback mangler for post ${postNumberGlobal}`);
                return;
            }

            const userAnswer = inputElement.value.trim().toUpperCase();
            const correctCodeKey = `post${postNumberGlobal}`;
            const correctCode = CORRECT_CODES[correctCodeKey];

            if (correctCode === undefined) {
                console.warn(`Ingen korrekt kode definert for ${correctCodeKey}`);
                feedbackElement.textContent = 'FEIL: Kode mangler for denne posten.';
                feedbackElement.className = 'feedback error';
                return;
            }

            feedbackElement.className = 'feedback';
            feedbackElement.textContent = '';

            if (!userAnswer) {
                feedbackElement.textContent = 'Du må skrive inn et svar!';
                feedbackElement.classList.add('error', 'shake');
                inputElement.classList.add('shake');
                setTimeout(() => {
                    feedbackElement.classList.remove('shake');
                    inputElement.classList.remove('shake');
                }, 400);
                return;
            }

            if (userAnswer === correctCode.toUpperCase() || userAnswer === 'FASIT') {
                if (userAnswer === 'FASIT') {
                    feedbackElement.textContent = 'FASIT godkjent! Hopper videre...';
                } else {
                    feedbackElement.textContent = 'Helt riktig! 👍 Bra jobba!';
                }
                feedbackElement.classList.add('success');
                inputElement.disabled = true;
                button.disabled = true;

                handleCorrectAnswer(postNumberGlobal);

            } else {
                feedbackElement.textContent = 'Hmm, det stemmer ikke helt. Prøv igjen!';
                feedbackElement.classList.add('error', 'shake');
                inputElement.classList.add('shake');
                setTimeout(() => {
                    feedbackElement.classList.remove('shake');
                    inputElement.classList.remove('shake');
                }, 400);
                inputElement.focus();
                inputElement.select();
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
                if (correspondingButton && !correspondingButton.disabled) {
                    correspondingButton.click();
                }
            }
        });
    });

    devResetButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (confirm("Er du sikker på at du vil nullstille og gå tilbake til start?\n(Dette er en testfunksjon)")) {
                clearState();
                showRebusPage('intro-page');
                if (teamCodeInput) {
                    teamCodeInput.value = '';
                    teamCodeInput.disabled = false;
                }
                if (teamCodeFeedback) {
                    teamCodeFeedback.textContent = '';
                    teamCodeFeedback.className = 'feedback';
                }
                 if (startWithTeamCodeButton) {
                    startWithTeamCodeButton.disabled = false;
                }
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
                console.warn("Ugyldig currentExpectedPostId ved load, viser finale eller intro.");
                if(currentTeamData.completedPostsCount >= TOTAL_POSTS) {
                    showRebusPage('finale-page');
                } else {
                    clearState();
                    showRebusPage('intro-page');
                }
            } else {
                showRebusPage(`post-${currentExpectedPostId}-page`);
            }
        } else { 
            clearState();
            showRebusPage('intro-page');
        }
        updateUIAfterLoad();
        if(currentTeamData) console.log(`Gjenopprettet tilstand for Team ${currentTeamData.name}. Fullførte: ${currentTeamData.completedPostsCount}. Neste post index: ${currentTeamData.currentPostArrayIndex}`);
    } else {
        showTabContent('rebus');
        showRebusPage('intro-page');
        resetAllPostUIs(); 
    }

}); // Slutt på DOMContentLoaded
/* Version: #9 */
