// Nastavenie canvasu na fullscreen
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const hpText = document.getElementById("hpText");
const gameOverScreen = document.getElementById("gameOverScreen");
const finalWaveText = document.getElementById("finalWave");

// Hráč
let player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, speed: 3, hp: 5, maxHp: 5 };

// Nepriatelia
let enemies = [];
const enemyTypes = [
    { speed: 1.5, hp: 1, color: "red" },
    { speed: 2.5, hp: 1, color: "purple" },
    { speed: 1, hp: 3, color: "darkred" }
];

// Boss
let boss = null;
const bossType = { speed: 1, hp: 10, color: "orange" };

let bullets = [];
let keys = {};

let currentWave = 0;
let waveInProgress = false;
let showWaveText = false;

// HP bar funkcia
function drawHpBar(x, y, width, hp, maxHp) {
    const barHeight = 10;
    const hpPercentage = hp / maxHp;

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, width, barHeight);

    ctx.fillStyle = '#0f0';
    ctx.fillRect(x, y, width * hpPercentage, barHeight);
}

// Zobrazenie vlny
function drawWaveText() {
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText('Level: ' + currentWave, 10, 30);
}

// Pohyb hráča (WASD)
function movePlayer() {
    if (keys["w"]) player.y -= player.speed;
    if (keys["s"]) player.y += player.speed;
    if (keys["a"]) player.x -= player.speed;
    if (keys["d"]) player.x += player.speed;
}

// Pohyb nepriateľov
function moveEnemies() {
    enemies.forEach(enemy => {
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;
        }

        if (Math.abs(player.x - enemy.x) < player.size && Math.abs(player.y - enemy.y) < player.size) {
            player.hp = Math.max(0, player.hp - 1); // Neumrie hneď, len stratí HP
            player.hp = 0;
            // hpText.innerText = "HP: " + player.hp;

            // Ukoncenie hry
            if (player.hp <= 0) {
                endGame();
            }
        }
    });

    if (boss) {
        let dx = player.x - boss.x;
        let dy = player.y - boss.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
            boss.x += (dx / distance) * boss.speed;
            boss.y += (dy / distance) * boss.speed;
        }

        if (Math.abs(player.x - boss.x) < player.size && Math.abs(player.y - boss.y) < player.size) {
            player.hp = Math.max(0, player.hp - 2); // Boss berie viac HP
            hpText.innerText = "HP: " + player.hp;

            if (player.hp <= 0) {
                endGame();
            }
        }
    }
}

function startNewWave() {
    if (waveInProgress) return;

    waveInProgress = true;
    currentWave++;
    enemies = [];

    let enemyCount = Math.floor(currentWave * 1.5);
    let safeDistance = 200; // Bezpečný radius pre všetkých nepriateľov

    for (let i = 0; i < enemyCount; i++) {
        let type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        let spawnX, spawnY;

        // Kontrola, aby nepriatelia neboli príliš blízko hráča
        do {
            spawnX = Math.random() * canvas.width;
            spawnY = Math.random() * canvas.height;
        } while (Math.sqrt((spawnX - player.x) ** 2 + (spawnY - player.y) ** 2) < safeDistance);

        enemies.push({
            x: spawnX,
            y: spawnY,
            size: 20,
            speed: type.speed,
            hp: type.hp,
            color: type.color
        });
    }

    // Boss sa spawnuje každých 10 vĺn
    if (currentWave % 10 === 0) {
        let bossX, bossY;
        do {
            bossX = Math.random() * canvas.width;
            bossY = Math.random() * canvas.height;
        } while (Math.sqrt((bossX - player.x) ** 2 + (bossY - player.y) ** 2) < safeDistance);

        boss = {
            x: bossX,
            y: bossY,
            size: 40,
            speed: bossType.speed,
            hp: bossType.hp,
            color: bossType.color
        };
    }

    waveInProgress = false;
}


// Streľba
function shootBullet(event) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;

    let angle = Math.atan2(mouseY - player.y, mouseX - player.x);
    let speed = 5;

    bullets.push({
        x: player.x + player.size / 2,
        y: player.y + player.size / 2,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size: 5
    });
}

// Pohyb guľky a kolízie
function moveBullets() {
    bullets.forEach((bullet, bulletIndex) => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        enemies.forEach((enemy, enemyIndex) => {
            if (Math.abs(bullet.x - enemy.x) < enemy.size && Math.abs(bullet.y - enemy.y) < enemy.size) {
                enemy.hp--;
                bullets.splice(bulletIndex, 1);
                if (enemy.hp <= 0) enemies.splice(enemyIndex, 1);
            }
        });

        if (boss && Math.abs(bullet.x - boss.x) < boss.size && Math.abs(bullet.y - boss.y) < boss.size) {
            boss.hp--;
            bullets.splice(bulletIndex, 1);
            if (boss.hp <= 0) boss = null;
        }
    });
}

// Vykreslenie
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "blue";
    ctx.fillRect(player.x, player.y, player.size, player.size);
    drawHpBar(player.x, player.y - 20, 100, player.hp, player.maxHp);

    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
        drawHpBar(enemy.x, enemy.y - 20, 50, enemy.hp, 3);
    });

    if (boss) {
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.size, boss.size);
        drawHpBar(boss.x, boss.y - 20, 100, boss.hp, 10);
    }

    ctx.fillStyle = "yellow";
    bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, bullet.size, bullet.size));

    drawWaveText();
}

// Herná slučka
let gameLoopId;

function gameLoop() {
    movePlayer();
    moveEnemies();
    moveBullets();
    draw();

    if (enemies.length === 0 && !boss) {
        startNewWave();
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

// Koniec hry
function endGame() {
    enemies = [];
    document.getElementById("gameOverScreen").style.display = "block";
    finalWaveText.innerText = currentWave;

    // Vyhodnotenie skóre
    let scoreMessage = "";
    if (currentWave < 5) {
        scoreMessage = "To je slabé, skúste znova!";
    } else if (currentWave <= 10) {
        scoreMessage = "Je to dobré!";
    } else {
        scoreMessage = "Skvelé, pokračujte v práci!";
    }

    // Zobrazenie hodnotenia
    const scoreText = document.createElement('p');
    scoreText.innerText = "Úroveň: " + currentWave + " - " + scoreMessage;
    document.getElementById("gameOverScreen").appendChild(scoreText);

    cancelAnimationFrame(gameLoopId); // Stop the game loop

    // Poslanie skóre (úroveň) do deadwindow.html cez URL
    window.location.href = "deadwindow.html?score=" + currentWave;
}


// Restart hry
function restartGame() {
    player = { x: canvas.width / 2, y: canvas.height / 2, size: 20, speed: 3, hp: 5, maxHp: 5 };
    enemies = [];
    bullets = [];
    boss = null;
    currentWave = 0;
    waveInProgress = false;

    document.getElementById("gameOverScreen").style.display = "none";

    startNewWave();
    gameLoop(); // Restart the game loop
}

// Návrat na domovskú stránku
function goHome() {
    window.location.href = "page.html";
}

window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);
canvas.addEventListener("click", shootBullet);

startNewWave();
gameLoop();
