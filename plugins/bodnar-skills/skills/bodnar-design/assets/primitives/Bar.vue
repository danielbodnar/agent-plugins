<!-- bodnar.sh primitive — Bar
     htop-style block-fill bar. `pct` is 0..100, `width` is the
     character count of the track. -->
<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    pct: number;
    color?: string;
    width?: number;
  }>(),
  { width: 24 },
);

const filled = computed(() => Math.round((props.pct / 100) * props.width));
const fullBlocks = computed(() => '█'.repeat(filled.value));
const emptyBlocks = computed(() => '░'.repeat(props.width - filled.value));
</script>

<template>
  <span class="bar">
    <span class="bracket">[</span>
    <span :style="{ color }">{{ fullBlocks }}</span>
    <span class="ghost">{{ emptyBlocks }}</span>
    <span class="bracket">]</span>
  </span>
</template>

<style scoped>
.bar {
  letter-spacing: 0;
}
.bracket {
  color: var(--fg-faint);
}
.ghost {
  color: var(--fg-ghost, rgba(0, 0, 0, 0.16));
}
</style>
