<template>
  <div class="sig-container" ref="container">
    <canvas 
      ref="canvas" 
      @mousedown="startDrawing"
      @mousemove="draw"
      @mouseup="stopDrawing"
      @mouseleave="stopDrawing"
      @touchstart.prevent="handleTouchStart"
      @touchmove.prevent="handleTouchMove"
      @touchend="stopDrawing"
      class="sig-canvas"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps<{
  penColor?: string;
  lineWidth?: number;
}>();

const container = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const isDrawing = ref(false);
const lastX = ref(0);
const lastY = ref(0);

let ctx: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;

const setupCanvas = () => {
  if (!canvas.value || !container.value) return;
  
  const rect = container.value.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  // Set canvas size to match container, accounting for device pixel ratio
  canvas.value.width = rect.width * dpr;
  canvas.value.height = rect.height * dpr;
  
  // Scale the context to account for the pixel ratio
  ctx = canvas.value.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = props.penColor || '#000000';
    ctx.lineWidth = props.lineWidth || 2;
  }
};

const getCoordinates = (e: MouseEvent | Touch): { x: number; y: number } => {
  if (!canvas.value) return { x: 0, y: 0 };
  
  const rect = canvas.value.getBoundingClientRect();
  const clientX = 'clientX' in e ? e.clientX : (e as Touch).clientX;
  const clientY = 'clientY' in e ? e.clientY : (e as Touch).clientY;
  
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
};

const startDrawing = (e: MouseEvent) => {
  isDrawing.value = true;
  const coords = getCoordinates(e);
  lastX.value = coords.x;
  lastY.value = coords.y;
};

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  if (e.touches.length === 1 && touch) {
    isDrawing.value = true;
    const coords = getCoordinates(touch);
    lastX.value = coords.x;
    lastY.value = coords.y;
  }
};

const draw = (e: MouseEvent) => {
  if (!isDrawing.value || !ctx) return;
  
  const coords = getCoordinates(e);
  
  ctx.beginPath();
  ctx.moveTo(lastX.value, lastY.value);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
  
  lastX.value = coords.x;
  lastY.value = coords.y;
};

const handleTouchMove = (e: TouchEvent) => {
  const touch = e.touches[0];
  if (!isDrawing.value || !ctx || e.touches.length !== 1 || !touch) return;
  
  const coords = getCoordinates(touch);
  
  ctx.beginPath();
  ctx.moveTo(lastX.value, lastY.value);
  ctx.lineTo(coords.x, coords.y);
  ctx.stroke();
  
  lastX.value = coords.x;
  lastY.value = coords.y;
};

const stopDrawing = () => {
  isDrawing.value = false;
};

const clearSignature = () => {
  if (!ctx || !canvas.value || !container.value) return;
  
  const rect = container.value.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
};

const isEmpty = (): boolean => {
  if (!canvas.value) return true;
  
  const ctx = canvas.value.getContext('2d');
  if (!ctx) return true;
  
  const imageData = ctx.getImageData(0, 0, canvas.value.width, canvas.value.height);
  if (!imageData?.data) return true;
  const data = imageData.data;
  
  // Check if any pixel has been drawn (alpha > 0)
  for (let i = 3; i < data.length; i += 4) {
    const alpha = data[i];
    if (alpha !== undefined && alpha > 0) return false;
  }
  return true;
};

const saveSignature = (): { isEmpty: boolean; data: string } => {
  const empty = isEmpty();
  const data = empty ? '' : (canvas.value?.toDataURL('image/png') || '');
  return { isEmpty: empty, data };
};

// Expose methods to parent component
defineExpose({
  clearSignature,
  saveSignature,
  isEmpty
});

onMounted(async () => {
  await nextTick();
  setupCanvas();
  
  // Watch for container resize
  if (container.value) {
    resizeObserver = new ResizeObserver(() => {
      setupCanvas();
    });
    resizeObserver.observe(container.value);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
});
</script>

<style scoped>
.sig-container {
  width: 100%;
  height: 150px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  overflow: hidden;
  touch-action: none;
}

.sig-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}
</style>
