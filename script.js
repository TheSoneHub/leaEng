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
    if (userLevel) {
        showPage('main-dashboard');
        checkForWeeklyTest();
    } else {
        showPage('level-assessment');
    }
}

// =================================================================================
// NAVIGATION & PAGE MANAGEMENT
// =================================================================================
function showPage(pageId) {
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
            if (!userLevel && button.dataset.page !== 'settings') {
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
    document.getElementById('close-player-button').addEventListener('click', closePlayer);
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
    const selection = window.getSelection().toString().trim().toLowerCase();
    const popup = document.getElementById('dictionary-popup');
    if (selection.length > 1 && selection.split(' ').length === 1) {
        popup.style.display = 'block';
        popup.style.left = `${event.pageX + 5}px`;
        popup.style.top = `${event.pageY + 5}px`;
        popup.innerHTML = `Searching for "<strong>${selection}</strong>"...`;
        try {
            const response = await fetch(`/.netlify/functions/fetchWord?word=${selection}`);
            if (!response.ok) throw new Error('Word not found.');
            const data = await response.json();
            const definition = data[0].meanings[0].definitions[0].definition;
            popup.innerHTML = `<strong>${selection}</strong>: ${definition} <br><small style="color:green;">Saved to My Notes!</small>`;
            saveNewNote({ type: 'vocab', word: selection, definition: definition, date: new Date().toISOString() });
        } catch (error) {
            popup.innerHTML = `Could not find a definition for "<strong>${selection}</strong>".`;
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
        const prompt = `Generate one single, clear English sentence for a CEFR level ${userLevel} learner to practice speaking (10-15 words). Respond with only the sentence.`;
        const sentence = await callGemini(prompt);
        sentenceDisplay.innerText = sentence.trim();
    } catch (error) {
        sentenceDisplay.innerText = "Could not get a sentence. Please try again.";
    }
}

async function toggleRecording() {
    if (!GEMINI_API_KEY) return alert("Please set your Google AI API Key in Settings first.");
    const recordButton = document.getElementById('record-button');
    const stopButton = document.getElementById('stop-button');
    try {
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
            let prompt = `Transcribe this audio and provide brief, helpful feedback for a ${userLevel} English learner.`;
            if (currentSpeakingMode === 'guided') {
                const sentenceToRead = document.getElementById('sentence-to-read').innerText;
                prompt = `The user was trying to say: "${sentenceToRead}". Transcribe their audio, compare it, give a score out of 10 for accuracy, and one suggestion for improvement.`;
            }
            const requestBody = { "contents": [{ "parts": [{ "text": prompt }, { "inline_data": { "mime_type": "audio/webm", "data": base64Audio } }] }] };
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            const analysisResult = data.candidates[0].content.parts[0].text;
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
    const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=10`;
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