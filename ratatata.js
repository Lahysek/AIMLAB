const TOTAL_TARGETS = 30;
const MAX_SIMULTANEOUS = 3;
const PADDING = 55;

let gameRunning = false;
let hitCount = 0;
let missCount = 0;
let startTime = 0;
let activeTargets = [];
let displayTimer = null;
let countdownTimer = null;

const arena       = document.getElementById('arena');
const progressBar = document.getElementById('progress-bar');
const countdownEl = document.getElementById('countdown');
const resultsEl   = document.getElementById('results');

function goMenu() {
  resetState();
  document.getElementById('menu').style.display = 'flex';
  document.getElementById("logged-user").style.display = "block";
  document.getElementById('game').style.display = 'none';
  document.getElementById('reaction-game').style.display = 'none';
}


function startGame() {
  resetState();
  document.getElementById('menu').style.display = 'none';
  document.getElementById("logged-user").style.display = "none";
  document.getElementById('game').style.display = 'flex';
  resultsEl.style.display = 'none';
  countdownEl.style.display = 'flex';

  runCountdown(3, () => {
    countdownEl.style.display = 'none';
    gameRunning = true;
    startTime = performance.now();
    startDisplayTimer();
    fillTargets();
  });
}
document.getElementById("logged-user").style.display = "none";

function resetState() {
  gameRunning = false;
  hitCount = 0;
  missCount = 0;
  clearInterval(displayTimer);
  clearTimeout(countdownTimer);
  activeTargets = [];
  document.querySelectorAll('.target').forEach(t => t.remove());
  progressBar.style.width = '0%';
  updateHUD();
}

function runCountdown(n, cb) {
  const el = document.getElementById('countdown-num');
  el.style.color = '#fff';

  function tick(n) {

    el.style.animation = 'none';
    void el.offsetHeight;
    el.style.animation = 'cPulse 0.55s ease-in-out';

    if (n === 0) {

      el.textContent = 'GO!';
      el.style.color = '#ff3c3c';
      countdownTimer = setTimeout(cb, 500);
    } else {
      el.textContent = n;
      countdownTimer = setTimeout(() => tick(n - 1), 700);
    }
  }
  tick(n);
}

function startDisplayTimer() {
  displayTimer = setInterval(() => {
    if (!gameRunning) return;
    const elapsed = (performance.now() - startTime) / 1000;
    document.getElementById('stat-time').textContent = elapsed.toFixed(2) + 's';
  }, 50);
}

function updateHUD() {
  document.getElementById('stat-hits').textContent = `${hitCount}/${TOTAL_TARGETS}`;
  document.getElementById('stat-miss').textContent = missCount;
  progressBar.style.width = (hitCount / TOTAL_TARGETS * 100) + '%';
}

function fillTargets() {
  const needed = Math.min(MAX_SIMULTANEOUS, TOTAL_TARGETS - hitCount) - activeTargets.length;
  for (let i = 0; i < needed; i++) spawnTarget();
}

function spawnTarget() {
  const rect = arena.getBoundingClientRect();

  const x = PADDING + Math.random() * (rect.width  - PADDING * 2);
  const y = PADDING + Math.random() * (rect.height - PADDING * 2);

  const t = document.createElement('div');
  t.className = 'target';
  t.style.left = x + 'px';
  t.style.top  = y + 'px';
  t.innerHTML  = '<div class="target-inner"></div>';
  arena.appendChild(t);
  activeTargets.push(t);

  requestAnimationFrame(() => t.classList.add('show'));

  t.addEventListener('click', onHit);
  t.addEventListener('mousedown', e => e.stopPropagation());
}

function onHit(e) {
  if (!gameRunning) return;
  const t = e.currentTarget;

  activeTargets = activeTargets.filter(x => x !== t);

  t.classList.remove('show');
  spawnRipple(t.style.left, t.style.top);
  setTimeout(() => t.remove(), 180);

  hitCount++;
  updateHUD();

  if (hitCount >= TOTAL_TARGETS) {
    endGame();
    return;
  }

  setTimeout(fillTargets, 80);
}

arena.addEventListener('click', e => {
  if (!gameRunning) return;

  const ignore = ['target', 'target-inner', 'progress-bar', 'ripple'];
  if (ignore.some(c => e.target.classList.contains(c))) return;

  missCount++;
  updateHUD();

  arena.classList.remove('miss-flash');
  void arena.offsetHeight;
  arena.classList.add('miss-flash');
});

function spawnRipple(left, top) {
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.left   = left;
  r.style.top    = top;
  r.style.width  = '52px';
  r.style.height = '52px';
  arena.appendChild(r);
  setTimeout(() => r.remove(), 420);
}

async function endGame() {

  console.log("ENDGAME");
  gameRunning = false;

  clearInterval(displayTimer);

  const totalTime = (performance.now() - startTime) / 1000;

  const avgMs = Math.round(totalTime / TOTAL_TARGETS * 1000);

  document.getElementById('res-time').textContent =
    totalTime.toFixed(3);

  document.getElementById('rs-hits').textContent =
    TOTAL_TARGETS;

  document.getElementById('rs-miss').textContent =
    missCount;

  document.getElementById('rs-avg').textContent =
    avgMs + 'ms';

  document.querySelectorAll('.target').forEach(t => t.remove());

  activeTargets = [];

  resultsEl.style.display = 'flex';

  await saveScore(totalTime, "speed");

  await loadLeaderboard();
}

const RT_ROUNDS      = 5;
const RT_DELAY_MIN   = 1000;
const RT_DELAY_MAX   = 4000;
const RT_PADDING     = 80;

let rtRound        = 0;
let rtTimes        = [];
let rtEarlyCount   = 0;
let rtWaitingForTarget = false;
let rtTargetVisible    = false;
let rtTargetTime       = 0;
let rtDelayTimeout     = null;
let rtTarget           = null;

const rtArena    = document.getElementById('reaction-arena');
const rtWaiting  = document.getElementById('rt-waiting');
const rtTooEarly = document.getElementById('rt-tooearly');
const rtResults  = document.getElementById('rt-results');

function startReactionGame() {

  document.getElementById('menu').style.display = 'none';
  document.getElementById("logged-user").style.display = "none";
  document.getElementById('game').style.display = 'none';

  rtRound        = 0;
  rtTimes        = [];
  rtEarlyCount   = 0;
  rtWaitingForTarget = false;
  rtTargetVisible    = false;
  clearTimeout(rtDelayTimeout);
  removeRtTarget();

  document.getElementById('menu').style.display        = 'none';
  document.getElementById('game').style.display        = 'none';
  document.getElementById('reaction-game').style.display = 'flex';
  rtResults.style.display  = 'none';
  rtTooEarly.style.display = 'none';
  rtWaiting.style.display  = 'flex';

  updateRtHUD();
  nextRtRound();
}

function nextRtRound() {
  rtRound++;
  updateRtHUD();

  rtWaiting.style.display  = 'flex';
  rtTooEarly.style.display = 'none';
  removeRtTarget();

  rtWaitingForTarget = true;
  rtTargetVisible    = false;

  const delay = RT_DELAY_MIN + Math.random() * (RT_DELAY_MAX - RT_DELAY_MIN);
  rtDelayTimeout = setTimeout(showRtTarget, delay);
}

function showRtTarget() {
  rtWaitingForTarget = false;
  rtTargetVisible    = true;

  const rect = rtArena.getBoundingClientRect();
  const x = RT_PADDING + Math.random() * (rect.width  - RT_PADDING * 2);
  const y = RT_PADDING + Math.random() * (rect.height - RT_PADDING * 2);

  rtTarget = document.createElement('div');
  rtTarget.id = 'rt-target';
  rtTarget.style.left = x + 'px';
  rtTarget.style.top  = y + 'px';
  rtTarget.innerHTML  = '<div id="rt-target-inner"></div>';
  rtArena.appendChild(rtTarget);

  requestAnimationFrame(() => rtTarget.classList.add('show'));

  rtTargetTime = performance.now();
  rtWaiting.style.display = 'none';
}

rtArena.addEventListener('click', function(e) {

  if (rtResults.style.display === 'flex') return;

  if (rtTargetVisible) {

    const t = document.getElementById('rt-target');
    if (!t) return;
    const tr = t.getBoundingClientRect();
    const hit = (
      e.clientX >= tr.left && e.clientX <= tr.right &&
      e.clientY >= tr.top  && e.clientY <= tr.bottom
    );
    if (hit) {
      onRtHit(e.clientX, e.clientY);
    }

  } else if (rtWaitingForTarget) {

    onRtTooEarly();
  }
});

function onRtHit(cx, cy) {
  const reactionMs = Math.round(performance.now() - rtTargetTime);
  rtTimes.push(reactionMs);

  const popup = document.createElement('div');
  popup.className = 'rt-hit-popup';
  popup.textContent = reactionMs + 'ms';

  const arenaRect = rtArena.getBoundingClientRect();
  popup.style.left = (cx - arenaRect.left) + 'px';
  popup.style.top  = (cy - arenaRect.top)  + 'px';
  rtArena.appendChild(popup);
  setTimeout(() => popup.remove(), 950);

  const t = document.getElementById('rt-target');
  if (t) spawnRtRipple(t.style.left, t.style.top);

  removeRtTarget();
  rtTargetVisible = false;

  updateRtHUD();

  if (rtRound >= RT_ROUNDS) {
    setTimeout(showRtResults, 600);
  } else {
    setTimeout(nextRtRound, 700);
  }
}

function onRtTooEarly() {
  rtEarlyCount++;
  clearTimeout(rtDelayTimeout);
  rtWaitingForTarget = false;

  rtTooEarly.style.display = 'none';
  void rtTooEarly.offsetHeight;
  rtTooEarly.style.display = 'flex';
  rtWaiting.style.display  = 'none';

  rtDelayTimeout = setTimeout(() => {
    rtTooEarly.style.display = 'none';
    rtWaitingForTarget = true;
    const delay = RT_DELAY_MIN + Math.random() * (RT_DELAY_MAX - RT_DELAY_MIN);
    rtWaiting.style.display = 'flex';
    rtDelayTimeout = setTimeout(showRtTarget, delay);
  }, 1200);
}

function showRtResults() {
  rtTargetVisible    = false;
  rtWaitingForTarget = false;

  const avg   = Math.round(rtTimes.reduce((a, b) => a + b, 0) / rtTimes.length);
  const best  = Math.min(...rtTimes);
  const worst = Math.max(...rtTimes);

  document.getElementById('rt-res-avg').textContent  = avg;
  document.getElementById('rt-rs-best').textContent  = best  + 'ms';
  document.getElementById('rt-rs-worst').textContent = worst + 'ms';
  document.getElementById('rt-rs-early').textContent = rtEarlyCount;

  rtWaiting.style.display  = 'none';
  rtTooEarly.style.display = 'none';
  rtResults.style.display  = 'flex';
}

function removeRtTarget() {
  const t = document.getElementById('rt-target');
  if (t) {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 150);
  }
}

function spawnRtRipple(left, top) {
  const r = document.createElement('div');
  r.className = 'ripple';
  r.style.left   = left;
  r.style.top    = top;
  r.style.width  = '72px';
  r.style.height = '72px';
  r.style.borderColor = '#ffaa00';
  rtArena.appendChild(r);
  setTimeout(() => r.remove(), 420);
}

function updateRtHUD() {
  document.getElementById('rt-stat-round').textContent = `${rtRound}/${RT_ROUNDS}`;
  const last = rtTimes[rtTimes.length - 1];
  const best = rtTimes.length ? Math.min(...rtTimes) : null;
  document.getElementById('rt-stat-last').textContent = last != null ? last + 'ms' : '—';
  document.getElementById('rt-stat-best').textContent = best != null ? best + 'ms' : '—';
}

let authMode = "login";

function openLogin() {

  authMode = "login";

  document.getElementById("auth-title").textContent = "PŘIHLÁŠENÍ";

  document.getElementById("auth-modal").style.display = "flex";
}

function openRegister() {

  authMode = "register";

  document.getElementById("auth-title").textContent = "REGISTRACE";

  document.getElementById("auth-modal").style.display = "flex";
}

function closeAuth() {

  document.getElementById("auth-modal").style.display = "none";
}

document.getElementById("auth-submit").addEventListener("click", async () => {

  const username = document.getElementById("username").value;

  const password = document.getElementById("password").value;

  const response = await fetch(`http://localhost:3000/api/${authMode}`, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({
      username,
      password
    })
  });

  const data = await response.json();

  alert(data.message || "Přihlášení úspěšné");
  
  if(data.token){

  localStorage.setItem("token", data.token);

  localStorage.setItem("username", data.username);

  document.getElementById("auth-buttons").style.display = "none";

  document.getElementById("logged-user").textContent =
    "👤 PŘIHLÁŠEN: " + data.username;

  closeAuth();
}

  console.log(data);
});

window.onload = () => {

  document.getElementById("logged-user").style.display = "block";

  const username = localStorage.getItem("username");

  if(username){

    document.getElementById("auth-buttons").style.display = "none";

    document.getElementById("logged-user").textContent =
      "👤 PŘIHLÁŠEN: " + username;
  }

  loadLeaderboard();
};

async function saveScore(score, mode){

  console.log("SAVE SCORE");

  try {

    const username = localStorage.getItem("username");

    if(!username) return;

    const response = await fetch(
      "http://localhost:3000/api/score",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          username,
          score,
          mode
        })
      }
    );

    const data = await response.json();

    console.log(data);

  } catch(err){

    console.error(err);
  }
}

async function loadLeaderboard(){

  const response = await fetch(
    "http://localhost:3000/api/leaderboard/speed"
  );

  const data = await response.json();

  const leaderboard =
    document.getElementById("leaderboard-content");

  leaderboard.innerHTML = "";

  data.forEach((player, index) => {

    leaderboard.innerHTML += `

      <div class="lb-item">

        <span>
          #${index + 1} ${player.username}
        </span>

        <span>
          ${player.score.toFixed(2)}s • ${player.mode}
        </span>

      </div>
    `;
  });
}