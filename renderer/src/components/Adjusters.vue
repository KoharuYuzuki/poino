<script lang="ts">
  import { Text } from '../text'
  import type { label } from '../text'
  import { extractNumbers } from '../utils'

  interface Config {
    min:  number
    max:  number
    step: number
    limit?: {
      min: number
      max: number
    }
  }

  export default {
    data(): {
      showAccent: boolean
      accent:     Config
      length:     Config
    } {
      return {
        showAccent: true,
        accent: {
          min:  0,
          max:  1,
          step: 0.01
        },
        length: {
          min:  0,
          max:  500,
          step: 1,
          limit: {
            min: 0,
            max: 10000
          }
        }
      }
    },
    props: {
      text: Text
    },
    methods: {
      horizontalScroll(event: WheelEvent) {
        (this.$refs.wrapper as Element).scrollBy({
          top: 0,
          left: event.deltaY,
          behavior: 'auto'
        })
      },
      updateAccent(event: Event, label: label) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const [min, max] = [
          this.accent.limit ? this.accent.limit.min : this.accent.min,
          this.accent.limit ? this.accent.limit.max : this.accent.max
        ]
        let num = Number(extractNumbers(target.value))
        if (num < min) num = min
        if (num > max) num = max
        label.accent = Math.round(num * 100) / 100
        target.value = String(label.accent)
        this.text?.cacheClear()
        if (event.type === 'change') this.updateProject()
      },
      updateLength(event: Event, label: label) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const [min, max] = [
          this.length.limit ? this.length.limit.min : this.length.min,
          this.length.limit ? this.length.limit.max : this.length.max
        ]
        let num = Number(extractNumbers(target.value))
        if (num < min) num = min
        if (num > max) num = max
        label.length = Math.round(num)
        target.value = String(label.length)
        this.text?.cacheClear()
        if (event.type === 'change') this.updateProject()
      },
      updateProject() {
        window.dispatchEvent(new Event('updateProject'))
      }
    }
  }
</script>

<template>
  <div id="adjusters">
    <div class="buttons">
      <button
        class="accent-button"
        v-on:click="showAccent = true"
        v-bind:class="[(showAccent ? 'selected' : '')]"
      >
        <div class="back"></div>
        <p>Acc</p>
      </button>
      <button
        class="length-button"
        v-on:click="showAccent = false"
        v-bind:class="[(!showAccent ? 'selected' : '')]"
      >
        <div class="back"></div>
        <p>Len</p>
      </button>
    </div>
    <div class="wrapper" ref="wrapper" v-on:wheel="horizontalScroll">
      <div class="label" v-for="label in text?.labels">
        <div class="kana-box">
          <p>{{ label.kana }}</p>
        </div>
        <div class="range-box">
          <input
            type="range"
            v-bind:min="accent.min"
            v-bind:max="accent.max"
            v-bind:step="accent.step"
            v-bind:value="label.accent"
            v-on:input="(event) => updateAccent(event, label)"
            v-on:change="(event) => updateAccent(event, label)"
            v-if="showAccent"
          >
          <input
            type="range"
            v-bind:min="length.min"
            v-bind:max="length.max"
            v-bind:step="length.step"
            v-bind:value="label.length"
            v-on:input="(event) => updateLength(event, label)"
            v-on:change="(event) => updateLength(event, label)"
            v-else
          >
        </div>
        <div class="num-box">
          <input
            type="text"
            v-bind:value="label.accent"
            v-on:change="(event) => updateAccent(event, label)"
            v-if="showAccent"
          >
          <input
            type="text"
            v-bind:value="label.length"
            v-on:change="(event) => updateLength(event, label)"
            v-else
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  #adjusters {
    width: calc(100% - 32px); // margin
    height: 250px - 24px; // margin
    position: relative;
    margin: 8px 16px 16px 16px;
    border-radius: 8px;
    background-color: var(--color-main);
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .buttons {
    width: 50px - 8px; // margin
    height: calc(100% - 16px); // margin
    margin: 8px;
    margin-right: 0;

    button {
      width: 42px;
      height: 42px;
      position: relative;
      margin-bottom: 8px;

      .back {
        width: 100%;
        height: 100%;
        border: 3px solid var(--color-sub);
        border-radius: 8px;
        background-color: var(--color-main);
      }

      p {
        width: 100%;
        height: 100%;
        position: absolute;
        margin: auto;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        font-size: 14px;
        font-weight: 700;
        line-height: 42px;
        color: var(--color-sub);
      }

      &.selected {
        .back {
          border: 3px solid var(--color-sub);
          background-color: var(--color-sub);
        }

        p {
          color: var(--color-main);
        }
      }
    }
  }

  .wrapper {
    width: calc(100% - 16px - 50px); // margin, buttons
    height: calc(100% - 16px); // margin
    margin: 8px;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    overflow-x: scroll;
  }

  .label {
    width: 50px;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;

    &:first-child {
      margin-left: 16px;
    }
    &:last-child {
      margin-right: 16px;
    }

    .kana-box {
      width: 100%;
      height: 40px;
      position: relative;

      p {
        width: 100%;
        height: 40px;
        font-size: 16px;
        line-height: 40px;
        text-align: center;
        color: var(--color-text-main);
      }
    }

    .range-box {
      width: 120px;
      height: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
      transform-origin: 25px 25px;
      transform: rotateZ(90deg);

      input[type='range'] {
        width: 110px;
        height: 5px;
        border-radius: 2.5px;
        background-color: var(--color-rangebar-main);
        transform: rotateZ(180deg);
        appearance: none;

        &::-webkit-slider-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: var(--color-sub);
          -webkit-appearance: none;
        }
      }
    }

    .num-box {
      width: 100%;
      height: 40px;
      position: absolute;
      left: 0;
      bottom: 0;
      display: flex;
      justify-content: center;
      align-items: center;

      input {
        width: 100%;
        height: 20px;
        font-size: 14px;
        line-height: 20px;
        text-align: center;
        color: var(--color-text-main);
      }
    }
  }
</style>
