<script setup>
defineProps({
  /** [{ key, label, value, tone }]，tone: gold | blue | teal | muted */
  stats: { type: Array, required: true },
});
</script>

<template>
  <div class="stats">
    <div v-for="item in stats" :key="item.key" class="stat">
      <span class="k">{{ item.label }}</span>
      <span class="v" :class="item.tone">{{ item.value }}</span>
    </div>
  </div>
</template>
