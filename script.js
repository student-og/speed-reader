// Get references to all HTML elements
const textInput = document.getElementById('text-input');
const wpmInput = document.getElementById('wpm');
const chunkSizeInput = document.getElementById('chunkSize');
const comprehensionBreakInput = document.getElementById('comprehension-break');
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

// Reading statistics
let readingStats = {
    startTime: null,
    totalWordsRead: 0,
    sessionWordsRead: 0,
    pausedTime: 0,
    actualWPM: 0,
    targetWPM: 0
};

// Comprehension break tracking
let comprehensionBreakCounter = 0;
const COMPREHENSION_BREAK_INTERVAL = 50; // Every 50 words

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

    // 3. Initialize reading statistics
    readingStats.startTime = Date.now();
    readingStats.sessionWordsRead = 0;
    readingStats.targetWPM = wpm;
    readingStats.pausedTime = 0;
    comprehensionBreakCounter = 0;
    updateTargetWPM(wpm);

    // 4. Start the timer (setInterval)
    isRunning = true;
    isPaused = false;
    startStopBtn.textContent = 'Pause';
    currentIndex = 0;
    updateProgress();
    displayWindow.innerHTML = processTextChunk(words[currentIndex]);
    updateReadingStats();

    intervalId = setInterval(() => {
        if (isPaused) return;
        currentIndex++;
        if (currentIndex >= words.length) {
            completeReading(); // Complete reading with summary
            return;
        }
        
        // Check for comprehension break
        if (comprehensionBreakInput.checked && shouldTakeComprehensionBreak()) {
            pauseForComprehension();
            return;
        }
        
        displayWindow.innerHTML = processTextChunk(words[currentIndex]);
        updateProgress();
        updateReadingStats();
    }, interval);
}

function pauseReader() {
    isPaused = true;
    readingStats.pauseStartTime = Date.now();
    startStopBtn.textContent = 'Resume';
}

function resumeReader() {
    isPaused = false;
    if (readingStats.pauseStartTime) {
        readingStats.pausedTime += Date.now() - readingStats.pauseStartTime;
        readingStats.pauseStartTime = null;
    }
    startStopBtn.textContent = 'Pause';
}

function stopReader() {
    clearInterval(intervalId); // Stop the timer
    isRunning = false;
    isPaused = false;
    startStopBtn.textContent = 'Start';
    displayWindow.innerHTML = ""; // Clear the display
    updateProgress(0);
    resetReadingStats();
}

function completeReading() {
    clearInterval(intervalId);
    isRunning = false;
    isPaused = false;
    startStopBtn.textContent = 'Start';
    
    // Show completion message with final stats
    const totalTime = (Date.now() - readingStats.startTime - readingStats.pausedTime) / 1000;
    const totalWords = countWordsInChunks();
    const finalWPM = Math.round((totalWords / totalTime) * 60);
    
    displayWindow.innerHTML = `
        <div style="font-size: 1.5rem; text-align: center; line-height: 1.4;">
            <div style="color: #28a745; margin-bottom: 10px;">✓ Reading Complete!</div>
            <div style="font-size: 1rem;">
                ${totalWords} words in ${Math.round(totalTime)}s<br>
                Average: ${finalWPM} WPM
            </div>
        </div>
    `;
    
    updateProgress(0);
}

function updateReadingStats() {
    if (!readingStats.startTime) return;
    
    const currentTime = Date.now();
    const elapsedTime = (currentTime - readingStats.startTime - readingStats.pausedTime) / 1000;
    const wordsRead = countWordsUpToIndex(currentIndex + 1);
    
    // Update stats
    readingStats.sessionWordsRead = wordsRead;
    readingStats.actualWPM = elapsedTime > 0 ? Math.round((wordsRead / elapsedTime) * 60) : 0;
    
    // Update display
    document.getElementById('words-read').textContent = wordsRead;
    document.getElementById('time-elapsed').textContent = formatTime(elapsedTime);
    document.getElementById('actual-wpm').textContent = readingStats.actualWPM;
}

function resetReadingStats() {
    readingStats = {
        startTime: null,
        totalWordsRead: 0,
        sessionWordsRead: 0,
        pausedTime: 0,
        actualWPM: 0,
        targetWPM: parseInt(wpmInput.value, 10)
    };
    
    document.getElementById('words-read').textContent = '0';
    document.getElementById('time-elapsed').textContent = '0:00';
    document.getElementById('actual-wpm').textContent = '0';
}

function updateTargetWPM(wpm) {
    document.getElementById('target-wpm').textContent = wpm;
}

function countWordsInChunks() {
    return words.reduce((total, chunk) => total + chunk.split(/\s+/).length, 0);
}

function countWordsUpToIndex(index) {
    if (index <= 0) return 0;
    return words.slice(0, index).reduce((total, chunk) => total + chunk.split(/\s+/).length, 0);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function shouldTakeComprehensionBreak() {
    const wordsRead = countWordsUpToIndex(currentIndex + 1);
    const breakPoint = (comprehensionBreakCounter + 1) * COMPREHENSION_BREAK_INTERVAL;
    return wordsRead >= breakPoint;
}

function pauseForComprehension() {
    isPaused = true;
    comprehensionBreakCounter++;
    
    displayWindow.innerHTML = `
        <div style="font-size: 1.5rem; text-align: center; line-height: 1.4; color: #007bff;">
            <div style="margin-bottom: 10px;">🤔 Comprehension Break</div>
            <div style="font-size: 1rem; color: #2d3a4a;">
                Take a moment to reflect on what you've read.<br>
                <button onclick="resumeFromComprehension()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Continue Reading</button>
            </div>
        </div>
    `;
    
    // Auto-resume after 10 seconds if not manually resumed
    setTimeout(() => {
        if (isPaused && isRunning) {
            resumeFromComprehension();
        }
    }, 10000);
}

function processTextChunk(chunk) {
    // Highlight important words (capitalized words, longer words, etc.)
    const words = chunk.split(' ');
    const processedWords = words.map(word => {
        const cleanWord = word.replace(/[^\w]/g, '');
        
        // Highlight criteria: capitalized words, long words (7+ chars), common important words
        const importantWords = ['important', 'critical', 'significant', 'essential', 'key', 'main', 'primary', 'conclusion', 'result', 'therefore', 'however', 'because'];
        
        if (cleanWord.length >= 7 || 
            /^[A-Z]/.test(cleanWord) || 
            importantWords.some(iw => cleanWord.toLowerCase().includes(iw.toLowerCase()))) {
            return `<span style="color: #e74c3c; font-weight: 600;">${word}</span>`;
        }
        return word;
    });
    
    return processedWords.join(' ');
}

function resumeFromComprehension() {
    if (!isRunning) return;
    isPaused = false;
    displayWindow.innerHTML = processTextChunk(words[currentIndex]);
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