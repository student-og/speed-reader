// Get references to all HTML elements
const textInput = document.getElementById('text-input');
const wpmInput = document.getElementById('wpm');
const chunkSizeInput = document.getElementById('chunkSize');
const startStopBtn = document.getElementById('start-stop-btn');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const displayWindow = document.getElementById('display-window');

// Statistics elements
const positionStat = document.getElementById('position-stat');
const wordsStat = document.getElementById('words-stat');
const timeStat = document.getElementById('time-stat');
const remainingStat = document.getElementById('remaining-stat');

// Add a progress indicator
let progressBar = document.getElementById('progress-bar');
if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'progress-bar';
    progressBar.style.width = '90%';
    progressBar.style.maxWidth = '700px';
    progressBar.style.height = '8px';
    progressBar.style.background = '#e0e7ff';
    progressBar.style.borderRadius = '4px';
    progressBar.style.marginTop = '12px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.boxShadow = '0 1px 4px rgba(44,62,80,0.07)';
    const inner = document.createElement('div');
    inner.id = 'progress-inner';
    inner.style.height = '100%';
    inner.style.width = '0%';
    inner.style.background = 'linear-gradient(90deg,#007bff 60%,#0056b3 100%)';
    inner.style.borderRadius = '4px';
    inner.style.transition = 'width 0.2s';
    progressBar.appendChild(inner);
    displayWindow.parentNode.insertBefore(progressBar, displayWindow.nextSibling);
}

let words = [];
let currentIndex = 0;
let isRunning = false;
let isPaused = false;
let intervalId = null;
let startTime = null;
let elapsedTime = 0;
let totalWords = 0;

// Event listeners
startStopBtn.addEventListener('click', () => {
    if (isRunning && !isPaused) {
        pauseReader();
    } else if (isRunning && isPaused) {
        resumeReader();
    } else {
        startReader();
    }
});

rewindBtn.addEventListener('click', () => {
    if (words.length > 0 && currentIndex > 0) {
        currentIndex--;
        updateDisplay();
        updateProgress();
        updateStats();
        saveReadingPosition();
    }
});

forwardBtn.addEventListener('click', () => {
    if (words.length > 0 && currentIndex < words.length - 1) {
        currentIndex++;
        updateDisplay();
        updateProgress();
        updateStats();
        saveReadingPosition();
    }
});

// Make progress bar clickable
progressBar.addEventListener('click', (e) => {
    if (words.length === 0) return;
    
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const clickPercent = clickX / progressWidth;
    
    const newIndex = Math.floor(clickPercent * words.length);
    currentIndex = Math.max(0, Math.min(newIndex, words.length - 1));
    
    updateDisplay();
    updateProgress();
    updateStats();
    saveReadingPosition();
});

function validateInputs() {
    const wpm = parseInt(wpmInput.value, 10);
    const chunkSize = parseInt(chunkSizeInput.value, 10);
    if (isNaN(wpm) || wpm < 50 || wpm > 2000) {
        alert('WPM must be a number between 50 and 2000.');
        return false;
    }
    if (isNaN(chunkSize) || chunkSize < 1 || chunkSize > 20) {
        alert('Words per flash must be between 1 and 20.');
        return false;
    }
    return true;
}

function startReader() {
    if (!validateInputs()) return;
    const rawText = textInput.value;
    if (rawText.trim() === "") {
        alert("Please paste some text to read.");
        return;
    }

    // 1. Process the text into word chunks
    const allWords = rawText.trim().split(/\s+/); // Split by any whitespace
    const chunkSize = parseInt(chunkSizeInput.value, 10);
    words = [];
    for (let i = 0; i < allWords.length; i += chunkSize) {
        words.push(allWords.slice(i, i + chunkSize).join(" "));
    }
    if (words.length === 0) {
        alert('No words found in the input.');
        return;
    }

    // Calculate total words for statistics
    totalWords = allWords.length;

    // 2. Calculate the interval duration from WPM
    const wpm = parseInt(wpmInput.value, 10);
    const interval = (60 / wpm) * 1000;

    // 3. Restore reading position if available
    const savedPosition = loadReadingPosition();
    if (savedPosition && savedPosition.text === rawText.trim()) {
        currentIndex = savedPosition.position;
    } else {
        currentIndex = 0;
    }

    // 4. Start the timer (setInterval)
    isRunning = true;
    isPaused = false;
    startStopBtn.textContent = 'Pause';
    startTime = Date.now() - elapsedTime;
    
    updateDisplay();
    updateProgress();
    updateStats();
    updateButtonStates();

    intervalId = setInterval(() => {
        if (isPaused) return;
        currentIndex++;
        if (currentIndex >= words.length) {
            stopReader(); // Stop when text is finished
            return;
        }
        updateDisplay();
        updateProgress();
        updateStats();
        saveReadingPosition();
    }, interval);
}

function pauseReader() {
    isPaused = true;
    startStopBtn.textContent = 'Resume';
    if (startTime) {
        elapsedTime = Date.now() - startTime;
    }
    updateButtonStates();
}

function resumeReader() {
    isPaused = false;
    startStopBtn.textContent = 'Pause';
    startTime = Date.now() - elapsedTime;
    updateButtonStates();
}

function stopReader() {
    clearInterval(intervalId); // Stop the timer
    isRunning = false;
    isPaused = false;
    startStopBtn.textContent = 'Start';
    displayWindow.textContent = ""; // Clear the display
    updateProgress(0);
    elapsedTime = 0;
    startTime = null;
    updateStats();
    updateButtonStates();
    clearReadingPosition();
}

function updateProgress(forceZero) {
    const inner = document.getElementById('progress-inner');
    if (!inner) return;
    if (forceZero === 0) {
        inner.style.width = '0%';
        return;
    }
    if (!words.length) {
        inner.style.width = '0%';
        return;
    }
    const percent = Math.min(100, Math.round((currentIndex + 1) / words.length * 100));
    inner.style.width = percent + '%';
}

function updateDisplay() {
    if (words.length > 0 && currentIndex >= 0 && currentIndex < words.length) {
        displayWindow.textContent = words[currentIndex];
    }
}

function updateStats() {
    // Update position
    positionStat.textContent = words.length > 0 ? `${currentIndex + 1} / ${words.length}` : '0 / 0';
    
    // Update total words
    wordsStat.textContent = totalWords.toString();
    
    // Update elapsed time
    const currentElapsedTime = isRunning && !isPaused && startTime ? Date.now() - startTime : elapsedTime;
    const elapsedSeconds = Math.floor(currentElapsedTime / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    timeStat.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update estimated remaining time
    if (isRunning && words.length > 0 && currentIndex < words.length) {
        const wpm = parseInt(wpmInput.value, 10);
        const wordsRemaining = words.length - currentIndex - 1;
        const timePerChunk = (60 / wpm) * 1000; // milliseconds per chunk
        const remainingMs = wordsRemaining * timePerChunk;
        const remainingSeconds = Math.floor(remainingMs / 1000);
        const remMinutes = Math.floor(remainingSeconds / 60);
        const remSecs = remainingSeconds % 60;
        remainingStat.textContent = `${remMinutes.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
    } else {
        remainingStat.textContent = '--:--';
    }
}

function updateButtonStates() {
    // Update rewind/forward buttons
    rewindBtn.disabled = words.length === 0 || currentIndex <= 0;
    forwardBtn.disabled = words.length === 0 || currentIndex >= words.length - 1;
}

function saveReadingPosition() {
    if (words.length > 0) {
        const position = {
            text: textInput.value.trim(),
            position: currentIndex,
            timestamp: Date.now()
        };
        localStorage.setItem('speedReaderPosition', JSON.stringify(position));
    }
}

function loadReadingPosition() {
    try {
        const saved = localStorage.getItem('speedReaderPosition');
        if (saved) {
            const position = JSON.parse(saved);
            // Only restore if saved within last 24 hours
            if (Date.now() - position.timestamp < 24 * 60 * 60 * 1000) {
                return position;
            }
        }
    } catch (e) {
        console.warn('Error loading reading position:', e);
    }
    return null;
}

function clearReadingPosition() {
    localStorage.removeItem('speedReaderPosition');
}

// Allow keyboard shortcuts: Space to start/pause/resume, Esc to stop, Arrow keys for navigation
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        startStopBtn.click();
    } else if (e.code === 'Escape') {
        stopReader();
    } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        rewindBtn.click();
    } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        forwardBtn.click();
    }
});

// Initialize statistics on page load
document.addEventListener('DOMContentLoaded', () => {
    updateStats();
    updateButtonStates();
    
    // Check for saved reading position and show notification
    const saved = loadReadingPosition();
    if (saved && textInput.value.trim() === '') {
        // Could restore text here if desired, but for now just update UI
        updateStats();
        updateButtonStates();
    }
});