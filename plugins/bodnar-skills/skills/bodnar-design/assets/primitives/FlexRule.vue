<!-- bodnar.sh primitive — FlexRule
     Horizontal mono rule that fills available flex space.
     Pair inside a flex row. Extra style/class fall through to the root. -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    ch?: string;
    color?: string;
  }>(),
  { ch: '─' },
);
</script>

<template>
  <span aria-hidden="true" class="flex-rule" :style="{ color }">{{ ch.repeat(400) }}</span>
</template>

<style scoped>
.flex-rule {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  user-select: none;
  line-height: 1;
}
</style>
