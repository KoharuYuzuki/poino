<script lang="ts">
  export default {
    data() {
      return {
        items: [
          {
            id:    'playOrPause',
            label: '再生 / 停止',
            event: 'playOrPause'
          },
          {
            id:    'removeNotes',
            label: 'ノート削除',
            event: 'removeNotes'
          }
        ]
      }
    },
    props: {
      editor: String
    },
    methods: {
      dispatchEvent(type: string) {
        window.dispatchEvent(new Event(type))
      }
    }
  }
</script>

<template>
  <div
    id="piano-controller"
    v-bind:class="[(editor !== 'pianoroll') ? 'hide' : '']"
  >
    <button
      class="item"
      v-for="item in items"
      v-on:click="(dispatchEvent(item.event))"
    >
      <p>{{ item.label }}</p>
    </button>
  </div>
</template>

<style lang="scss" scoped>
  #piano-controller {
    width: fit-content;
    height: 30px;
    margin: 16px;
    margin-left: 0;
    margin-bottom: 0;
    border-radius: 8px;
    background-color: var(--color-main);
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    flex-grow: 1;

    &.hide {
      display: none;
    }

    .item {
      width: fit-content;
      height: 100%;
      border-radius: 8px;
      background-color: var(--color-main);
      display: flex;
      justify-content: center;
      align-items: center;

      &:active {
        filter: brightness(95%);
      }

      &:not(:last-child)::after {
        content: '';
        width: 2px;
        height: 16px;
        background-color: var(--color-line-main);
      }

      p {
        margin: 0 12px;
        font-size: 14px;
        color: var(--color-text-main);
      }
    }
  }
</style>
