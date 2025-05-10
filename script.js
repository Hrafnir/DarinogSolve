/* Version: #6 */
document.addEventListener('DOMContentLoaded', () => {
    // === HTML ELEMENT REFERENCES ===
    const teamCodeInput = document.getElementById('team-code-input');
    const startWithTeamCodeButton = document.getElementById('start-with-team-code-button');
    const teamCodeFeedback = document.getElementById('team-code-feedback');
    const startSound = document.getElementById('start-sound');

    const pages = document.querySelectorAll('#rebus-content .page');
    const checkButtons = document.querySelectorAll('.check-answer-btn');
    const allInputs = document.querySelectorAll('input[type="text"]');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const devResetButtons = document.querySelectorAll('.dev-reset-button'); // Hent alle reset-knapper

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
             // Når vi bytter side, må vi også sørge for at inputfelt og knapper er i riktig tilstand
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
            localStorage.removeItem('activeTeamData'); // Sørg for å fjerne hvis currentTeamData er null
        }
    }

    function loadState() {
        const savedData = localStorage.getItem('activeTeamData');
        if (savedData) {
            try {
                currentTeamData = JSON.parse(savedData);
                if (!currentTeamData || typeof currentTeamData.completedPostsCount === 'undefined' || !currentTeamData.postSequence) {
                    console.warn("Ugyldig lagret state, tømmer.");
                    clearState(); // clearState vil også sette currentTeamData til null
                    return false;
                }
                return true;
            } catch (e) {
                console.error("Feil ved parsing av lagret state:", e);
                clearState();
                return false;
            }
        }
        currentTeamData = null; // Sørg for at den er null hvis ingen savedData
        return false;
    }

    function clearState() {
        localStorage.removeItem('activeTeamData');
        currentTeamData = null;
        // Når state tømmes, må vi også resette UI for alle poster
        resetAllPostUIs();
    }
    
    function resetPageUI(pageId) {
        if (pageId === 'intro-page' || pageId === 'finale-page') return; // Ingen input/knapper å resette her på samme måte

        const postNumberMatch = pageId.match(/post-(\d+)-page/);
        if (!postNumberMatch) return;
        const postNumberGlobal = postNumberMatch[1];

        const inputElement = document.getElementById(`post-${postNumberGlobal}-input`);
        const buttonElement = document.querySelector(`.check-answer-btn[data-post="${postNumberGlobal}"]`);
        const feedbackElement = document.getElementById(`feedback-${postNumberGlobal}`);

        // Hvis det ikke er lagdata, eller denne posten ikke er fullført av laget, aktiver input/knapp
        const isCompletedByTeam = currentTeamData && currentTeamData.completedGlobalPosts && currentTeamData.completedGlobalPosts[`post${postNumberGlobal}`];

        if (inputElement) {
            inputElement.disabled = !!isCompletedByTeam; // Dobbel not for å sikre boolean
            if (!isCompletedByTeam) inputElement.value = ''; // Tøm input hvis ikke fullført
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
        // Tøm også lagkode-input og feedback
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
            resetAllPostUIs(); // Sørg for at alle UIer er resatt før vi starter et nytt lag

            if (startSound) {
                startSound.play().catch(e => console.warn("Kunne ikke spille startlyd:", e));
            }
            
            const firstPostInSequence = currentTeamData.postSequence[0];
            showRebusPage(`post-${firstPostInSequence}-page`); // resetPageUI vil bli kalt inni her
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

        // Bare oppdater hvis denne posten ikke allerede var fullført og talt
        if (!currentTeamData.completedGlobalPosts[`post${postNumberGlobal}`]) {
            currentTeamData.completedGlobalPosts[`post${postNumberGlobal}`] = true;
            currentTeamData.completedPostsCount++;
        }
        
        currentTeamData.currentPostArrayIndex++; // Gå til neste indeks i lagets sekvens
        saveState();

        if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
            // Sjekk om vi har en gyldig neste post i sekvensen
            if (currentTeamData.currentPostArrayIndex < currentTeamData.postSequence.length) {
                const nextPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
                setTimeout(() => {
                    showRebusPage(`post-${nextPostGlobalId}-page`);
                }, 1200);
            } else {
                // Dette skal egentlig ikke skje hvis completedPostsCount < TOTAL_POSTS,
                // men som en fallback hvis sekvensen er kortere enn TOTAL_POSTS.
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
            resetAllPostUIs(); // Hvis ingen lagdata, eller manglende data, resettes alt.
            return;
        }
        // Gå gjennom alle poster og sett UI basert på lagret tilstand
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


    // === EVENT LISTENERS ===
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

    // Event listener for dev reset buttons
    devResetButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (confirm("Er du sikker på at du vil nullstille og gå tilbake til start?\n(Dette er en testfunksjon)")) {
                clearState();
                showRebusPage('intro-page');
                // Sørg for at lagkode-input er klar
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
    if (loadState()) { // loadState setter currentTeamData hvis data finnes
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
        } else { // Hvis loadState returnerte true men currentTeamData av en eller annen grunn er null
            clearState();
            showRebusPage('intro-page');
        }
        updateUIAfterLoad();
        if(currentTeamData) console.log(`Gjenopprettet tilstand for Team ${currentTeamData.name}. Fullførte: ${currentTeamData.completedPostsCount}. Neste post index: ${currentTeamData.currentPostArrayIndex}`);
    } else {
        showTabContent('rebus');
        showRebusPage('intro-page');
        resetAllPostUIs(); // Sørg for at UI er ren hvis ingen state lastes
    }

}); // Slutt på DOMContentLoaded
/* Version: #6 */
