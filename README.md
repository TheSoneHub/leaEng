# 🌎 Global Connect AI English App - v4.2

**Your Personalized AI-Powered Language Learning Companion**

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

Global Connect is a comprehensive web application designed to provide a rich, personalized, and engaging platform for English language learners. It leverages the power of Google's Generative AI (Gemini) to create a tailored experience that adapts to the user's skill level, from A1 to C2. The application is wrapped in a beautiful, consistent Skeuomorphic design aesthetic inspired by classic Mac OS, providing a premium and intuitive user experience.


## v4.2 — What's new

- Welcome screen and branding: a full-screen welcome overlay and updated app logo (`leaEng`).
- Manual "Check My Level" flow: submit short essays to get AI-estimated CEFR levels; each check is saved to a local progress history.
- Listening improvements: unified Back behavior and a simplified player UX; select a video to open player/notes, and a single Back button will close the player or navigate back.
- Lofi music integration: a small header button lets you play/pause a lofi YouTube live stream (auto-pauses when you start speaking recordings).
- Stronger speaking prompts & structured feedback: guided sentences are returned as structured JSON (sentence + phonetic + tips) and recordings are analyzed into a JSON schema which the app formats into readable feedback.
- Robust selection lookup: dictionary lookup sanitizes selected words (removes punctuation) to reduce lookup failures.
- Navigation/back button improvements: page-level back buttons and a navigation history stack for consistent backward navigation.

### ✨ Core Features

This application is packed with features designed to create a complete learning loop, covering all essential aspects of language acquisition.

#### 🧠 Smart Assessment & Progression
*   **Initial Level Assessment:** A sophisticated initial assessment using a free-form essay to accurately place users on the CEFR scale (A1-C2).
*   **� Check My Level (Manual):** Users can now manually submit short essays on the "Check My Level" page to get an AI-estimated CEFR level. Each check is saved to a progress history for review.

#### 📖 AI-Powered Reading Exploration
*   **User-Defined Topics:** Generate reading passages on any topic you can imagine—from Tech and Psychology to Philosophy and Business.
*   **Multi-Level Passages:** For any given topic, the AI generates three distinct passages at A2 (Beginner), B1 (Intermediate), and C1 (Advanced) levels.
*   **🪄 Interactive Dictionary:** Select any unknown word in a passage to get an instant definition. The word and its meaning are automatically saved to your notes.

#### ✍️ Advanced Writing Coach
*   **AI-Powered Feedback:** Submit your writing and receive detailed, constructive feedback from the AI, which acts as a friendly English teacher.
*   **Corrected Versions & Suggestions:** Get a corrected version of your text along with key suggestions to help you understand and avoid future mistakes.

#### 🎙️ Dual-Mode Speaking Practice
*   **💬 Freestyle Mode:** Record yourself speaking freely on any topic to practice fluency and confidence.
*   **📖 Guided Practice Mode:** Let the AI generate a sentence tailored to your CEFR level for you to practice pronunciation and structure.
*   **🔊 AI Speech Analysis:** Your recordings are sent to the Gemini API for transcription and contextual feedback, comparing your speech to the target sentence in Guided Mode.
*   **Recording Management:** All your analyzed recordings are saved in the browser, complete with a delete function.

#### 🎧 Integrated Listening Practice
*   **Personal YouTube Library:** Add up to 5 of your favorite English-learning YouTube channels.
*   **📺 In-App Player:** Watch videos directly within the app in a clean, focused UI.
*   **🧠 Smart Note-Taking:** The video automatically pauses when you type in the notes area and can be resumed by pressing Enter.
*   **Timestamped Notes:** Your saved notes include the video title and the exact timestamp, making review easy.

#### ⚙️ Personalization & Workflow
*   **Centralized Notes Hub:** All your saved vocabulary and listening notes are collected in one organized "My Notes" page.
*   **📤 Export to Markdown:** Export all your notes as a single, beautifully formatted `.md` file, perfect for Notion, Obsidian, or any other note-taking tool.
*   **User-Managed API Key:** Securely save your personal Google AI Studio API key in the app's settings.
*   **💫 Light & Dark Modes:** Switch between a classic light theme and a sleek dark theme.
*   **Data Persistence:** Your level, channels, notes, and recordings are all saved in the browser's local storage.

---

### 🛠️ Tech Stack

*   **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
*   **Generative AI:** Google Generative AI (Gemini 1.5 Flash) via REST API
*   **APIs:**
    *   YouTube Data API v3 (for fetching channel videos)
    *   YouTube IFrame Player API (for embedding the video player)
    *   Free Dictionary API (`dictionaryapi.dev`)

---

### 🚀 Getting Started

To run this project locally, follow these simple steps.

#### 1. Clone the Repository
```bash
git clone https://github.com/your-username/ai-english-app.git
cd ai-english-app