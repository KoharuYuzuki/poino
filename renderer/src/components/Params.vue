<script lang="ts">
  import { Text } from '../text'
  import { extractNumbers } from '../utils'

  interface Config {
    min:  number
    max:  number
    step: number
    val:  number
    limit?: {
      min: number
      max: number
    }
  }

  export default {
    data(): {
      voiceId:  string | null
      speed:    Config
      volume:   Config
      pitchMax: Config
      pitchMin: Config
    } {
      return {
        voiceId:  null,
        speed: {
          min:  0.5,
          max:  2.0,
          step: 0.1,
          val:  1.0
        },
        volume: {
          min:  0.0,
          max:  2.0,
          step: 0.1,
          val:  1.0
        },
        pitchMax: {
          min:  100,
          max:  800,
          step: 1,
          val:  400,
          limit: {
            min: 0,
            max: 5000
          }
        },
        pitchMin: {
          min:  100,
          max:  800,
          step: 1,
          val:  400,
          limit: {
            min: 0,
            max: 5000
          }
        }
      }
    },
    props: {
      text: Text
    },
    methods: {
      updateSpeed(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const [min, max] = [
          this.speed.limit ? this.speed.limit.min : this.speed.min,
          this.speed.limit ? this.speed.limit.max : this.speed.max
        ]
        let num = Number(extractNumbers(target.value))
        if (num < min) num = min
        if (num > max) num = max
        this.updateValues()
        this.speed.val = Math.round(num * 100) / 100
        target.value = `${this.speed.val}.0`.slice(0, 3)
        if (event.type === 'change') {
          this.updateText()
          this.updateLabel()
        }
      },
      updateVolume(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const [min, max] = [
          this.volume.limit ? this.volume.limit.min : this.volume.min,
          this.volume.limit ? this.volume.limit.max : this.volume.max
        ]
        let num = Number(extractNumbers(target.value))
        if (num < min) num = min
        if (num > max) num = max
        this.updateValues()
        this.volume.val = Math.round(num * 100) / 100
        target.value = `${this.volume.val}.0`.slice(0, 3)
        if (event.type === 'change') {
          this.updateText()
          this.updateProject()
        }
      },
      updatePitchMax(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const [min, max] = [
          this.pitchMax.limit ? this.pitchMax.limit.min : this.pitchMax.min,
          this.pitchMax.limit ? this.pitchMax.limit.max : this.pitchMax.max
        ]
        let num = Number(extractNumbers(target.value))
        if (num < min) num = min
        if (num > max) num = max
        this.updateValues()
        this.pitchMax.val = Math.round(num)
        target.value = String(this.pitchMax.val)
        if (event.type === 'change') {
          this.updateText()
          this.updateProject()
        }
      },
      updatePitchMin(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const [min, max] = [
          this.pitchMin.limit ? this.pitchMin.limit.min : this.pitchMin.min,
          this.pitchMin.limit ? this.pitchMin.limit.max : this.pitchMin.max
        ]
        let num = Number(extractNumbers(target.value))
        if (num < min) num = min
        if (num > max) num = max
        this.updateValues()
        this.pitchMin.val = Math.round(num)
        target.value = String(this.pitchMin.val)
        if (event.type === 'change') {
          this.updateText()
          this.updateProject()
        }
      },
      updateValues() {
        const text = this.text
        if (!text) return
        this.speed.val    = text.speed
        this.volume.val   = text.volume
        this.pitchMax.val = text.pitchMax
        this.pitchMin.val = text.pitchMin
      },
      updateText() {
        const text = this.text
        if (!text) return
        text.speed    = this.speed.val
        text.volume   = this.volume.val
        text.pitchMax = this.pitchMax.val
        text.pitchMin = this.pitchMin.val
        text.cacheClear()
        this.voiceId = text.voiceId
      },
      updateLabel() {
        const text = this.text
        if (!text) return
        text.text2label()
      },
      updateProject() {
        window.dispatchEvent(new Event('updateProject'))
      }
    },
    watch: {
      text() {
        const text = this.text
        if (!text) return

        const match = text.voiceId === this.voiceId
        if (text.speed    < 0) text.speed    = match ? this.speed.val    : -text.speed
        if (text.volume   < 0) text.volume   = match ? this.volume.val   : -text.volume
        if (text.pitchMax < 0) text.pitchMax = match ? this.pitchMax.val : -text.pitchMax
        if (text.pitchMin < 0) text.pitchMin = match ? this.pitchMin.val : -text.pitchMin

        this.updateValues()
      }
    }
  }
</script>

<template>
  <div id="params" v-bind:class="(!text ? 'disabled': '')">
    <div class="param">
      <p class="label">速度</p>
      <div class="value">
        <input
          type="text"
          v-bind:value="`${speed.val}.0`.slice(0, 3)"
          v-bind:disabled="!text"
          v-on:change="updateSpeed"
        >
      </div>
      <input
        type="range"
        v-bind:min="speed.min"
        v-bind:max="speed.max"
        v-bind:step="speed.step"
        v-bind:value="speed.val"
        v-bind:disabled="!text"
        v-on:input="updateSpeed"
        v-on:change="updateSpeed"
      >
    </div>
    <div class="param">
      <p class="label">音量</p>
      <p class="value">
        <input
          type="text"
          v-bind:value="`${volume.val}.0`.slice(0, 3)"
          v-bind:disabled="!text"
          v-on:change="updateVolume"
        >
      </p>
      <input
        type="range"
        v-bind:min="volume.min"
        v-bind:max="volume.max"
        v-bind:step="volume.step"
        v-bind:value="volume.val"
        v-bind:disabled="!text"
        v-on:input="updateVolume"
        v-on:change="updateVolume"
      >
    </div>
    <div class="param">
      <p class="label">ピッチ上限</p>
      <p class="value">
        <input
          type="text"
          v-bind:value="pitchMax.val"
          v-bind:disabled="!text"
          v-on:change="updatePitchMax"
        >
        <span class="unit">Hz</span>
      </p>
      <input
        type="range"
        v-bind:min="pitchMax.min"
        v-bind:max="pitchMax.max"
        v-bind:step="pitchMax.step"
        v-bind:value="pitchMax.val"
        v-bind:disabled="!text"
        v-on:input="updatePitchMax"
        v-on:change="updatePitchMax"
      >
    </div>
    <div class="param">
      <p class="label">ピッチ下限</p>
      <p class="value">
        <input
          type="text"
          v-bind:value="pitchMin.val"
          v-bind:disabled="!text"
          v-on:change="updatePitchMin"
        >
        <span class="unit">Hz</span>
      </p>
      <input
        type="range"
        v-bind:min="pitchMin.min"
        v-bind:max="pitchMin.max"
        v-bind:step="pitchMin.step"
        v-bind:value="pitchMin.val"
        v-bind:disabled="!text"
        v-on:input="updatePitchMin"
        v-on:change="updatePitchMin"
      >
    </div>
  </div>
</template>

<style lang="scss" scoped>
  #params {
    width: 300px - 24px; // margin
    height: calc(100% - 46px - 250px - 21px - 24px); // menus, adjusters, progress, margin
    margin: 16px 16px 8px 8px;
    border-radius: 8px;
    background-color: var(--color-main);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;

    &.disabled {
      .param {
        filter: opacity(0.5);
      }
    }
  }

  .param {
    width: calc(100% - 32px); // margin
    height: fit-content;
    margin: 16px;
    margin-bottom: 8px;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: flex-start;

    .label,
    .value {
      width: 50%;
      height: 24px;
      font-size: 14px;
      line-height: 24px;
      color: var(--color-text-main);
    }

    .value {
      display: flex;
      justify-content: flex-end;
      align-items: center;

      input[type='text'] {
        width: 40px;
        height: 100%;
        font-size: 16px;
        text-align: center;
        color: var(--color-text-main);
      }

      .unit {
        margin-left: 4px;
      }
    }

    input[type='range'] {
      width: 100%;
      height: 5px;
      margin: 8px 0;
      border-radius: 2.5px;
      background-color: var(--color-rangebar-main);
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
</style>
