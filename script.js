/* Version: #1 */
document.addEventListener('DOMContentLoaded', () => {
    // === HTML ELEMENT REFERENCES ===
    const teamCodeInput = document.getElementById('team-code-input');
    const startWithTeamCodeButton = document.getElementById('start-with-team-code-button');
    const teamCodeFeedback = document.getElementById('team-code-feedback');
    const startSound = document.getElementById('start-sound');

    const pages = document.querySelectorAll('#rebus-content .page');
    const feedbackDivs = document.querySelectorAll('.feedback'); // Generic feedback divs for posts
    const checkButtons = document.querySelectorAll('.check-answer-btn');
    const allInputs = document.querySelectorAll('input[type="text"]'); // All text inputs including team code

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // === CONFIGURATION ===
    const TOTAL_POSTS = 8;

    // Definer lagkoder, navn, startpost og postrekkefølge
    // Postnumrene i postSequence refererer til de globale post ID-ene (1-8)
    const TEAM_CONFIG = {
        "SKIPPER": { name: "Team Skipper", startPostId: "post-1-page", postSequence: [1, 2, 3, 4, 5, 6, 7, 8] },
        "KOWALSKI": { name: "Team Kowalski", startPostId: "post-3-page", postSequence: [3, 4, 5, 6, 7, 8, 1, 2] },
        "RICO": { name: "Team Rico", startPostId: "post-5-page", postSequence: [5, 6, 7, 8, 1, 2, 3, 4] },
        "MENIG": { name: "Team Menig", startPostId: "post-7-page", postSequence: [7, 8, 1, 2, 3, 4, 5, 6] }
    };

    // Definer korrekte kodeord for hver post
    const CORRECT_CODES = {
        post1: "HEMMELIG",   // Skateparken (f.eks. kodeord fra voksen etter underskrifter)
        post2: "EVENTYR",    // Mjøspromenaden (kodeord fra voksen)
        post3: "63",         // Skibladner-kaia (7 * 9)
        post4: "P",          // Kulturhuset (B, D, G, K, P - følger tastaturrad QWERTYUIOP, hopper over en)
        post5: "363",        // Gjøvik Kirke (H=T-3, T=2E, H+T+E=12 => E=3, T=6, H=3)
        post6: "30",         // Vitensenteret ((5*5)+10-5 = 25+10-5 = 30)
        post7: "SHORT",      // Kauffeldtgården (SHORT -> SHORTER)
        post8: "IMORGEN"     // Gjøvik Gård (Tomorrow)
    };

    // === STATE VARIABLES ===
    let currentTeamData = null; // Blir { name, startPostId, postSequence, currentPostArrayIndex, completedPostsCount }
    
    // === CORE FUNCTIONS ===

    function showRebusPage(pageId) {
        pages.forEach(page => {
            page.classList.remove('visible');
        });
        const nextPage = document.getElementById(pageId);
        if (nextPage) {
            nextPage.classList.add('visible');
            // Scroll til toppen av containeren for bedre synlighet på mobil
            const container = document.querySelector('.container');
            if (container) {
                 window.scrollTo({ top: container.offsetTop - 20, behavior: 'smooth' });
            }
        } else {
            console.error("Kunne ikke finne rebus-side med ID:", pageId);
            showRebusPage('intro-page'); // Gå tilbake til intro hvis noe er galt
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
            currentTeamData = JSON.parse(savedData);
            return true;
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

        teamCodeFeedback.className = 'feedback'; // Reset feedback
        teamCodeFeedback.textContent = '';

        if (config) {
            currentTeamData = {
                ...config, // name, startPostId, postSequence
                id: teamKey,
                currentPostArrayIndex: 0, // Index i lagets postSequence
                completedPostsCount: 0
            };
            saveState();

            if (startSound) {
                startSound.play().catch(e => console.warn("Kunne ikke spille startlyd:", e));
            }
            
            // Vis lagets første post
            const firstPostInSequence = currentTeamData.postSequence[0];
            showRebusPage(`post-${firstPostInSequence}-page`);
            
            // Oppdater UI for å vise lagnavn (valgfritt, men hyggelig)
            // Kan f.eks. endre en generell tittel eller lignende. Foreløpig ingen dedikert plass.
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

        currentTeamData.completedPostsCount++;
        currentTeamData.currentPostArrayIndex++;
        saveState();

        // Finn neste post for laget
        if (currentTeamData.completedPostsCount < TOTAL_POSTS) {
            const nextPostGlobalId = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            setTimeout(() => {
                showRebusPage(`post-${nextPostGlobalId}-page`);
                // TODO: Her skal kartet oppdateres med neste post
            }, 1200); // Gi tid til å lese suksessmelding
        } else {
            // Alle poster for laget er fullført
            setTimeout(() => {
                showRebusPage('finale-page');
                // TODO: Vurder å tømme state her, eller la dem se kartet med alle poster
                // clearState(); // Kan gjøres hvis de ikke skal kunne gå tilbake
            }, 1200);
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
    
    // Enter i lagkodefeltet
    if (teamCodeInput) {
        teamCodeInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                initializeTeam(this.value);
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
            const postNumberGlobal = button.getAttribute('data-post'); // Dette er det globale postnummeret (1-8)
            const inputElement = document.getElementById(`post-${postNumberGlobal}-input`);
            const feedbackElement = document.getElementById(`feedback-${postNumberGlobal}`);

            if (!inputElement || !feedbackElement) {
                console.error(`Input eller feedback element mangler for post ${postNumberGlobal}`);
                return;
            }

            const userAnswer = inputElement.value.trim().toUpperCase();
            const correctCodeKey = `post${postNumberGlobal}`;
            const correctCode = CORRECT_CODES[correctCodeKey];

            if (correctCode === undefined) {
                console.warn(`Ingen korrekt kode definert for ${correctCodeKey}`);
                feedbackElement.textContent = 'FEIL: Ingen kode definert for denne posten.';
                feedbackElement.classList.add('error');
                return;
            }

            feedbackElement.className = 'feedback'; // Reset
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

            if (userAnswer === correctCode || userAnswer === 'FASIT') {
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

    allInputs.forEach(input => { // Gjelder nå også lagkode-input
        if (input.id === 'team-code-input') return; // Håndteres separat ovenfor

        input.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                // Finn tilhørende sjekk-knapp
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
        // Gjenopprett tilstand hvis et lag allerede er aktivt
        showTabContent('rebus');
        if (currentTeamData.completedPostsCount >= TOTAL_POSTS) {
            showRebusPage('finale-page');
        } else {
            const currentPostForTeam = currentTeamData.postSequence[currentTeamData.currentPostArrayIndex];
            showRebusPage(`post-${currentPostForTeam}-page`);
            // Sørg for at input/knapper for allerede fullførte poster (i denne økten) er deaktivert
            // Dette blir mer komplekst hvis de hopper mellom faner etc., men for nå:
            // Hvis de laster inn på en post, antar vi at den ikke er fullført ennå.
            // En mer robust løsning ville lagret status per post.
        }
        console.log(`Gjenopprettet tilstand for Team ${currentTeamData.name}. Fullførte poster: ${currentTeamData.completedPostsCount}`);

    } else {
        // Ingen lagdata, vis intro-siden for lagkode
        showTabContent('rebus');
        showRebusPage('intro-page');
    }

}); // Slutt på DOMContentLoaded
/* Version: #1 */
