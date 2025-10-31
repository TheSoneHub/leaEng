/* ======================================================================== */
/*  SCRIPT.JS - V4.0 FINAL - "GLOBAL CONNECT" AI ENGLISH APP              */
/* ======================================================================== */

// --- API KEYS (Loaded from Local Storage) ---
let GEMINI_API_KEY = localStorage.getItem('geminiApiKey') || null;
const YOUTUBE_API_KEY = 'AIzaSyA77MJly5x-CD70EhttJ3c1JrwClVvWSBs'; // IMPORTANT: Replace with your actual YouTube key

// --- GLOBAL STATE ---
let userLevel = localStorage.getItem('userLevel') || null;
let userChannels = JSON.parse(localStorage.getItem('userChannels')) || [];
let savedNotes = JSON.parse(localStorage.getItem('savedNotes')) || [];
let userRecordings = JSON.parse(localStorage.getItem('userRecordings')) || [];
let player; // YouTube player object
let mediaRecorder;
let audioChunks = [];
let currentSpeakingMode = 'freestyle';
// Navigation history stack and current page tracker
let pageHistory = [];
let currentPage = null;
// Lofi player state
let lofiPlayer = null;
let isLofiPlaying = false;
let lofiWasPlayingBeforeRecording = false;
const LOFI_VIDEO_ID = 'jfKfPfyJRdk';

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', initializeApp);

function initializeApp() {
    // 1. Fade out welcome bubbles after a short delay
    setTimeout(() => {
        const bubbles = document.getElementById('welcome-bubbles');
        if (bubbles) {
            bubbles.style.opacity = 0;
            setTimeout(() => bubbles.remove(), 1000);
        }
    }, 2500);

    // 2. Set Theme
    if (localStorage.getItem('theme') === 'dark-mode') {
        document.body.classList.add('dark-mode');
    }

    // 3. Setup event listeners for the entire app
    setupEventListeners();

    // 4. Load saved API key into the settings input for user visibility
    const savedKey = localStorage.getItem('geminiApiKey');
    if (savedKey) {
        document.getElementById('api-key-input').value = savedKey;
    }

    // 5. Check if user has a level and route accordingly
    // Do not auto-navigate here — show the welcome screen first.
    // Navigation into the app will happen when the user clicks the "Enter App" button on the welcome screen.
}

// =================================================================================
// NAVIGATION & PAGE MANAGEMENT
// =================================================================================
function showPage(pageId, options = { recordHistory: true }) {
    // Record history unless explicitly disabled
    if (options.recordHistory && currentPage && currentPage !== pageId) {
        pageHistory.push(currentPage);
    }

    document.querySelectorAll('.page-container').forEach(p => p.style.display = 'none');
    const pageToShow = document.getElementById(pageId);
    if (pageToShow) {
        pageToShow.style.display = 'block';
    }
    updatePageTitle(pageId);

    if (pageId === 'main-dashboard' && userLevel) {
        document.getElementById('welcome-message').innerText = `Welcome! Your CEFR Level is ${userLevel}.`;
    }
    if (pageId === 'my-notes') {
        displaySavedNotes();
    }
    if (pageId === 'settings') {
        displayChannels();
    }
    if (pageId === 'listening-section' && userChannels.length > 0) {
        fetchAllChannelVideos();
    }
    if (pageId === 'speaking-section') {
        displayRecordings();
    }
    if (pageId === 'check-level') {
        displayLevelProgress();
    }

    // Set current page after rendering
    currentPage = pageId;
}

function updatePageTitle(pageId) {
    const titles = {
        'level-assessment': 'Find Your Level',
        'main-dashboard': 'Home Dashboard 🏠',
        'reading-section': 'Reading Exploration 📖',
        'writing-section': 'Writing Practice ✍️',
        'listening-section': 'Listening Practice 🎧',
        'speaking-section': 'Speaking Practice 🎙️',
        'my-notes': 'My Notes 🧾',
        'check-level': 'Check My Level 🔎',
        'settings': 'Settings ⚙️'
    };
    document.getElementById('page-title').innerText = titles[pageId] || 'AI English App';
}

// =================================================================================
// MASTER EVENT LISTENERS SETUP
// =================================================================================
function setupEventListeners() {
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            // Allow visiting settings and check-level even if user hasn't completed assessment
            if (!userLevel && button.dataset.page !== 'settings' && button.dataset.page !== 'check-level') {
                return alert("Please complete the level assessment first.");
            }
            showPage(button.dataset.page);
        });
    });

    document.getElementById('reading-card').addEventListener('click', () => showPage('reading-section'));
    document.getElementById('writing-card').addEventListener('click', () => showPage('writing-section'));
    document.getElementById('speaking-card').addEventListener('click', () => showPage('speaking-section'));
    document.getElementById('listening-card').addEventListener('click', () => showPage('listening-section'));
    document.getElementById('analyze-button').addEventListener('click', () => {
        const text = document.getElementById('writing-input').value;
        if (text.trim().length < 20) return alert('Please write a bit more for an accurate assessment.');
        getLevelFromAI(text);
    });
    document.getElementById('submit-reassessment-btn').addEventListener('click', submitLevelReassessment);
    document.getElementById('generate-passages-button').addEventListener('click', generateReadingPassages);
    document.getElementById('passages-wrapper').addEventListener('mouseup', handleTextSelection);
    document.addEventListener('mousedown', (e) => {
        if (!document.getElementById('dictionary-popup').contains(e.target)) {
            document.getElementById('dictionary-popup').style.display = 'none';
        }
    });
    document.getElementById('check-writing-button').addEventListener('click', checkUserWriting);
    const closePlayerBtn = document.getElementById('close-player-button');
    if (closePlayerBtn) closePlayerBtn.addEventListener('click', closePlayer);
    document.getElementById('save-note-button').addEventListener('click', saveVideoNote);
    document.getElementById('freestyle-mode-btn').addEventListener('click', () => setSpeakingMode('freestyle'));
    document.getElementById('guided-mode-btn').addEventListener('click', () => setSpeakingMode('guided'));
    document.getElementById('get-sentence-btn').addEventListener('click', getGuidedSentence);
    document.getElementById('record-button').addEventListener('click', toggleRecording);
    document.getElementById('stop-button').addEventListener('click', stopRecording);
    document.getElementById('export-notes-button').addEventListener('click', exportNotes);
    document.getElementById('theme-toggle-button').addEventListener('click', toggleTheme);
    document.getElementById('save-api-key-button').addEventListener('click', saveApiKey);
    document.getElementById('add-channel-button').addEventListener('click', addYouTubeChannel);
    document.getElementById('reset-app-button').addEventListener('click', resetApp);

    // Check-level page actions
    const checkBtn = document.getElementById('check-level-button');
    if (checkBtn) checkBtn.addEventListener('click', checkLevelNow);
    const clearHistBtn = document.getElementById('clear-level-history-button');
    if (clearHistBtn) clearHistBtn.addEventListener('click', clearLevelHistory);

    // Generic page back buttons (used on each page)
    document.querySelectorAll('.page-back-btn').forEach(btn => {
        btn.addEventListener('click', handlePageBack);
    });

    // Welcome screen enter button: hide overlay and navigate into the app
    const enterBtn = document.getElementById('enter-app-button');
    if (enterBtn) {
        enterBtn.addEventListener('click', () => {
            const welcome = document.getElementById('welcome-screen');
            if (welcome) welcome.style.display = 'none';
            const bubbles = document.getElementById('welcome-bubbles');
            if (bubbles) bubbles.style.display = 'none';
            // Navigate into the app after welcome
            const dest = userLevel ? 'main-dashboard' : 'level-assessment';
            showPage(dest, { recordHistory: false });
        });
    }

    // Lofi play button
    const lofiBtn = document.getElementById('lofi-play-btn');
    if (lofiBtn) lofiBtn.addEventListener('click', toggleLofi);
}

function handlePageBack() {
    // If we're on the listening page and the player area is open, close the player instead of navigating back
    if (currentPage === 'listening-section') {
        const playerArea = document.getElementById('player-and-notes-area');
        if (playerArea && playerArea.style.display !== 'none') {
            closePlayer();
            return;
        }
    }

    const prev = pageHistory.pop() || (userLevel ? 'main-dashboard' : 'level-assessment');
    showPage(prev, { recordHistory: false });
}

// =================================================================================
// LEVEL ASSESSMENT & WEEKLY CHECK
// =================================================================================
async function getLevelFromAI(text) {
    if (!GEMINI_API_KEY) return alert("Please set your Google AI API Key in Settings first.");
    const resultDisplay = document.getElementById('result-display');
    resultDisplay.innerText = 'Analyzing using CEFR scale...';
    try {
        const prompt = `Analyze the following text. Based on grammar, vocabulary, and sentence structure, classify the user's English proficiency into one of the CEFR levels: A1, A2, B1, B2, C1, or C2. Respond with ONLY the level code (e.g., "B1"). Text: "${text}"`;
        const level = await callGemini(prompt);
        userLevel = level.trim().toUpperCase();
        localStorage.setItem('userLevel', userLevel);
        localStorage.setItem('lastTestDate', new Date().toISOString());
        showPage('main-dashboard');
    } catch (error) {
        resultDisplay.innerText = 'Error analyzing. Check your API Key and console for details.';
    }
}

async function checkForWeeklyTest() {
    const lastTestDate = localStorage.getItem('lastTestDate');
    if (!userLevel) return;

    const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
    const timeSinceLastTest = new Date() - new Date(lastTestDate);

    if (timeSinceLastTest > sevenDaysInMillis) {
        const modal = document.getElementById('reassessment-modal');
        modal.style.display = 'flex';
        const mcqArea = document.getElementById('reassessment-mcq-area');
        mcqArea.innerHTML = "<p>Generating fresh questions for you...</p>";
        try {
            const prompt = `Generate 3 multiple-choice grammar questions suitable for a ${userLevel} English learner. Format the response as a JSON array of objects. Each object should have "question", an array of "options", and the "answer" (the text of the correct option).`;
            const response = await callGemini(prompt);
            const jsonString = response.replace(/```json\n|\n```/g, '');
            const questions = JSON.parse(jsonString);
            mcqArea.innerHTML = "<h3>Multiple Choice Questions 🧠</h3>";
            questions.forEach((q, index) => {
                mcqArea.innerHTML += `
                    <div class="mcq-question">
                        <p><b>${index + 1}.</b> ${q.question}</p>
                        <div class="mcq-options">
                            ${q.options.map(opt => `<label><input type="radio" name="mcq-${index}" value="${opt}"> ${opt}</label>`).join('')}
                        </div>
                    </div>
                `;
            });
        } catch (error) {
            mcqArea.innerHTML = "<p>Couldn't load questions. You can still submit the essay.</p>";
        }
    }
}

async function submitLevelReassessment() {
    const essayText = document.getElementById('reassessment-essay').value;
    if (essayText.trim().length < 20) return alert("Please write a bit more for an accurate assessment.");
    const prompt = `A user with a current CEFR level of '${userLevel}' has submitted a new weekly essay to check their progress. Analyze the following essay and determine their updated CEFR level (A1, A2, B1, B2, C1, C2). The essay is: "${essayText}". Respond with ONLY the new level code.`;
    try {
        const newLevel = await callGemini(prompt);
        const trimmedLevel = newLevel.trim().toUpperCase();
        if (userLevel !== trimmedLevel) {
            alert(`Congratulations! Your level has been updated from ${userLevel} to ${trimmedLevel}!`);
            userLevel = trimmedLevel;
            localStorage.setItem('userLevel', userLevel);
        } else {
            alert(`Great work! You're solidifying your skills at the ${userLevel} level. Keep it up!`);
        }
        localStorage.setItem('lastTestDate', new Date().toISOString());
        document.getElementById('reassessment-modal').style.display = 'none';
        showPage('main-dashboard');
    } catch (error) {
        alert("There was an error assessing your level. Please try again later.");
    }
}

// =================================================================================
// CHECK LEVEL PAGE: submit checks and store progress
// =================================================================================
async function checkLevelNow() {
    const essayText = document.getElementById('check-level-input').value;
    const resultBox = document.getElementById('checklevel-result');
    const statusEl = document.getElementById('check-level-status');
    if (essayText.trim().length < 20) return alert('Please write at least a short paragraph (20+ chars).');
    if (!GEMINI_API_KEY) return alert('Please set your Google AI API Key in Settings first.');

    resultBox.innerText = 'Checking your level...';
    try {
        const prompt = `Analyze the following text. Based on grammar, vocabulary, and sentence structure, classify the user's English proficiency into one of the CEFR levels: A1, A2, B1, B2, C1, or C2. Respond with ONLY the level code (e.g., "B1"). Text: "${essayText}"`;
        const level = await callGemini(prompt);
        const trimmedLevel = level.trim().toUpperCase();

        // Save to progress history
        const existing = JSON.parse(localStorage.getItem('levelChecks') || '[]');
        existing.push({ date: new Date().toISOString(), level: trimmedLevel, essay: essayText });
        localStorage.setItem('levelChecks', JSON.stringify(existing));

        // Update user's current level as well
        userLevel = trimmedLevel;
        localStorage.setItem('userLevel', userLevel);
        localStorage.setItem('lastTestDate', new Date().toISOString());

        resultBox.innerText = `Detected level: ${trimmedLevel}`;
        if (statusEl) {
            statusEl.style.opacity = 1;
            setTimeout(() => statusEl.style.opacity = 0, 1400);
        }
        displayLevelProgress();
    } catch (error) {
        console.error('Error checking level:', error);
        resultBox.innerText = 'Could not determine level. Please try again later.';
    }
}

function displayLevelProgress() {
    const container = document.getElementById('level-progress-list');
    const checks = JSON.parse(localStorage.getItem('levelChecks') || '[]');
    if (!container) return;
    if (!checks || checks.length === 0) {
        container.innerHTML = 'No checks recorded yet.';
        return;
    }
    // Show most recent first
    const html = checks.slice().reverse().map(ch => {
        const when = new Date(ch.date).toLocaleString();
        const safeEssay = ch.essay ? ch.essay.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
        return `<div class="note-card"><h3>${ch.level} <small style="margin-left:8px;font-weight:normal;color:#666;">${when}</small></h3><p>${safeEssay}</p></div>`;
    }).join('');
    container.innerHTML = html;
}

function clearLevelHistory() {
    if (!confirm('Clear all saved level checks? This cannot be undone.')) return;
    localStorage.removeItem('levelChecks');
    displayLevelProgress();
}

// =================================================================================
// READING & DICTIONARY
// =================================================================================
async function generateReadingPassages() {
    const topic = document.getElementById('topic-input').value;
    if (topic.trim() === '') return alert('Please enter a topic.');
    const passagesWrapper = document.getElementById('passages-wrapper');
    passagesWrapper.innerHTML = '<p>Generating 3 passages... This may take a moment.</p>';
    const levels = ['A2', 'B1', 'C1'];
    const promises = levels.map(level => {
        const prompt = `Generate a 150-word passage about "${topic}". The passage must be suitable for a CEFR level ${level} English learner. The topic can be from tech, psychology, philosophy, business, or general knowledge.`;
        return callGemini(prompt);
    });
    try {
        const results = await Promise.all(promises);
        passagesWrapper.innerHTML = '';
        results.forEach((passage, index) => {
            const card = document.createElement('div');
            card.className = 'passage-card';
            card.innerHTML = `<h3>Level: ${levels[index]}</h3><p>${passage}</p>`;
            passagesWrapper.appendChild(card);
        });
    } catch (error) {
        passagesWrapper.innerHTML = '<p>Error generating passages. Please try again.</p>';
    }
}

async function handleTextSelection(event) {
    // Read raw selection and do basic sanitization to avoid punctuation/hidden chars
    const raw = window.getSelection().toString().trim();
    const popup = document.getElementById('dictionary-popup');

    // Remove surrounding punctuation and any non-letter (allow hyphen and apostrophe)
    const cleaned = raw.toLowerCase().replace(/^[^a-zA-Z'-]+|[^a-zA-Z'-]+$/g, '').replace(/[^a-zA-Z'-]/g, '');

    // Only proceed for a single clean word with length > 1
    if (cleaned && cleaned.length > 1 && !/\s/.test(cleaned)) {
        popup.style.display = 'block';
        popup.style.left = `${event.pageX + 5}px`;
        popup.style.top = `${event.pageY + 5}px`;
        popup.innerHTML = `Searching for "<strong>${cleaned}</strong>"...`;
        try {
            const response = await fetch(`/.netlify/functions/fetchWord?word=${encodeURIComponent(cleaned)}`);
            if (!response.ok) throw new Error('Word not found.');
            const data = await response.json();

            // Defensive checks for API response shape
            if (!data || !Array.isArray(data) || data.length === 0 || !data[0].meanings || data[0].meanings.length === 0) {
                throw new Error('Unexpected dictionary response');
            }

            const meaning = data[0].meanings[0];
            const defObj = meaning.definitions && meaning.definitions[0];
            const definition = defObj ? defObj.definition : null;

            if (!definition) throw new Error('Definition not found');

            popup.innerHTML = `<strong>${cleaned}</strong>: ${definition} <br><small style="color:green;">Saved to My Notes!</small>`;
            if (typeof saveNewNote === 'function') {
                saveNewNote({ type: 'vocab', word: cleaned, definition: definition, date: new Date().toISOString() });
            }
        } catch (error) {
            console.error('Dictionary lookup error for', cleaned, error);
            popup.innerHTML = `Could not find a definition for "<strong>${cleaned}</strong>".`;
        }
    }
}

// =================================================================================
// WRITING
// =================================================================================
async function checkUserWriting() {
    const userWriting = document.getElementById('writing-practice-input').value;
    if (userWriting.trim() === '') return alert('Please write something to check!');
    const feedbackBox = document.getElementById('writing-feedback');
    feedbackBox.innerText = 'Your personal English tutor is checking your writing...';
    try {
        const prompt = `You are a friendly English teacher. Analyze the following text written by a user whose level is '${userLevel}'. Text: "${userWriting}". Provide feedback in this format: 1. A positive encouraging sentence. 2. A 'Corrected Version' of the text. 3. 2-3 bullet points under 'Key Suggestions' explaining important mistakes simply.`;
        const feedback = await callGemini(prompt);
        feedbackBox.innerText = feedback;
    } catch (error) {
        feedbackBox.innerText = 'Sorry, we couldn\'t check your writing. Please try again.';
    }
}

// =================================================================================
// SPEAKING (RECORDING, SAVING, AI ANALYSIS)
// =================================================================================
function setSpeakingMode(mode) {
    currentSpeakingMode = mode;
    document.getElementById('freestyle-mode-btn').classList.toggle('active', mode === 'freestyle');
    document.getElementById('guided-mode-btn').classList.toggle('active', mode === 'guided');
    document.getElementById('guided-practice-area').style.display = mode === 'guided' ? 'block' : 'none';
}

async function getGuidedSentence() {
    if (!GEMINI_API_KEY) return alert("Please set your Google AI API Key in Settings first.");
    const sentenceDisplay = document.getElementById('sentence-to-read');
    sentenceDisplay.innerText = "Generating a sentence...";
    try {
        const prompt = `You are a concise speaking prompt generator for language learners. Produce ONE clear English sentence suitable for a ${userLevel || 'B1'} learner (10-15 words). Return a JSON object with these fields exactly: {"sentence": string, "phonetic": string (IPA or simple), "target_words": [strings], "difficulty": string, "speaking_tips": [strings]}. Respond with ONLY the JSON object and nothing else.`;
        const raw = await callGemini(prompt);
        // remove possible code fences then parse
        const jsonText = raw.replace(/```json\n?|\n?```/g, '').trim();
        let parsed;
        try { parsed = JSON.parse(jsonText); } catch (e) { parsed = null; }
        if (parsed && parsed.sentence) {
            // show sentence and optional phonetic below
            sentenceDisplay.innerHTML = `<span>${parsed.sentence}</span>` + (parsed.phonetic ? `<div style="font-style:italic;color:#666;margin-top:6px;">/${parsed.phonetic}/</div>` : '');
        } else {
            sentenceDisplay.innerText = (raw || 'Could not get a sentence.');
        }
    } catch (error) {
        sentenceDisplay.innerText = "Could not get a sentence. Please try again.";
    }
}

async function toggleRecording() {
    if (!GEMINI_API_KEY) return alert("Please set your Google AI API Key in Settings first.");
    const recordButton = document.getElementById('record-button');
    const stopButton = document.getElementById('stop-button');
    try {
        // Auto-pause lofi if it's playing and remember to resume later
        if (typeof lofiPlayer !== 'undefined' && isLofiPlaying) {
            try { lofiPlayer.pauseVideo(); } catch (e) {}
            lofiWasPlayingBeforeRecording = true;
            isLofiPlaying = false;
            updateLofiButton();
        } else {
            lofiWasPlayingBeforeRecording = false;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.start();
        audioChunks = [];
        mediaRecorder.addEventListener("dataavailable", e => audioChunks.push(e.data));
        mediaRecorder.addEventListener("stop", () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            saveAndAnalyzeRecording(audioBlob);
            stream.getTracks().forEach(track => track.stop());
        });
        recordButton.innerText = "Recording...";
        recordButton.classList.add('is-recording');
        stopButton.disabled = false;
    } catch (err) {
        alert("Could not access microphone. Please grant permission.");
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        const recordButton = document.getElementById('record-button');
        const stopButton = document.getElementById('stop-button');
        recordButton.innerText = "Start Recording";
        recordButton.classList.remove('is-recording');
        stopButton.disabled = true;
        // Resume lofi if it was playing before recording started
        if (lofiWasPlayingBeforeRecording && lofiPlayer) {
            try { lofiPlayer.playVideo(); } catch (e) {}
            isLofiPlaying = true;
            updateLofiButton();
            lofiWasPlayingBeforeRecording = false;
        }
    }
}

function saveAndAnalyzeRecording(audioBlob) {
    const newRecording = { id: `rec_${Date.now()}`, date: new Date().toISOString(), analysis: "Analyzing..." };
    userRecordings.push(newRecording);
    displayRecordings();
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
                // Stronger, structured prompt asking for JSON output
                let promptObj = {
                    instruction: `You are an English speaking tutor. Carefully analyze the user's audio. Provide a JSON object with these fields: "transcription" (string), "score" (number 0-10), "pronunciation_feedback" (array of short strings), "errors" (array of {type: string, original: string, correction: string}), "suggestions" (array of short strings), and "confidence" (0-1). If the user attempted a target sentence, include a field "target_sentence" with that sentence.`
                };
                let promptText = `Transcribe and analyze this audio for a ${userLevel || 'B1'} learner. Respond with ONLY a JSON object matching this schema: {"transcription":"...","score":number,"pronunciation_feedback":["..."],"errors":[{"type":"...","original":"...","correction":"..."}],"suggestions":["..."],"confidence":0-1${currentSpeakingMode === 'guided' ? ',"target_sentence":"' + document.getElementById('sentence-to-read').innerText.replace(/\"/g,'\\"') + '"' : ''} }.`;

                const requestBody = { "contents": [{ "parts": [{ "text": promptText }, { "inline_data": { "mime_type": "audio/webm", "data": base64Audio } }] }] };
                const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
                if (!response.ok) throw new Error(await response.text());
                const data = await response.json();
                const rawAnalysis = data.candidates[0].content.parts[0].text;

                // Attempt to extract JSON from response
                let jsonText = rawAnalysis.replace(/```json\n?|\n?```/g, '').trim();
                let parsed = null;
                try { parsed = JSON.parse(jsonText); } catch (e) { parsed = null; }

                let analysisResult = rawAnalysis;
                if (parsed) {
                    // Build a human-friendly formatted analysis
                    analysisResult = `Transcription: ${parsed.transcription || ''}\n` +
                        `Score: ${parsed.score ?? 'N/A'}/10\n` +
                        (parsed.target_sentence ? `Target: ${parsed.target_sentence}\n` : '') +
                        `\nPronunciation Feedback:\n` + (Array.isArray(parsed.pronunciation_feedback) ? parsed.pronunciation_feedback.map(p => `- ${p}`).join('\n') : '') +
                        `\n\nErrors:\n` + (Array.isArray(parsed.errors) ? parsed.errors.map(er => `- ${er.type || ''}: "${er.original || ''}" -> "${er.correction || ''}"`).join('\n') : '') +
                        `\n\nSuggestions:\n` + (Array.isArray(parsed.suggestions) ? parsed.suggestions.map(s => `- ${s}`).join('\n') : '') +
                        `\n\nConfidence: ${parsed.confidence ?? 'N/A'}`;
                }

                const recToUpdate = userRecordings.find(r => r.id === newRecording.id);
                if (recToUpdate) {
                    recToUpdate.analysis = analysisResult;
                    localStorage.setItem('userRecordings', JSON.stringify(userRecordings));
                    displayRecordings();
                }
        } catch (error) {
            const recToUpdate = userRecordings.find(r => r.id === newRecording.id);
            if (recToUpdate) {
                recToUpdate.analysis = "Error during analysis. Check API key and console.";
                localStorage.setItem('userRecordings', JSON.stringify(userRecordings));
                displayRecordings();
            }
        }
    };
}

function displayRecordings() {
    const list = document.getElementById('recording-list');
    list.innerHTML = '';
    [...userRecordings].reverse().forEach(rec => {
        const item = document.createElement('div');
        item.className = 'recording-item';
        item.innerHTML = `
            <div class="recording-item-header">
                <span>${new Date(rec.date).toLocaleString()}</span>
                <button class="delete-recording-btn" data-id="${rec.id}">❌</button>
            </div>
            <div class="analysis-result">${rec.analysis}</div>`;
        list.appendChild(item);
    });
    document.querySelectorAll('.delete-recording-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteRecording(e.target.dataset.id));
    });
}

function deleteRecording(idToDelete) {
    userRecordings = userRecordings.filter(rec => rec.id !== idToDelete);
    localStorage.setItem('userRecordings', JSON.stringify(userRecordings));
    displayRecordings();
}

// =================================================================================
// LISTENING & YOUTUBE
// =================================================================================
function onYouTubeIframeAPIReady() { /* Placeholder for API */ }

function playVideo(videoId) {
    document.getElementById('video-selection-area').style.display = 'none';
    document.getElementById('player-and-notes-area').style.display = 'block';
    if (player) {
        player.loadVideoById(videoId);
    } else {
        player = new YT.Player('player', {
            height: '100%', width: '100%', videoId: videoId,
            events: { 'onReady': onPlayerReady }
        });
    }
    const notesArea = document.getElementById('video-notes');
    const existingNote = savedNotes.find(note => note.type === 'listening' && note.videoId === videoId);
    notesArea.value = existingNote ? existingNote.text : '';
    window.scrollTo(0, 0);
}

function onPlayerReady(event) {
    event.target.playVideo();
    const notesArea = document.getElementById('video-notes');
    notesArea.addEventListener('input', () => {
        if (player.getPlayerState() === YT.PlayerState.PLAYING) player.pauseVideo();
    });
    notesArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (player.getPlayerState() !== YT.PlayerState.PLAYING) player.playVideo();
        }
    });
}

function closePlayer() {
    document.getElementById('video-selection-area').style.display = 'block';
    document.getElementById('player-and-notes-area').style.display = 'none';
    if (player && typeof player.stopVideo === 'function') {
        player.stopVideo();
    }
}

async function fetchAllChannelVideos() {
    const list = document.getElementById('video-list');
    list.innerHTML = '<p>Loading videos...</p>';
    let allVideos = [];
    for (const channelId of userChannels) {
        const videos = await fetchVideosFromChannel(channelId);
        allVideos.push(...videos);
    }
    displayVideos(allVideos);
}

async function fetchVideosFromChannel(channelId) {
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=30`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items;
    } catch (error) { return []; }
}

function displayVideos(videos) {
    const list = document.getElementById('video-list');
    list.innerHTML = '';
    if (videos.length === 0) {
        list.innerHTML = '<p>No videos found. Add channels in Settings.</p>';
        return;
    }
    videos.forEach(video => {
        const item = document.createElement('div');
        item.className = 'video-item';
        item.innerHTML = `<img src="${video.snippet.thumbnails.high.url}" alt="${video.snippet.title}"><p>${video.snippet.title}</p>`;
        item.addEventListener('click', () => playVideo(video.id.videoId));
        list.appendChild(item);
    });
}

// =================================================================================
// NOTES & SETTINGS
// =================================================================================
function saveVideoNote() {
    if (!player || !player.getVideoData().video_id) return;
    const videoId = player.getVideoData().video_id;
    const videoTitle = player.getVideoData().title;
    const timestamp = Math.floor(player.getCurrentTime());
    const text = document.getElementById('video-notes').value;
    savedNotes = savedNotes.filter(note => !(note.type === 'listening' && note.videoId === videoId));
    saveNewNote({ type: 'listening', videoId, videoTitle, timestamp, text, date: new Date().toISOString() });
    const status = document.getElementById('save-status');
    status.innerText = "Note Saved!";
    status.style.opacity = 1;
    setTimeout(() => { status.style.opacity = 0; }, 2000);
}

function displaySavedNotes() {
    const list = document.getElementById('notes-list');
    list.innerHTML = '';
    if (savedNotes.length === 0) {
        list.innerHTML = '<p>You have no saved notes.</p>';
        return;
    }
    const sorted = [...savedNotes].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(note => {
        const card = document.createElement('div');
        card.className = 'note-card';
        if (note.type === 'vocab') {
            card.classList.add('note-vocab');
            card.innerHTML = `<h3>${note.word}</h3><p>${note.definition}</p><div class="note-meta">Saved on ${new Date(note.date).toLocaleDateString()}</div>`;
        } else if (note.type === 'listening' && note.text.trim() !== '') {
            const time = `${Math.floor(note.timestamp / 60)}:${(note.timestamp % 60).toString().padStart(2, '0')}`;
            card.classList.add('note-listening');
            card.innerHTML = `<h3>Note for: ${note.videoTitle}</h3><p>${note.text}</p><div class="note-meta">Saved at ${time} on ${new Date(note.date).toLocaleDateString()}</div>`;
        }
        list.appendChild(card);
    });
}

function exportNotes() {
    if (savedNotes.length === 0) return alert("No notes to export.");
    let markdown = "# My English Learning Notes\n\n";
    const sorted = [...savedNotes].sort((a, b) => new Date(b.date) - new Date(a.date));
    markdown += "## Saved Vocabulary\n\n";
    sorted.filter(n => n.type === 'vocab').forEach(note => {
        markdown += `- **${note.word}**: ${note.definition}\n`;
    });
    markdown += "\n## Listening Notes\n\n";
    sorted.filter(n => n.type === 'listening' && n.text.trim() !== '').forEach(note => {
        const time = `${Math.floor(note.timestamp / 60)}:${(note.timestamp % 60).toString().padStart(2, '0')}`;
        markdown += `### Note for: [${note.videoTitle}](https://www.youtube.com/watch?v=${note.videoId})\n*Saved at ${time} on ${new Date(note.date).toLocaleDateString()}*\n\n${note.text.replace(/^/gm, '> ')}\n\n`;
    });
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `english-notes-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode');
}

function saveApiKey() {
    const key = document.getElementById('api-key-input').value.trim();
    if (key) {
        localStorage.setItem('geminiApiKey', key);
        GEMINI_API_KEY = key;
        alert("API Key saved successfully!");
    } else {
        localStorage.removeItem('geminiApiKey');
        GEMINI_API_KEY = null;
        alert("API Key cleared.");
    }
}

function addYouTubeChannel() {
    const input = document.getElementById('channel-input');
    const id = input.value.trim();
    if (id && userChannels.length < 5 && !userChannels.includes(id)) {
        userChannels.push(id);
        localStorage.setItem('userChannels', JSON.stringify(userChannels));
        displayChannels();
    } else if (userChannels.length >= 5) {
        alert("Maximum of 5 channels reached.");
    }
    input.value = '';
}

function deleteChannel(idToDelete) {
    userChannels = userChannels.filter(id => id !== idToDelete);
    localStorage.setItem('userChannels', JSON.stringify(userChannels));
    displayChannels();
}

function displayChannels() {
    const list = document.getElementById('channel-list');
    list.innerHTML = '';
    userChannels.forEach(id => {
        const tag = document.createElement('div');
        tag.className = 'channel-tag';
        tag.innerText = id;
        const btn = document.createElement('button');
        btn.innerText = 'x';
        btn.onclick = () => deleteChannel(id);
        tag.appendChild(btn);
        list.appendChild(tag);
    });
}

function resetApp() {
    if (confirm("Are you sure? All your data (level, channels, notes, recordings) will be deleted permanently.")) {
        localStorage.clear();
        window.location.reload();
    }
}

// =================================================================================
// HELPER FUNCTIONS
// =================================================================================
function saveNewNote(noteObject) {
    if (noteObject.type === 'vocab') {
        if (savedNotes.some(n => n.type === 'vocab' && n.word === noteObject.word)) return;
    }
    savedNotes.push(noteObject);
    localStorage.setItem('savedNotes', JSON.stringify(savedNotes));
}

async function callGemini(prompt) {
    if (!GEMINI_API_KEY) throw new Error("API Key is not set.");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }] })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${errorData.error.message}`);
        }
        const data = await response.json();
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("Invalid response structure from AI.");
        }
    } catch (error) {
        console.error("Gemini call failed:", error);
        throw error;
    }
}

// =================================================================================
// Lofi player (small YouTube player toggled from header)
// =================================================================================
function createLofiPlayer() {
    // Wait for YT API to be ready
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        // try again shortly
        setTimeout(createLofiPlayer, 250);
        return;
    }
    lofiPlayer = new YT.Player('lofi-player', {
        height: '0', width: '0', videoId: LOFI_VIDEO_ID,
        playerVars: { controls: 0, loop: 1, playlist: LOFI_VIDEO_ID, modestbranding: 1, rel: 0 },
        events: {
            onReady: (e) => {
                try { e.target.setVolume(40); } catch (err) {}
                e.target.playVideo();
                isLofiPlaying = true;
                updateLofiButton();
            },
            onStateChange: (e) => {
                // update play state
                if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                    isLofiPlaying = false;
                    updateLofiButton();
                } else if (e.data === YT.PlayerState.PLAYING) {
                    isLofiPlaying = true;
                    updateLofiButton();
                }
            }
        }
    });
}

function toggleLofi() {
    if (!lofiPlayer) {
        // create and play
        createLofiPlayer();
        return;
    }
    try {
        const state = lofiPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            lofiPlayer.pauseVideo();
            isLofiPlaying = false;
        } else {
            lofiPlayer.playVideo();
            isLofiPlaying = true;
        }
    } catch (err) {
        // fallback: try to recreate
        createLofiPlayer();
    }
    updateLofiButton();
}

function updateLofiButton() {
    const btn = document.getElementById('lofi-play-btn');
    if (!btn) return;
    btn.classList.toggle('playing', !!isLofiPlaying);
    btn.setAttribute('aria-pressed', !!isLofiPlaying);
    btn.title = isLofiPlaying ? 'Pause lofi beats' : 'Play lofi beats';
}