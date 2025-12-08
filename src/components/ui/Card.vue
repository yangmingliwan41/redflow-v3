<template>
  <div
    :class="[
      'ui-card',
      {
        'ui-card--hover': hover,
        'ui-card--shadow-sm': shadow === 'sm',
        'ui-card--shadow-md': shadow === 'md',
        'ui-card--shadow-lg': shadow === 'lg',
        'ui-card--bordered': bordered
      }
    ]"
  >
    <div v-if="$slots.header" class="ui-card__header">
      <slot name="header" />
    </div>
    <div class="ui-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="ui-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  hover?: boolean
  shadow?: 'sm' | 'md' | 'lg' | 'none'
  bordered?: boolean
}

withDefaults(defineProps<Props>(), {
  hover: true,
  shadow: 'sm',
  bordered: true
})
</script>

<style scoped>
.ui-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: all var(--duration-normal) var(--ease-out);
}

.ui-card--bordered {
  border: 1px solid var(--border-color);
}

.ui-card--shadow-sm {
  box-shadow: var(--shadow-sm);
}

.ui-card--shadow-md {
  box-shadow: var(--shadow-md);
}

.ui-card--shadow-lg {
  box-shadow: var(--shadow-lg);
}

.ui-card--hover:hover {
  box-shadow: var(--shadow-hover);
  transform: translateY(-2px);
}

.ui-card__header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.ui-card__body {
  padding: var(--spacing-lg);
}

.ui-card__footer {
  padding: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  background: var(--bg-body);
}
</style>




