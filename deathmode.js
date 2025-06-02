const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Referencie na HTML UI elementy
const hpText = document.getElementById("hpText");
const ammoText = document.getElementById("ammoText");
const waveText = document.getElementById("waveText");
const weaponText = document.getElementById("weaponText");

// Zabezpečenie, že kontext canvasu je dostupný
if (!ctx) {
    console.error("Nepodarilo sa získať 2D kontext canvasu!");
    alert("Chyba: Nepodarilo sa inicializovať hru. Váš prehliadač možno nepodporuje Canvas.");
}

// --- Nastavenia hry podľa módu obtiažnosti ---
let gameMode = localStorage.getItem("gameMode") || "normal"; // Načítaj mód, predvolene 'normal'

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
        enemySpawnInterval = 2000; // Každé 2 sekundy
        globalDamageMultiplier = 1;
        console.log("Herný mód: Normal");
        break;
    case "horde":
        playerInitialHp = 3; // Menej životov
        playerSpeed = 3.5; // Možno trochu rýchlejší hráč, aby sa vyhol
        enemyBaseHealthMultiplier = 1.5; // Nepriatelia majú o 50% viac zdravia
        enemySpeedMultiplier = 1.3; // Nepriatelia sú o 30% rýchlejší
        enemySpawnInterval = 1000; // Každú 1 sekundu (dvojnásobná rýchlosť)
        globalDamageMultiplier = 1; // Štandardné poškodenie
        console.log("Herný mód: Horde");
        break;
    case "death":
        playerInitialHp = 1; // Len jeden život
        playerSpeed = 4; // Rýchlejší hráč
        enemyBaseHealthMultiplier = 2.5; // Nepriatelia majú 2.5x viac zdravia
        enemySpeedMultiplier = 1.6; // Nepriatelia sú o 60% rýchlejší
        enemySpawnInterval = 500; // Každých 0.5 sekundy (extrémne rýchle)
        globalDamageMultiplier = 0.5; // Náboje dávajú menej poškodenia! (aby to bolo ťažšie)
        console.log("Herný mód: Death");
        break;
    default: // Ak sa náhodou mód nenašiel, default je normal
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
    size: 50, // Nastav veľkosť hráča, aby zodpovedala obrázku
    speed: playerSpeed,
    hp: playerInitialHp,
    maxHp: playerInitialHp,
    ammo: 100, // Počiatočná munícia
    maxAmmo: 100 // Maximálna munícia
};

// Funkcia na prispôsobenie veľkosti canvasu obrazovke
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // player.x a player.y sa menia iba pri štarte, nie pri každom resize
    // Ak by si chcel vycentrovať hráča pri každom resize, odkomentuj:
    // player.x = canvas.width / 2 - player.size / 2;
    // player.y = canvas.height / 2 - player.size / 2;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // Zavolaj pri štarte, aby sa canvas prispôsobil a hráč sa vycentroval


// --- Načítanie obrázkov ---
let playerImage = new Image();
playerImage.src = "images/doom pixel.png"; // DÔLEŽITÉ: UISTI SA, ŽE TENTO SÚBOR EXISTUJE NA TEJTO CESTE!
let gameStarted = false; // Nová premenná na sledovanie, či sa hra už začala

// Načítanie obrázka pozadia - NOVINKA
let backgroundImage = new Image();
backgroundImage.src = "images/background..png"; // UISTI SA, ŽE TENTO SÚBOR EXISTUJE A JE NA TEJTO CESTE!
let backgroundLoaded = false;

backgroundImage.onload = () => {
    backgroundLoaded = true;
    console.log("Obrázok pozadia načítaný.");
};
backgroundImage.onerror = () => {
    console.warn("Nepodarilo sa načítať obrázok pozadia: " + backgroundImage.src + ". Použije sa čierna farba.");
};

playerImage.onload = () => {
    // Až po načítaní obrázka hráča (a ideálne aj pozadia) môžeme začať hernú slučku
    if (!gameStarted) {
        startNewWave(); // Spusti prvú vlnu (teraz volá updateWaveDisplay v sebe)
        updateAmmoDisplay(); // Inicializuj zobrazenie munície
        updateHpDisplay();   // Inicializuj zobrazenie HP
        updateWeaponDisplay(); // Inicializuj zobrazenie zbrane
        gameLoop(); // Spusti hlavnú hernú slučku
        gameStarted = true;
        console.log("Hra spustená po načítaní obrázka hráča.");
    }
};
playerImage.onerror = () => {
    console.error("Nepodarilo sa načítať obrázok hráča: " + playerImage.src + ". Hra sa spúšťa bez obrázka.");
    // V prípade chyby načítania obrázka, aspoň spustiť hru s placeholderom
    if (!gameStarted) {
        startNewWave();
        updateAmmoDisplay();
        updateHpDisplay();
        updateWeaponDisplay();
        gameLoop();
        gameStarted = true;
    }
};


// Typy nepriateľov
const enemyTypes = [
    { name: "red", speed: 1.5, hp: 1, color: "red", damage: 0.2, minWave: 1, image: "img/enemy_red.png" },
    { name: "purple", speed: 2.5, hp: 1, color: "purple", damage: 0.5, minWave: 1, image: "img/baron_of_hell_pixel.png" },
    { name: "darkred", speed: 1, hp: 3, color: "darkred", damage: 1, minWave: 1, image: "img/enemy_darkred.png" },
    { name: "blue", speed: 5.0, hp: 2, color: "blue", damage: 0.7, minWave: 5, image: "img/enemy_blue.png" },
    { name: "green", speed: 0.5, hp: 5, color: "green", damage: 1.2, minWave: 8, image: "img/enemy_green.png" }
];

// Načítanie obrázkov pre nepriateľov - ZAKOMENTOVANÉ / UPRAVENÉ
const enemyImages = {};
/*
enemyTypes.forEach(type => {
    enemyImages[type.name] = new Image();
    enemyImages[type.name].src = type.image;
    enemyImages[type.name].onerror = () => {
        console.warn("Nepodarilo sa načítať obrázok pre " + type.name + ": " + type.image + ". Použije sa farba.");
    };
});
*/

// Boss
let boss = null;
const bossType = { speed: 1, hp: 10, color: "orange", damage: 3, size: 80, image: "img/boss.png" };

// Načítanie obrázka bossa - ZAKOMENTOVANÉ / UPRAVENÉ
const bossImage = new Image();
bossImage.src = ""; // Nastav prázdny reťazec, aby sa nenačítal žiadny súbor
/*
bossImage.src = bossType.image;
bossImage.onerror = () => {
    console.warn("Nepodarilo sa načítať obrázok bossa: " + bossType.image + ". Použije sa farba.");
};
*/

let enemies = [];
let bullets = [];
let keys = {};

let currentWave = 0;
let waveInProgress = false;


// --- Zbrane ---
const weapons = [
    {
        name: "Pistol",
        damage: 1,
        bulletSpeed: 10,
        fireRate: 200,
        ammoCost: 1,
        size: 5,
        type: "ranged" // NOVINKA: typ zbrane
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
        type: "ranged"
    },
    {
        name: "Machinegun",
        damage: 0.7,
        bulletSpeed: 12,
        fireRate: 80,
        ammoCost: 1,
        size: 4,
        type: "ranged"
    },
    // NOVINKA: Melee zbraň
    {
        name: "Fist", // Alebo Knife, Chainsaw, atď.
        damage: 2, // Viac poškodenia, lebo je na blízko
        fireRate: 400, // Rýchlosť útoku
        ammoCost: 0, // Melee zbraň nepotrebuje muníciu
        range: 60, // Dosah melee útoku
        size: 0, // Melee nemá projektily, veľkosť sa nepoužíva
        type: "melee" // NOVINKA: typ zbrane
    }
];

let currentWeaponIndex = 0;
let currentWeapon = weapons[currentWeaponIndex];
let lastShotTime = 0; // Premenná pre kontrolu rýchlosti streľby
let lastMeleeTime = 0; // NOVINKA: pre melee cooldown
let isMeleeAttacking = false; // NOVINKA: pre vizuálnu indikáciu melee útoku


// --- Power-upy ---
const powerUpTypes = [
    { name: "ammo", color: "gold", type: "ammo", value: 50, duration: 0, image: "images/ammo_box-removebg-preview.png" },
    { name: "heal", color: "lime", type: "heal", value: 2, duration: 0, image: "images/heart_pixelart.png" },
    { name: "speed_boost", color: "cyan", type: "speed", value: 2, duration: 5000, image: "images/speedup.png" },
    { name: "piercing_bullets", color: "grey", type: "bullet_piercing", value: 1, duration: 7000, image: "images/bulllet.png" }
];

// NOVINKA: Objekt na ukladanie načítaných obrázkov power-upov
const powerUpImages = {};
let powerUpsLoadedCount = 0;
const totalPowerUps = powerUpTypes.length;

console.log("DEBUG: Začínam načítavať power-up obrázky...");

// NOVINKA: Načítanie všetkých obrázkov power-upov
powerUpTypes.forEach(type => {
    powerUpImages[type.type] = new Image();
    powerUpImages[type.type].src = type.image;

    powerUpImages[type.type].onload = () => {
        powerUpsLoadedCount++;
        console.log(`DEBUG: Obrázok pre power-up "${type.name}" načítaný.`);
    };
    powerUpImages[type.type].onerror = () => {
        console.warn(`DEBUG: Nepodarilo sa načítať obrázok pre power-up "${type.name}": ${type.image}.`);
        powerUpsLoadedCount++;
    };
});
console.log("DEBUG: Skončil som s inicializáciou načítania power-up obrázkov.");

let activePowerUps = [];
let powerUps = []; // Pole pre power-upy, ktoré sa objavili na mape

// HP bar funkcia
function drawHpBar(x, y, width, hp, maxHp) {
    const barHeight = 7; // Menší bar pre lepší vzhľad
    const hpPercentage = hp / maxHp;

    ctx.fillStyle = '#333'; // Pozadie baru
    ctx.fillRect(x, y, width, barHeight);

    // Zdravie
    ctx.fillStyle = '#0f0';
    ctx.fillRect(x, y, width * hpPercentage, barHeight);

    // Hranica barov
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

function updateWeaponDisplay() {
    if (weaponText) {
        weaponText.innerText = `Zbraň: ${currentWeapon.name}`;
    }
}


// Pohyb hráča (WASD)
function movePlayer() {
    let currentSpeed = player.speed;

    if (keys["w"]) player.y = Math.max(0, player.y - currentSpeed);
    if (keys["s"]) player.y = Math.min(canvas.height - player.size, player.y + currentSpeed);
    if (keys["a"]) player.x = Math.max(0, player.x - currentSpeed);
    if (keys["d"]) player.x = Math.min(canvas.width - player.size, player.x + currentSpeed);
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

        // KONTROLA KOLÍZIE S BEŽNÝM NEPŘÍTEĽOM (AABB)
        if (player.x < enemy.x + enemy.size &&
            player.x + player.size > enemy.x &&
            player.y < enemy.y + enemy.size &&
            player.y + player.size > enemy.y) {
            player.hp = Math.max(0, player.hp - enemy.damage);
            updateHpDisplay(); // Aktualizuj zobrazenie HP

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

        // KONTROLA KOLÍZIE S BOSSOM (AABB)
        if (player.x < boss.x + boss.size &&
            player.x + player.size > boss.x &&
            player.y < boss.y + boss.size &&
            player.y + player.size > boss.y) {
            boss.hp -= boss.damage; // Boss by mal uberať HP nezávisle od globalDamageMultiplier
            player.hp = Math.max(0, player.hp - boss.damage);
            updateHpDisplay(); // Aktualizuj zobrazenie HP

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
    console.log("Aktuálna vlna:", currentWave);
    updateWaveDisplay(); // Aktualizuj vlnu v HTML
    enemies = []; // Vyčistí pole nepriateľov pre novú vlnu
    
    // powerUps = []; // ZAKOMENTOVANÉ: NEVYČISTÍ power-upy na mape medzi vlnami

    let enemyCount = Math.floor(currentWave * 1.5);
    if (gameMode === "horde") {
        enemyCount *= 2; // Dvojnásobok nepriateľov v Horde móde
    } else if (gameMode === "death") {
        enemyCount *= 3; // Trojnásobok nepriateľov v Death móde
    }

    let safeDistance = 200; // Bezpečný radius pre nepriateľov okolo hráča

    // Filtrujeme typy nepriateľov, ktoré sú dostupné pre aktuálnu vlnu
    const availableEnemyTypes = enemyTypes.filter(type => type.minWave <= currentWave);

    // Ak nie sú k dispozícii žiadne typy pre aktuálnu vlnu, použijeme všetky, ktoré máme
    const typesToSpawnFrom = availableEnemyTypes.length > 0 ? availableEnemyTypes : enemyTypes;

    for (let i = 0; i < enemyCount; i++) {
        let type = typesToSpawnFrom[Math.floor(Math.random() * typesToSpawnFrom.length)];
        spawnEnemy(type, safeDistance);
    }

    // Spawnovanie bossa každú 10. vlnu
    if (currentWave % 10 === 0 && !boss) {
        let bossX, bossY;
        do {
            bossX = Math.random() * (canvas.width - bossType.size);
            bossY = Math.random() * (canvas.height - bossType.size);
        } while (Math.sqrt((bossX - player.x) ** 2 + (bossY - player.y) ** 2) < safeDistance + bossType.size);

        boss = {
            x: bossX,
            y: bossY,
            size: bossType.size,
            speed: bossType.speed * enemySpeedMultiplier,
            hp: bossType.hp * enemyBaseHealthMultiplier,
            maxHp: bossType.hp * enemyBaseHealthMultiplier, // Pridaj maxHp pre bossa
            color: bossType.color,
            damage: bossType.damage
        };
        console.log("Boss sa objavil!");
    }

    waveInProgress = false;
}

// Pomocná funkcia pre spawn nepriateľa
function spawnEnemy(type, safeDistance) {
    let spawnX, spawnY;
    do {
        // Zabezpečenie, aby sa spawnol v rámci canvasu
        spawnX = Math.random() * (canvas.width - 20);
        spawnY = Math.random() * (canvas.height - 20);
    } while (Math.sqrt((spawnX - player.x) ** 2 + (spawnY - player.y) ** 2) < safeDistance);

    enemies.push({
        x: spawnX,
        y: spawnY,
        size: 20, // Predpokladaná veľkosť pre bežných nepriateľov
        speed: type.speed * enemySpeedMultiplier,
        hp: type.hp * enemyBaseHealthMultiplier,
        maxHp: type.hp * enemyBaseHealthMultiplier, // Pridaj maxHp pre nepriateľov
        color: type.color,
        damage: type.damage,
        // image: enemyImages[type.name] // TOTO JE ZAKOMENTOVANÉ, POUŽIJE SA FARBA
    });
}


function shootBullet(event) {
    // Ak aktuálna zbraň je melee, nebudeme strieľať guľky
    if (currentWeapon.type === "melee") {
        performMeleeAttack(); // Zavolaj funkciu melee útoku
        return;
    }

    const now = Date.now();
    if (now - lastShotTime < currentWeapon.fireRate) {
        return; // Ešte nie je čas na ďalší výstrel
    }
    if (player.ammo < currentWeapon.ammoCost) {
        console.log("Nedostatok munície!");
        // Tu môžeš pridať zvuk "klik-prázdny-zásobník" alebo vizuálnu indikáciu
        return;
    }

    lastShotTime = now; // Ulož čas posledného výstrelu
    player.ammo -= currentWeapon.ammoCost; // Zníž muníciu
    updateAmmoDisplay(); // Aktualizuj zobrazenie munície

    let rect = canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;

    let baseAngle = Math.atan2(mouseY - (player.y + player.size / 2), mouseX - (player.x + player.size / 2)); // Stred hráča

    // Streľba pre rôzne typy zbraní
    if (currentWeapon.name === "Shotgun") {
        for (let i = 0; i < currentWeapon.pellets; i++) {
            let angleOffset = (Math.random() - 0.5) * currentWeapon.spread; // Náhodný rozptyl
            let angle = baseAngle + angleOffset;
            bullets.push({
                x: player.x + player.size / 2,
                y: player.y + player.size / 2,
                dx: Math.cos(angle) * currentWeapon.bulletSpeed,
                dy: Math.sin(angle) * currentWeapon.bulletSpeed,
                size: currentWeapon.size,
                damage: currentWeapon.damage
            });
        }
    } else {
        // Pre pištoľ a guľomet
        bullets.push({
            x: player.x + player.size / 2,
            y: player.y + player.size / 2,
            dx: Math.cos(baseAngle) * currentWeapon.bulletSpeed,
            dy: Math.sin(baseAngle) * currentWeapon.bulletSpeed,
            size: currentWeapon.size,
            damage: currentWeapon.damage
        });
    }
}

// NOVINKA: Funkcia pre melee útok
function performMeleeAttack() {
    const now = Date.now();
    if (now - lastMeleeTime < currentWeapon.fireRate) {
        return; // Ešte nie je čas na ďalší melee útok
    }

    lastMeleeTime = now;
    isMeleeAttacking = true; // Nastav príznak, že prebieha útok
    setTimeout(() => {
        isMeleeAttacking = false; // Po krátkej dobe zruš príznak
    }, currentWeapon.fireRate / 2); // Trvanie vizuálneho útoku je polovica cooldownu

    // Detekcia nepriateľov v dosahu melee útoku
    for (let i = enemies.length - 1; i >= 0; i--) {
        let enemy = enemies[i];

        // Vypočítaj vzdialenosť od stredu hráča k stredu nepriateľa
        let playerCenterX = player.x + player.size / 2;
        let playerCenterY = player.y + player.size / 2;
        let enemyCenterX = enemy.x + enemy.size / 2;
        let enemyCenterY = enemy.y + enemy.size / 2;

        let distance = Math.sqrt((playerCenterX - enemyCenterX) ** 2 + (playerCenterY - enemyCenterY) ** 2);

        // Ak je nepriateľ v dosahu melee a koliduje
        if (distance < currentWeapon.range + (player.size / 2 + enemy.size / 2)) {
            enemy.hp -= currentWeapon.damage * globalDamageMultiplier;
            console.log(`Nepriateľ zasiahnutý melee! HP: ${enemy.hp}`);

            if (enemy.hp <= 0) {
                enemies.splice(i, 1);
                // Šanca na vypadnutie power-upu (upravené na 50% šancu celkovo)
                if (Math.random() < 0.5) { // 50% celková šanca, že niečo vypadne
                    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                    powerUps.push({
                        x: enemy.x,
                        y: enemy.y,
                        size: 15,
                        color: randomType.color,
                        type: randomType.type,
                        value: randomType.value,
                        duration: randomType.duration,
                        timeCollected: 0
                    });
                }
            }
        }
    }

    // Kontrola kolízie s bossom pre melee
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


function moveBullets() {
    let hasPiercingBullets = activePowerUps.some(pu => pu.type === "bullet_piercing");

    for (let i = bullets.length - 1; i >= 0; i--) {
        let bullet = bullets[i];
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        let bulletHitSomething = false; // Sledujeme, či náboj niečo zasiahol

        // Kontrola kolízií s nepriateľmi
        for (let j = enemies.length - 1; j >= 0; j--) {
            let enemy = enemies[j];

            // AABB Kolízia: (bullet.x, bullet.y) s (enemy.x, enemy.y)
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
                    // Šanca na vypadnutie power-upu (upravené na 50% šancu celkovo)
                    if (Math.random() < 0.5) { // 50% celková šanca, že niečo vypadne
                        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
                        powerUps.push({
                            x: enemy.x,
                            y: enemy.y,
                            size: 15,
                            color: randomType.color,
                            type: randomType.type,
                            value: randomType.value,
                            duration: randomType.duration,
                            timeCollected: 0
                        });
                    }
                }
                if (bulletHitSomething) break; // Ak náboj niečo zasiahol a nemá piercing, ukončí kontrolu pre tohto náboja
            }
        }

        // Ak náboj nebol odstránený a boss existuje, skontroluj kolíziu s bossom
        if (!bulletHitSomething && boss) {
            // AABB Kolízia s bossom
            if (bullet.x < boss.x + boss.size &&
                bullet.x + bullet.size > boss.x &&
                bullet.y < boss.y + boss.size &&
                bullet.y + bullet.size > boss.y) {
                boss.hp -= bullet.damage * globalDamageMultiplier;
                bullets.splice(i, 1); // Náboj zmizne aj pri bossovi (aj s piercingom)
                bulletHitSomething = true;
                if (boss.hp <= 0) {
                    boss = null;
                    console.log("Boss porazený!");
                }
            }
        }

        // Odstráň náboj, ak je mimo obrazovky a nebol odstránený (ani nebol piercing a nič nezasiahol)
        if (!bulletHitSomething && (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height)) {
            bullets.splice(i, 1);
        }
    }
}


// Správa power-upov
function checkPowerUpCollisions() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        let powerUp = powerUps[i];
        // Kolízia hráča a power-upu (AABB)
        if (player.x < powerUp.x + powerUp.size &&
            player.x + player.size > powerUp.x &&
            player.y < powerUp.y + powerUp.size &&
            player.y + player.size > powerUp.y) {
            powerUps.splice(i, 1); // Odstráň power-up z mapy

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
                    player.speed += powerUp.value; // Zvýš rýchlosť
                    powerUp.timeCollected = Date.now();
                    activePowerUps.push(powerUp); // Pridaj do aktívnych power-upov
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

function manageActivePowerUps() {
    for (let i = activePowerUps.length - 1; i >= 0; i--) {
        let powerUp = activePowerUps[i];
        if (powerUp.duration > 0 && Date.now() - powerUp.timeCollected > powerUp.duration) {
            // Power-up vypršal, zruš jeho efekt
            switch (powerUp.type) {
                case "speed":
                    player.speed -= powerUp.value; // Zníž rýchlosť späť
                    console.log("Speed boost vypršal.");
                    break;
                case "bullet_piercing":
                    console.log("Piercingové náboje vypršali.");
                    break;
            }
            activePowerUps.splice(i, 1); // Odstráň z aktívnych
        }
    }
}

// Funkcia vykreslovania
function draw() {
    // 1. Vykresli pozadie
    if (backgroundLoaded) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        // Záložná farba, ak sa obrázok nenačítal
        ctx.fillStyle = "#000"; // Čierna farba pozadia
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Vykreslenie hráča
    if (playerImage.complete && playerImage.naturalWidth !== 0) {
        ctx.drawImage(playerImage, player.x, player.y, player.size, player.size);
    } else {
        ctx.fillStyle = "blue";
        ctx.fillRect(player.x, player.y, player.size, player.size);
    }
    drawHpBar(player.x, player.y - 20, player.size, player.hp, player.maxHp);

    // NOVINKA: Vizuálna indikácia melee útoku
    if (isMeleeAttacking) {
        ctx.fillStyle = "rgba(255, 255, 0, 0.3)"; // Žltý polopriehľadný kruh okolo hráča
        ctx.beginPath();
        ctx.arc(player.x + player.size / 2, player.y + player.size / 2, currentWeapon.range, 0, Math.PI * 2);
        ctx.fill();
    }

    // Vykreslenie nepriateľov
    enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.size, enemy.size);
        drawHpBar(enemy.x, enemy.y - 15, enemy.size, enemy.hp, enemy.maxHp);
    });

    // Vykreslenie bossa
    if (boss) {
        ctx.fillStyle = boss.color;
        ctx.fillRect(boss.x, boss.y, boss.size, boss.size);
        drawHpBar(boss.x, boss.y - 25, boss.size, boss.hp, boss.maxHp);
    }

    // Vykreslenie nábojov
    bullets.forEach(bullet => {
        ctx.fillStyle = "red";
        ctx.fillRect(bullet.x, bullet.y, bullet.size, bullet.size);
    });

    // Vykreslenie power-upov
    powerUps.forEach(powerUp => {
        const powerUpImg = powerUpImages[powerUp.type]; // Získaj obrázok pre tento typ power-upu
        if (powerUpImg && powerUpImg.complete && powerUpImg.naturalWidth !== 0) {
            // Ak je obrázok načítaný, vykresli ho
            ctx.drawImage(powerUpImg, powerUp.x, powerUp.y, powerUp.size, powerUp.size);
        } else {
            // Ak obrázok nie je načítaný, vykresli farebný štvorec a text (záložný režim)
            ctx.fillStyle = powerUp.color;
            ctx.fillRect(powerUp.x, powerUp.y, powerUp.size, powerUp.size);
            ctx.fillStyle = "black"; // Text pre power-up
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.fillText(powerUp.name, powerUp.x + powerUp.size / 2, powerUp.y + powerUp.size / 2 + 3);
            ctx.textAlign = "left"; // Reset pre ostatný text
        }
    });
}

let gameLoopId; // ID pre requestAnimationFrame

function gameLoop() {
    movePlayer();
    moveEnemies();
    moveBullets();
    checkPowerUpCollisions();
    manageActivePowerUps();
    draw();

    // Spustenie novej vlny, len ak je aktuálna vlna dokončená
    if (enemies.length === 0 && !boss && !waveInProgress) {
        startNewWave();
    }

    gameLoopId = requestAnimationFrame(gameLoop);
}

// Funkcia volaná pri Game Over
function endGame() {
    cancelAnimationFrame(gameLoopId); // Zastav hernú slučku
    console.log("KONIEC HRY! Hráč dosiahol 0 HP. Presmerujem na stránku so skóre.");

    // Vyčisti všetky herné objekty (toto je dôležité)
    enemies = [];
    bullets = [];
    powerUps = [];
    activePowerUps = [];
    boss = null;

    // *** KĽÚČOVÁ ZMENA: Presmerovanie na externú stránku so skóre ***
    window.location.href = "deadwindow.html?score=" + currentWave;
}


// Event Listenery
window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    // Prepínanie zbraní (číslami 1, 2, 3, 4 - pre novú melee zbraň)
    if (e.code === "Digit1") {
        currentWeaponIndex = 0;
    } else if (e.code === "Digit2") {
        currentWeaponIndex = 1;
    } else if (e.code === "Digit3") {
        currentWeaponIndex = 2;
    } else if (e.code === "Digit4") { // NOVINKA: Klávesa pre melee zbraň
        currentWeaponIndex = 3; // Index pre Fist (alebo akúkoľvek melee zbraň)
    }

    // Aplikuj vybranú zbraň a aktualizuj UI, len ak je index platný
    if (currentWeaponIndex >= 0 && currentWeaponIndex < weapons.length) {
        currentWeapon = weapons[currentWeaponIndex];
        console.log("Vybraná zbraň: " + currentWeapon.name);
        updateWeaponDisplay(); // AKTUALIZUJ ZBRAŇ V HTML
    }
});
window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

// Kliknutie myšou bude aktivovať streľbu ALEBO melee útok v závislosti od vybranej zbrane
canvas.addEventListener("click", shootBullet);