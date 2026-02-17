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
        // 双重检查：从grid找出空格子，同时确保tiles数组中没有冲突
        const emptyCells = [];

        // 先检查grid
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                // grid位置为空，且没有tile引用这个位置
                if (this.grid[i][j] === null) {
                    let hasTile = false;
                    for (const tile of this.tiles) {
                        if (tile.row === i && tile.col === j &&
                            tile.element &&
                            tile.element.isConnected &&
                            tile.element.style.opacity !== '0') {
                            hasTile = true;
                            break;
                        }
                    }
                    if (!hasTile) {
                        emptyCells.push({ row: i, col: j });
                    }
                }
            }
        }

        // 只在有空格子时添加新方块
        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            const tile = this.createTile(value, randomCell.row, randomCell.col, true);
            this.grid[randomCell.row][randomCell.col] = tile;

            // 确保没有重复添加
            this.tiles.push(tile);
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
        const newTiles = [];

        // 从左到右收集非空方块
        for (let j = 0; j < this.size; j++) {
            const tile = this.grid[row][j];
            if (tile) {
                // 重置合并标记
                tile.merged = false;
                newTiles.push(tile);
            }
        }

        // 处理合并和移动
        const mergedTiles = [];
        let writeIndex = 0;

        for (let i = 0; i < newTiles.length; i++) {
            if (i + 1 < newTiles.length &&
                newTiles[i].value === newTiles[i + 1].value &&
                !newTiles[i].merged &&
                !newTiles[i + 1].merged) {
                // 合并两个方块
                const tile1 = newTiles[i];
                const tile2 = newTiles[i + 1];
                const mergedValue = tile1.value * 2;

                // 隐藏第二个方块
                tile2.element.style.opacity = '0';
                moved = true;

                // 更新第一个方块
                tile1.value = mergedValue;
                tile1.element.textContent = mergedValue;
                tile1.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                tile1.merged = true;

                // 放置在正确位置
                tile1.row = row;
                tile1.col = writeIndex;
                mergedTiles.push(tile1);
                this.score += mergedValue;
                writeIndex++;

                i++; // 跳过已合并的方块
            } else if (!newTiles[i].merged) {
                // 移动方块到新位置
                const tile = newTiles[i];
                if (tile.col !== writeIndex || tile.row !== row) {
                    tile.row = row;
                    tile.col = writeIndex;
                    this.updateTilePosition(tile);
                    moved = true;
                }
                mergedTiles.push(tile);
                writeIndex++;
            }
        }

        // 更新这一行的grid，先清空整行
        for (let j = 0; j < this.size; j++) {
            this.grid[row][j] = null;
        }

        // 然后放置处理后的方块
        mergedTiles.forEach((tile, index) => {
            this.grid[row][index] = tile;
        });

        return moved;
    }

    processRowRight(row) {
        let moved = false;
        const newTiles = [];

        // 从右到左收集非空方块
        for (let j = this.size - 1; j >= 0; j--) {
            const tile = this.grid[row][j];
            if (tile) {
                tile.merged = false;
                newTiles.push(tile);
            }
        }

        // 处理合并和移动
        const result = [];
        let resultIndex = 0;

        // 从右到左遍历
        for (let i = 0; i < newTiles.length; i++) {
            // 检查是否有可以合并的方块
            if (i + 1 < newTiles.length &&
                newTiles[i].value === newTiles[i + 1].value &&
                !newTiles[i].merged &&
                !newTiles[i + 1].merged) {

                // 合并
                const tile1 = newTiles[i];
                const tile2 = newTiles[i + 1];
                const mergedValue = tile1.value * 2;

                // 隐藏第二个方块
                tile2.element.style.opacity = '0';
                moved = true;

                // 更新第一个方块
                tile1.value = mergedValue;
                tile1.element.textContent = mergedValue;
                tile1.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                tile1.merged = true;

                // 放置在正确位置（从右侧开始）
                result[resultIndex] = tile1;
                this.score += mergedValue;
                resultIndex++;

                i++; // 跳过已合并的方块
            } else if (!newTiles[i].merged) {
                // 直接放入结果数组
                result[resultIndex] = newTiles[i];
                resultIndex++;
            }
        }

        // 更新grid - 先清空整行
        for (let j = 0; j < this.size; j++) {
            this.grid[row][j] = null;
        }

        // 从右侧开始放置方块
        for (let i = 0; i < this.size; i++) {
            const tile = result[i];
            if (tile) {
                // 计算新的列位置（从右侧开始）
                const targetCol = this.size - 1 - i;
                if (tile.row !== row || tile.col !== targetCol) {
                    tile.row = row;
                    tile.col = targetCol;
                    this.updateTilePosition(tile);
                    moved = true;
                }
                this.grid[row][targetCol] = tile;
            }
        }

        return moved;
    }

    processColUp(col) {
        let moved = false;
        const newTiles = [];

        // 从上到下收集非空方块
        for (let i = 0; i < this.size; i++) {
            const tile = this.grid[i][col];
            if (tile) {
                tile.merged = false;
                newTiles.push(tile);
            }
        }

        // 处理合并和移动
        const mergedTiles = [];
        let writeIndex = 0;

        for (let i = 0; i < newTiles.length; i++) {
            if (i + 1 < newTiles.length &&
                newTiles[i].value === newTiles[i + 1].value &&
                !newTiles[i].merged &&
                !newTiles[i + 1].merged) {
                // 合并两个方块
                const tile1 = newTiles[i];
                const tile2 = newTiles[i + 1];
                const mergedValue = tile1.value * 2;

                // 隐藏第二个方块
                tile2.element.style.opacity = '0';
                moved = true;

                // 更新第一个方块
                tile1.value = mergedValue;
                tile1.element.textContent = mergedValue;
                tile1.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                tile1.merged = true;

                // 放置在正确位置
                tile1.row = writeIndex;
                tile1.col = col;
                mergedTiles.push(tile1);
                this.score += mergedValue;
                writeIndex++;

                i++; // 跳过已合并的方块
            } else if (!newTiles[i].merged) {
                // 移动方块到新位置
                const tile = newTiles[i];
                if (tile.row !== writeIndex || tile.col !== col) {
                    tile.row = writeIndex;
                    tile.col = col;
                    this.updateTilePosition(tile);
                    moved = true;
                }
                mergedTiles.push(tile);
                writeIndex++;
            }
        }

        // 更新这一列的grid
        for (let i = 0; i < this.size; i++) {
            this.grid[i][col] = null;
        }

        mergedTiles.forEach((tile, index) => {
            this.grid[index][col] = tile;
        });

        return moved;
    }

    processColDown(col) {
        let moved = false;
        const newTiles = [];

        // 从下到上收集非空方块
        for (let i = this.size - 1; i >= 0; i--) {
            const tile = this.grid[i][col];
            if (tile) {
                tile.merged = false;
                newTiles.push(tile);
            }
        }

        // 处理合并和移动
        const result = [];
        let resultIndex = 0;

        // 从下往上遍历
        for (let i = 0; i < newTiles.length; i++) {
            // 检查是否有可以合并的方块
            if (i + 1 < newTiles.length &&
                newTiles[i].value === newTiles[i + 1].value &&
                !newTiles[i].merged &&
                !newTiles[i + 1].merged) {

                // 合并
                const tile1 = newTiles[i];
                const tile2 = newTiles[i + 1];
                const mergedValue = tile1.value * 2;

                // 隐藏第二个方块
                tile2.element.style.opacity = '0';
                moved = true;

                // 更新第一个方块
                tile1.value = mergedValue;
                tile1.element.textContent = mergedValue;
                tile1.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                tile1.merged = true;

                // 放置在正确位置（从底部开始）
                result[resultIndex] = tile1;
                this.score += mergedValue;
                resultIndex++;

                i++; // 跳过已合并的方块
            } else if (!newTiles[i].merged) {
                // 直接放入结果数组
                result[resultIndex] = newTiles[i];
                resultIndex++;
            }
        }

        // 更新grid - 先清空整列
        for (let i = 0; i < this.size; i++) {
            this.grid[i][col] = null;
        }

        // 从底部开始放置方块
        for (let i = 0; i < this.size; i++) {
            const tile = result[i];
            if (tile) {
                // 计算新的行位置（从底部开始）
                const targetRow = this.size - 1 - i;
                if (tile.row !== targetRow || tile.col !== col) {
                    tile.row = targetRow;
                    tile.col = col;
                    this.updateTilePosition(tile);
                    moved = true;
                }
                this.grid[targetRow][col] = tile;
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
