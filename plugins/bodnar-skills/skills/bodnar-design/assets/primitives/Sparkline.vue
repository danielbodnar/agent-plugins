<!-- bodnar.sh primitive — Sparkline
     Unicode-block sparkline mapped from a numeric data array. -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: number[];
  color?: string;
}>();

const blocks = '▁▂▃▄▅▆▇█';

const rendered = computed(() => {
  const max = Math.max(...props.data, 1);
  return props.data
    .map((v) => blocks[Math.min(7, Math.round((v / max) * 7))])
    .join('');
});
</script>

<template>
  <span class="sparkline" :style="{ color }">{{ rendered }}</span>
</template>

<style scoped>
.sparkline {
  letter-spacing: 0;
}
</style>
