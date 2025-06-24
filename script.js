let gameInstance = null;

// Responsive canvas utility
function resizeCanvas(canvas) {
  const ratio = 4/3; // Original 800x600, use 4:3 for best scaling
  let width = window.innerWidth - 40;
  let height = window.innerHeight - 220;
  if (width / height > ratio) {
    width = height * ratio;
  } else {
    height = width / ratio;
  }
  width = Math.max(240, Math.min(800, width));
  height = Math.max(180, Math.min(600, height));
  canvas.width = width;
  canvas.height = height;
}

class ParkerGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreElement = document.getElementById('scoreValue');
    this.levelElement = document.getElementById('levelValue');
    this.highScoreElement = document.getElementById('highScoreValue');
    this.jumpUsedElement = document.getElementById('jumpUsedValue');
    this.jumpMaxElement = document.getElementById('jumpMaxValue');
    this.jumpLeftElement = document.getElementById('jumpLeftValue');
    this.restartBtn = document.getElementById('restartBtn');

    // Touch controls
    this.btnLeft = document.getElementById('btnLeft');
    this.btnRight = document.getElementById('btnRight');
    this.btnJump = document.getElementById('btnJump');

    this.score = 0;
    this.level = 1;
    this.highScore = Number(localStorage.getItem('parkerHighScore')) || 0;
    this.gameRunning = true;
    this.jumpMax = 2;
    this.jumpUsed = 0;

    this.player = {
      x: 100,
      y: 200,
      width: 32,
      height: 64,
      speedX: 0,
      speedY: 0,
      maxSpeed: 8,
      jumpPower: 15,
      onGround: false,
      color: '#3498db'
    };

    this.gravity = 0.6;
    this.friction = 0.85;
    this.worldSpeed = 1.5;
    this.worldSpeedIncrease = 0.005;
    this.cameraX = 0;
    this.platforms = [];
    this.goals = [];
    this.nextPlatformX = 0;
    this.keys = {};

    this.generateLevel();
    this.updateScore();
    this.updateLevel();
    this.updateHighScore();
    this.updateJumpCounter();

    // Responsive canvas
    resizeCanvas(this.canvas);
    window.addEventListener('resize', () => {
      resizeCanvas(this.canvas);
      this.lavaLevel = this.canvas.height - 32;
    });
  }

  setupEventListeners() {
    if (this.listenersAdded) return;
    this.listenersAdded = true;

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (gameInstance) gameInstance.restart();
      } else if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === ' '
      ) {
        if (gameInstance) gameInstance.keys[e.key] = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      if (
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'ArrowUp' ||
        e.key === ' '
      ) {
        if (gameInstance) gameInstance.keys[e.key] = false;
      }
    });

    this.restartBtn.addEventListener('click', () => {
      if (gameInstance) gameInstance.restart();
    });

    // Touch events
    const preventDefault = e => e.preventDefault();

    // For multi-touch support, keep track of which buttons are down
    this.touchActive = { left: false, right: false, jump: false };

    // Touch Left
    this.btnLeft.addEventListener('touchstart', e => {
      this.touchActive.left = true;
      this.keys['ArrowLeft'] = true;
      preventDefault(e);
    });
    this.btnLeft.addEventListener('touchend', e => {
      this.touchActive.left = false;
      this.keys['ArrowLeft'] = false;
      preventDefault(e);
    });
    this.btnLeft.addEventListener('mousedown', e => {
      this.touchActive.left = true;
      this.keys['ArrowLeft'] = true;
    });
    this.btnLeft.addEventListener('mouseup', e => {
      this.touchActive.left = false;
      this.keys['ArrowLeft'] = false;
    });

    // Touch Right
    this.btnRight.addEventListener('touchstart', e => {
      this.touchActive.right = true;
      this.keys['ArrowRight'] = true;
      preventDefault(e);
    });
    this.btnRight.addEventListener('touchend', e => {
      this.touchActive.right = false;
      this.keys['ArrowRight'] = false;
      preventDefault(e);
    });
    this.btnRight.addEventListener('mousedown', e => {
      this.touchActive.right = true;
      this.keys['ArrowRight'] = true;
    });
    this.btnRight.addEventListener('mouseup', e => {
      this.touchActive.right = false;
      this.keys['ArrowRight'] = false;
    });

    // Touch Jump
    this.btnJump.addEventListener('touchstart', e => {
      this.touchActive.jump = true;
      this.keys['ArrowUp'] = true;
      this.keys[' '] = true;
      preventDefault(e);
    });
    this.btnJump.addEventListener('touchend', e => {
      this.touchActive.jump = false;
      this.keys['ArrowUp'] = false;
      this.keys[' '] = false;
      preventDefault(e);
    });
    this.btnJump.addEventListener('mousedown', e => {
      this.touchActive.jump = true;
      this.keys['ArrowUp'] = true;
      this.keys[' '] = true;
    });
    this.btnJump.addEventListener('mouseup', e => {
      this.touchActive.jump = false;
      this.keys['ArrowUp'] = false;
      this.keys[' '] = false;
    });
  }

  // ... rest of ParkerGame unchanged, same as before ...

  generateLevel() {
    this.platforms = [];
    this.goals = [];
    this.nextPlatformX = 0;
    this.cameraX = 0;
    this.lavaLevel = this.canvas.height - 32;
    this.generateMorePlatforms();
    this.player.y = this.lavaLevel - 200;
    this.player.x = 100;
    this.player.speedX = 0;
    this.player.speedY = 0;
    this.jumpUsed = 0;
    this.updateJumpCounter();
  }

  generateMorePlatforms() {
    const blockTypes = [
      { color: '#8b7355', type: 'stone' },
      { color: '#a0522d', type: 'wood' },
      { color: '#654321', type: 'stone' },
      { color: '#5d4e37', type: 'wood' },
      { color: '#8b4513', type: 'wood' },
      { color: '#696969', type: 'stone' },
      { color: '#778899', type: 'stone' }
    ];
    const maxJumpHeight = this.player.jumpPower * this.player.jumpPower / (2 * this.gravity);
    const maxJumpDistance = this.player.maxSpeed * (this.player.jumpPower / this.gravity);
    while (this.nextPlatformX < this.cameraX + this.canvas.width + 1000) {
      if (Math.random() < 0.8) {
        const blockData = blockTypes[Math.floor(Math.random() * blockTypes.length)];
        const platformHeight = 80 + Math.random() * Math.min(120, maxJumpHeight - 50);
        const platformWidth = 64 + Math.floor(Math.random() * 3) * 64;
        const horizontalGap = 32 + Math.random() * Math.min(80, maxJumpDistance - 40);
        this.platforms.push({
          x: this.nextPlatformX + horizontalGap,
          y: this.canvas.height - 32 - platformHeight,
          width: platformWidth,
          height: 32,
          color: blockData.color,
          type: blockData.type
        });
        if (Math.random() < 0.3) {
          this.goals.push({
            x: this.nextPlatformX + horizontalGap + 16,
            y: this.canvas.height - 32 - platformHeight - 32,
            width: 32,
            height: 32,
            collected: false,
            color: '#27ae60',
            type: 'emerald'
          });
        }
        this.nextPlatformX += horizontalGap + platformWidth;
      } else {
        this.nextPlatformX += 64;
      }
    }
  }

  update() {
    if (!this.gameRunning) return;
    this.cameraX += this.worldSpeed;
    this.worldSpeed += this.worldSpeedIncrease;
    this.generateMorePlatforms();

    // Movement
    if (this.keys['ArrowLeft']) {
      this.player.speedX = Math.max(this.player.speedX - 1.2, -this.player.maxSpeed);
    }
    if (this.keys['ArrowRight']) {
      this.player.speedX = Math.min(this.player.speedX + 1.2, this.player.maxSpeed);
    }

    // Double Jump logic
    if ((this.keys['ArrowUp'] || this.keys[' ']) && this.jumpUsed < this.jumpMax && !this.jumpLock) {
      this.player.speedY = -this.player.jumpPower;
      this.player.onGround = false;
      this.jumpUsed++;
      this.updateJumpCounter();
      this.jumpLock = true;
    }
    // Prevent holding down jump to use all jumps: only allow once per key press
    if (!(this.keys['ArrowUp'] || this.keys[' '])) {
      this.jumpLock = false;
    }

    this.player.speedX *= this.friction;
    this.player.speedY += this.gravity;
    this.player.x += this.player.speedX;
    this.player.y += this.player.speedY;

    // Clamp player X
    if (this.player.x < 50) {
      this.player.x = 50;
      this.player.speedX = 0;
    }
    if (this.player.x > 200) {
      this.player.x = 200;
      this.player.speedX = 0;
    }

    // Platform collision + jump reset
    this.player.onGround = false;
    const playerWorldX = this.player.x + this.cameraX;
    for (let platform of this.platforms) {
      if (platform.x + platform.width < this.cameraX - 100 || platform.x > this.cameraX + this.canvas.width + 100) {
        continue;
      }
      const playerRect = {
        x: playerWorldX,
        y: this.player.y,
        width: this.player.width,
        height: this.player.height
      };
      if (this.checkCollision(playerRect, platform)) {
        // Landing on top of platform
        if (this.player.speedY > 0 && this.player.y < platform.y) {
          this.player.y = platform.y - this.player.height;
          this.player.speedY = 0;
          this.player.onGround = true;
          this.jumpUsed = 0; // Reset jumps when landing
          this.updateJumpCounter();
        }
        // Hitting platform from below
        else if (this.player.speedY < 0 && this.player.y + this.player.height > platform.y + platform.height) {
          this.player.y = platform.y + platform.height;
          this.player.speedY = 0;
        }
        // Hitting platform from side
        else if (this.player.speedX > 0 && playerWorldX < platform.x) {
          this.player.x = platform.x - this.player.width - this.cameraX;
          this.player.speedX = 0;
        } else if (this.player.speedX < 0 && playerWorldX + this.player.width > platform.x + platform.width) {
          this.player.x = platform.x + platform.width - this.cameraX;
          this.player.speedX = 0;
        }
      }
    }

    // Collect goals
    for (let goal of this.goals) {
      if (!goal.collected) {
        const playerRect = {
          x: playerWorldX,
          y: this.player.y,
          width: this.player.width,
          height: this.player.height
        };
        if (this.checkCollision(playerRect, goal)) {
          goal.collected = true;
          goal.color = '#f39c12';
          this.score += Math.floor(this.worldSpeed * 50);
          this.updateScore();
        }
      }
    }

    this.platforms = this.platforms.filter(p => p.x > this.cameraX - 200);
    this.goals = this.goals.filter(g => g.x > this.cameraX - 200);

    // Death
    if (this.player.y + this.player.height >= this.lavaLevel ||
      this.player.y > this.canvas.height ||
      this.player.x + this.cameraX < this.cameraX - 100) {
      this.gameOver();
    }
    this.score += Math.floor(this.worldSpeed);
    this.updateScore();
  }

  // ... rest of methods unchanged: gameOver(), checkCollision(), render(), drawing methods, updateScore(), updateLevel(), updateHighScore(), updateJumpCounter(), nextLevel(), respawn(), restart(), gameLoop() ...
  // (See previous code blocks for those methods, unchanged)

  gameOver() {
    this.gameRunning = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('parkerHighScore', String(this.highScore));
      this.updateHighScore();
    }
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER!', this.canvas.width / 2, this.canvas.height / 2 - 50);
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.fillText('Click Restart or press Enter to try again!', this.canvas.width / 2, this.canvas.height / 2 + 50);
    if (this.score === this.highScore) {
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = '32px Arial';
      this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 + 100);
    }
  }

  checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y;
  }

  render() {
    if (!this.gameRunning) return;
    this.ctx.fillStyle = '#2c1810';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawLava();
    for (let platform of this.platforms) {
      const screenX = platform.x - this.cameraX;
      if (screenX + platform.width >= -100 && screenX <= this.canvas.width + 100) {
        this.drawMinecraftBlock(screenX, platform.y, platform.width, platform.height, platform.color, platform.type);
      }
    }
    for (let goal of this.goals) {
      const screenX = goal.x - this.cameraX;
      if (screenX + goal.width >= -50 && screenX <= this.canvas.width + 50) {
        this.drawMinecraftBlock(screenX, goal.y, goal.width, goal.height, goal.color, goal.type);
        if (!goal.collected) {
          const time = Date.now() * 0.01;
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          this.ctx.fillRect(screenX + 4 + Math.sin(time) * 4, goal.y + 4, 2, 2);
          this.ctx.fillRect(screenX + 24 + Math.cos(time * 1.2) * 4, goal.y + 6, 2, 2);
          this.ctx.fillRect(screenX + 10, goal.y + 24 + Math.sin(time * 0.8) * 4, 2, 2);
          this.ctx.fillRect(screenX + 20, goal.y + 16 + Math.cos(time * 1.5) * 4, 2, 2);
        }
      }
    }
    this.drawMinecraftPlayer();
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Speed: ${Math.floor(this.worldSpeed)}`, 10, 30);
  }

  // ... drawing methods, updateScore, updateLevel, updateHighScore, updateJumpCounter, nextLevel, respawn, restart, gameLoop ...
  // (Unchanged from previous code blocks)
  // See previous code for all of these methods.
}

// Start the game ONCE, and keep the instance alive globally
window.addEventListener('load', () => {
  gameInstance = new ParkerGame();
  gameInstance.setupEventListeners();
  gameInstance.gameLoop();
});
