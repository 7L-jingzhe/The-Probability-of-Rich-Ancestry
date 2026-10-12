<script setup>
import { computed } from 'vue';
import { formatVal } from '../core/format';

const props = defineProps({
  modelValue: { type: Number, required: true },
  label: { type: String, required: true },
  unit: { type: String, default: '' },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  hint: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

const display = computed(() => formatVal(props.modelValue, props.unit));

function onInput(event) {
  emit('update:modelValue', parseFloat(event.target.value));
}
</script>

<template>
  <div class="ctrl">
    <div class="ctrl-head">
      <label :for="'c-' + label">{{ label }}</label>
      <output>{{ display }}</output>
    </div>
    <input
      type="range"
      :id="'c-' + label"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="onInput"
    />
    <div v-if="hint" class="hint">{{ hint }}</div>
  </div>
</template>
