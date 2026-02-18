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
        // 先收集该行的所有方块
        const tiles = [];
        for (let j = 0; j < this.size; j++) {
            const tile = this.grid[row][j];
            if (tile) {
                tiles.push(tile);
            }
        }

        // 处理合并和移动
        const result = [];
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            if (i < tiles.length - 1 &&
                tile.value === tiles[i + 1].value) {
                // 合并两个方块
                const nextTile = tiles[i + 1];
                const mergedValue = tile.value * 2;

                // 隐藏第二个方块并移除
                nextTile.element.remove();
                this.grid[row][nextTile.col] = null;

                // 更新第一个方块
                tile.value = mergedValue;
                tile.element.textContent = mergedValue;
                tile.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                this.score += mergedValue;

                result.push(tile);
                i++; // 跳过已合并的方块
            } else {
                result.push(tile);
            }
        }

        // 清空该行并重新放置方块
        for (let j = 0; j < this.size; j++) {
            this.grid[row][j] = null;
        }

        let moved = false;
        result.forEach((tile, index) => {
            const oldCol = tile.col;
            const oldRow = tile.row;

            tile.col = index;
            tile.row = row;
            this.grid[row][index] = tile;
            this.updateTilePosition(tile);

            if (oldCol !== tile.col || oldRow !== tile.row) {
                moved = true;
            }
            tile.element.classList.remove('merged');
        });

        return moved;
    }

    processRowRight(row) {
        // 先收集该行的所有方块（从右到左）
        const tiles = [];
        for (let j = this.size - 1; j >= 0; j--) {
            const tile = this.grid[row][j];
            if (tile) {
                tiles.push(tile);
            }
        }

        // 处理合并
        const result = [];
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            if (i < tiles.length - 1 &&
                tile.value === tiles[i + 1].value) {
                // 合并两个方块
                const nextTile = tiles[i + 1];
                const mergedValue = tile.value * 2;

                // 隐藏第二个方块并移除
                nextTile.element.remove();
                this.grid[row][nextTile.col] = null;

                // 更新第一个方块
                tile.value = mergedValue;
                tile.element.textContent = mergedValue;
                tile.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                this.score += mergedValue;

                result.push(tile);
                i++; // 跳过已合并的方块
            } else {
                result.push(tile);
            }
        }

        // 清空该行并重新放置方块（从右到左）
        for (let j = 0; j < this.size; j++) {
            this.grid[row][j] = null;
        }

        let moved = false;
        result.forEach((tile, index) => {
            const oldCol = tile.col;
            const oldRow = tile.row;
            const targetCol = this.size - 1 - index;

            tile.col = targetCol;
            tile.row = row;
            this.grid[row][targetCol] = tile;
            this.updateTilePosition(tile);

            if (oldCol !== tile.col || oldRow !== tile.row) {
                moved = true;
            }
            tile.element.classList.remove('merged');
        });

        return moved;
    }

    processColUp(col) {
        // 先收集该列的所有方块（从上到下）
        const tiles = [];
        for (let i = 0; i < this.size; i++) {
            const tile = this.grid[i][col];
            if (tile) {
                tiles.push(tile);
            }
        }

        // 处理合并
        const result = [];
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            if (i < tiles.length - 1 &&
                tile.value === tiles[i + 1].value) {
                // 合并两个方块
                const nextTile = tiles[i + 1];
                const mergedValue = tile.value * 2;

                // 隐藏第二个方块并移除
                nextTile.element.remove();
                this.grid[nextTile.row][col] = null;

                // 更新第一个方块
                tile.value = mergedValue;
                tile.element.textContent = mergedValue;
                tile.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                this.score += mergedValue;

                result.push(tile);
                i++; // 跳过已合并的方块
            } else {
                result.push(tile);
            }
        }

        // 清空该列并重新放置方块
        for (let i = 0; i < this.size; i++) {
            this.grid[i][col] = null;
        }

        let moved = false;
        result.forEach((tile, index) => {
            const oldRow = tile.row;
            const oldCol = tile.col;

            tile.row = index;
            tile.col = col;
            this.grid[index][col] = tile;
            this.updateTilePosition(tile);

            if (oldRow !== tile.row || oldCol !== tile.col) {
                moved = true;
            }
            tile.element.classList.remove('merged');
        });

        return moved;
    }

    processColDown(col) {
        // 先收集该列的所有方块（从下到上）
        const tiles = [];
        for (let i = this.size - 1; i >= 0; i--) {
            const tile = this.grid[i][col];
            if (tile) {
                tiles.push(tile);
            }
        }

        // 处理合并
        const result = [];
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            if (i < tiles.length - 1 &&
                tile.value === tiles[i + 1].value) {
                // 合并两个方块
                const nextTile = tiles[i + 1];
                const mergedValue = tile.value * 2;

                // 隐藏第二个方块并移除
                nextTile.element.remove();
                this.grid[nextTile.row][col] = null;

                // 更新第一个方块
                tile.value = mergedValue;
                tile.element.textContent = mergedValue;
                tile.element.className = `tile tile-${mergedValue > 2048 ? 'super' : mergedValue} merged`;
                this.score += mergedValue;

                result.push(tile);
                i++; // 跳过已合并的方块
            } else {
                result.push(tile);
            }
        }

        // 清空该列并重新放置方块（从下到上）
        for (let i = 0; i < this.size; i++) {
            this.grid[i][col] = null;
        }

        let moved = false;
        result.forEach((tile, index) => {
            const oldRow = tile.row;
            const oldCol = tile.col;
            const targetRow = this.size - 1 - index;

            tile.row = targetRow;
            tile.col = col;
            this.grid[targetRow][col] = tile;
            this.updateTilePosition(tile);

            if (oldRow !== tile.row || oldCol !== tile.col) {
                moved = true;
            }
            tile.element.classList.remove('merged');
        });

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

        // 清理 tiles 数组，移除已断开连接的元素
        this.tiles = this.tiles.filter(tile => tile.element && tile.element.isConnected);

        this.tiles.forEach(tile => {
            if (tile.element && tile.element.isConnected) {
                this.updateTilePosition(tile);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
