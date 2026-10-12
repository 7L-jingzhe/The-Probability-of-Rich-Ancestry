<script setup>
defineProps({
  /** [{ label, value }] */
  rows: { type: Array, required: true },
});
</script>

<template>
  <div class="sim-info">
    <div v-for="row in rows" :key="row.label">
      <b>{{ row.label }}：</b>{{ row.value }}
    </div>
  </div>
</template>
