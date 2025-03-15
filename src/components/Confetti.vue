<script setup lang="ts">
import { ref, onMounted, onUnmounted, defineProps, defineExpose } from 'vue';

/**
 * 礼炮组件 - 提供可配置的礼炮效果
 * 可以通过调用组件实例的startConfetti方法触发礼炮效果
 */

// 定义组件属性
const props = defineProps({
  // 是否自动播放音效
  playSound: {
    type: Boolean,
    default: true
  },
  // 粒子数量
  particleCount: {
    type: Number,
    default: 600
  },
  // 火花粒子数量
  sparkCount: {
    type: Number,
    default: 150
  },
  // 粒子持续时间系数 (值越大，粒子消失越慢)
  durationFactor: {
    type: Number,
    default: 1.0
  },
  // 粒子速度系数 (值越大，粒子移动越快)
  speedFactor: {
    type: Number,
    default: 1.0
  },
  // 粒子大小系数 (值越大，粒子越大)
  sizeFactor: {
    type: Number,
    default: 1.0
  },
  // 礼炮位置 ('corners' 表示左下和右下角, 'bottom' 表示底部中间, 'custom' 表示自定义位置)
  position: {
    type: String,
    default: 'corners',
    validator: (value: string) => ['corners', 'bottom', 'custom'].includes(value)
  },
  // 自定义礼炮位置 (仅当 position 为 'custom' 时有效)
  customPositions: {
    type: Array,
    default: () => []
  },
  // 粒子颜色列表 (为空时使用默认颜色)
  colors: {
    type: Array,
    default: () => []
  }
});

// 粒子接口定义
interface Particle {
  x: number;
  y: number;
  rotation: number;
  speedX: number;
  speedY: number;
  size: number;
  color: string;
  opacity: number;
  gravity: number;
  type?: string; // 粒子类型：'confetti'(碎纸片) 或 'spark'(火花)
}

// 配置选项接口
interface ConfettiOptions {
  particleCount?: number;
  sparkCount?: number;
  playSound?: boolean;
  speedFactor?: number;
  sizeFactor?: number;
  durationFactor?: number;
  colors?: string[]; // 自定义颜色列表
  position?: string; // 礼炮位置
  customPositions?: Array<[number, number]>; // 自定义礼炮位置
}

// 画布引用和粒子数组
const canvas = ref<HTMLCanvasElement | null>(null);
const particles = ref<Particle[]>([]);
const animationFrame = ref<number>();

// 默认颜色列表
const defaultColors = [
  '#FFD700', // 金色
  '#FF69B4', // 粉色
  '#87CEEB', // 天蓝色
  '#98FB98', // 浅绿色
  '#DDA0DD', // 梅红色
  '#F0E68C', // 卡其色
  '#FFA07A', // 浅鲑鱼色
  '#B0E0E6', // 粉蓝色
  '#FF5252', // 红色
  '#4CAF50', // 绿色
  '#FFFFFF', // 白色
  '#FFC107', // 琥珀色
];

// 获取实际使用的颜色列表
const getColors = (): string[] => {
  return props.colors.length > 0 ? props.colors as string[] : defaultColors;
};

// 火花颜色列表
const sparkColors = ['#FFF', '#FFD', '#FFB', '#FFA', '#FF8'];

/**
 * 更新粒子状态和绘制
 */
const updateParticles = () => {
  if (!canvas.value) return;
  
  const ctx = canvas.value.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);
  
  // 使用新数组存储未消失的粒子
  const remainingParticles: Particle[] = [];
  
  particles.value.forEach((particle) => {
    // 应用重力，适中的重力加速度
    particle.speedY += particle.gravity * 0.85;
    
    // 适中的移动速度，应用速度系数
    particle.y += particle.speedY * 0.9 * props.speedFactor;
    particle.x += particle.speedX * 0.9 * props.speedFactor;
    particle.rotation += 2.5 * props.speedFactor; // 适中的旋转速度
    
    // 粒子到达顶点后开始降低透明度，适中的消失速度，应用持续时间系数
    if (particle.speedY > 0) {
      // 适中的消失速度，应用持续时间系数
      const fadeSpeed = particle.type === 'spark' ? 0.02 : 0.003;
      particle.opacity -= fadeSpeed / props.durationFactor;
    }
    
    // 如果粒子已消失或超出屏幕，不保留
    if (particle.opacity <= 0 || 
        particle.y > canvas.value!.height + 50 || 
        particle.x < -50 || 
        particle.x > canvas.value!.width + 50) {
      return; // 不添加到新数组
    }
    
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.globalAlpha = particle.opacity;
    
    if (particle.type === 'spark') {
      // 绘制火花（小圆点）
      ctx.beginPath();
      ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();
    } else {
      // 绘制碎纸片（矩形或条状）
      ctx.rotate((particle.rotation * Math.PI) / 180);
      
      // 随机选择形状：长条形、正方形或三角形
      const shapeType = Math.floor(particle.x * particle.y) % 3; // 0, 1, 2
      
      if (shapeType === 0) {
        // 长条形
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 6, -particle.size / 2, particle.size / 3, particle.size);
      } else if (shapeType === 1) {
        // 正方形
        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      } else {
        // 小三角形
        ctx.beginPath();
        ctx.moveTo(0, -particle.size / 2);
        ctx.lineTo(particle.size / 2, particle.size / 2);
        ctx.lineTo(-particle.size / 2, particle.size / 2);
        ctx.closePath();
        ctx.fillStyle = particle.color;
        ctx.fill();
      }
    }
    
    ctx.restore();
    
    remainingParticles.push(particle);
  });
  
  particles.value = remainingParticles;
  
  // 如果还有粒子，继续动画
  if (particles.value.length > 0) {
    animationFrame.value = requestAnimationFrame(updateParticles);
  }
};

/**
 * 绘制礼炮发射闪光效果
 * @param x 闪光中心x坐标
 * @param y 闪光中心y坐标
 * @param size 闪光大小
 */
const drawCannonFlash = (x: number, y: number, size: number = 70) => {
  if (!canvas.value) return;
  const ctx = canvas.value.getContext('2d');
  if (!ctx) return;
  
  // 绘制闪光
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
  
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
};

/**
 * 获取礼炮位置
 * @returns 礼炮位置数组，每个元素为 [x, y] 坐标
 */
const getCannonPositions = (): Array<[number, number]> => {
  if (!canvas.value) return [];
  
  const width = canvas.value.width;
  const height = canvas.value.height;
  
  // 根据位置配置返回不同的礼炮位置
  switch (props.position) {
    case 'corners':
      // 左下角和右下角
      return [
        [20, height - 20],
        [width - 20, height - 20]
      ];
    case 'bottom':
      // 底部中间
      return [
        [width / 2, height - 20]
      ];
    case 'custom':
      // 自定义位置
      return props.customPositions as Array<[number, number]>;
    default:
      // 默认左下角和右下角
      return [
        [20, height - 20],
        [width - 20, height - 20]
      ];
  }
};

/**
 * 播放爆炸音效
 */
const playExplosionSound = () => {
  if (!props.playSound) return;
  
  try {
    const audio = new Audio();
    audio.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwMD09PT09PUxMTExMWlpaWlpaZ2dnZ2d1dXV1dXWIiIiIiIiWlpaWlpaioqKioqKwsLCwsLC9vb29vb3KysrKytrp6enp6en39/f39/f///////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAHjOZTf9/AAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KEYABEY41g5vAAA9RjpZxRwAImU+W8eshaFpAQgALAAYALATx/nYDYCMJ0HITQYYA7AH4c7MoGsnCMU5pnW+OQnBcDrQ9Xx7w37/D+PimYavV8elKUpT5fqx5VjV6vZ38eJR48eRKa9KUp7v396UgPHkQwMAAAAAA//8MAOp39CECAAhlIEEIIECBAgTT1oj///tEQYT0wgEIYxgDC09aIiE7u7u7uIiIz+LtoIQGE/+XAGYLjpTAIOGYYy0ZACgDgSNFxC7YYiINocwERjAEDhIy0mRoGwAE7lOTBsGhj1qrXNCU9GrgwSPr80jj0dIpT9DRUNHKJbRxiWSiifVHuD2b0EbjLkOUzSXztP3uE1JpHzV6NPq+f3P5T0/f/lNH7lWTavQ5Xz1yLVe653///qf93B7f/vMdaKJAAJAMAIwIMAHMpzDkoYwD8CR717zVb8/p54P3MikXGCEWhQOEAOAdP6v8b8oNL/EzdnROC8Zo+z+71O8VVAGIKFEglKbidkoLam0mAFiwo0ZoVExf/7kmQLgAQyZFxvPWAENcVKXeK0ABAk2WFMaSNIzBMptBYfArbkZgpWjEQpcmjxQoG2qREWQcvpzuuIm29V+NWm1OrTQK5dtNSaHcIxSJaq20lWjttK2tJAdyQAAABJkKCT6Z3XqoQlAQAD15gECPo9PGs5/9FJbhCG+SCCSA4gAUw3//8vTf/8vQCCfQTnhY0WqxkEMvpBqAQCpTDc8DUWYyAQVfwmMSfkogaBtNQBWCsNSZoZXJYxPZzXWQq+UK22d9XY1VoZjTW6uWqyEbY1YtjXhp9jWbVVZEtjYcwFAHWAAACkhh5PMVYhsPx6AEBkfEeXRUuX/KZ/8RBcU6QGWQAMM6C//8r0v//L0AgmTCcihHbFmEQQNfqOQGzCDmF5sZQ1DqFgiDVVmuHzBIAhkQoG2qREWYpuMOm9V+2dDSaHcIxSJaq20lWjttK2tJAdyQAAABJkKCT6Z3XqoQlAQAAAAAUfe+/7aKQTk0J//8vS//8vQCCfQTnhY0WqxkEMvpBqAQCpTDc8DUWYyAQVfwmMSfkogaBtNQBWCsNSZoZXJYxPZzXWQq+UK22d9XY1VoZjTW6uWqyEbY1YtjXhp9jWbVVZEtjYcwFAHWAAACkhh5PMVYhsPx6AEBkfEeXRUuX/KZ/8RBcU6QGWQAMM6C//8r0v//L0AgmTCcihHbFmEQQNfqOQGzCDmF5sZQ1DqFgiDVVmuHzBIAhkQoG2qREWYpuMOm9V+2dDSaHcIxSJaq20lWjttK2tJAd';
    audio.volume = 0.5;
    audio.play();
  } catch (e) {
    console.log('无法播放音效', e);
  }
};

/**
 * 添加火花粒子
 * @param x 发射点x坐标
 * @param y 发射点y坐标
 * @param count 粒子数量
 */
const addSparkParticles = (x: number, y: number, count: number) => {
  for (let i = 0; i < count; i++) {
    // 火花向四周发散
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 7 + 3) * props.speedFactor;
    
    particles.value.push({
      x,
      y,
      rotation: 0,
      speedX: Math.cos(angle) * speed,
      speedY: Math.sin(angle) * speed,
      size: (Math.random() * 4 + 2) * props.sizeFactor,
      color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      opacity: 1,
      gravity: 0.1,
      type: 'spark'
    });
  }
};

/**
 * 添加碎纸片粒子
 * @param x 发射点x坐标
 * @param y 发射点y坐标
 * @param count 粒子数量
 */
const addConfettiParticles = (x: number, y: number, count: number) => {
  // 获取颜色列表
  const colorList = getColors();
  
  // 发射角度范围（弧度）
  // 左侧礼炮：0度到80度（向右上方发射）
  // 右侧礼炮：100度到180度（向左上方发射）
  // 中间礼炮：45度到135度（向上方发射）
  let angleRange;
  const width = canvas.value!.width;
  
  if (x < width / 3) {
    // 左侧礼炮
    angleRange = [0, Math.PI * 4/9]; // 0度到80度
  } else if (x > width * 2/3) {
    // 右侧礼炮
    angleRange = [Math.PI * 5/9, Math.PI]; // 100度到180度
  } else {
    // 中间礼炮
    angleRange = [Math.PI * 1/4, Math.PI * 3/4]; // 45度到135度
  }
  
  for (let i = 0; i < count; i++) {
    // 随机角度，但更集中在中间角度
    const randomFactor = Math.pow(Math.random(), 1.5); // 使分布更集中在中间
    const angle = angleRange[0] + randomFactor * (angleRange[1] - angleRange[0]);
    
    // 随机速度，适中的速度
    const speed = (Math.random() * 9 + 13) * props.speedFactor; // 适中的速度
    const speedX = Math.cos(angle) * speed;
    const speedY = Math.sin(angle) * speed * -1; // 向上为负
    const size = (Math.random() * 8 + 6) * props.sizeFactor;
    const gravity = (0.2 + Math.random() * 0.12); // 适中的重力
    
    particles.value.push({
      x,
      y,
      rotation: Math.random() * 360,
      speedX,
      speedY,
      size,
      color: colorList[Math.floor(Math.random() * colorList.length)],
      opacity: 1,
      gravity,
      type: 'confetti'
    });
  }
};

/**
 * 开始礼炮效果
 * 可以从组件外部调用此方法触发礼炮效果
 * @param options 可选配置，可覆盖组件默认配置
 */
const startConfetti = (options: ConfettiOptions = {}) => {
  if (!canvas.value) return;
  
  console.log('开始礼炮效果');
  
  // 合并选项
  const opts = {
    particleCount: options.particleCount || props.particleCount,
    sparkCount: options.sparkCount || props.sparkCount,
    playSound: options.playSound !== undefined ? options.playSound : props.playSound,
    speedFactor: options.speedFactor || props.speedFactor,
    sizeFactor: options.sizeFactor || props.sizeFactor,
    durationFactor: options.durationFactor || props.durationFactor,
    colors: options.colors || undefined, // 临时存储自定义颜色
    position: options.position || undefined, // 临时存储自定义位置
    customPositions: options.customPositions || undefined, // 临时存储自定义位置坐标
  };
  
  // 临时保存原始值
  const originalColors = props.colors;
  const originalPosition = props.position;
  const originalCustomPositions = props.customPositions;
  
  // 临时应用自定义选项
  if (opts.colors) {
    // @ts-ignore - 我们知道这是安全的，因为我们只是临时修改
    props.colors = opts.colors;
  }
  
  if (opts.position) {
    // @ts-ignore - 我们知道这是安全的，因为我们只是临时修改
    props.position = opts.position;
  }
  
  if (opts.customPositions) {
    // @ts-ignore - 我们知道这是安全的，因为我们只是临时修改
    props.customPositions = opts.customPositions;
  }
  
  // 清空现有粒子
  particles.value = [];
  
  // 获取礼炮位置
  const cannonPositions = getCannonPositions();
  if (cannonPositions.length === 0) return;
  
  // 为每个礼炮位置绘制闪光并添加粒子
  cannonPositions.forEach(([x, y]) => {
    // 绘制闪光
    drawCannonFlash(x, y, 70 * opts.sizeFactor);
    
    // 添加火花粒子
    addSparkParticles(x, y, opts.sparkCount / cannonPositions.length);
    
    // 添加碎纸片粒子
    addConfettiParticles(x, y, opts.particleCount / cannonPositions.length);
  });
  
  // 播放音效
  if (opts.playSound) {
    playExplosionSound();
  }
  
  // 取消之前的动画帧
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
  
  // 开始新的动画
  animationFrame.value = requestAnimationFrame(updateParticles);
  
  // 恢复原始设置
  if (opts.colors) {
    // @ts-ignore - 我们知道这是安全的，因为我们只是临时修改
    props.colors = originalColors;
  }
  
  if (opts.position) {
    // @ts-ignore - 我们知道这是安全的，因为我们只是临时修改
    props.position = originalPosition;
  }
  
  if (opts.customPositions) {
    // @ts-ignore - 我们知道这是安全的，因为我们只是临时修改
    props.customPositions = originalCustomPositions;
  }
};

// 组件挂载时设置画布大小
onMounted(() => {
  if (canvas.value) {
    canvas.value.width = window.innerWidth;
    canvas.value.height = window.innerHeight;
    console.log('礼炮画布已初始化', canvas.value.width, canvas.value.height);
  }
  
  // 监听窗口大小变化
  const handleResize = () => {
    if (canvas.value) {
      canvas.value.width = window.innerWidth;
      canvas.value.height = window.innerHeight;
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  // 保存resize处理函数以便卸载时移除
  (window as any)._confettiResizeHandler = handleResize;
});

// 组件卸载时清理
onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value);
  }
  
  // 移除resize事件监听
  if ((window as any)._confettiResizeHandler) {
    window.removeEventListener('resize', (window as any)._confettiResizeHandler);
    delete (window as any)._confettiResizeHandler;
  }
});

// 向外部暴露方法
defineExpose({
  startConfetti
});
</script>

<template>
  <canvas ref="canvas" class="confetti-canvas"></canvas>
</template>

<style scoped>
.confetti-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}
</style> 
