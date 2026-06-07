<!-- bodnar.sh primitive — SectionFrame
     The signature surface: top kicker + body slot + bottom rule.
     The `right` meta string should be a command incantation,
     never marketing copy. -->
<script setup lang="ts">
import FlexRule from './FlexRule.vue';

withDefaults(
  defineProps<{
    kicker: string;
    right?: string;
    accent?: string;
    padTop?: number;
    padBottom?: number;
  }>(),
  { padTop: 24, padBottom: 28 },
);
</script>

<template>
  <section class="section-frame">
    <div class="frame-rule" :style="{ color: accent }">
      <span class="nowrap">╭─ {{ kicker }} ─</span>
      <FlexRule :color="accent" />
      <template v-if="right">
        <span class="frame-meta">{{ right }}</span>
        <FlexRule :color="accent" />
      </template>
      <span>╮</span>
    </div>
    <div class="frame-body" :style="{ padding: `${padTop}px 0 ${padBottom}px` }">
      <slot />
    </div>
    <div class="frame-rule" :style="{ color: accent }">
      <span>╰</span>
      <FlexRule :color="accent" />
      <span>╯</span>
    </div>
  </section>
</template>

<style scoped>
.section-frame {
  padding: 32px 56px 0;
  font-family: var(--ff-mono);
}
.frame-rule {
  display: flex;
  align-items: center;
  gap: 0;
  font-size: 12px;
  line-height: 1;
}
.nowrap {
  white-space: nowrap;
}
.frame-meta {
  color: var(--fg-faint);
  padding: 0 10px;
  white-space: nowrap;
}
</style>
