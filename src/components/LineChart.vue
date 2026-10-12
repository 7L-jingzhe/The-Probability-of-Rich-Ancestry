<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { drawLineChart } from '../charts/lineChart';
import { fmtWan } from '../core/format';

const props = defineProps({
  /** x 轴刻度（年份） */
  xs: { type: Array, required: true },
  /** [{ key, color, values, dashed? }] */
  series: { type: Array, required: true },
  /** 固定 y 轴上限；null 表示按数据自适应 */
  yMax: { type: Number, default: null },
  /** 数值格式：number | wan | percent */
  yFmt: { type: String, default: 'number' },
  /** 竖向虚线标记（如天灾年份） */
  markers: { type: Array, default: () => [] },
});

const canvasRef = ref(null);
let observer = null;

const formatters = {
  number: (v) => String(Math.round(v)),
  wan: fmtWan,
  percent: (v) => Math.round(v) + '%',
};

function draw() {
  if (!canvasRef.value) return;
  drawLineChart(canvasRef.value, props.xs, props.series, {
    yMax: props.yMax == null ? undefined : props.yMax,
    yFmt: formatters[props.yFmt] || formatters.number,
    markers: props.markers,
  });
}

onMounted(() => {
  draw();
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(draw);
    observer.observe(canvasRef.value);
  }
  window.addEventListener('resize', draw);
});

onBeforeUnmount(() => {
  if (observer) observer.disconnect();
  window.removeEventListener('resize', draw);
});

// 参数变化 -> view 重算 -> series 引用变化 -> 重绘
watch(() => [props.xs, props.series, props.yMax, props.markers], draw, { deep: true });
</script>

<template>
  <canvas ref="canvasRef"></canvas>
</template>
