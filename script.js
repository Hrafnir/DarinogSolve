/* Version: #3 */
document.addEventListener('DOMContentLoaded', () => {
    // === HTML ELEMENT REFERENCES ===
    const teamCodeInput = document.getElementById('team-code-input');
    const startWithTeamCodeButton = document.getElementById('start-with-team-code-button');
    const teamCodeFeedback = document.getElementById('team-code-feedback');
    const startSound = document.getElementById('start-sound');

    const pages = document.querySelectorAll('#rebus-content .page');
    // feedbackDivs er ikke lenger nødvendig å hente her, da vi henter spesifikk feedback div i check-handler
    const checkButtons = document.querySelectorAll('.check-answer-btn');
    const allInputs = document.querySelectorAll('input[type="text"]');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // === CONFIGURATION ===
    const TOTAL_POSTS = 8;

    const TEAM_CONFIG = {
        "SKIPPER": { name: "Team Skipper", startPostId: "post-1-page", postSequence: [1, 2, 3, 4, 5, 6, 7, 8] },
        "KOWALSKI": { name: "Team Kowalski", startPostId: "post-3-page", postSequence: [3, 4, 5, 6, 7, 8, 1, 2] },
        "RICO": { name: "Team Rico", startPostId: "post-5-page", postSequence: [5, 6, 7, 8, 1, 2, 3, 4] },
        "MENIG": { name: "Team Menig", startPostId: "post-7-page", postSequence: [7, 8, 1, 2, 3, 4, 5, 6] }
    };

    // Definer korrekte kodeord for hver post (NYE SVAR)
    // HUSK: Disse må tilpasses det faktiske stedet!
    const CORRECT_CODES = {
        post1: "4",         // Antall kjettinger på rød huske (Eksempel)
        post2: "GRØNN",     // Farge på nærmeste søppelspann ved eika (Eksempel)
        post3: "R",         // Tredje bokstav i ord på benk (Eksempel, for "PARKVERN")
        post4: "OVAL",      // Form på dammen på kartet (Eksempel)
        post5: "3",         // Antall benker rundt flaggstang (Eksempel)
        post6: "SYKKEL",    // Symbol øverst på blått skilt ved sykkelstativ (Eksempel)
        post7: "SEMENT",    // Annet materiale i steinmur (Eksempel)
        post8: "VENSTRE"    // Retning til lekeplass fra inngang (Eksempel)
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
        } else {
            console.error("Kunne ikke finne rebus-side med ID:", pageId);
            // Fallback til intro hvis noe er galt med lagret state eller logikk
            clearState(); // Tøm ødelagt state
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
        }
    }

    function loadState() {
        const savedData = localStorage.getItem('activeTeamData');
        if (savedData) {
            try {
                currentTeamData = JSON.parse(savedData);
                // Validering av lastet state (enkelt eksempel)
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
        return false;
    }

    function clearState() {
        localStorage.removeItem('activeTeamData');
        currentTeamData = null;
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
                // For å holde styr på hvilke globale poster som er fullført (for UI-deaktivering)
                completedGlobalPosts: {} // f.eks. { "post1": true, "post3": true }
            };
            saveState();

            if (startSound) {
                startSound.play().catch(e => console.warn("Kunne ikke spille startlyd:", e));
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

        // Merk denne globale posten som fullført for laget
        currentTeamData.completedGlobalPosts[`post${postNumberGlobal}`] = true;
        
        // Kun øk completedPostsCount hvis denne posten ikke allerede var talt med
        // (Dette er en ekstra sjekk, burde ikke skje med disabled knapper, men greit for robusthet)
        let alreadyCounted = false;
        const postIndexInSequence = currentTeamData.postSequence.indexOf(parseInt(postNumberGlobal));
        if (postIndexInSequence < currentTeamData.currentPostArrayIndex) {
            alreadyCounted = true; // Denne posten var tidligere i sekvensen enn den vi "forventet"
        }

        if (!alreadyCounted) {
            currentTeamData.completedPostsCount++;
        }
        
        // Vi går alltid til neste post i sekvensen, selv om de skulle ha klart en "senere" post
        // Dette er fordi currentPostArrayIndex styrer progresjonen gjennom lagets definerte rekkefølge.
        currentTeamData.currentPostArrayIndex++;
        saveState();

        if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
            const nextPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            setTimeout(() => {
                showRebusPage(`post-${nextPostGlobalId}-page`);
                // TODO: Kartoppdatering
            }, 1200);
        } else {
            setTimeout(() => {
                showRebusPage('finale-page');
            }, 1200);
        }
    }

    function updateUIAfterLoad() {
        if (!currentTeamData) return;

        // Deaktiver input/knapper for allerede fullførte poster
        Object.keys(currentTeamData.completedGlobalPosts || {}).forEach(completedPostKey => { // post1, post2 etc.
            const globalPostNum = completedPostKey.replace('post', ''); // "1", "2"
            const inputElement = document.getElementById(`post-${globalPostNum}-input`);
            const buttonElement = document.querySelector(`.check-answer-btn[data-post="${globalPostNum}"]`);
            const feedbackElement = document.getElementById(`feedback-${globalPostNum}`);

            if (inputElement) inputElement.disabled = true;
            if (buttonElement) buttonElement.disabled = true;
            if (feedbackElement && currentTeamData.completedGlobalPosts[completedPostKey]) {
                feedbackElement.textContent = 'Denne posten er fullført!';
                feedbackElement.className = 'feedback success'; // Vis suksess
            }
        });
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

    // === INITIALIZATION ===
    if (loadState() && currentTeamData) {
        showTabContent('rebus');
        if (currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            showRebusPage('finale-page');
        } else {
            // Sikrer at vi viser den *forventede* neste posten i henhold til sekvensen
            const currentExpectedPostId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            if (typeof currentExpectedPostId === 'undefined') {
                // Dette kan skje hvis currentPostArrayIndex er utenfor rekkevidde (f.eks. etter at alle poster er fullført, men før finale vises)
                // Eller hvis postSequence er tom/ugyldig.
                console.warn("Ugyldig currentExpectedPostId, viser finale eller intro.");
                if(currentTeamData.completedPostsCount >= TOTAL_POSTS) {
                    showRebusPage('finale-page');
                } else {
                    clearState(); // Noe er galt med state, start på nytt
                    showRebusPage('intro-page');
                }
            } else {
                showRebusPage(`post-${currentExpectedPostId}-page`);
            }
        }
        updateUIAfterLoad(); // Deaktiver inputs for fullførte poster
        console.log(`Gjenopprettet tilstand for Team ${currentTeamData.name}. Fullførte: ${currentTeamData.completedPostsCount}. Neste post index: ${currentTeamData.currentPostArrayIndex}`);
    } else {
        showTabContent('rebus');
        showRebusPage('intro-page');
    }

}); // Slutt på DOMContentLoaded
/* Version: #3 */
