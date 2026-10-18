
const API_URL = "http://127.0.0.1:5000";

const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");
const clickButton = document.getElementById("clickButton");
const startButton = document.getElementById("startButton");
const submitButton = document.getElementById("submitButton");
const usernameInput = document.getElementById("username");
const statusElement = document.getElementById("status");
const leaderboardList = document.getElementById("leaderboardList");

const durationButtons = document.querySelectorAll(".duration-button");
const customDurationButton = document.getElementById("customDurationButton");
const customDurationPanel = document.getElementById("customDurationPanel");
const customDurationInput = document.getElementById("customDuration");
const applyCustomDuration = document.getElementById("applyCustomDuration");
const selectedDurationText = document.getElementById("selectedDurationText");

const leaderboardDuration = document.getElementById("leaderboardDuration");
const customLeaderboardPanel = document.getElementById("customLeaderboardPanel");
const customLeaderboardDuration = document.getElementById("customLeaderboardDuration");
const applyLeaderboardDuration = document.getElementById("applyLeaderboardDuration");
const refreshButton = document.getElementById("refreshButton");

let score = 0;
let selectedDuration = 10;
let gameDuration = 10;
let running = false;
let finished = false;
let timerId = null;

function validDuration(value) {
    const duration = Number(value);
    return Number.isInteger(duration) && duration >= 1 && duration <= 300;
}

function updateDurationControls() {
    const locked = running || finished;

    durationButtons.forEach(button => {
        button.disabled = locked;
    });

    customDurationInput.disabled = locked;
    applyCustomDuration.disabled = locked;
}

function setDuration(duration, isCustom = false) {
    selectedDuration = duration;

    durationButtons.forEach(button => {
        button.classList.toggle(
            "selected",
            isCustom
                ? button === customDurationButton
                : Number(button.dataset.duration) === duration
        );
    });

    selectedDurationText.textContent = `Selected: ${duration} seconds`;
    timerElement.textContent = `${duration}s`;
}

durationButtons.forEach(button => {
    if (button === customDurationButton) return;

    button.addEventListener("click", () => {
        if (running || finished) return;

        customDurationPanel.hidden = true;
        setDuration(Number(button.dataset.duration));
    });
});

customDurationButton.addEventListener("click", () => {
    if (running || finished) return;

    customDurationPanel.hidden = !customDurationPanel.hidden;

    if (customDurationPanel.hidden) return;

    customDurationInput.value = selectedDuration;
    customDurationInput.focus();
});

applyCustomDuration.addEventListener("click", () => {
    if (running || finished) return;

    const value = Number(customDurationInput.value);

    if (!validDuration(value)) {
        statusElement.textContent =
            "Enter a whole number between 1 and 300 seconds.";
        return;
    }

    setDuration(value, true);
    customDurationPanel.hidden = true;
    statusElement.textContent = "Duration selected. Ready to play!";
});

clickButton.addEventListener("click", () => {
    if (!running) return;

    score++;
    scoreElement.textContent = score;
});

startButton.addEventListener("click", () => {
    if (running) return;

    if (!usernameInput.value.trim()) {
        statusElement.textContent = "Please enter a username first.";
        usernameInput.focus();
        return;
    }

    clearInterval(timerId);

    score = 0;
    gameDuration = selectedDuration;
    let endTime = Date.now() + gameDuration * 1000;

    running = true;
    finished = false;

    scoreElement.textContent = "0";
    timerElement.textContent = `${gameDuration}s`;

    clickButton.disabled = false;
    startButton.disabled = true;
    submitButton.disabled = true;
    usernameInput.disabled = true;

    updateDurationControls();
    statusElement.textContent = "Go! Go! Go!";

    timerId = setInterval(() => {
        const remaining = Math.max(0, endTime - Date.now());

        timerElement.textContent =
            `${Math.ceil(remaining / 1000)}s`;

        if (remaining <= 0) {
            clearInterval(timerId);
            running = false;
            finished = true;

            clickButton.disabled = true;
            startButton.disabled = false;
            submitButton.disabled = false;
            usernameInput.disabled = false;

            updateDurationControls();

            statusElement.textContent =
                `Time's up! ${score} clicks in ${gameDuration} seconds.`;
        }
    }, 50);
});

submitButton.addEventListener("click", async () => {
    if (!finished) return;

    submitButton.disabled = true;
    statusElement.textContent = "Submitting score...";

    try {
        const response = await fetch(`${API_URL}/score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: usernameInput.value.trim(),
                score: score,
                duration: gameDuration
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Submission failed");
        }

        statusElement.textContent = "Score submitted successfully!";
        finished = false;
        updateDurationControls();

        await loadLeaderboard();
    } catch (error) {
        statusElement.textContent =
            `Error: ${error.message}. Is the backend running?`;
    } finally {
        submitButton.disabled = !finished;
    }
});

function getLeaderboardDuration() {
    if (leaderboardDuration.value !== "custom") {
        return Number(leaderboardDuration.value);
    }

    const value = Number(customLeaderboardDuration.value);

    if (!validDuration(value)) {
        throw new Error("Enter a custom duration from 1 to 300 seconds.");
    }

    return value;
}

async function loadLeaderboard() {
    try {
        const duration = getLeaderboardDuration();

        leaderboardList.replaceChildren();

        const loadingItem = document.createElement("li");
        loadingItem.textContent = "Loading leaderboard...";
        leaderboardList.appendChild(loadingItem);

        const response = await fetch(
            `${API_URL}/leaderboard?duration=${duration}`
        );

        if (!response.ok) {
            throw new Error("Could not load scores");
        }

        const scores = await response.json();
        leaderboardList.replaceChildren();

        if (scores.length === 0) {
            const item = document.createElement("li");
            item.textContent =
                `No scores for ${duration} seconds yet. Be the first!`;
            leaderboardList.appendChild(item);
            return;
        }

        scores.forEach((entry) => {
            const item = document.createElement("li");
            item.textContent =
                `${entry.username} — ${entry.score} clicks`;
            leaderboardList.appendChild(item);
        });
    } catch (error) {
        leaderboardList.replaceChildren();

        const item = document.createElement("li");
        item.textContent = error.message || "Unable to load leaderboard.";
        leaderboardList.appendChild(item);
    }
}

leaderboardDuration.addEventListener("change", () => {
    const isCustom = leaderboardDuration.value === "custom";
    customLeaderboardPanel.hidden = !isCustom;

    if (!isCustom) {
        loadLeaderboard();
    } else {
        leaderboardList.replaceChildren();
        const item = document.createElement("li");
        item.textContent = "Enter a custom duration to view its rankings.";
        leaderboardList.appendChild(item);
        customLeaderboardDuration.focus();
    }
});

applyLeaderboardDuration.addEventListener("click", loadLeaderboard);
refreshButton.addEventListener("click", loadLeaderboard);

setDuration(10);
updateDurationControls();
loadLeaderboard();
