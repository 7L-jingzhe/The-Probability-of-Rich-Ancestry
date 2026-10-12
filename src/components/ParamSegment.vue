<script setup>
defineProps({
  modelValue: { type: Number, required: true },
  label: { type: String, required: true },
  options: { type: Array, required: true },
  hint: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue']);

function pick(value) {
  emit('update:modelValue', value);
}
</script>

<template>
  <div class="ctrl">
    <div class="ctrl-head">
      <label>{{ label }}</label>
    </div>
    <div class="seg">
      <button
        v-for="option in options"
        :key="option.v"
        type="button"
        :class="{ active: modelValue === option.v }"
        @click="pick(option.v)"
      >
        {{ option.label }}
      </button>
    </div>
    <div v-if="hint" class="hint">{{ hint }}</div>
  </div>
</template>
