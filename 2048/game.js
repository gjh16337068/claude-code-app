class Tile {
    constructor(value, row, col, id) {
        this.value = value;
        this.row = row;
        this.col = col;
        this.id = id;
        this.merged = false;
        this.element = null;
    }
}

class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.tiles = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore2048')) || 0;
        this.gameOver = false;
        this.tileIdCounter = 0;
        this.isProcessingMove = false;

        this.gameContainer = document.getElementById('game-container');
        this.gridBackground = document.getElementById('grid-background');
        this.tilesContainer = document.getElementById('tiles-container');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.restartBtn = document.getElementById('restart-btn');

        this.tileSize = 0;
        this.gap = 10;
        this.touchThreshold = 50; // Minimum distance for swipe detection
        this.lastTouchTime = 0;
        this.touchStartTime = 0;

        this.init();
    }

    init() {
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.restartBtn.addEventListener('click', () => this.newGame());
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        window.addEventListener('resize', () => this.calculateTileSize());

        // Touch event handlers
        this.gameContainer.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.gameContainer.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.gameContainer.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        this.gameContainer.addEventListener('touchcancel', (e) => this.handleTouchCancel(e));

        // Prevent default touch behavior for better gaming experience
        this.gameContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });

        this.createGridBackground();
        this.newGame();
    }

    createGridBackground() {
        let html = '';
        for (let i = 0; i < this.size * this.size; i++) {
            html += '<div class="grid-bg-cell"></div>';
        }
        this.gridBackground.innerHTML = html;
    }

    calculateTileSize() {
        const containerWidth = this.tilesContainer.offsetWidth;
        this.tileSize = (containerWidth - this.gap * (this.size - 1)) / this.size;
    }

    newGame() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
        this.tiles = [];
        this.score = 0;
        this.gameOver = false;
        this.gameOverOverlay.classList.remove('show');
        this.tilesContainer.innerHTML = '';
        this.calculateTileSize();
        this.addRandomTile();
        this.addRandomTile();
        this.updateDisplay();
    }

    createTile(value, row, col, isNew = false) {
        const id = ++this.tileIdCounter;
        const tile = new Tile(value, row, col, id);
        this.tiles.push(tile);

        const element = document.createElement('div');
        element.className = `tile tile-${value > 2048 ? 'super' : value} ${isNew ? 'new' : ''}`;
        element.textContent = value;
        element.id = `tile-${id}`;
        this.tilesContainer.appendChild(element);
        tile.element = element;

        this.updateTilePosition(tile);
        return tile;
    }

    addRandomTile() {
        // 找出所有空格子
        const emptyCells = [];

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === null) {
                    emptyCells.push({ row: i, col: j });
                }
            }
        }

        // 只在有空格子时添加新方块
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            const tile = this.createTile(value, randomCell.row, randomCell.col, true);
            this.grid[randomCell.row][randomCell.col] = tile;
        }
    }

    updateTilePosition(tile) {
        const left = tile.col * (this.tileSize + this.gap);
        const top = tile.row * (this.tileSize + this.gap);
        tile.element.style.left = `${left}px`;
        tile.element.style.top = `${top}px`;
        tile.element.style.width = `${this.tileSize}px`;
        tile.element.style.height = `${this.tileSize}px`;
    }

    handleKeyPress(e) {
        if (this.gameOver || this.isProcessingMove) return;

        let moved = false;
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                moved = this.moveUp();
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                moved = this.moveDown();
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                moved = this.moveLeft();
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                moved = this.moveRight();
                break;
            default:
                return;
        }

        if (moved) {
            this.isProcessingMove = true;
            setTimeout(() => {
                this.cleanupTiles();
                this.addRandomTile();
                this.updateDisplay();

                if (this.isGameOver()) {
                    this.gameOver = true;
                    this.gameOverOverlay.classList.add('show');
                    this.saveBestScore();
                }
                this.isProcessingMove = false;
            }, 100);
        }
    }

    // Touch event handlers
    handleTouchStart(e) {
        this.touchStartTime = Date.now();
        this.lastTouchTime = this.touchStartTime;
        this.startX = e.touches[0].clientX;
        this.startY = e.touches[0].clientY;
    }

    handleTouchMove(e) {
        // Prevent scrolling while playing
        e.preventDefault();
    }

    handleTouchEnd(e) {
        const touchDuration = Date.now() - this.touchStartTime;
        const deltaX = e.changedTouches[0].clientX - this.startX;
        const deltaY = e.changedTouches[0].clientY - this.startY;

        // Only process swipe if duration is reasonable (not a tap)
        if (touchDuration > 100) {
            this.handleSwipe(deltaX, deltaY);
        }
    }

    handleTouchCancel(e) {
        // Handle touch cancellation
    }

    handleSwipe(deltaX, deltaY) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        if (Math.max(absDeltaX, absDeltaY) < this.touchThreshold) {
            return; // Not a significant swipe
        }

        if (this.isProcessingMove) return;

        let moved = false;

        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0) {
                // Swipe right
                moved = this.moveRight();
            } else {
                // Swipe left
                moved = this.moveLeft();
            }
        } else {
            // Vertical swipe
            if (deltaY > 0) {
                // Swipe down
                moved = this.moveDown();
            } else {
                // Swipe up
                moved = this.moveUp();
            }
        }

        if (moved) {
            this.isProcessingMove = true;
            setTimeout(() => {
                this.cleanupTiles();
                this.addRandomTile();
                this.updateDisplay();

                if (this.isGameOver()) {
                    this.gameOver = true;
                    this.gameOverOverlay.classList.add('show');
                    this.saveBestScore();
                }
                this.isProcessingMove = false;
            }, 100);
        }
    }

    cleanupTiles() {
        // 创建一个新的tiles数组，只保留可见的方块
        const visibleTiles = [];

        // 遍历所有tiles，只保留可见的
        this.tiles.forEach(tile => {
            if (tile.element && tile.element.isConnected && tile.element.style.opacity !== '0') {
                visibleTiles.push(tile);
            } else if (tile.element && tile.element.isConnected) {
                // 移除不可见的方块
                tile.element.remove();
            }
        });

        // 更新tiles数组
        this.tiles = visibleTiles;
    }

    moveLeft() {
        let moved = false;
        for (let i = 0; i < this.size; i++) {
            moved = this.processRowLeft(i) || moved;
        }
        return moved;
    }

    moveRight() {
        let moved = false;
        for (let i = 0; i < this.size; i++) {
            moved = this.processRowRight(i) || moved;
        }
        return moved;
    }

    moveUp() {
        let moved = false;
        for (let j = 0; j < this.size; j++) {
            moved = this.processColUp(j) || moved;
        }
        return moved;
    }

    moveDown() {
        let moved = false;
        for (let j = 0; j < this.size; j++) {
            moved = this.processColDown(j) || moved;
        }
        return moved;
    }

    processRowLeft(row) {
        let moved = false;

        // 先重置合并标记
        for (let j = 0; j < this.size; j++) {
            const tile = this.grid[row][j];
            if (tile) {
                tile.merged = false;
            }
        }

        // 从左向右处理每一列
        for (let j = 1; j < this.size; j++) {
            const tile = this.grid[row][j];
            if (tile && tile.element.style.opacity !== '0') {
                // 找到这个方块左侧第一个空位或方块
                let targetCol = j;
                let merged = false;
                for (let k = j - 1; k >= 0; k--) {
                    const targetTile = this.grid[row][k];
                    if (targetTile === null) {
                        targetCol = k;
                    } else {
                        // 遇到方块，检查是否可以合并
                        if (targetTile.value === tile.value && !targetTile.merged && !tile.merged) {
                            // 合并
                            const mergedValue = tile.value * 2;
                            targetTile.value = mergedValue;
                            targetTile.element.textContent = mergedValue;
                            targetTile.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                            targetTile.merged = true;
                            this.score += mergedValue;

                            // 隐藏原方块
                            tile.element.style.opacity = '0';
                            this.grid[row][j] = null;
                            moved = true;
                            merged = true;
                            break;
                        } else {
                            // 不能合并，停在遇到方块的前一个位置
                            targetCol = k + 1;
                            break;
                        }
                    }
                }

                // 移动方块（如果没有合并）
                if (!merged && targetCol !== j) {
                    this.grid[row][targetCol] = tile;
                    this.grid[row][j] = null;
                    tile.col = targetCol;
                    this.updateTilePosition(tile);
                    if (targetCol !== j) moved = true;
                }
            }
        }

        // 清除所有方块的merged类
        for (let j = 0; j < this.size; j++) {
            const tile = this.grid[row][j];
            if (tile && tile.element) {
                tile.element.classList.remove('merged');
            }
        }

        return moved;
    }

    processRowRight(row) {
        let moved = false;

        // 先重置合并标记
        for (let j = 0; j < this.size; j++) {
            const tile = this.grid[row][j];
            if (tile) {
                tile.merged = false;
            }
        }

        // 从右向左处理每一列
        for (let j = this.size - 2; j >= 0; j--) {
            const tile = this.grid[row][j];
            if (tile && tile.element.style.opacity !== '0') {
                // 找到这个方块右侧第一个空位或方块
                let targetCol = j;
                let merged = false;
                for (let k = j + 1; k < this.size; k++) {
                    const targetTile = this.grid[row][k];
                    if (targetTile === null) {
                        targetCol = k;
                    } else {
                        // 遇到方块，检查是否可以合并
                        if (targetTile.value === tile.value && !targetTile.merged && !tile.merged) {
                            // 合并
                            const mergedValue = tile.value * 2;
                            targetTile.value = mergedValue;
                            targetTile.element.textContent = mergedValue;
                            targetTile.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                            targetTile.merged = true;
                            this.score += mergedValue;

                            // 隐藏原方块
                            tile.element.style.opacity = '0';
                            this.grid[row][j] = null;
                            moved = true;
                            merged = true;
                            break;
                        } else {
                            // 不能合并，停在遇到方块的前一个位置
                            targetCol = k - 1;
                            break;
                        }
                    }
                }

                // 移动方块（如果没有合并）
                if (!merged && targetCol !== j) {
                    this.grid[row][targetCol] = tile;
                    this.grid[row][j] = null;
                    tile.col = targetCol;
                    this.updateTilePosition(tile);
                    if (targetCol !== j) moved = true;
                }
            }
        }

        // 清除所有方块的merged类
        for (let j = 0; j < this.size; j++) {
            const tile = this.grid[row][j];
            if (tile && tile.element) {
                tile.element.classList.remove('merged');
            }
        }

        return moved;
    }

    processColUp(col) {
        let moved = false;

        // 先重置合并标记
        for (let i = 0; i < this.size; i++) {
            const tile = this.grid[i][col];
            if (tile) {
                tile.merged = false;
            }
        }

        // 从上到下处理每一行
        for (let i = 1; i < this.size; i++) {
            const tile = this.grid[i][col];
            if (tile && tile.element.style.opacity !== '0') {
                // 找到这个方块上方第一个空位或方块
                let targetRow = i;
                let merged = false;
                for (let k = i - 1; k >= 0; k--) {
                    const targetTile = this.grid[k][col];
                    if (targetTile === null) {
                        targetRow = k;
                    } else {
                        // 遇到方块，检查是否可以合并
                        if (targetTile.value === tile.value && !targetTile.merged && !tile.merged) {
                            // 合并
                            const mergedValue = tile.value * 2;
                            targetTile.value = mergedValue;
                            targetTile.element.textContent = mergedValue;
                            targetTile.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                            targetTile.merged = true;
                            this.score += mergedValue;

                            // 隐藏原方块
                            tile.element.style.opacity = '0';
                            this.grid[i][col] = null;
                            moved = true;
                            merged = true;
                            break;
                        } else {
                            // 不能合并，停在遇到方块的前一个位置
                            targetRow = k + 1;
                            break;
                        }
                    }
                }

                // 移动方块（如果没有合并）
                if (!merged && targetRow !== i) {
                    this.grid[targetRow][col] = tile;
                    this.grid[i][col] = null;
                    tile.row = targetRow;
                    this.updateTilePosition(tile);
                    if (targetRow !== i) moved = true;
                }
            }
        }

        // 清除所有方块的merged类
        for (let i = 0; i < this.size; i++) {
            const tile = this.grid[i][col];
            if (tile && tile.element) {
                tile.element.classList.remove('merged');
            }
        }

        return moved;
    }

    processColDown(col) {
        let moved = false;

        // 先重置合并标记
        for (let i = 0; i < this.size; i++) {
            const tile = this.grid[i][col];
            if (tile) {
                tile.merged = false;
            }
        }

        // 从下向上处理每一行
        for (let i = this.size - 2; i >= 0; i--) {
            const tile = this.grid[i][col];
            if (tile && tile.element.style.opacity !== '0') {
                // 找到这个方块下方第一个空位或方块
                let targetRow = i;
                let merged = false;
                for (let k = i + 1; k < this.size; k++) {
                    const targetTile = this.grid[k][col];
                    if (targetTile === null) {
                        targetRow = k;
                    } else {
                        // 遇到方块，检查是否可以合并
                        if (targetTile.value === tile.value && !targetTile.merged && !tile.merged) {
                            // 合并
                            const mergedValue = tile.value * 2;
                            targetTile.value = mergedValue;
                            targetTile.element.textContent = mergedValue;
                            targetTile.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                            targetTile.merged = true;
                            this.score += mergedValue;

                            // 隐藏原方块
                            tile.element.style.opacity = '0';
                            this.grid[i][col] = null;
                            moved = true;
                            merged = true;
                            break;
                        } else {
                            // 不能合并，停在遇到方块的前一个位置
                            targetRow = k - 1;
                            break;
                        }
                    }
                }

                // 移动方块（如果没有合并）
                if (!merged && targetRow !== i) {
                    this.grid[targetRow][col] = tile;
                    this.grid[i][col] = null;
                    tile.row = targetRow;
                    this.updateTilePosition(tile);
                    if (targetRow !== i) moved = true;
                }
            }
        }

        // 清除所有方块的merged类
        for (let i = 0; i < this.size; i++) {
            const tile = this.grid[i][col];
            if (tile && tile.element) {
                tile.element.classList.remove('merged');
            }
        }

        return moved;
    }

    isGameOver() {
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.grid[i][j] === null) return false;
            }
        }

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                const current = this.grid[i][j];
                if (i < this.size - 1 && this.grid[i + 1][j].value === current.value) return false;
                if (j < this.size - 1 && this.grid[i][j + 1].value === current.value) return false;
            }
        }

        return true;
    }

    saveBestScore() {
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore2048', this.bestScore);
            this.bestScoreElement.textContent = this.bestScore;
        }
    }

    
    
    updateDisplay() {
        this.scoreElement.textContent = this.score;
        this.bestScoreElement.textContent = this.bestScore;

        this.calculateTileSize();
        this.tiles.forEach(tile => {
            if (tile.element && tile.element.isConnected) {
                this.updateTilePosition(tile);
            }
        });
        console.log('Current grid state:', this.countEmptyCells(), 'empty cells');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
