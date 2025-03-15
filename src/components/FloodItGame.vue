<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import Confetti from './Confetti.vue';
// 游戏配置接口
interface GameConfig {
  boardSize: number;
  colorCount: number;
  maxMoves: number;
}

// 游戏配置，可由用户调整
const gameConfig = ref<GameConfig>({
  boardSize: 14, // 棋盘大小 N x N
  colorCount: 6, // 颜色数量
  maxMoves: 25, // 最大允许步数
});

// 可用颜色列表
const colors: string[] = [
  '#FF5252', // 红色
  '#4CAF50', // 绿色
  '#2196F3', // 蓝色
  '#FFEB3B', // 黄色
  '#9C27B0', // 紫色
  '#FF9800', // 橙色
  '#607D8B', // 蓝灰色
  '#E91E63', // 粉色
];

// 游戏状态
const board = ref<string[][]>([]);
const moves = ref<number>(0);
const gameWon = ref<boolean>(false);
const gameOver = ref<boolean>(false);
const shakingCell = ref<string | null>(null); // 用于标记正在震动的格子

// 撒花组件引用
const confettiRef = ref<InstanceType<typeof Confetti> | null>(null);

// 初始化游戏
const initGame = (): void => {
  const newBoard: string[][] = [];
  for (let i = 0; i < gameConfig.value.boardSize; i++) {
    const row: string[] = [];
    for (let j = 0; j < gameConfig.value.boardSize; j++) {
      const randomIndex = Math.floor(Math.random() * gameConfig.value.colorCount);
      row.push(colors[randomIndex]);
    }
    newBoard.push(row);
  }
  board.value = newBoard;
  moves.value = 0;
  gameWon.value = false;
  gameOver.value = false;
};

// 检查游戏是否胜利
const checkWin = (): boolean => {
  // 如果已经赢了，直接返回true
  if (gameWon.value) return true;
  
  const firstColor = board.value[0][0];
  for (let i = 0; i < gameConfig.value.boardSize; i++) {
    for (let j = 0; j < gameConfig.value.boardSize; j++) {
      if (board.value[i][j] !== firstColor) {
        return false;
      }
    }
  }
  
  // 游戏胜利时触发撒花效果，使用自定义配置
  if (confettiRef.value) {
    confettiRef.value.startConfetti({
      particleCount: 600,
      sparkCount: 150,
      durationFactor: 1.2, // 延长持续时间
      speedFactor: 0.9,    // 稍微降低速度
      sizeFactor: 1.0,     // 保持默认大小
      colors: colors.slice(0, gameConfig.value.colorCount) // 使用游戏中的颜色
    });
  }
  return true;
};

// 执行淹没操作
const flood = (newColor: string): void => {
  if (gameWon.value || gameOver.value) return;
  if (newColor === board.value[0][0]) return; // 如果选择的颜色与当前颜色相同，不执行操作

  moves.value++;
  
  // 使用BFS算法进行淹没操作
  const oldColor = board.value[0][0];
  const queue: [number, number][] = [[0, 0]];
  const visited = new Set<string>();
  visited.add('0,0');
  
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    board.value[x][y] = newColor;
    
    // 检查四个方向的相邻格子
    const directions: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      
      // 检查边界
      if (nx >= 0 && nx < gameConfig.value.boardSize && 
          ny >= 0 && ny < gameConfig.value.boardSize) {
        const key = `${nx},${ny}`;
        // 如果相邻格子颜色与原始颜色相同且未访问过
        if (board.value[nx][ny] === oldColor && !visited.has(key)) {
          queue.push([nx, ny]);
          visited.add(key);
        }
      }
    }
  }
  
  // 检查游戏状态
  if (checkWin()) {
    gameWon.value = true;
    // 确保在胜利时调用撒花效果
    setTimeout(() => {
      if (confettiRef.value) {
        confettiRef.value.startConfetti({
          particleCount: 600,
          sparkCount: 150,
          durationFactor: 1.2, // 延长持续时间
          speedFactor: 0.9,    // 稍微降低速度
          sizeFactor: 1.0,     // 保持默认大小
          colors: colors.slice(0, gameConfig.value.colorCount) // 使用游戏中的颜色
        });
        console.log('触发撒花效果');
      } else {
        console.log('撒花组件引用为空');
      }
    }, 100);
  } else if (moves.value >= gameConfig.value.maxMoves) {
    // 达到最大步数时调用checkGameOver
    checkGameOver();
  }
};

// 处理格子点击事件
const handleCellClick = (rowIndex: number, colIndex: number): void => {
  if (gameWon.value || gameOver.value) return;
  
  const clickedColor = board.value[rowIndex][colIndex];
  const currentColor = board.value[0][0];
  
  // 检查是否可以使用这个颜色（是否与当前颜色区域相邻）
  const canUseColor = isColorAdjacent(clickedColor);
  
  if (canUseColor && clickedColor !== currentColor) {
    flood(clickedColor);
  } else {
    // 如果不能使用这个颜色，显示震动效果
    shakingCell.value = `${rowIndex}-${colIndex}`;
    setTimeout(() => {
      shakingCell.value = null;
    }, 500); // 震动效果持续500毫秒
  }
};

// 检查颜色是否与当前颜色区域相邻
const isColorAdjacent = (color: string): boolean => {
  if (color === board.value[0][0]) return false; // 相同颜色不需要点击
  
  // 使用BFS找出当前所有相连的同色格子
  const currentColor = board.value[0][0];
  const queue: [number, number][] = [[0, 0]];
  const visited = new Set<string>();
  visited.add('0,0');
  
  // 存储与当前区域相邻的不同颜色
  const adjacentColors = new Set<string>();
  
  while (queue.length > 0) {
    const [x, y] = queue.shift()!;
    
    // 检查四个方向的相邻格子
    const directions: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    for (const [dx, dy] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      
      // 检查边界
      if (nx >= 0 && nx < gameConfig.value.boardSize && 
          ny >= 0 && ny < gameConfig.value.boardSize) {
        const key = `${nx},${ny}`;
        
        if (!visited.has(key)) {
          if (board.value[nx][ny] === currentColor) {
            // 如果是同色格子，继续BFS
            queue.push([nx, ny]);
            visited.add(key);
          } else {
            // 如果是不同颜色，记录这个颜色
            adjacentColors.add(board.value[nx][ny]);
          }
        }
      }
    }
  }
  
  // 检查点击的颜色是否在相邻颜色中
  return adjacentColors.has(color);
};

// 计算剩余步数
const remainingMoves = computed<number>(() => {
  return gameConfig.value.maxMoves - moves.value;
});

// 游戏结束时检查是否胜利
const checkGameOver = (): void => {
  if (moves.value >= gameConfig.value.maxMoves) {
    gameOver.value = true;
    
    // 游戏结束但未胜利时，显示较少的礼炮效果
    if (confettiRef.value) {
      confettiRef.value.startConfetti({
        particleCount: 200,  // 减少粒子数量
        sparkCount: 50,      // 减少火花数量
        durationFactor: 0.8, // 缩短持续时间
        speedFactor: 1.1,    // 稍微加快速度
        position: 'bottom'   // 只从底部中间发射
      });
    }
  }
};

// 重置游戏
const resetGame = (): void => {
  // 重置游戏时，如果之前赢了，显示小型礼炮效果
  if (gameWon.value && confettiRef.value) {
    confettiRef.value.startConfetti({
      particleCount: 100,  // 很少的粒子
      sparkCount: 30,      // 很少的火花
      durationFactor: 0.5, // 更短的持续时间
      speedFactor: 1.2,    // 更快的速度
      sizeFactor: 0.8      // 更小的粒子
    });
  }
  
  initGame();
};

// 更新游戏配置
const updateConfig = (): void => {
  // 确保颜色数量不超过可用颜色
  if (gameConfig.value.colorCount > colors.length) {
    gameConfig.value.colorCount = colors.length;
  }
  resetGame();
};

// 监听配置变化
watch(() => gameConfig.value, updateConfig, { deep: true });

// 组件挂载时初始化游戏
onMounted(() => {
  initGame();
});
</script>

<template>
  <div class="flood-it-game">
    <Confetti ref="confettiRef" />
    <div class="game-header">
      <h1>Flood-It 游戏</h1>
      <div class="game-info">
        <div class="moves">步数: {{ moves }} / {{ gameConfig.maxMoves }}</div>
        <div class="moves">剩余: {{ remainingMoves }}</div>
        <div v-if="gameWon" class="message win">恭喜你赢了!</div>
        <div v-else-if="gameOver" class="message lose">游戏结束!</div>
      </div>
    </div>
    
    <div class="game-content">
      <div class="game-controls">
        <button @click="resetGame" class="control-button">重新开始</button>
      </div>
      
      <div class="game-board" :style="{ 
        'grid-template-columns': `repeat(${gameConfig.boardSize}, 1fr)`,
        'grid-template-rows': `repeat(${gameConfig.boardSize}, 1fr)`
      }">
        <template v-for="(row, rowIndex) in board" :key="rowIndex">
          <div
            v-for="(cell, colIndex) in row"
            :key="`${rowIndex}-${colIndex}`"
            class="cell"
            :class="{ 'shaking': shakingCell === `${rowIndex}-${colIndex}` }"
            :style="{ backgroundColor: cell }"
            @click="handleCellClick(rowIndex, colIndex)"
          ></div>
        </template>
      </div>
      
      <div class="game-config">
        <h3>游戏设置</h3>
        <div class="config-item">
          <label for="boardSize">棋盘大小:</label>
          <input 
            id="boardSize" 
            type="range" 
            v-model.number="gameConfig.boardSize" 
            min="5" 
            max="20" 
            step="1"
          />
          <span>{{ gameConfig.boardSize }}x{{ gameConfig.boardSize }}</span>
        </div>
        
        <div class="config-item">
          <label for="colorCount">颜色数量:</label>
          <input 
            id="colorCount" 
            type="range" 
            v-model.number="gameConfig.colorCount" 
            min="3" 
            :max="colors.length" 
            step="1"
          />
          <span>{{ gameConfig.colorCount }}</span>
        </div>
        
        <div class="config-item">
          <label for="maxMoves">最大步数:</label>
          <input 
            id="maxMoves" 
            type="range" 
            v-model.number="gameConfig.maxMoves" 
            min="10" 
            max="50" 
            step="5"
          />
          <span>{{ gameConfig.maxMoves }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.flood-it-game {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  overflow: hidden;

  .game-header {
    padding: 10px 10px 5px 10px;
    text-align: center;
    flex-shrink: 0;

    h1 {
      margin: 0 0 5px 0;
      font-size: 1.6rem;
    }
  }

  .game-info {
    display: flex;
    justify-content: center;
    gap: 15px;
    flex-wrap: wrap;
    margin-bottom: 5px;

    .moves {
      font-size: 1rem;
      font-weight: bold;
    }

    .message {
      font-size: 1rem;
      font-weight: bold;
      padding: 3px 8px;
      border-radius: 4px;

      &.win {
        background-color: #4CAF50;
        color: white;
      }

      &.lose {
        background-color: #FF5252;
        color: white;
      }
    }
  }

  .game-content {
    display: flex;
    flex-direction: column;
    flex: 1;
    padding: 0 10px 10px 10px;
    gap: 10px;
    overflow: auto;
    align-items: center;
    justify-content: center;

    .game-controls {
      display: flex;
      justify-content: center;
      width: 100%;
      max-width: 500px;
      margin-bottom: 5px;
      flex-shrink: 0;

      .control-button {
        padding: 8px 16px;
        background-color: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
        transition: background-color 0.2s ease;

        &:hover {
          background-color: #0b7dda;
        }
      }
    }

    .game-board {
      display: grid;
      gap: 2px;
      width: 100%;
      max-width: 500px;
      height: auto;
      aspect-ratio: 1 / 1;
      border: 2px solid #333;
      border-radius: 5px;
      overflow: hidden;
      flex-shrink: 0;
      margin: 10px 0;

      .cell {
        width: 100%;
        height: 100%;
        transition: background-color 0.3s ease;
        cursor: pointer;

        &:hover {
          opacity: 0.8;
        }

        &.shaking {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      }
    }

    .game-config {
      width: 100%;
      max-width: 500px;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 5px;
      background-color: #f9f9f9;
      flex-shrink: 0;
      margin-top: 5px;

      h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 1.1rem;
        text-align: center;
      }

      .config-item {
        display: flex;
        align-items: center;
        margin-bottom: 8px;

        label {
          width: 80px;
          font-weight: bold;
          font-size: 0.9rem;
        }

        input {
          flex: 1;
          margin: 0 8px;
        }

        span {
          width: 50px;
          text-align: right;
          font-size: 0.9rem;
        }
      }
    }
  }
}

@keyframes shake {
  10%, 90% {
    transform: translate3d(-1px, 0, 0);
  }
  
  20%, 80% {
    transform: translate3d(2px, 0, 0);
  }

  30%, 50%, 70% {
    transform: translate3d(-4px, 0, 0);
  }

  40%, 60% {
    transform: translate3d(4px, 0, 0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .flood-it-game {
    .game-header {
      padding: 8px 8px 3px 8px;
      
      h1 {
        font-size: 1.4rem;
      }
    }
    
    .game-content {
      padding: 0 5px 5px 5px;
      
      .game-board {
        max-width: 90vw;
      }
      
      .game-config {
        max-width: 90vw;
        padding: 8px;
      }
    }
  }
}

@media (max-height: 600px) {
  .flood-it-game {
    .game-header {
      padding: 5px 5px 2px 5px;
      
      h1 {
        font-size: 1.2rem;
        margin-bottom: 2px;
      }
    }

    .game-info {
      gap: 10px;
      margin-bottom: 2px;
      
      .moves, .message {
        font-size: 0.9rem;
      }
    }

    .game-content {
      gap: 5px;
      padding: 0 5px 5px 5px;
      
      .game-controls {
        margin-bottom: 2px;
        
        .control-button {
          padding: 5px 12px;
          font-size: 0.9rem;
        }
      }
      
      .game-config {
        padding: 5px;
        
        h3 {
          margin-bottom: 5px;
          font-size: 1rem;
        }
        
        .config-item {
          margin-bottom: 5px;
          
          label {
            font-size: 0.85rem;
          }
          
          span {
            font-size: 0.85rem;
          }
        }
      }
    }
  }
}
</style>
