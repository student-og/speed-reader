// Get references to all HTML elements
const textInput = document.getElementById('text-input');
const wpmInput = document.getElementById('wpm');
const chunkSizeInput = document.getElementById('chunkSize');
const startStopBtn = document.getElementById('start-stop-btn');
const displayWindow = document.getElementById('display-window');

let words = [];
let currentIndex = 0;
let isRunning = false;
let intervalId = null;

// Function to start or stop the reader
startStopBtn.addEventListener('click', () => {
    if (isRunning) {
        stopReader();
    } else {
        startReader();
    }
});

function startReader() {
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

    // 2. Calculate the interval duration from WPM
    // (60 seconds / WPM) * 1000 milliseconds
    const wpm = parseInt(wpmInput.value, 10);
    const interval = (60 / wpm) * 1000;

    // 3. Start the timer (setInterval)
    isRunning = true;
    startStopBtn.textContent = 'Stop';
    currentIndex = 0;

    intervalId = setInterval(() => {
        if (currentIndex >= words.length) {
            stopReader(); // Stop when text is finished
            return;
        }
        displayWindow.textContent = words[currentIndex];
        currentIndex++;
    }, interval);
}

function stopReader() {
    clearInterval(intervalId); // Stop the timer
    isRunning = false;
    startStopBtn.textContent = 'Start';
    displayWindow.textContent = ""; // Clear the display
}