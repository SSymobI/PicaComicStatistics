<script setup lang="ts">
import type { UpdateBucket, WordStatItem, YearBucket } from '@types-project/stats';
import type { StatsChartProps } from '@types-project/ui';
import type { ECharts, EChartsOption } from 'echarts';

const props = withDefaults(defineProps<StatsChartProps>(), { height: '20rem' });
const chartRoot = ref<HTMLElement>();
let chart: ECharts | undefined;

function colors(): string[] {
  const styles = getComputedStyle(document.documentElement);
  return ['--primary', '--accent', '--brand-purple', '--brand-green', '--info', '--danger'].map(token => styles.getPropertyValue(token).trim());
}

function createOption(): EChartsOption {
  const palette = colors();
  if (props.kind === 'wordcloud') {
    return {
      animation: false,
      series: [{ type: 'wordCloud', shape: 'square', gridSize: 8, sizeRange: [14, 52], rotationRange: [0, 0], drawOutOfBound: false, textStyle: { color: () => palette[Math.floor(Math.random() * palette.length)] || '#000' }, data: (props.items as WordStatItem[]).map(item => ({ name: item.name, value: item.count })) }],
    } as EChartsOption;
  }
  if (props.kind === 'pie') {
    return { animation: false, tooltip: { trigger: 'item' }, legend: { bottom: 0 }, series: [{ type: 'pie', radius: ['42%', '70%'], data: (props.items as WordStatItem[]).map(item => ({ name: item.name, value: item.count })), label: { show: false } }] } as EChartsOption;
  }
  const values = props.items as Array<YearBucket | UpdateBucket>;
  return { animation: false, tooltip: { trigger: 'axis' }, grid: { left: '8%', right: '4%', bottom: '18%', top: '8%' }, xAxis: { type: 'category', data: values.map(item => 'year' in item ? String(item.year) : item.label), axisLine: { lineStyle: { color: '#000', width: 2 } }, axisLabel: { color: '#000' } }, yAxis: { type: 'value', axisLine: { lineStyle: { color: '#000', width: 2 } }, splitLine: { lineStyle: { type: 'dashed', opacity: 0.2 } } }, series: [{ type: 'bar', data: values.map(item => item.count), itemStyle: { color: palette[0] || '#ff5c8a' } }] } as EChartsOption;
}

async function render(): Promise<void> {
  if (!chartRoot.value)
    return;
  const echarts = await import('echarts');
  await import('echarts-wordcloud');
  chart?.dispose();
  chart = echarts.init(chartRoot.value);
  chart.setOption(createOption());
}

onMounted(() => { void render(); window.addEventListener('resize', () => chart?.resize()); });
onBeforeUnmount(() => chart?.dispose());
watch(() => [props.kind, props.items], () => { void render(); }, { deep: true });
</script>

<template>
  <div ref="chartRoot" class="stats-chart" :style="{ height }" role="img" aria-label="统计图表" />
</template>

<style scoped>
.stats-chart { width: 100%; min-height: 16rem; }
</style>
