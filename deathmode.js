const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Referencie na HTML UI elementy
const hpText = document.getElementById("hpText");
const ammoText = document.getElementById("ammoText");
const waveText = document.getElementById("waveText");
// const weaponText = document.getElementById("weaponText"); // ODSTRÁNENÉ - nahradené weaponImageDisplay
const weaponImageDisplay = document.getElementById("weaponImageDisplay"); // NOVINKA: Referencia na <img> element pre zbraň
                                                                        // UISTI SA, ŽE TENTO ELEMENT EXISTUJE V TVOJOM HTML!
                                                                        // Napr.: <div>Zbraň: <img id="weaponImageDisplay" alt="Aktuálna zbraň" style="width:50px; height:auto;"></div>

// Zabezpečenie, že kontext canvasu je dostupný
if (!ctx) {
    console.error("Nepodarilo sa získať 2D kontext canvasu!");
    alert("Chyba: Nepodarilo sa inicializovať hru. Váš prehliadač možno nepodporuje Canvas.");
}

// --- Nastavenia hry podľa módu obtiažnosti ---
let gameMode = localStorage.getItem("gameMode") || "normal";

let playerInitialHp;
let playerSpeed;
let enemyBaseHealthMultiplier;
let enemySpeedMultiplier;
let enemySpawnInterval;
let globalDamageMultiplier;

switch (gameMode) {
    case "normal":
        playerInitialHp = 5;
        playerSpeed = 3;
        enemyBaseHealthMultiplier = 1;
        enemySpeedMultiplier = 1;
        enemySpawnInterval = 2000;
        globalDamageMultiplier = 1;
        console.log("Herný mód: Normal");
        break;
    case "horde":
        playerInitialHp = 3;
        playerSpeed = 3.5;
        enemyBaseHealthMultiplier = 1.5;
        enemySpeedMultiplier = 1.3;
        enemySpawnInterval = 1000;
        globalDamageMultiplier = 1;
        console.log("Herný mód: Horde");
        break;
    case "death":
        playerInitialHp = 1;
        playerSpeed = 4;
        enemyBaseHealthMultiplier = 2.5;
        enemySpeedMultiplier = 1.6;
        enemySpawnInterval = 500;
        globalDamageMultiplier = 0.5;
        console.log("Herný mód: Death");
        break;
    default:
        playerInitialHp = 5;
        playerSpeed = 3;
        enemyBaseHealthMultiplier = 1;
        enemySpeedMultiplier = 1;
        enemySpawnInterval = 2000;
        globalDamageMultiplier = 1;
        console.log("Žiadny herný mód nebol vybratý, nastavujem Normal.");
        break;
}

// Hráč - inicializácia s hodnotami z módu
let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 50,
    speed: playerSpeed,
    hp: playerInitialHp,
    maxHp: playerInitialHp,
    ammo: 100,
    maxAmmo: 100
};

// Funkcia na prispôsobenie veľkosti canvasu obrazovke
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();


let playerImage = new Image();
playerImage.src = "images/doom pixel.png";
let backgroundImage = new Image();
backgroundImage.src = "images/background..png";

// NOVINKA: Obrázok pre zobrazenie HP
let heartDisplayImage = new Image();
heartDisplayImage.src = "images/h"; // UISTI SA, ŽE TENTO SÚBOR EXISTUJE!

let gameStarted = false;
// ...

// --- Zbrane ---
const weapons = [
    {
        name: "Pistol",
        damage: 1,
        bulletSpeed: 10,
        fireRate: 200,
        ammoCost: 1,
        size: 5,
        type: "ranged",
        imageSrc: "images/pistol_pixel-removebg-preview.png" // NOVINKA: Cesta k obrázku pištole
    },
    {
        name: "Shotgun",
        damage: 0.5,
        bulletSpeed: 8,
        fireRate: 800,
        ammoCost: 5,
        pellets: 5,
        spread: 0.3,
        size: 8,
        type: "ranged",
        imageSrc: "images/shotgun_pixel-removebg-preview.png" // NOVINKA: Cesta k obrázku brokovnice
    },
    {
        name: "Machinegun",
        damage: 0.7,
        bulletSpeed: 12,
        fireRate: 80,
        ammoCost: 1,
        size: 4,
        type: "ranged",
        imageSrc: "images/machinegun_pixel-removebg-preview.png" // NOVINKA: Cesta k obrázku guľometu
    },
    {
        name: "Fist",
        damage: 2,
        fireRate: 400,
        ammoCost: 0,
        range: 60,
        size: 0,
        type: "melee",
        imageSrc: "images/fist_pixel-removebg-preview.png" // NOVINKA: Cesta k obrázku päste/melee
    }
];

// --- Power-upy ---
const powerUpTypes = [
    { name: "ammo", color: "gold", type: "ammo", value: 50, duration: 0, image: "images/ammo_box-removebg-preview.png" },
    { name: "heal", color: "lime", type: "heal", value: 2, duration: 0, image: "images/heart_pixelart.png" },
    { name: "speed_boost", color: "cyan", type: "speed", value: 2, duration: 5000, image: "images/speedup.png" },
    { name: "piercing_bullets", color: "grey", type: "bullet_piercing", value: 1, duration: 7000, image: "images/bulllet.png" }
];

// --- Manažment načítania assetov ---
let assetsToLoad = 0;
let assetsLoaded = 0;

function signalAssetLoaded() {
    assetsLoaded++;
    console.log(`Asset načítaný (${assetsLoaded}/${assetsToLoad})`);
    if (assetsLoaded >= assetsToLoad && !gameStarted) {
        console.log("Všetky kľúčové assety sú načítané. Spúšťam hru...");
        initializeGameAndStartLoop();
    }
}

// Registrujeme počet všetkých assetov, ktoré potrebujeme načítať
assetsToLoad++; // playerImage
assetsToLoad++; // backgroundImage

// Načítanie obrázka pozadia
backgroundImage.onload = () => {
    backgroundLoaded = true;
    console.log("Obrázok pozadia načítaný.");
    signalAssetLoaded();
};
backgroundImage.onerror = () => {
    console.warn("Nepodarilo sa načítať obrázok pozadia: " + backgroundImage.src + ". Použije sa čierna farba.");
    signalAssetLoaded(); // Aj pri chybe signalizujeme, aby hra mohla pokračovať
};

// Načítanie obrázka hráča
playerImage.onload = () => {
    console.log("Obrázok hráča načítaný.");
    signalAssetLoaded();
};
playerImage.onerror = () => {
    console.error("Nepodarilo sa načítať obrázok hráča: " + playerImage.src + ". Hra sa spúšťa bez obrázka.");
    signalAssetLoaded(); // Aj pri chybe
};

// NOVINKA: Načítanie obrázkov zbraní
const weaponImages = {};
assetsToLoad += weapons.length; // Pridaj počet obrázkov zbraní k celkovému počtu assetov

weapons.forEach(weapon => {
    weaponImages[weapon.name] = new Image();
    weaponImages[weapon.name].src = weapon.imageSrc;
    weaponImages[weapon.name].onload = () => {
        console.log(`Obrázok pre zbraň "${weapon.name}" načítaný: ${weapon.imageSrc}`);
        signalAssetLoaded();
    };
    weaponImages[weapon.name].onerror = () => {
        console.warn(`Nepodarilo sa načítať obrázok pre zbraň "${weapon.name}": ${weapon.imageSrc}.`);
        signalAssetLoaded(); // Aj pri chybe signalizujeme
    };
});


// NOVINKA: Objekt na ukladanie načítaných obrázkov power-upov
const powerUpImages = {};
assetsToLoad += powerUpTypes.length; // Pridaj počet obrázkov power-upov

console.log("DEBUG: Začínam načítavať power-up obrázky...");
powerUpTypes.forEach(type => {
    powerUpImages[type.type] = new Image();
    powerUpImages[type.type].src = type.image;

    powerUpImages[type.type].onload = () => {
        console.log(`DEBUG: Obrázok pre power-up "${type.name}" načítaný.`);
        signalAssetLoaded();
    };
    powerUpImages[type.type].onerror = () => {
        console.warn(`DEBUG: Nepodarilo sa načítať obrázok pre power-up "${type.name}": ${type.image}.`);
        signalAssetLoaded(); // Aj pri chybe
    };
});
console.log("DEBUG: Skončil som s inicializáciou načítania power-up obrázkov.");
console.log(`Celkový počet assetov na načítanie: ${assetsToLoad}`);

// Funkcia, ktorá sa zavolá, keď sú všetky assety načítané
function initializeGameAndStartLoop() {
    if (!gameStarted) { // Zabezpečenie, aby sa nespustila viackrát
        startNewWave();
        updateAmmoDisplay();
        updateHpDisplay();
        updateWeaponDisplay(); // Inicializuj zobrazenie obrázku zbrane
        gameLoop();
        gameStarted = true;
        console.log("Hra spustená.");
    }
}

// Typy nepriateľov (bez zmien)
const enemyTypes = [
    { name: "red", speed: 1.5, hp: 1, color: "red", damage: 0.2, minWave: 1, image: "img/enemy_red.png" },
    { name: "purple", speed: 2.5, hp: 1, color: "purple", damage: 0.5, minWave: 1, image: "img/baron_of_hell_pixel.png" },
    { name: "darkred", speed: 1, hp: 3, color: "darkred", damage: 1, minWave: 1, image: "img/enemy_darkred.png" },
    { name: "blue", speed: 5.0, hp: 2, color: "blue", damage: 0.7, minWave: 5, image: "img/enemy_blue.png" },
    { name: "green", speed: 0.5, hp: 5, color: "green", damage: 1.2, minWave: 8, image: "img/enemy_green.png" }
];
// Načítanie obrázkov pre nepriateľov - ZAKOMENTOVANÉ / UPRAVENÉ (bez zmien)
// ...

// Boss (bez zmien)
let boss = null;
const bossType = { speed: 1, hp: 10, color: "orange", damage: 3, size: 80, image: "img/boss.png" };
// Načítanie obrázka bossa - ZAKOMENTOVANÉ / UPRAVENÉ (bez zmien)
// ...

let enemies = [];
let bullets = [];
let keys = {};

let currentWave = 0;
let waveInProgress = false;

let currentWeaponIndex = 0;
let currentWeapon = weapons[currentWeaponIndex];
let lastShotTime = 0;
let lastMeleeTime = 0;
let isMeleeAttacking = false;

let activePowerUps = [];
let powerUps = [];

// HP bar funkcia (bez zmien)
function drawHpBar(x, y, width, hp, maxHp) {
    const barHeight = 7;
    const hpPercentage = hp / maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, width, barHeight);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(x, y, width * hpPercentage, barHeight);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, barHeight);
}

// Funkcie na aktualizáciu HTML UI elementov
function updateHpDisplay() {
    if (hpText) {
        hpText.innerText = "HP: " + Math.ceil(player.hp);
    }
}

function updateAmmoDisplay() {
    if (ammoText) {
        ammoText.innerText = `Munícia: ${player.ammo}/${player.maxAmmo}`;
    }
}

function updateWaveDisplay() {
    if (waveText) {
        waveText.innerText = `Vlna: ${currentWave}`;
    }
}

// AKTUALIZOVANÁ FUNKCIA PRE ZOBRAZENIE OBRÁZKU ZBRANE
function updateWeaponDisplay() {
    if (weaponImageDisplay) { // Skontroluj, či HTML element existuje
        const weaponImgObject = weaponImages[currentWeapon.name]; // Získaj prednačítaný Image objekt

        if (weaponImgObject && weaponImgObject.complete && weaponImgObject.naturalWidth !== 0) {
            // Ak je obrázok načítaný a platný
            weaponImageDisplay.src = weaponImgObject.src;
            weaponImageDisplay.alt = currentWeapon.name; // Dôležité pre prístupnosť
        } else {
            // Fallback, ak sa obrázok nenačítal alebo je chybný
            weaponImageDisplay.src = ""; // Vyčisti src alebo nastav cestu k defaultnému placeholder obrázku
            weaponImageDisplay.alt = currentWeapon.name + " (obrázok sa nenačítal)";
            console.warn(`Obrázok pre zbraň "${currentWeapon.name}" nie je dostupný alebo sa nenačítal správne. Použitý zdroj: ${currentWeapon.imageSrc}`);
            // Môžeš tu zobraziť aj textový názov ako fallback, ak máš na to pripravený iný HTML element
        }
    } else {
        console.warn("HTML element 'weaponImageDisplay' pre zobrazenie obrázku zbrane nebol nájdený v HTML dokumente.");
    }
}


// Pohyb hráča (WASD) (bez zmien)
function movePlayer() {
    let currentSpeed = player.speed;
    if (keys["w"]) player.y = Math.max(0, player.y - currentSpeed);
    if (keys["s"]) player.y = Math.min(canvas.height - player.size, player.y + currentSpeed);
    if (keys["a"]) player.x = Math.max(0, player.x - currentSpeed);
    if (keys["d"]) player.x = Math.min(canvas.width - player.size, player.x + currentSpeed);
}

// Pohyb nepriateľov (bez zmien)
function moveEnemies() {
    enemies.forEach(enemy => {
        let dx = player.x - enemy.x;
        let dy = player.y - enemy.y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            enemy.x += (dx / distance) * enemy.speed;
            enemy.y += (dy / distance) * enemy.speed;
        }

        if (player.x < enemy.x + enemy.size &&
            player.x + player.size > enemy.x &&
            player.y < enemy.y + enemy.size &&
            player.y + player.size > enemy.y) {
            player.hp = Math.max(0, player.hp - enemy.damage);
            updateHpDisplay();
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
        if (player.x < boss.x + boss.size &&
            player.x + player.size > boss.x &&
            player.y < boss.y + boss.size &&
            player.y + player.size > boss.y) {
            player.hp = Math.max(0, player.hp - boss.damage);
            updateHpDisplay();
            if (player.hp <= 0) {
                endGame();
            }
        }
    }
}

// startNewWave (bez zmien)
function startNewWave() {
    if (waveInProgress) return;
    waveInProgress = true;
    currentWave++;
    console.log("Aktuálna vlna:", currentWave);
    updateWaveDisplay();
    enemies = [];
    let enemyCount = Math.floor(currentWave * 1.5);
    if (gameMode === "horde") {
        enemyCount *= 2;
    } else if (gameMode === "death") {
        enemyCount *= 3;
    }
    let safeDistance = 200;
    const availableEnemyTypes = enemyTypes.filter(type => type.minWave <= currentWave);
    const typesToSpawnFrom = availableEnemyTypes.length > 0 ? availableEnemyTypes : enemyTypes;
    for (let i = 0; i < enemyCount; i++) {
        let type = typesToSpawnFrom[Math.floor(Math.random() * typesToSpawnFrom.length)];
        spawnEnemy(type, safeDistance);
    }
    if (currentWave % 10 === 0 && !boss) {
        let bossX, bossY;
        do {
            bossX = Math.random() * (canvas.width - bossType.size);
            bossY = Math.random() * (canvas.height - bossType.size);
        } while (Math.sqrt((bossX - player.x) ** 2 + (bossY - player.y) ** 2) < safeDistance + bossType.size);
        boss = {
            x: bossX, y: bossY, size: bossType.size,
            speed: bossType.speed * enemySpeedMultiplier,
            hp: bossType.hp * enemyBaseHealthMultiplier,
            maxHp: bossType.hp * enemyBaseHealthMultiplier,
            color: bossType.color, damage: bossType.damage
        };
        console.log("Boss sa objavil!");
    }
    waveInProgress = false;
}

// spawnEnemy (bez zmien)
function spawnEnemy(type, safeDistance) {
    let spawnX, spawnY;
    do {
        spawnX = Math.random() * (canvas.width - 20);
        spawnY = Math.random() * (canvas.height - 20);
    } while (Math.sqrt((spawnX - player.x) ** 2 + (spawnY - player.y) ** 2) < safeDistance);
    enemies.push({
        x: spawnX, y: spawnY, size: 20,
        speed: type.speed * enemySpeedMultiplier,
        hp: type.hp * enemyBaseHealthMultiplier,
        maxHp: type.hp * enemyBaseHealthMultiplier,
        color: type.color, damage: type.damage,
    });
}

// shootBullet (bez zmien)
function shootBullet(event) {
    if (currentWeapon.type === "melee") {
        performMeleeAttack();
        return;
    }
    const now = Date.now();
    if (now - lastShotTime < currentWeapon.fireRate) return;
    if (player.ammo < currentWeapon.ammoCost) {
        console.log("Nedostatok munície!");
        return;
    }
    lastShotTime = now;
    player.ammo -= currentWeapon.ammoCost;
    updateAmmoDisplay();
    let rect = canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;
    let baseAngle = Math.atan2(mouseY - (player.y + player.size / 2), mouseX - (player.x + player.size / 2));
    if (currentWeapon.name === "Shotgun") {
        for (let i = 0; i < currentWeapon.pellets; i++) {
            let angleOffset = (Math.random() - 0.5) * currentWeapon.spread;
            let angle = baseAngle + angleOffset;
            bullets.push({
                x: player.x + player.size / 2, y: player.y + player.size / 2,
                dx: Math.cos(angle) * currentWeapon.bulletSpeed,
                dy: Math.sin(angle) * currentWeapon.bulletSpeed,
                size: currentWeapon.size, damage: currentWeapon.damage
            });
        }
    } else {
        bullets.push({
            x: player.x + player.size / 2, y: player.y + player.size / 2,
            dx: Math.cos(baseAngle) * currentWeapon.bulletSpeed,
            dy: Math.sin(baseAngle) * currentWeapon.bulletSpeed,
            size: currentWeapon.size, damage: currentWeapon.damage
        });
    }
}

// performMeleeAttack (bez zmien)
function performMeleeAttack() {
    const now = Date.now();
    if (now - lastMeleeTime < currentWeapon.fireRate) return;
    lastMeleeTime = now;
    isMeleeAttacking = true;
    setTimeout(() => { isMeleeAttacking = false; }, currentWeapon.fireRate / 2);
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];
        let playerCenterX = player.x + player.size / 2;
        let playerCenterY = player.y + player.size / 2;
        let enemyCenterX = enemy.x + enemy.size / 2;
        let enemyCenterY = enemy.y + enemy.size / 2;
        let distance = Math.sqrt((playerCenterX - enemyCenterX) ** 2 + (playerCenterY - enemyCenterY) ** 2);
        if (distance < currentWeapon.range + (player.size / 2 + enemy.size / 2)) {
            enemy.hp -= currentWeapon.damage * globalDamageMultiplier;
            console.log(`Nepriateľ zasiahnutý melee! HP: ${enemy.hp}`);
            if (enemy.hp <= 0) {
                enemies.splice(i, 1);
                if (Math.random() < 0.5) {
                    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                    powerUps.push({
                        x: enemy.x, y: enemy.y, size: 15,
                        color: randomType.color, type: randomType.type,
                        value: randomType.value, duration: randomType.duration,
                        timeCollected: 0
                    });
                }
            }
        }
    }
    if (boss) {
        let playerCenterX = player.x + player.size / 2;
        let playerCenterY = player.y + player.size / 2;
        let bossCenterX = boss.x + boss.size / 2;
        let bossCenterY = boss.y + boss.size / 2;
        let distance = Math.sqrt((playerCenterX - bossCenterX) ** 2 + (playerCenterY - bossCenterY) ** 2);
        if (distance < currentWeapon.range + (player.size / 2 + boss.size / 2)) {
            boss.hp -= currentWeapon.damage * globalDamageMultiplier;
            console.log(`Boss zasiahnutý melee! HP: ${boss.hp}`);
            if (boss.hp <= 0) {
                boss = null;
                console.log("Boss porazený!");
            }
        }
    }
}

// moveBullets (bez zmien)
function moveBullets() {
    let hasPiercingBullets = activePowerUps.some(pu => pu.type === "bullet_piercing");
    for (let i = bullets.length - 1; i >= 0; i--) {
        let bullet = bullets[i];
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;
        let bulletHitSomething = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            let enemy = enemies[j];
            if (bullet.x < enemy.x + enemy.size &&
                bullet.x + bullet.size > enemy.x &&
                bullet.y < enemy.y + enemy.size &&
                bullet.y + bullet.size > enemy.y) {
                enemy.hp -= bullet.damage * globalDamageMultiplier;
                if (!hasPiercingBullets) {
                    bullets.splice(i, 1);
                    bulletHitSomething = true;
                }
                if (enemy.hp <= 0) {
                    enemies.splice(j, 1);
                    if (Math.random() < 0.5) {
                        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                        powerUps.push({
                            x: enemy.x, y: enemy.y, size: 15,
                            color: randomType.color, type: randomType.type,
                            value: randomType.value, duration: randomType.duration,
                            timeCollected: 0
                        });
                    }
                }
                if (bulletHitSomething) break;
            }
        }
        if (!bulletHitSomething && boss) {
            if (bullet.x < boss.x + boss.size &&
                bullet.x + bullet.size > boss.x &&
                bullet.y < boss.y + boss.size &&
                bullet.y + bullet.size > boss.y) {
                boss.hp -= bullet.damage * globalDamageMultiplier;
                bullets.splice(i, 1);
                bulletHitSomething = true;
                if (boss.hp <= 0) {
                    boss = null;
                    console.log("Boss porazený!");
                }
            }
        }
        if (!bulletHitSomething && (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height)) {
            bullets.splice(i, 1);
        }
    }
}

// checkPowerUpCollisions (bez zmien)
function checkPowerUpCollisions() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        let powerUp = powerUps[i];
        if (player.x < powerUp.x + powerUp.size &&
            player.x + player.size > powerUp.x &&
            player.y < powerUp.y + powerUp.size &&
            player.y + player.size > powerUp.y) {
            powerUps.splice(i, 1);
            switch (powerUp.type) {
                case "ammo":
                    player.ammo = Math.min(player.maxAmmo, player.ammo + powerUp.value);
                    updateAmmoDisplay();
                    console.log("Zobraná munícia! Aktuálna: " + player.ammo);
                    break;
                case "heal":
                    player.hp = Math.min(player.maxHp, player.hp + powerUp.value);
                    updateHpDisplay();
                    console.log("Zobrané zdravie! Aktuálne HP: " + Math.ceil(player.hp));
                    break;
                case "speed":
                    player.speed += powerUp.value;
                    powerUp.timeCollected = Date.now();
                    activePowerUps.push(powerUp);
                    console.log("Speed boost aktivovaný!");
                    break;
                case "bullet_piercing":
                    powerUp.timeCollected = Date.now();
                    activePowerUps.push(powerUp);
                    console.log("Piercingové náboje aktivované!");
                    break;
            }
        }
    }
}

// manageActivePowerUps (bez zmien)
function manageActivePowerUps() {
    for (let i = activePowerUps.length - 1; i >= 0; i--) {
        let powerUp = activePowerUps[i];
        if (powerUp.duration > 0 && Date.now() - powerUp.timeCollected > powerUp.duration) {
            switch (powerUp.type) {
                case "speed":
                    player.speed -= powerUp.value;
                    console.log("Speed boost vypršal.");
                    break;
                case "bullet_piercing":
                    console.log("Piercingové náboje vypršali.");
                    break;
            }
            activePowerUps.splice(i, 1);
        }
    }
}

// Funkcia vykreslovania (bez zmien)
function draw() {
    if (backgroundLoaded) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (playerImage.complete && playerImage.naturalWidth !== 0) {
        ctx.drawImage(playerImage, player.x, player.y, player.size, player.size);
    } else {
        ctx.fillStyle = "blue";
        ctx.fillRect(player.x, player.y, player.size, player.size);
    }
    drawHpBar(player.x, player.y - 20, player.size, player.hp, player.maxHp);
    if (isMeleeAttacking) {
        ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(player.x + player.size / 2, player.y + player.size / 2, currentWeapon.range, 0, Math.PI * 2);
        ctx.fill();
    }
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
        drawHpBar(enemy.x, enemy.y - 15, enemy.size, enemy.hp, enemy.maxHp);
    });
    if (boss) {
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.size, boss.size);
        drawHpBar(boss.x, boss.y - 25, boss.size, boss.hp, boss.maxHp);
    }
    bullets.forEach(bullet => {
        ctx.fillStyle = "red";
        ctx.fillRect(bullet.x, bullet.y, bullet.size, bullet.size);
    });
    powerUps.forEach(powerUp => {
        const powerUpImg = powerUpImages[powerUp.type];
        if (powerUpImg && powerUpImg.complete && powerUpImg.naturalWidth !== 0) {
            ctx.drawImage(powerUpImg, powerUp.x, powerUp.y, powerUp.size, powerUp.size);
        } else {
            ctx.fillStyle = powerUp.color;
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.size, powerUp.size);
            ctx.fillStyle = "black";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            // ctx.fillText(powerUp.name, powerUp.x + powerUp.size / 2, powerUp.y + powerUp.size / 2 + 3); // Ak by si chcel text
            ctx.textAlign = "left";
        }
    });
}

let gameLoopId;

function gameLoop() {
    movePlayer();
    moveEnemies();
    moveBullets();
    checkPowerUpCollisions();
    manageActivePowerUps();
    draw();
    if (enemies.length === 0 && !boss && !waveInProgress) {
        startNewWave();
    }
    gameLoopId = requestAnimationFrame(gameLoop);
}

// Funkcia volaná pri Game Over (bez zmien)
function endGame() {
    cancelAnimationFrame(gameLoopId);
    console.log("KONIEC HRY! Hráč dosiahol 0 HP. Presmerujem na stránku so skóre.");
    enemies = [];
    bullets = [];
    powerUps = [];
    activePowerUps = [];
    boss = null;
    window.location.href = "deadwindow.html?score=" + currentWave;
}

// Event Listenery
window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
    let weaponChanged = false; // Sleduj, či sa zbraň skutočne zmenila

    if (e.code === "Digit1" && currentWeaponIndex !== 0) {
        currentWeaponIndex = 0;
        weaponChanged = true;
    } else if (e.code === "Digit2" && currentWeaponIndex !== 1) {
        currentWeaponIndex = 1;
        weaponChanged = true;
    } else if (e.code === "Digit3" && currentWeaponIndex !== 2) {
        currentWeaponIndex = 2;
        weaponChanged = true;
    } else if (e.code === "Digit4" && currentWeaponIndex !== 3) { // NOVINKA: Klávesa pre melee zbraň
        currentWeaponIndex = 3;
        weaponChanged = true;
    }

    // Aplikuj vybranú zbraň a aktualizuj UI, len ak sa zmenila a index je platný
    if (weaponChanged && currentWeaponIndex >= 0 && currentWeaponIndex < weapons.length) {
        currentWeapon = weapons[currentWeaponIndex];
        console.log("Vybraná zbraň: " + currentWeapon.name);
        updateWeaponDisplay(); // AKTUALIZUJ OBRAZ ZBRANE V HTML
    }
});
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("click", shootBullet);

// Na konci scriptu, po definovaní všetkých funkcií a premenných,
// sa môže začať proces načítavania (už sa deje nastavením .src obrázkov).
// Hra sa spustí automaticky cez initializeGameAndStartLoop(), keď budú všetky assety načítané.