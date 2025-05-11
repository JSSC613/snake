// 在 script.js 頂部初始化 Firebase 
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue, push, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0pp5DYUbd08eyFy8_6dZX92zMyG00xLw",
  authDomain: "game-think.firebaseapp.com",
  projectId: "game-think",
  storageBucket: "game-think.firebasestorage.app",
  messagingSenderId: "467980852911",
  appId: "1:467980852911:web:f9e1dc38f4bf223685be5a",
  measurementId: "G-Q1VGHT1PYN"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);



const board     = document.getElementById('game-board');
const scoreDisp = document.getElementById('score');
const overText  = document.getElementById('game-over');
const startBtn  = document.getElementById('start-button');
const boardSize = 19;

let snake, direction, food;
let score, baseSpeed, speed, boosting, snakeColor, gameInterval;

function getRandomColor() {
  return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6,'0');
}

startBtn.addEventListener('click', () => {
  startBtn.style.display = 'none';
  startGame();
});

function startGame() {
  snake       = [{ x: 10, y: 10 }];
  direction   = { x: 1, y: 0 };
  score       = 0;
  baseSpeed   = 300;
  speed       = baseSpeed;
  boosting    = false;
  snakeColor  = getRandomColor();
  food        = generateFood();
  updateScore();
  overText.classList.add('hidden');
  draw();
  clearInterval(gameInterval);
  gameInterval = setInterval(gameLoop, speed);
}

function updateScore() {
  scoreDisp.textContent = `得分:${score}`;
}

function gameLoop() {
  moveSnake();
  draw();
}

function draw() {
  board.innerHTML = '';
  drawFood();
  drawSnake();
}

function drawSnake() {
  snake.forEach(part => {
    const cell = document.createElement('div');
    cell.classList.add('cell', 'snake');
    cell.style.backgroundColor = snakeColor;
    setPosition(cell, part);
    board.appendChild(cell);
  });
}

function drawFood() {
  const cell = document.createElement('div');
  cell.classList.add('cell', 'food');
  cell.style.backgroundColor = food.color;
  setPosition(cell, food);
  board.appendChild(cell);
}

function setPosition(el, pos) {
  el.style.gridColumnStart = pos.x;
  el.style.gridRowStart    = pos.y;
}

function generateFood() {
  let p;
  while (true) {
    p = {
      x: Math.floor(Math.random() * boardSize) + 1,
      y: Math.floor(Math.random() * boardSize) + 1,
      color: getRandomColor()
    };
    if (!snake.some(s => s.x === p.x && s.y === p.y)) break;
  }
  return p;
}

function moveSnake() {
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  if (head.x < 1 || head.x > boardSize || head.y < 1 || head.y > boardSize
      || snake.some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score++;
    updateScore();
    if (score % 3 === 0) snakeColor = getRandomColor();
    baseSpeed = Math.max(50, baseSpeed - 10);
    speed     = boosting ? Math.max(50, baseSpeed / 2) : baseSpeed;
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, speed);
    food = generateFood();
  } else {
    snake.pop();
  }
}

function endGame() {
  clearInterval(gameInterval);
  overText.classList.remove('hidden');
  startBtn.textContent = '重新開始';
  startBtn.style.display = 'block';

  // 上傳分數
  if (playerName) {
    const scoresRef = ref(db, 'scores');
    push(scoresRef, {
      name: playerName,
      score: score,
      time: Date.now()
    });
  }
}


document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp':    if (direction.y === 0) direction = { x: 0, y: -1 }; break;
    case 'ArrowDown':  if (direction.y === 0) direction = { x: 0, y: 1 }; break;
    case 'ArrowLeft':  if (direction.x === 0) direction = { x: -1, y: 0 }; break;
    case 'ArrowRight': if (direction.x === 0) direction = { x: 1, y: 0 }; break;
    case ' ':
      e.preventDefault();
      if (!boosting) {
        boosting = true;
        speed = Math.max(50, baseSpeed / 2);
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, speed);
      }
      break;
  }
});

document.addEventListener('keyup', e => {
  if (e.key === ' ') {
    if (boosting) {
      boosting = false;
      speed = baseSpeed;
      clearInterval(gameInterval);
      gameInterval = setInterval(gameLoop, speed);
    }
  }
});
document.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault(); // 阻止預設行為，避免畫面捲動
  }

  // 以下為原本的方向控制
  switch (e.key) {
    case 'ArrowUp':    if (direction.y === 0) direction = { x: 0, y: -1 }; break;
    case 'ArrowDown':  if (direction.y === 0) direction = { x: 0, y: 1 }; break;
    case 'ArrowLeft':  if (direction.x === 0) direction = { x: -1, y: 0 }; break;
    case 'ArrowRight': if (direction.x === 0) direction = { x: 1, y: 0 }; break;
    case ' ':
      if (!boosting) {
        boosting = true;
        speed = Math.max(50, baseSpeed / 2);
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, speed);
      }
      break;
  }
});

let playerName = "";

document.getElementById('confirm-nickname').addEventListener('click', () => {
  const input = document.getElementById('nickname');
  playerName = input.value.trim();
  if (playerName) {
    document.getElementById('nickname-panel').style.display = 'none';
    document.getElementById('start-button').style.display = 'block';
  } else {
    alert("請輸入暱稱");
  }
});

function setupLeaderboard() {
  const scoresRef = query(ref(db, 'scores'), orderByChild('score'), limitToLast(10));

  onValue(scoresRef, snapshot => {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    const items = [];
    snapshot.forEach(child => {
      items.push(child.val());
    });
    items.reverse(); // 高分在上
    items.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.name}:${item.score}`; 
      list.appendChild(li);
    });
  });
}

setupLeaderboard();