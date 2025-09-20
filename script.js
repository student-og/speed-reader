// Get references to all HTML elements
const textInput = document.getElementById('text-input');
const wpmInput = document.getElementById('wpm');
const chunkSizeInput = document.getElementById('chunkSize');
const startStopBtn = document.getElementById('start-stop-btn');
const displayWindow = document.getElementById('display-window');

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

// Function to start, pause, resume, or stop the reader
startStopBtn.addEventListener('click', () => {
    if (isRunning && !isPaused) {
        pauseReader();
    } else if (isRunning && isPaused) {
        resumeReader();
    } else {
        startReader();
    }
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

    // 2. Calculate the interval duration from WPM
    // (60 seconds / WPM) * 1000 milliseconds
    const wpm = parseInt(wpmInput.value, 10);
    const interval = (60 / wpm) * 1000;

    // 3. Start the timer (setInterval)
    isRunning = true;
    isPaused = false;
    startStopBtn.textContent = 'Pause';
    currentIndex = 0;
    updateProgress();
    displayWindow.textContent = words[currentIndex];

    intervalId = setInterval(() => {
        if (isPaused) return;
        currentIndex++;
        if (currentIndex >= words.length) {
            stopReader(); // Stop when text is finished
            return;
        }
        displayWindow.textContent = words[currentIndex];
        updateProgress();
    }, interval);
}

function pauseReader() {
    isPaused = true;
    startStopBtn.textContent = 'Resume';
}

function resumeReader() {
    isPaused = false;
    startStopBtn.textContent = 'Pause';
}

function stopReader() {
    clearInterval(intervalId); // Stop the timer
    isRunning = false;
    isPaused = false;
    startStopBtn.textContent = 'Start';
    displayWindow.textContent = ""; // Clear the display
    updateProgress(0);
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

// Allow keyboard shortcuts: Space to start/pause/resume, Esc to stop
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') {
        e.preventDefault();
        startStopBtn.click();
    } else if (e.code === 'Escape') {
        stopReader();
    }
});