<script setup lang="ts">
import type { UpdateBucket, WordStatItem, YearBucket } from '@types-project/stats';
import type { StatsChartProps } from '@types-project/ui';
import type { ECharts, EChartsOption } from 'echarts';
import { MotionChart, MotionReveal } from '@/constants/motion';
import { prefersReducedMotion } from '@/utils/motion';

const props = withDefaults(defineProps<StatsChartProps>(), { height: '20rem' });
const chartRoot = ref<HTMLElement>();
let chart: ECharts | undefined;
let viewportObserver: IntersectionObserver | undefined;
let resizeObserver: ResizeObserver | undefined;
let visible = false;

/** 读取 @theme 令牌的计算值；图表内不硬编码色值。 */
function cssVar(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

function colors(): string[] {
  return ['--color-primary', '--color-accent', '--color-brand-purple', '--color-brand-green', '--color-info', '--color-danger'].map(cssVar);
}

/** 入场动画：用户声明减少动态效果时直接静态呈现。 */
function motionOptions(): Pick<EChartsOption, 'animation' | 'animationDuration' | 'animationEasing' | 'animationDelay'> {
  if (prefersReducedMotion())
    return { animation: false };
  return {
    animation: true,
    animationDuration: MotionChart.DURATION_MS,
    animationEasing: MotionChart.EASING,
    animationDelay: (index: number) => index * MotionChart.DELAY_STEP_MS,
  };
}

function createOption(): EChartsOption {
  const palette = colors();
  if (props.kind === 'wordcloud') {
    return {
      animation: false,
      series: [{ type: 'wordCloud', shape: 'square', gridSize: 8, sizeRange: [14, 52], rotationRange: [0, 0], drawOutOfBound: false, textStyle: { color: () => palette[Math.floor(Math.random() * palette.length)] || cssVar('--color-ink') }, data: (props.items as WordStatItem[]).map(item => ({ name: item.name, value: item.count })) }],
    } as EChartsOption;
  }
  if (props.kind === 'pie') {
    return { ...motionOptions(), tooltip: { trigger: 'item' }, legend: { bottom: 0 }, series: [{ type: 'pie', radius: ['42%', '70%'], data: (props.items as WordStatItem[]).map(item => ({ name: item.name, value: item.count })), label: { show: false } }] } as EChartsOption;
  }
  const values = props.items as Array<YearBucket | UpdateBucket>;
  return { ...motionOptions(), tooltip: { trigger: 'axis' }, grid: { left: '8%', right: '4%', bottom: '18%', top: '8%' }, xAxis: { type: 'category', data: values.map(item => 'year' in item ? String(item.year) : item.label), axisLine: { lineStyle: { color: cssVar('--color-ink'), width: 2 } }, axisLabel: { color: cssVar('--color-ink') } }, yAxis: { type: 'value', axisLine: { lineStyle: { color: cssVar('--color-ink'), width: 2 } }, splitLine: { lineStyle: { type: 'dashed', opacity: 0.2 } } }, series: [{ type: 'bar', data: values.map(item => item.count), itemStyle: { color: palette[0] || cssVar('--color-primary') } }] } as EChartsOption;
}

async function render(): Promise<void> {
  if (!visible || !chartRoot.value)
    return;
  const echarts = await import('echarts');
  await import('echarts-wordcloud');
  chart?.dispose();
  chart = echarts.init(chartRoot.value);
  chart.setOption(createOption());
}

/** 首次进入视口时才初始化图表，使入场动画在可见时播放。 */
function observeViewport(element: HTMLElement): void {
  if (prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
    visible = true;
    void render();
    return;
  }
  viewportObserver = new IntersectionObserver((entries) => {
    if (!entries.some(entry => entry.isIntersecting))
      return;
    visible = true;
    viewportObserver?.disconnect();
    viewportObserver = undefined;
    void render();
  }, { threshold: MotionReveal.THRESHOLD, rootMargin: MotionReveal.ROOT_MARGIN });
  viewportObserver.observe(element);
}

function observeSize(element: HTMLElement): void {
  if (typeof ResizeObserver === 'undefined')
    return;
  resizeObserver = new ResizeObserver(() => chart?.resize());
  resizeObserver.observe(element);
}

onMounted(() => {
  const element = chartRoot.value;
  if (!element)
    return;
  observeViewport(element);
  observeSize(element);
});

onBeforeUnmount(() => {
  viewportObserver?.disconnect();
  resizeObserver?.disconnect();
  chart?.dispose();
});

watch(() => [props.kind, props.items], () => { void render(); }, { deep: true });
</script>

<template>
  <div ref="chartRoot" class="stats-chart" :style="{ height }" role="img" aria-label="统计图表" />
</template>

<style scoped>
.stats-chart { width: 100%; min-height: 16rem; }
</style>
