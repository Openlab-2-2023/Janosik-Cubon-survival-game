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
            hpText.innerText = "HP: " + player.hp;

            if (player.hp <= 0) {
                alert("Koniec hry!");
                location.reload();
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
                alert("Koniec hry!");
                location.reload();
            }
        }
    }
}

// Generovanie nepriateľov a bossa
function startNewWave() {
    if (waveInProgress) return;

    waveInProgress = true;
    currentWave++;
    enemies = [];

    let enemyCount = Math.floor(currentWave * 1.5);
    for (let i = 0; i < enemyCount; i++) {
        let type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        enemies.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 20,
            speed: type.speed,
            hp: type.hp,
            color: type.color
        });
    }

    if (currentWave % 10 === 0) {
        boss = {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
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

    ctx.fillStyle = "white";
    bullets.forEach(bullet => ctx.fillRect(bullet.x, bullet.y, bullet.size, bullet.size));

    drawWaveText();
}

// Herná slučka
function gameLoop() {
    movePlayer();
    moveEnemies();
    moveBullets();
    draw();

    if (enemies.length === 0 && !boss) {
        startNewWave();
    }

    requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", (e) => keys[e.key] = true);
window.addEventListener("keyup", (e) => keys[e.key] = false);
canvas.addEventListener("click", shootBullet);

startNewWave();
gameLoop();