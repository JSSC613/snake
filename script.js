import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
// 確保引入 get 函式
import { getDatabase, ref, set, onValue, push, query, orderByChild, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

// DOM 元素
const board     = document.getElementById('game-board');
const scoreDisp = document.getElementById('score');
const overText  = document.getElementById('game-over'); // 遊戲結束文字
const startBtn  = document.getElementById('start-button'); // 開始按鈕
const boardSize = 19;

// 遊戲變數
let snake, direction, food;
let score, baseSpeed, speed, boosting, snakeColor, gameInterval;
let playerName = "";
// 遊戲時間變數
let playTimerInterval = null;
let playSeconds = 0;
let isGameOver = false; // 新增遊戲結束狀態旗標

// 工具函式
function getRandomColor() {
  return '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6,'0');
}

function updateScoreDisplay() { // 函式名稱稍微修改，更明確是更新分數顯示
  scoreDisp.textContent = `得分:${score}`;
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

// ====================================================
// 排行榜相關函式

// 將上傳分數的邏輯獨立成一個函式
function uploadScoreToLeaderboard(name, finalScore, durationSeconds) {
  if (!name) {
    console.warn("Player name not set, score not uploaded to leaderboard.");
    return;
  }

  // 使用玩家暱稱作為資料庫的鍵，這樣同一個玩家只會有一筆紀錄
  const playerRef = ref(db, "scores/" + name);

  // 使用 get 讀取現有數據
  get(playerRef).then(snapshot => {
    const data = snapshot.val();
    // 如果該玩家沒有紀錄 (data === null)，或者本次分數 (finalScore) 比現有紀錄的分數 (data.score) 高
    if (data === null || finalScore > data.score) {
      console.log(`Uploading new high score for ${name}: ${finalScore} points in ${durationSeconds}s.`);
      // 使用 set 覆寫或新建該玩家的紀錄
      set(playerRef, {
        name: name, // 存儲玩家名稱
        score: finalScore, // 存儲得分 (這個是分數，不是時間)
        time: durationSeconds // 存儲計算好的遊戲持續時間 (秒)
      });
    } else {
      console.log(`Current score ${finalScore} is not a high score for ${name}. High score is ${data.score}.`);
    }
  }).catch(error => {
    console.error("Error uploading score:", error);
  });
}


// 遊戲初始化與啟動
function startGame() {
  isGameOver = false; // 重設遊戲結束狀態
  snake       = [{ x: 10, y: 10 }];
  direction   = { x: 1, y: 0 };
  score       = 0;
  baseSpeed   = 500;
  speed       = baseSpeed;
  boosting    = false;
  snakeColor  = getRandomColor();
  food        = generateFood();
  updateScoreDisplay(); // 更新分數顯示
  overText.classList.add('hidden'); // 隱藏遊戲結束文字
  startBtn.style.display = 'none'; // 隱藏開始按鈕

  draw(); // 第一次繪製畫面

  // 清除之前的遊戲和計時器
  clearInterval(gameInterval);
  clearInterval(playTimerInterval);

  // 啟動遊戲主迴圈
  gameInterval = setInterval(gameLoop, speed);

  // 重置並啟動遊戲時間計時器 (以秒為單位)
  playSeconds = 0;
  playTimerInterval = setInterval(() => {
    playSeconds++;
    // 你可以在這裡更新一個顯示遊戲時間的 DOM 元素，如果有的話
    // console.log("Time elapsed:", playSeconds, "s"); // 可以在控制台觀察時間變化
  }, 1000); // 每 1000 毫秒 (即 1 秒) 增加 playSeconds
}

// 遊戲迴圈與邏輯
function gameLoop() {
  if (isGameOver) return; // 如果遊戲已經結束，就不再執行遊戲迴圈

  moveSnake();
  draw();
}

function moveSnake() {
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

  // 檢查碰撞邊界或自身
  if (
    head.x < 1 || head.x > boardSize ||
    head.y < 1 || head.y > boardSize ||
    snake.some(s => s.x === head.x && s.y === head.y)
  ) {
    return endGame(); // 如果碰撞，結束遊戲
  }

  snake.unshift(head); // 在蛇頭前面增加新的一節

  // 檢查是否吃到食物
  if (head.x === food.x && head.y === food.y) {
    score++; // 分數增加
    updateScoreDisplay(); // 更新分數顯示
    if (score % 3 === 0) snakeColor = getRandomColor(); // 每吃三個食物改變顏色
    // 加速遊戲，但速度不低於 50ms
    baseSpeed = Math.max(50, baseSpeed - 10);
    speed     = boosting ? Math.max(50, baseSpeed / 2) : baseSpeed;
    // 重新設定遊戲迴圈間隔以應用新的速度
    clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, speed);
    food = generateFood(); // 生成新的食物
  } else {
    snake.pop(); // 如果沒吃到食物，移除蛇尾，保持長度不變
  }
}

function endGame() {
  // 停止所有計時器
  clearInterval(gameInterval);
  clearInterval(playTimerInterval);

  isGameOver = true; // 設定遊戲結束狀態

  // 顯示遊戲結束相關元素
  overText.classList.remove('hidden');
  startBtn.textContent = '重新開始';
  startBtn.style.display = 'block';
  // 注意: 你的原始程式碼中這裡有個 clearInterval(intervalId);
  // 我不確定 intervalId 是什麼，如果不是這個遊戲相關的計時器，可能需要保留
  // 如果是遊戲相關的計時器，應該已經被 gameInterval 或 playTimerInterval 取代了
  // 暫時移除這個不確定的 clearInterval
  // clearInterval(intervalId);

  // 你原始程式碼中這裡也有個 gameOverDisplay，但上面沒有定義，暫時移除
  // gameOverDisplay.classList.remove("hidden");


  // === 核心修改 ===
  // 在遊戲結束時，呼叫獨立的上傳分數函式
  uploadScoreToLeaderboard(playerName, score, playSeconds);
  // === 移除不正確的 push 程式碼 ===
  // 原始程式碼中這裡有段使用 push 和 Date.now() 的邏輯，已經被上面的 uploadScoreToLeaderboard 取代並移除
  // if (playerName) { ... push(...) ... }
}

// 畫面呈現
function draw() {
  board.innerHTML = ''; // 清空畫板
  drawFood(); // 繪製食物
  drawSnake(); // 繪製蛇
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

// 暱稱輸入確認
document.getElementById('confirm-nickname').addEventListener('click', () => {
  const input = document.getElementById('nickname');
  playerName = input.value.trim();
  if (playerName) {
    document.getElementById('nickname-panel').style.display = 'none';
    // 暱稱確認後才顯示開始按鈕
    startBtn.style.display = 'block'; // 確保開始按鈕在這裡被顯示
  } else {
    alert("請輸入暱稱");
  }
});

// 排行榜載入與顯示
function setupLeaderboard() {
  // 查詢分數最高的 10 個項目
  const scoresRef = query(ref(db, 'scores'), orderByChild('score'), limitToLast(10));

  onValue(scoresRef, snapshot => {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = ''; // 清空排行榜列表
    const items = [];
    snapshot.forEach(child => {
      // 從資料庫讀取的數據
      const itemData = child.val();
      // 確保數據存在且包含 score 和 time
      if (itemData && typeof itemData.score === 'number' && typeof itemData.time === 'number') {
         items.push(itemData);
      }
    });

    items.sort((a, b) => b.score - a.score); // 再次排序，確保是分數最高的在前

    items.forEach(item => {
      const li = document.createElement('li');
      // 直接使用 item.time，它現在應該是秒數了
      li.textContent = `${item.name}: ${item.score} 分 (${item.time} 秒)`;
      list.appendChild(li);
    });
  });
}

// 初始化時載入排行榜
setupLeaderboard();

// 遊戲控制：方向、加速、重新開始
// 遊戲控制：方向、加速、重新開始
document.addEventListener('keydown', e => { // <-- 這裡開始 addEventListener 呼叫
  // 防止預設行為，例如方向鍵滾動頁面
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'r', 'R'].includes(e.key)) {
    e.preventDefault();
  } // <-- if 判斷式的結束大括號

  // 這裡應該還有一個 switch 語句來處理不同的按鍵邏輯
  switch (e.key) {
    case 'ArrowUp':
      if (direction.y === 0) direction = { x: 0, y: -1 };
      break;
    case 'ArrowDown':
      if (direction.y === 0) direction = { x: 0, y: 1 };
      break;
    case 'ArrowLeft':
      if (direction.x === 0) direction = { x: -1, y: 0 };
      break;
    case 'ArrowRight':
      if (direction.x === 0) direction = { x: 1, y: 0 };
      break;
    case ' ':
      if (!boosting && !isGameOver) { // 增加判斷遊戲是否結束
        boosting = true;
        speed = Math.max(150, baseSpeed / 2);
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, speed);
      }
      break;
    case 'r':
    case 'R':
      if (playerName && isGameOver) { // 只有遊戲結束且有玩家暱稱時才允許重新開始
         startGame();
      }
      break;
  }

}); // <-- 這裡才是 addEventListener 呼叫的結束小括號和分號
// 開始遊戲按鈕事件
startBtn.addEventListener('click', () => {
  if (playerName) { // 確保玩家已經輸入暱稱
    startGame();
  } else {
    alert("請先輸入暱稱");
  }
});
// 這裡是原本的程式碼結束

