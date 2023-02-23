<script lang="ts">
  export default {
    mounted() {
      window.addEventListener('synthProgress', (event) => {
        const detail = (event as CustomEvent).detail
        this.progress = detail as number

        if (this.timeoutId !== null) {
          clearTimeout(this.timeoutId)
          this.timeoutId = null
        }

        if (this.progress >= 1) {
          const delayTimeMs = 3000
          this.timeoutId = setTimeout(() => {
            this.progress = 0
            this.timeoutId = null
          }, delayTimeMs)
        }
      })
    },
    data(): {
      progress: number
      timeoutId: any
    } {
      return {
        progress: 0,
        timeoutId: null
      }
    }
  }
</script>

<template>
  <div id="progress">
    <div
      v-bind:style="[`width: ${progress * 100}%;`]"
    >
    </div>
  </div>
</template>

<style lang="scss" scoped>
  #progress {
    width: calc(100% - 32px); // margin
    height: 5px;
    position: relative;
    margin: 16px;
    margin-top: 0;
    border-radius: 2.5px;
    background-color: var(--color-main);

    div {
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      border-radius: 2.5px;
      background-color: var(--color-line-sub);
      transition: width 0.1s;
    }
  }
</style>
