<!-- bodnar.sh primitive — Caret
     Blinking block caret for the end of any "live" line.
     Depends on the `v3blink` keyframe defined globally in
     assets/tokens.css. -->
<template>
  <span class="caret">▌</span>
</template>

<style scoped>
.caret {
  animation: v3blink 1.1s steps(2) infinite;
}
</style>
