<script lang="ts">
  import { extractNumbers } from '../utils'

  export default {
    props: {
      editor: String,
      bpm: Number,
      beatTop: Number,
      beatBottom: Number,
      pianoRollSnap: Number,
      pianoRollTimesX: Number
    },
    methods: {
      updateBpm(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const min = 1
        let num = Number(extractNumbers(target.value))
        if (num < min) num = min
        if (num === this.bpm) {
          target.value = String(num)
        } else {
          this.$emit('updateBpm', num)
        }
      },
      updateBeatTop(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const min = 1
        let num = Number(extractNumbers(target.value))
        num = Math.round(num)
        if (num < min) num = min
        if (num === this.beatTop) {
          target.value = String(num)
        } else {
          this.$emit('updateBeatTop', num)
        }
      },
      updateBeatBottom(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const nums = [2, 4, 8, 16]
        let num = Number(extractNumbers(target.value))
        num = Math.round(num)
        if (!nums.includes(num)) num = nums[1]
        if (num === this.beatBottom) {
          target.value = String(num)
        } else {
          this.$emit('updateBeatBottom', num)
        }
      },
      updatePianoRollSnap(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const nums = [4, 8, 16, 32]
        let num = Number(extractNumbers(target.value))
        num = Math.round(num)
        if (!nums.includes(num)) num = nums[0]
        if (num === this.pianoRollSnap) {
          target.value = String(num)
        } else {
          this.$emit('updatePianoRollSnap', num)
        }
      },
      updatePianoRollTimesX(event: Event) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const min = 0.25
        let num = Number(extractNumbers(target.value))
        if (num < min) num = min
        if (num === this.pianoRollTimesX) {
          target.value = String(num)
        } else {
          this.$emit('updatePianoRollTimesX', num)
        }
      }
    }
  }
</script>

<template>
  <div
    id="piano-params"
    v-bind:class="[(editor !== 'pianoroll') ? 'hide' : '']"
  >
    <div class="param bpm">
      <p>
        BPM :
        <input
          type="text"
          v-if="bpm !== undefined"
          v-bind:value="bpm"
          v-on:change="updateBpm"
        >
      </p>
    </div>
    <div class="param beat">
      <p>
        拍子 :
        <input
          type="text"
          v-if="beatTop !== undefined"
          v-bind:value="beatTop"
          v-on:change="updateBeatTop"
        >
        /
        <input
          type="text"
          v-if="beatBottom !== undefined"
          v-bind:value="beatBottom"
          v-on:change="updateBeatBottom"
        >
      </p>
    </div>
    <div class="param snap">
      <p>
        スナップ :
        <input
          type="text"
          v-if="pianoRollSnap !== undefined"
          v-bind:value="pianoRollSnap"
          v-on:change="updatePianoRollSnap"
        >
        分音符
      </p>
    </div>
    <div class="param times">
      <p>
        倍率 :
        <input
          type="text"
          v-if="pianoRollTimesX !== undefined"
          v-bind:value="pianoRollTimesX"
          v-on:change="updatePianoRollTimesX"
        >
      </p>
    </div>
  </div>
</template>


<style lang="scss" scoped>
  #piano-params {
    width: fit-content;
    height: 30px;
    margin: 16px;
    margin-bottom: 0;
    border-radius: 8px;
    background-color: var(--color-main);
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;

    &.hide {
      display: none;
    }

    .param {
      width: fit-content;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;

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

      input[type='text'] {
        height: 30px;
        font-size: 14px;
        color: var(--color-text-main);
        text-align: center;
      }

      &.bpm {
        input[type='text'] {
          width: 40px;
        }
      }

      &.beat {
        input[type='text'] {
          width: 20px;
        }
      }

      &.snap {
        input[type='text'] {
          width: 20px;
        }
      }

      &.times {
        input[type='text'] {
          width: 30px;
        }
      }
    }
  }
</style>
