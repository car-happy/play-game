class ParkerGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreElement = document.getElementById('scoreValue');
    this.levelElement = document.getElementById('levelValue');
    this.restartBtn = document.getElementById('restartBtn');

    this.score = 0;
    this.level = 1;
    this.gameRunning = true;

    // Player character (stays in fixed position on screen)
    this.player = {
      x: 100, // Fixed position on screen
      y: 200,
      width: 32, // Bigger player
      height: 64,
      speedX: 0,
      speedY: 0,
      maxSpeed: 8,
      jumpPower: 15,
      onGround: false,
      color: '#3498db'
    };

    // Physics
    this.gravity = 0.6;
    this.friction = 0.85;

    // World movement (train speed)
    this.worldSpeed = 1.5;
    this.worldSpeedIncrease = 0.005;
    this.cameraX = 0;

    // Platforms and goals
    this.platforms = [];
    this.goals = [];
    this.nextPlatformX = 0;

    this.keys = {};

    this.init();
  }

  init() {
    this.generateLevel();
    this.setupEventListeners();
    this.gameLoop();
  }

  setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Restart button
    this.restartBtn.addEventListener('click', () => {
      this.restart();
    });
  }

  generateLevel() {
    this.platforms = [];
    this.goals = [];
    this.nextPlatformX = 0;
    this.cameraX = 0;

    // Generate lava floor (not a platform, just visual)
    this.lavaLevel = this.canvas.height - 32;

    // Generate initial elevated platforms
    this.generateMorePlatforms();

    // Reset player position (above lava)
    this.player.y = this.lavaLevel - 200;
    this.player.speedX = 0;
    this.player.speedY = 0;
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

    const maxJumpHeight = this.player.jumpPower * this.player.jumpPower / (2 * this.gravity); // Physics calculation
    const maxJumpDistance = this.player.maxSpeed * (this.player.jumpPower / this.gravity); // Horizontal distance during jump

    // Generate platforms ahead of the camera
    while (this.nextPlatformX < this.cameraX + this.canvas.width + 1000) {
      // Always generate platforms to ensure progression
      if (Math.random() < 0.8) {
        const blockData = blockTypes[Math.floor(Math.random() * blockTypes.length)];

        // Ensure platform heights are reachable (max jump height is about 187 pixels)
        const platformHeight = 80 + Math.random() * Math.min(120, maxJumpHeight - 50);
        const platformWidth = 64 + Math.floor(Math.random() * 3) * 64; // 64, 128, or 192

        // Ensure horizontal spacing is achievable (max jump distance is about 120 pixels)
        const horizontalGap = 32 + Math.random() * Math.min(80, maxJumpDistance - 40);

        this.platforms.push({
          x: this.nextPlatformX + horizontalGap,
          y: this.canvas.height - 32 - platformHeight,
          width: platformWidth,
          height: 32,
          color: blockData.color,
          type: blockData.type
        });

        // Add emerald goals on some platforms
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
        // Add smaller gap when no platform is generated
        this.nextPlatformX += 64;
      }
    }
  }

  update() {
    if (!this.gameRunning) return;

    // Move the world (train effect)
    this.cameraX += this.worldSpeed;
    this.worldSpeed += this.worldSpeedIncrease; // Gradually speed up

    // Generate more platforms as needed
    this.generateMorePlatforms();

    // Player input - now only affects vertical movement and slight horizontal adjustment
    if (this.keys['a'] || this.keys['arrowleft']) {
      this.player.speedX = Math.max(this.player.speedX - 1.2, -this.player.maxSpeed);
    }
    if (this.keys['d'] || this.keys['arrowright']) {
      this.player.speedX = Math.min(this.player.speedX + 1.2, this.player.maxSpeed);
    }
    // Manual jump only - player must press jump key while on ground
    if ((this.keys['w'] || this.keys['arrowup'] || this.keys[' ']) && this.player.onGround) {
      this.player.speedY = -this.player.jumpPower;
      this.player.onGround = false;
    }

    // Apply friction to horizontal movement
    this.player.speedX *= this.friction;

    // Apply gravity
    this.player.speedY += this.gravity;

    // Update player position (but keep X relatively fixed on screen)
    this.player.x += this.player.speedX;
    this.player.y += this.player.speedY;

    // Keep player from moving too far left or right on screen
    if (this.player.x < 50) {
      this.player.x = 50;
      this.player.speedX = 0;
    }
    if (this.player.x > 200) {
      this.player.x = 200;
      this.player.speedX = 0;
    }

    // Platform collision (adjusted for world coordinates)
    this.player.onGround = false;

    // Convert player screen position to world position for collision
    const playerWorldX = this.player.x + this.cameraX;

    for (let platform of this.platforms) {
      // Only check platforms that are visible on screen
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
        if (this.player.speedY > 0 && 
            this.player.y < platform.y) {
          this.player.y = platform.y - this.player.height;
          this.player.speedY = 0;
          this.player.onGround = true;
        }
        // Hitting platform from below
        else if (this.player.speedY < 0 && 
                 this.player.y + this.player.height > platform.y + platform.height) {
          this.player.y = platform.y + platform.height;
          this.player.speedY = 0;
        }
        // Hitting platform from side
        else if (this.player.speedX > 0 && 
                 playerWorldX < platform.x) {
          this.player.x = platform.x - this.player.width - this.cameraX;
          this.player.speedX = 0;
        }
        else if (this.player.speedX < 0 && 
                 playerWorldX + this.player.width > platform.x + platform.width) {
          this.player.x = platform.x + platform.width - this.cameraX;
          this.player.speedX = 0;
        }
      }
    }

    // Check goal collection
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

    // Clean up old platforms and goals to save memory
    this.platforms = this.platforms.filter(p => p.x > this.cameraX - 200);
    this.goals = this.goals.filter(g => g.x > this.cameraX - 200);

    // Death conditions: touching lava, falling off screen, or falling behind
    if (this.player.y + this.player.height >= this.lavaLevel || 
        this.player.y > this.canvas.height || 
        this.player.x + this.cameraX < this.cameraX - 100) {
      this.gameOver();
    }

    // Increase score based on distance traveled
    this.score += Math.floor(this.worldSpeed);
    this.updateScore();
  }

  gameOver() {
    this.gameRunning = false;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER!', this.canvas.width / 2, this.canvas.height / 2 - 50);
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.fillText('Click Restart to try again!', this.canvas.width / 2, this.canvas.height / 2 + 50);
  }

  checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  render() {
    if (!this.gameRunning) return;

    // Clear canvas with darker atmosphere
    this.ctx.fillStyle = '#2c1810';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw lava floor
    this.drawLava();

    // Draw platforms with proper Minecraft block textures (adjusted for camera)
    for (let platform of this.platforms) {
      const screenX = platform.x - this.cameraX;

      // Only draw platforms that are visible on screen
      if (screenX + platform.width >= -100 && screenX <= this.canvas.width + 100) {
        this.drawMinecraftBlock(screenX, platform.y, platform.width, platform.height, platform.color, platform.type);
      }
    }

    // Draw goals as emerald blocks (adjusted for camera)
    for (let goal of this.goals) {
      const screenX = goal.x - this.cameraX;

      if (screenX + goal.width >= -50 && screenX <= this.canvas.width + 50) {
        this.drawMinecraftBlock(screenX, goal.y, goal.width, goal.height, goal.color, goal.type);

        if (!goal.collected) {
          // Draw animated sparkles around emerald blocks
          const time = Date.now() * 0.01;
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          this.ctx.fillRect(screenX + 4 + Math.sin(time) * 4, goal.y + 4, 2, 2);
          this.ctx.fillRect(screenX + 24 + Math.cos(time * 1.2) * 4, goal.y + 6, 2, 2);
          this.ctx.fillRect(screenX + 10, goal.y + 24 + Math.sin(time * 0.8) * 4, 2, 2);
          this.ctx.fillRect(screenX + 20, goal.y + 16 + Math.cos(time * 1.5) * 4, 2, 2);
        }
      }
    }

    // Draw Minecraft-style player (always at fixed screen position)
    this.drawMinecraftPlayer();

    // Draw speed indicator
    this.ctx.fillStyle = 'white';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Speed: ${Math.floor(this.worldSpeed)}`, 10, 30);
  }

  drawLava() {
    // Animated lava floor
    const time = Date.now() * 0.003;

    // Base lava color
    this.ctx.fillStyle = '#ff4500';
    this.ctx.fillRect(0, this.lavaLevel, this.canvas.width, this.canvas.height - this.lavaLevel);

    // Lava bubbles and animation
    for (let x = 0; x < this.canvas.width; x += 32) {
      const bubbleY = this.lavaLevel + Math.sin(time + x * 0.1) * 4;

      // Dark lava spots
      this.ctx.fillStyle = '#cc3300';
      this.ctx.fillRect(x, bubbleY, 16, 8);
      this.ctx.fillRect(x + 20, bubbleY + 4, 12, 6);

      // Bright lava highlights
      this.ctx.fillStyle = '#ff6600';
      this.ctx.fillRect(x + 4, bubbleY + 2, 8, 4);
      this.ctx.fillRect(x + 22, bubbleY + 6, 6, 3);

      // Lava glow effect
      this.ctx.fillStyle = '#ffaa00';
      this.ctx.fillRect(x + 6, bubbleY + 3, 4, 2);
      this.ctx.fillRect(x + 24, bubbleY + 7, 3, 1);
    }

    // Add some lava particles floating up
    for (let i = 0; i < 10; i++) {
      const particleX = (i * 80 + Math.sin(time + i) * 20) % this.canvas.width;
      const particleY = this.lavaLevel - 20 + Math.sin(time * 2 + i) * 10;

      this.ctx.fillStyle = '#ff8800';
      this.ctx.fillRect(particleX, particleY, 2, 2);
    }
  }

  drawClouds() {
    // Simple cloud blocks in the sky
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';

    // Cloud 1
    this.ctx.fillRect(100, 50, 48, 16);
    this.ctx.fillRect(116, 34, 16, 16);

    // Cloud 2
    this.ctx.fillRect(400, 30, 64, 16);
    this.ctx.fillRect(416, 14, 32, 16);

    // Cloud 3
    this.ctx.fillRect(600, 60, 32, 16);
    this.ctx.fillRect(608, 44, 16, 16);
  }

  drawMinecraftBlock(x, y, width, height, baseColor, blockType = 'stone') {
    // Draw main block color
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(x, y, width, height);

    // Create more detailed Minecraft-style textures
    const blockSize = 16; // Standard Minecraft block size

    for (let bx = x; bx < x + width; bx += blockSize) {
      for (let by = y; by < y + height; by += blockSize) {
        const blockWidth = Math.min(blockSize, x + width - bx);
        const blockHeight = Math.min(blockSize, y + height - by);

        // Draw different textures based on block type
        if (blockType === 'grass') {
          this.drawGrassBlock(bx, by, blockWidth, blockHeight);
        } else if (blockType === 'stone') {
          this.drawStoneBlock(bx, by, blockWidth, blockHeight, baseColor);
        } else if (blockType === 'wood') {
          this.drawWoodBlock(bx, by, blockWidth, blockHeight, baseColor);
        } else if (blockType === 'emerald') {
          this.drawEmeraldBlock(bx, by, blockWidth, blockHeight);
        }
      }
    }
  }

  drawGrassBlock(x, y, width, height) {
    // Grass top (green)
    this.ctx.fillStyle = '#7cb342';
    this.ctx.fillRect(x, y, width, 4);

    // Dirt bottom (brown)
    this.ctx.fillStyle = '#8b7355';
    this.ctx.fillRect(x, y + 4, width, height - 4);

    // Add grass texture details
    this.ctx.fillStyle = '#8bc34a';
    for (let i = 0; i < 4; i++) {
      this.ctx.fillRect(x + (i * 4), y, 2, 2);
      this.ctx.fillRect(x + (i * 4) + 2, y + 2, 2, 1);
    }

    // Add dirt speckles
    this.ctx.fillStyle = '#654321';
    this.ctx.fillRect(x + 2, y + 6, 2, 2);
    this.ctx.fillRect(x + 8, y + 8, 2, 2);
    this.ctx.fillRect(x + 12, y + 10, 2, 1);

    // Block outline
    this.ctx.strokeStyle = '#2d5016';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
  }

  drawStoneBlock(x, y, width, height, baseColor) {
    // Base stone color
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(x, y, width, height);

    // Add stone texture with random speckles
    const darkerColor = this.darkenColor(baseColor, 20);
    const lighterColor = this.lightenColor(baseColor, 15);

    // Random stone pattern
    this.ctx.fillStyle = darkerColor;
    this.ctx.fillRect(x + 2, y + 2, 3, 2);
    this.ctx.fillRect(x + 7, y + 1, 2, 3);
    this.ctx.fillRect(x + 12, y + 4, 2, 2);
    this.ctx.fillRect(x + 4, y + 8, 3, 2);
    this.ctx.fillRect(x + 10, y + 10, 2, 2);
    this.ctx.fillRect(x + 1, y + 12, 2, 2);

    // Lighter highlights
    this.ctx.fillStyle = lighterColor;
    this.ctx.fillRect(x + 6, y + 3, 2, 1);
    this.ctx.fillRect(x + 11, y + 7, 1, 2);
    this.ctx.fillRect(x + 3, y + 11, 1, 1);
    this.ctx.fillRect(x + 13, y + 12, 1, 1);

    // Block outline
    this.ctx.strokeStyle = darkerColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
  }

  drawWoodBlock(x, y, width, height, baseColor) {
    // Base wood color
    this.ctx.fillStyle = baseColor;
    this.ctx.fillRect(x, y, width, height);

    // Wood grain lines
    const darkerColor = this.darkenColor(baseColor, 15);
    this.ctx.fillStyle = darkerColor;

    // Vertical wood grain
    for (let i = 0; i < width; i += 4) {
      this.ctx.fillRect(x + i, y, 1, height);
    }

    // Horizontal wood details
    this.ctx.fillStyle = this.darkenColor(baseColor, 25);
    this.ctx.fillRect(x, y + 3, width, 1);
    this.ctx.fillRect(x, y + 8, width, 1);
    this.ctx.fillRect(x, y + 13, width, 1);

    // Wood knots
    this.ctx.fillStyle = this.darkenColor(baseColor, 40);
    this.ctx.fillRect(x + 6, y + 5, 3, 2);
    this.ctx.fillRect(x + 11, y + 10, 2, 2);

    // Block outline
    this.ctx.strokeStyle = darkerColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
  }

  drawEmeraldBlock(x, y, width, height) {
    // Emerald green base
    this.ctx.fillStyle = '#27ae60';
    this.ctx.fillRect(x, y, width, height);

    // Gem facet pattern
    this.ctx.fillStyle = '#2ecc71';
    this.ctx.fillRect(x + 2, y + 2, 4, 4);
    this.ctx.fillRect(x + 10, y + 2, 4, 4);
    this.ctx.fillRect(x + 6, y + 8, 4, 4);
    this.ctx.fillRect(x + 2, y + 10, 4, 4);
    this.ctx.fillRect(x + 10, y + 10, 4, 4);

    // Bright highlights for sparkle effect
    this.ctx.fillStyle = '#a7ffeb';
    this.ctx.fillRect(x + 3, y + 3, 1, 1);
    this.ctx.fillRect(x + 11, y + 3, 1, 1);
    this.ctx.fillRect(x + 7, y + 9, 1, 1);
    this.ctx.fillRect(x + 3, y + 11, 1, 1);
    this.ctx.fillRect(x + 11, y + 11, 1, 1);

    // Dark emerald outline
    this.ctx.strokeStyle = '#1e8449';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
  }

  drawMinecraftPlayer() {
    const px = this.player.x;
    const py = this.player.y;

    // Player body (blue shirt) - doubled size
    this.ctx.fillStyle = '#4a90e2';
    this.ctx.fillRect(px, py + 16, 32, 32);

    // Player head (skin color) - doubled size
    this.ctx.fillStyle = '#fdbcb4';
    this.ctx.fillRect(px, py, 32, 16);

    // Player legs (blue pants) - doubled size
    this.ctx.fillStyle = '#2c5282';
    this.ctx.fillRect(px, py + 48, 16, 16);
    this.ctx.fillRect(px + 16, py + 48, 16, 16);

    // Hair (brown) - doubled size
    this.ctx.fillStyle = '#8b4513';
    this.ctx.fillRect(px + 4, py, 24, 6);

    // Eyes - doubled size
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(px + 6, py + 4, 4, 4);
    this.ctx.fillRect(px + 22, py + 4, 4, 4);

    // Mouth - doubled size
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(px + 12, py + 10, 8, 2);

    // Add pixelated border for authentic Minecraft look
    this.ctx.strokeStyle = 'black';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(px, py, 32, 16); // Head
    this.ctx.strokeRect(px, py + 16, 32, 32); // Body
    this.ctx.strokeRect(px, py + 48, 16, 16); // Left leg
    this.ctx.strokeRect(px + 16, py + 48, 16, 16); // Right leg
  }

  darkenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  updateScore() {
    this.scoreElement.textContent = this.score;
  }

  updateLevel() {
    this.levelElement.textContent = this.level;
  }

  nextLevel() {
    this.level++;
    this.worldSpeed += 1; // Increase speed each level
    this.updateLevel();
  }

  respawn() {
    this.player.x = 100;
    this.player.y = this.canvas.height - 100;
    this.player.speedX = 0;
    this.player.speedY = 0;
  }

  restart() {
    this.score = 0;
    this.level = 1;
    this.gameRunning = true;
    this.worldSpeed = 1.5;
    this.cameraX = 0;
    this.updateScore();
    this.updateLevel();
    this.generateLevel();
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }
}

// Start the game when the page loads
window.addEventListener('load', () => {
  new ParkerGame();
});