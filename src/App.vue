<script setup>
import { computed } from 'vue';
import ChartCard from './components/ChartCard.vue';
import ControlPanel from './components/ControlPanel.vue';
import LineChart from './components/LineChart.vue';
import ModelDocs from './components/ModelDocs.vue';
import SimInfo from './components/SimInfo.vue';
import StatGrid from './components/StatGrid.vue';
import { useSimulation } from './composables/useSimulation';
import { COLORS } from './core/viewModel';

const { params, view, reset } = useSimulation();

function updateParam(key, value) {
  params[key] = value;
}

const statCards = computed(() => [
  { key: 'pop', label: 'N 年后总人口', value: view.value.stats.pop, tone: '' },
  { key: 'richPct', label: '当前富人占比', value: view.value.stats.richPct, tone: 'teal' },
  { key: 'ancPct', label: view.value.labels.kRichAnc, value: view.value.stats.ancPct, tone: 'gold' },
  { key: 'richPop', label: view.value.labels.kRichPop, value: view.value.stats.richPop, tone: 'blue' },
]);
</script>

<template>
  <div class="wrap">
    <aside class="panel">
      <h1>古代阶层延续模拟器</h1>
      <p class="sub">阶层内婚 · 阶层流动 · 血统扩散 · 天灾冲击</p>

      <ControlPanel :params="params" @update="updateParam" />

      <SimInfo :rows="view.info" />

      <button class="reset" type="button" @click="reset">恢复默认参数</button>
    </aside>

    <main>
      <StatGrid :stats="statCards" />

      <ChartCard title="血统人口结构">
        <template #legend>
          <span><i :style="{ background: COLORS.anc }"></i>{{ view.labels.lgAnc }}</span>
          <span><i :style="{ background: COLORS.noAnc }"></i>{{ view.labels.lgNoAnc }}</span>
          <span><i :style="{ background: COLORS.total }"></i>总人口</span>
          <span><i :style="{ background: COLORS.disaster }"></i>天灾</span>
        </template>
        <LineChart
          :xs="view.xs"
          :series="view.charts.population.series"
          :y-max="view.charts.population.yMax"
          :y-fmt="view.charts.population.yFmt"
          :markers="view.disasters"
        />
      </ChartCard>

      <ChartCard :title="view.labels.title2">
        <template #legend>
          <span><i :style="{ background: COLORS.anc }"></i>有富人祖先的比例</span>
        </template>
        <LineChart
          :xs="view.xs"
          :series="view.charts.ancestry.series"
          :y-max="view.charts.ancestry.yMax"
          :y-fmt="view.charts.ancestry.yFmt"
          :markers="view.disasters"
        />
      </ChartCard>

      <ChartCard title="当前仍是富人的比例（阶层是否延续的真正指标）">
        <template #legend>
          <span><i :style="{ background: COLORS.rich }"></i>当前富人占比</span>
        </template>
        <LineChart
          :xs="view.xs"
          :series="view.charts.currentRich.series"
          :y-max="view.charts.currentRich.yMax"
          :y-fmt="view.charts.currentRich.yFmt"
          :markers="view.disasters"
        />
      </ChartCard>

      <ModelDocs />
    </main>
  </div>
</template>
