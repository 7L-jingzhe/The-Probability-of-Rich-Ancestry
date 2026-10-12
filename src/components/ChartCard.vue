<script setup>
defineProps({
  title: { type: String, required: true },
});
</script>

<template>
  <div class="chart-box">
    <div class="chart-head">
      <span class="chart-title">{{ title }}</span>
      <span v-if="$slots.legend" class="legend">
        <slot name="legend" />
      </span>
    </div>
    <slot />
  </div>
</template>
