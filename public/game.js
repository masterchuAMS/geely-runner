// Инициализация Telegram Web App
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

// Элементы DOM
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const shareBtn = document.getElementById('share-btn');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const playerCar = document.getElementById('player-car');
const obstaclesContainer = document.getElementById('obstacles-container');
const distanceDisplay = document.getElementById('distance');
const speedDisplay = document.getElementById('speed');
const finalDistance = document.getElementById('final-distance');
const finalSpeed = document.getElementById('final-speed');
const recordDisplay = document.getElementById('record');
const newRecordBanner = document.getElementById('new-record');
const gameContainer = document.getElementById('game-container');

// Игровые константы
const LANES = 3;
const LANE_WIDTH = 100; // ширина полосы в пикселях
const GAME_WIDTH = LANES * LANE_WIDTH;
const CAR_WIDTH = 60;
const CAR_HEIGHT = 100;
const OBSTACLE_WIDTH = 70;
const OBSTACLE_HEIGHT = 45;

// Игровое состояние
let gameState = {
    isRunning: false,
    currentLane: 1, // 0 = левая, 1 = центр, 2 = правая
    distance: 0,
    speed: 60,
    maxSpeed: 60,
    obstacles: [],
    spawnInterval: null,
    gameLoop: null,
    lastTime: 0,
    highScore: parseInt(localStorage.getItem('geelyRunnerHighScore') || '0'),
    userId: tg?.initDataUnsafe?.user?.id || null,
    userName: tg?.initDataUnsafe?.user?.first_name || 'Игрок'
};

// Инициализация рекорда
recordDisplay.textContent = gameState.highScore;

// Получить позицию X для полосы
function getLaneX(lane) {
    const containerWidth = gameContainer.offsetWidth;
    const roadWidth = Math.min(350, containerWidth);
    const roadLeft = (containerWidth - roadWidth) / 2;
    const laneWidth = roadWidth / LANES;
    return roadLeft + laneWidth * lane + laneWidth / 2;
}

// Обновить позицию машины
function updateCarPosition(animate = true) {
    const x = getLaneX(gameState.currentLane);
    playerCar.style.left = x + 'px';
    if (animate) {
        playerCar.style.transition = 'left 0.15s ease-out';
    } else {
        playerCar.style.transition = 'none';
    }
}

// Перемещение машины влево
function moveLeft() {
    if (gameState.currentLane > 0 && gameState.isRunning) {
        gameState.currentLane--;
        updateCarPosition();
        // Вибрация на мобильных
        if (navigator.vibrate) navigator.vibrate(30);
    }
}

// Перемещение машины вправо
function moveRight() {
    if (gameState.currentLane < LANES - 1 && gameState.isRunning) {
        gameState.currentLane++;
        updateCarPosition();
        if (navigator.vibrate) navigator.vibrate(30);
    }
}

// Создать сугроб
function spawnObstacle() {
    if (!gameState.isRunning) return;
    
    const lane = Math.floor(Math.random() * LANES);
    const obstacle = document.createElement('div');
    obstacle.className = 'obstacle';
    obstacle.innerHTML = '<div class="snowdrift"></div>';
    
    const x = getLaneX(lane);
    obstacle.style.left = (x - OBSTACLE_WIDTH / 2) + 'px';
    
    // Скорость движения зависит от общей скорости
    const duration = Math.max(1.5, 3 - gameState.speed / 100);
    obstacle.style.animationDuration = duration + 's';
    
    obstaclesContainer.appendChild(obstacle);
    
    gameState.obstacles.push({
        element: obstacle,
        lane: lane,
        y: -60,
        speed: (gameState.speed / 60) * 5
    });
    
    // Удалить сугроб после анимации
    setTimeout(() => {
        if (obstacle.parentNode) {
            obstacle.remove();
            gameState.obstacles = gameState.obstacles.filter(o => o.element !== obstacle);
        }
    }, duration * 1000 + 100);
}

// Проверка столкновения
function checkCollision(obstacle) {
    const carRect = playerCar.getBoundingClientRect();
    const obstacleRect = obstacle.element.getBoundingClientRect();
    
    // Уменьшим хитбокс для более честного геймплея
    const padding = 10;
    
    return !(carRect.right - padding < obstacleRect.left + padding ||
             carRect.left + padding > obstacleRect.right - padding ||
             carRect.bottom - padding < obstacleRect.top + padding ||
             carRect.top + padding > obstacleRect.bottom - padding);
}

// Главный игровой цикл
function gameLoop(timestamp) {
    if (!gameState.isRunning) return;
    
    const deltaTime = timestamp - gameState.lastTime;
    gameState.lastTime = timestamp;
    
    // Увеличиваем дистанцию (метры в секунду на основе скорости)
    const metersPerSecond = gameState.speed / 3.6; // км/ч в м/с
    gameState.distance += metersPerSecond * (deltaTime / 1000);
    distanceDisplay.textContent = Math.floor(gameState.distance);
    
    // Постепенно увеличиваем скорость
    if (gameState.speed < 180) {
        gameState.speed += 0.02;
        speedDisplay.textContent = Math.floor(gameState.speed);
        gameState.maxSpeed = Math.max(gameState.maxSpeed, Math.floor(gameState.speed));
    }
    
    // Увеличиваем скорость анимации дороги
    const roadSpeed = 0.5 - (gameState.speed - 60) / 400;
    document.querySelector('.road-lines').style.animationDuration = Math.max(0.2, roadSpeed) + 's';
    
    // Проверяем столкновения
    for (const obstacle of gameState.obstacles) {
        if (checkCollision(obstacle)) {
            gameOver();
            return;
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Начало игры
function startGame() {
    // Сброс состояния
    gameState.isRunning = true;
    gameState.currentLane = 1;
    gameState.distance = 0;
    gameState.speed = 60;
    gameState.maxSpeed = 60;
    gameState.obstacles = [];
    gameState.lastTime = performance.now();
    
    // Очистка сугробов
    obstaclesContainer.innerHTML = '';
    
    // Обновление UI
    distanceDisplay.textContent = '0';
    speedDisplay.textContent = '60';
    updateCarPosition(false);
    
    // Показать игровой экран
    startScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // Запуск спавна сугробов
    gameState.spawnInterval = setInterval(() => {
        spawnObstacle();
        // Уменьшаем интервал спавна со временем
    }, Math.max(600, 1500 - gameState.distance / 10));
    
    // Динамический интервал спавна
    const updateSpawnRate = () => {
        if (!gameState.isRunning) return;
        clearInterval(gameState.spawnInterval);
        const interval = Math.max(500, 1500 - gameState.speed * 5);
        gameState.spawnInterval = setInterval(spawnObstacle, interval);
        setTimeout(updateSpawnRate, 2000);
    };
    setTimeout(updateSpawnRate, 3000);
    
    // Запуск игрового цикла
    requestAnimationFrame(gameLoop);
    
    // Haptic feedback для Telegram
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.impactOccurred('medium');
    }
}

// Конец игры
function gameOver() {
    gameState.isRunning = false;
    
    // Остановить спавн
    clearInterval(gameState.spawnInterval);
    
    // Вибрация
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('error');
    }
    
    // Обновить финальную статистику
    const finalDist = Math.floor(gameState.distance);
    finalDistance.textContent = finalDist;
    finalSpeed.textContent = gameState.maxSpeed;
    
    // Проверка рекорда
    if (finalDist > gameState.highScore) {
        gameState.highScore = finalDist;
        localStorage.setItem('geelyRunnerHighScore', finalDist.toString());
        recordDisplay.textContent = finalDist;
        newRecordBanner.classList.remove('hidden');
        
        // Отправить результат на сервер
        if (gameState.userId) {
            fetch('/api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: gameState.userId,
                    userName: gameState.userName,
                    distance: finalDist
                })
            }).catch(console.error);
        }
    } else {
        newRecordBanner.classList.add('hidden');
    }
    
    // Показать экран Game Over
    setTimeout(() => {
        gameScreen.classList.add('hidden');
        gameoverScreen.classList.remove('hidden');
    }, 500);
}

// Поделиться результатом
function shareResult() {
    const text = `🚗 Я проехал ${Math.floor(gameState.distance)} метров в Geely Runner!\n` +
                 `⚡ Максимальная скорость: ${gameState.maxSpeed} км/ч\n` +
                 `❄️ Попробуй побить мой рекорд!`;
    
    if (tg) {
        // Telegram share
        tg.openTelegramLink(`https://t.me/share/url?text=${encodeURIComponent(text)}`);
    } else {
        // Web share API
        if (navigator.share) {
            navigator.share({ text });
        } else {
            // Копировать в буфер
            navigator.clipboard.writeText(text).then(() => {
                alert('Результат скопирован!');
            });
        }
    }
}

// Обработчики событий - кнопки
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
shareBtn.addEventListener('click', shareResult);
btnLeft.addEventListener('click', moveLeft);
btnRight.addEventListener('click', moveRight);

// Обработчики клавиатуры
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        moveLeft();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'в' || e.key === 'В') {
        moveRight();
    } else if (e.key === ' ' || e.key === 'Enter') {
        if (!gameState.isRunning) {
            startGame();
        }
    }
});

// Обработчики свайпов
let touchStartX = 0;
let touchStartY = 0;

gameContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

gameContainer.addEventListener('touchend', (e) => {
    if (!gameState.isRunning) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Минимальное расстояние свайпа
    const minSwipe = 30;
    
    // Проверяем, что горизонтальный свайп больше вертикального
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipe) {
        if (diffX > 0) {
            moveRight();
        } else {
            moveLeft();
        }
    }
}, { passive: true });

// Обновить позицию машины при изменении размера окна
window.addEventListener('resize', () => {
    updateCarPosition(false);
});

// Инициализация
updateCarPosition(false);

// Применить тему Telegram если доступна
if (tg?.themeParams) {
    const theme = tg.themeParams;
    if (theme.bg_color) {
        document.documentElement.style.setProperty('--night-sky', theme.bg_color);
    }
}

console.log('🚗 Geely Runner загружен!');
console.log('TG WebApp:', tg ? 'Да' : 'Нет');

