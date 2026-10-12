<script setup>
import { computed } from 'vue';
import { CONTROLS, groupControls } from '../constants/model';
import ParamSegment from './ParamSegment.vue';
import ParamSlider from './ParamSlider.vue';

defineProps({
  /** 响应式参数对象（来自 useSimulation） */
  params: { type: Object, required: true },
});

const emit = defineEmits(['update']);

const groups = computed(() => groupControls(CONTROLS));

function update(key, value) {
  emit('update', key, value);
}
</script>

<template>
  <div class="controls">
    <template v-for="group in groups" :key="group.title">
      <div class="group-title">{{ group.title }}</div>
      <template v-for="item in group.items" :key="item.key">
        <ParamSegment
          v-if="item.type === 'segment'"
          :model-value="params[item.key]"
          :label="item.label"
          :options="item.options"
          :hint="item.hint || ''"
          @update:model-value="update(item.key, $event)"
        />
        <ParamSlider
          v-else
          :model-value="params[item.key]"
          :label="item.label"
          :unit="item.unit || ''"
          :min="item.min"
          :max="item.max"
          :step="item.step"
          :hint="item.hint || ''"
          @update:model-value="update(item.key, $event)"
        />
      </template>
    </template>
  </div>
</template>
