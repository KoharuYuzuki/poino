<script lang="ts">
  import { Text, Label } from '../text'
  import { hira2kana, kanaOnly } from '../../../ts/utils'
  import { toRaw } from 'vue'

  export default {
    mounted() {
      window.addEventListener('resize', this.updateVerticalLinesWidth)
      window.addEventListener('mouseup', () => {
        this.currentTimeChanging = false
        this.noteResizing = false
        this.noteResizeDirection = null
        this.noteResizeOrigLen = -1
        this.noteResizeX = 0
        this.noteMoving = false
        this.noteMoveOrigAccs = []
        this.noteMoveY = 0
      })
      window.addEventListener('undo', this.updateVerticalLinesWidthWithDelay)
      window.addEventListener('redo', this.updateVerticalLinesWidthWithDelay)
      window.addEventListener('playOrPause', this.playOrPause)
      window.addEventListener('removeNotes', this.removeNotes)
    },
    data(): {
      keyboardSize: number
      keyboardKeys: string[]
      verticalLinesWidth: number
      currentTimeMs: number
      adjustSnap: number
      adjustTimesX: number
      currentTimeChanging: boolean
      noteResizing: boolean
      noteResizeDirection: 'front' | 'back' | null
      noteResizeOrigLen: number
      noteResizeX: number
      noteMoving: boolean
      noteMoveOrigAccs: number[]
      noteMoveY: number
      lastClickedNoteLabel: Label | null
      currentTimeMsIntervalId: number | null
    } {
      return {
        keyboardSize: 8,
        keyboardKeys: [
          'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
        ].reverse(),
        verticalLinesWidth: 0,
        currentTimeMs: 0,
        adjustSnap: 4,
        adjustTimesX: 0.2,
        currentTimeChanging: false,
        noteResizing: false,
        noteResizeDirection: null,
        noteResizeOrigLen: -1,
        noteResizeX: 0,
        noteMoving: false,
        noteMoveOrigAccs: [],
        noteMoveY: 0,
        lastClickedNoteLabel: null,
        currentTimeMsIntervalId: null
      }
    },
    props: {
      text: Text,
      editor: String,
      bpm: Number,
      beatTop: Number,
      beatBottom: Number,
      pianoRollSnap: Number,
      pianoRollTimesX: Number,
      player: HTMLAudioElement
    },
    methods: {
      calcPositionX(index: number) {
        if (!this.text) return 0
        const frontLabels = this.text.labels.slice(0, index)
        const x = frontLabels.reduce((sum, label) => sum + label.length, 0)
        return x
      },
      calcPositionY(index: number) {
        if (!this.text) return 0
        const label = this.text.labels[index]
        const pitch = label.accent
        const pitchMin = this.text.pitchMin
        const pitchMax = this.text.pitchMax
        const pitchDiff = pitchMax - pitchMin
        const freq = (pitchDiff * pitch) + pitchMin
        const c1 = 32.703
        const r = 1.059463094
        const noteHeight = 20
        const numOfLine = this.keyboardKeys.length * this.keyboardSize
        const y = noteHeight * (numOfLine - Math.log(freq / c1) / Math.log(r) - 1)
        return y
      },
      calcTotalLabelLen() {
        if (!this.text) return 0
        return this.text.labels.reduce((sum, label) => sum + label.length, 0)
      },
      y2acc(val: number) {
        if (!this.text) return 0

        const pitchMin = this.text.pitchMin
        const pitchMax = this.text.pitchMax
        const pitchDiff = pitchMax - pitchMin
        const c1 = 32.703
        const r = 1.059463094
        const noteHeight = 20
        const numOfLine = this.keyboardKeys.length * this.keyboardSize

        let y = Math.round(val / noteHeight) * noteHeight
        if (y < 0) y = 0
        if (y > (noteHeight * (numOfLine - 1))) y = noteHeight * (numOfLine - 1)
        const newFreq = c1 * (r ** (numOfLine - (y / noteHeight) - 1))
        const accent = (newFreq - pitchMin) / pitchDiff

        return accent
      },
      bpm2ms(bpm: number) {
        const ms = 1000 * 60 / bpm
        return ms
      },
      calcNumOfVerticalLine(bpm: number, width: number) {
        const ms = this.bpm2ms(bpm)
        const times = this.pianoRollTimesX ? this.pianoRollTimesX : 1
        const adjustTimes = this.adjustTimesX
        const snap = this.pianoRollSnap ? this.pianoRollSnap : 1
        const adjustSnap = this.adjustSnap
        const num = Math.floor(width / (ms * times * adjustTimes)) * (snap / adjustSnap)
        return num
      },
      updateVerticalLinesWidth() {
        const verticalLines = this.$refs.verticalLines as HTMLElement
        this.verticalLinesWidth = (verticalLines) ? verticalLines.getBoundingClientRect().width : 0
      },
      updateVerticalLinesWidthWithDelay() {
        const delayTimeMs = 100
        setTimeout(() => {
          this.updateVerticalLinesWidth()
        }, delayTimeMs)
      },
      updateCurrentTimeMs() {
        if (this.player?.paused) return
        this.currentTimeMs = this.player ? (this.player.currentTime * 1000) : 0
      },
      jumpCurrentTime(event: Event) {
        if (!this.pianoRollTimesX || !this.player) return
        this.currentTimeChanging = true
        const x = (event as PointerEvent).offsetX
        let ms = x / this.pianoRollTimesX / this.adjustTimesX
        if (ms < 0) ms = 0
        this.currentTimeMs = ms
      },
      moveCurrentTime(event: Event) {
        if (!this.currentTimeChanging) return
        if (!this.pianoRollTimesX || !this.player) return
        const x = -(event as PointerEvent).movementX
        const ms = x / this.pianoRollTimesX / this.adjustTimesX
        let newCurrentTimeMs = this.currentTimeMs - ms
        if (newCurrentTimeMs < 0) newCurrentTimeMs = 0
        this.currentTimeMs = newCurrentTimeMs
      },
      playOrPause() {
        if (!this.player) return
        window.dispatchEvent(new CustomEvent('play', {
          detail: this.currentTimeMs / 1000
        }))
      },
      selectNote(event: Event, label: Label) {
        if (!this.text) return
        const metaKey = (event as PointerEvent).metaKey
        const ctrlKey = (event as PointerEvent).ctrlKey
        const shiftKey = (event as PointerEvent).shiftKey
        const labels = this.text.labels
        if (metaKey || ctrlKey) {
          label.select()
          this.lastClickedNoteLabel = label
          return
        }
        if (shiftKey) {
          if (!this.lastClickedNoteLabel) {
            label.select()
            this.lastClickedNoteLabel = label
            return
          }
          const start = labels.indexOf(this.lastClickedNoteLabel)
          const end = labels.indexOf(label)
          const sliced = labels.slice(
            (start <= end) ? start : end,
            ((start <= end) ? end : start) + 1
          )
          sliced.forEach((label) => label.select())
          return
        }
        labels.forEach((label) => label.unselect())
        label.select()
        this.lastClickedNoteLabel = label
      },
      unselectNotes(event: Event) {
        if (!this.text) return
        const metaKey = (event as PointerEvent).metaKey
        const ctrlKey = (event as PointerEvent).ctrlKey
        const shiftKey = (event as PointerEvent).shiftKey
        if (this.noteMoving || metaKey || ctrlKey || shiftKey) return
        const labels = this.text.labels
        labels.forEach((label) => label.unselect())
        this.lastClickedNoteLabel = null
      },
      calcSnap(index: number) {
        if (!this.text) return 0
        if (!this.bpm) return 0
        if (!this.pianoRollSnap) return 0

        const frontToralMs =
          this.text.labels
          .slice(0, index + 1)
          .reduce((sum, label) => sum + label.length, 0)

        const snapMs =
          this.bpm2ms(this.bpm) / this.pianoRollSnap * this.adjustSnap

        return frontToralMs - Math.round(frontToralMs / snapMs) * snapMs
      },
      resizeNote(event: Event) {
        if (!this.noteResizing) return
        if (!this.noteResizeDirection) return
        if (!this.pianoRollTimesX) return
        if (!this.text) return

        const labels = this.text.labels
        const filtered = labels.filter((x) => x.isSelected())
        if (filtered.length <= 0) return

        const selected = filtered[0]
        const index = labels.indexOf(selected)
        if (this.noteResizeOrigLen === -1) {
          this.noteResizeOrigLen = selected.length
        }

        this.noteResizeX += (event as PointerEvent).movementX
        const ms = this.noteResizeX / this.pianoRollTimesX / this.adjustTimesX

        if (selected.kana === '、') {
          let newSelectedMs =
            (this.noteResizeDirection === 'front') ?
            this.noteResizeOrigLen - ms :
            this.noteResizeOrigLen + ms
          if (newSelectedMs < 0) newSelectedMs = 0
          selected.length = newSelectedMs
          selected.length -= this.calcSnap(index)
          return
        }

        if (this.noteResizeDirection === 'front') {
          const beforeIndex = index - 1
          let beforeLabel: Label | null = null

          if ((beforeIndex >= 0) && (beforeIndex < labels.length)) {
            const label = labels[beforeIndex]
            if (label.kana === '、') beforeLabel = label
          }

          if (beforeLabel === null) {
            beforeLabel = new Label('、', 0, selected.accent)
            labels.splice(index, 0, beforeLabel)
          }

          let newSelectedMs = this.noteResizeOrigLen - ms
          if (newSelectedMs < 0) newSelectedMs = 0
          const diffMs = newSelectedMs - selected.length
          selected.length = newSelectedMs
          const snapMs = this.calcSnap(index)
          selected.length -= snapMs

          let newBeforeMs = beforeLabel.length - (diffMs - snapMs)
          if (newBeforeMs < 0) newBeforeMs = 0
          beforeLabel.length = newBeforeMs
        } else {
          const afterIndex = index + 1
          let afterLabel: Label | null = null

          if ((afterIndex >= 0) && (afterIndex < labels.length)) {
            const label = labels[afterIndex]
            if (label.kana === '、') afterLabel = label
          }

          if (afterLabel === null) {
            afterLabel = new Label('、', 0, selected.accent)
            labels.splice(index + 1, 0, afterLabel)
          }

          let newSelectedMs = this.noteResizeOrigLen + ms
          if (newSelectedMs < 0) newSelectedMs = 0
          const diffMs = newSelectedMs - selected.length
          selected.length = newSelectedMs
          const snapMs = this.calcSnap(index)
          selected.length -= snapMs

          let newAfterMs = afterLabel.length - (diffMs - snapMs)
          if (newAfterMs < 0) newAfterMs = 0
          afterLabel.length = newAfterMs
        }
      },
      moveNote(event: Event) {
        if (!this.noteMoving) return
        if (!this.text) return

        const labels = this.text.labels
        const selections = labels.filter((x) => x.isSelected())
        if (selections.length <= 0) return

        if (this.noteMoveOrigAccs.length <= 0) {
          this.noteMoveOrigAccs = selections.map((x) => x.accent)
        }

        this.noteMoveY += (event as PointerEvent).movementY

        const pitchMin = this.text.pitchMin
        const pitchMax = this.text.pitchMax
        const pitchDiff = pitchMax - pitchMin
        const c1 = 32.703
        const r = 1.059463094
        const noteHeight = 20
        const numOfLine = this.keyboardKeys.length * this.keyboardSize

        selections.forEach((label, i) => {
          const accent = this.noteMoveOrigAccs[i]
          const freq = (pitchDiff * accent) + pitchMin
          const y = noteHeight * (numOfLine - Math.log(freq / c1) / Math.log(r) - 1)
          const newAccent = this.y2acc(y + this.noteMoveY)
          label.accent = newAccent
        })
      },
      createNote(event: Event) {
        if (!this.text) return
        if (!this.bpm) return

        const x = (event as MouseEvent).offsetX
        const y = (event as MouseEvent).offsetY
        const labels = this.text.labels
        const diffs = [] as {
          diff: number
          index: number
        }[]

        labels.reduce((sum, label, index) => {
          const timesX = this.pianoRollTimesX ? this.pianoRollTimesX : 1
          const noteLen = label.length * timesX * this.adjustTimesX
          sum += noteLen / 2
          const diff = x - sum
          diffs.push({
            diff: (diff >= 0) ? diff : -diff,
            index: (diff < 0) ? index : index + 1
          })
          sum += noteLen / 2
          return sum
        }, 0)

        const noteHeightHalf = 10
        const sorted = diffs.sort((a, b) => a.diff - b.diff)
        const insertIndex = (sorted.length > 0) ? sorted[0].index : 0
        const newLabel = new Label(
          'ア',
          this.bpm2ms(this.bpm),
          this.y2acc(y - noteHeightHalf)
        )

        labels.splice(insertIndex, 0, newLabel)
        this.text?.cacheClear()
        this.text?.text2voice()
        this.updateProject()
        this.updateVerticalLinesWidthWithDelay()
      },
      removeNotes() {
        if (!this.text) return
        const labels = this.text.labels
        const unselected = labels.filter((label) => !label.isSelected())
        this.text.labels = unselected.map((x) => toRaw(x))
        this.text?.cacheClear()
        this.text?.text2voice()
        this.updateProject()
        this.updateVerticalLinesWidthWithDelay()
      },
      changeKana(event: Event, label: Label) {
        if (event.target === null) return
        const target = event.target as HTMLInputElement
        const result = kanaOnly(hira2kana(target.value))
        const kana = (result === '') ? '、' : result
        target.value = kana
        label.kana = kana
        this.text?.cacheClear()
        this.text?.text2voice()
        this.updateProject()
      },
      onMouseMove(event: Event) {
        if (this.currentTimeChanging) {
          this.moveCurrentTime(event)
        }

        if (this.noteResizing) {
          this.resizeNote(event)
          this.updateVerticalLinesWidthWithDelay()
        }

        if (this.noteMoving) {
          this.moveNote(event)
        }
      },
      onMouseUp(event: Event) {
        if (this.currentTimeChanging) {
          this.moveCurrentTime(event)
        }

        if (this.noteResizing) {
          this.resizeNote(event)
          this.text?.cacheClear()
          this.text?.text2voice()
          this.updateProject()
        }

        if (this.noteMoving) {
          this.moveNote(event)
          this.text?.cacheClear()
          this.text?.text2voice()
          this.updateProject()
        }
      },
      updateProject() {
        window.dispatchEvent(new Event('updateProject'))
      }
    },
    watch: {
      editor() {
        this.updateVerticalLinesWidthWithDelay()　
      },
      text() {
        this.updateVerticalLinesWidthWithDelay()
      },
      pianoRollTimesX() {
        this.updateVerticalLinesWidthWithDelay()
      },
      player(newVal: HTMLAudioElement | undefined) {
        if (newVal) {
          if (this.currentTimeMsIntervalId !== null) {
            clearInterval(this.currentTimeMsIntervalId)
          }
          const fpsMs = 1000 / 60
          this.currentTimeMsIntervalId = setInterval(() => {
            this.updateCurrentTimeMs()
          }, fpsMs) as any
        }
      },
      currentTimeMs() {
        if (!this.currentTimeMs) return
        if (!this.player || this.player.paused) return

        const pianoRoll = this.$refs.pianoRoll as HTMLElement
        const roll = this.$refs.roll as HTMLElement
        const widthHalf = roll.getBoundingClientRect().width / 2
        const times = this.pianoRollTimesX ? this.pianoRollTimesX : 1
        const adjustTimes = this.adjustTimesX
        const left = this.currentTimeMs * times * adjustTimes

        pianoRoll.scrollTo({
          left: (left >= widthHalf) ? (left - widthHalf) : 0,
          behavior: 'instant' as any
        })
      }
    }
  }
</script>

<template>
  <div
    id="piano-roll"
    tabindex="0"
    ref="pianoRoll"
    v-if="pianoRollTimesX"
    v-bind:class="[(editor !== 'pianoroll') ? 'hide' : '']"
    v-on:mousemove="onMouseMove"
    v-on:mouseup="onMouseUp"
    v-on:keydown.space.prevent="playOrPause"
  >
    <div
      class="beats"
      v-bind:style="[
        `width: calc(((100% - 60px) * 0.5) + ${calcTotalLabelLen() * pianoRollTimesX * adjustTimesX}px);`
      ]"
      v-on:mousedown="jumpCurrentTime"
    >
      <p>1</p>
    </div>
    <div class="keyboard">
      <div
        class="keys"
        v-for="num in [...new Array(keyboardSize)].map((_, i) => i + 1).reverse()"
      >
        <div
          class="key"
          v-for="key in keyboardKeys"
          v-bind:class="[key.includes('#') ? 'black' : 'white']"
        >
          <p v-if="key === 'C'">{{ key + num }}</p>
        </div>
      </div>
    </div>
    <div
      class="roll"
      ref="roll"
    >
      <div
        class="horizontal-lines"
        v-for="_ in keyboardSize"
        v-bind:style="[
          `width: calc(50% + ${calcTotalLabelLen() * pianoRollTimesX * adjustTimesX}px);`
        ]"
      >
        <div
          class="horizontal-line"
          v-for="key in keyboardKeys"
          v-bind:class="[key.includes('#') ? 'black' : 'white']"
        >
        </div>
      </div>
      <div
        class="vertical-lines"
        ref="verticalLines"
        v-bind:style="[
          `width: calc(50% + ${calcTotalLabelLen() * pianoRollTimesX * adjustTimesX}px);`
        ]"
      >
        <div
          class="vertical-line"
          v-if="bpm && pianoRollSnap && beatTop && beatBottom"
          v-for="i in calcNumOfVerticalLine(bpm, verticalLinesWidth)"
          v-bind:style="[
            `left: ${bpm2ms(bpm) * i * pianoRollTimesX * adjustTimesX / pianoRollSnap * adjustSnap}px;`
          ]"
          v-bind:class="[
            (i % (pianoRollSnap * (beatTop / beatBottom)) === 0) ? 'main-line' : 'sub-line'
          ]"
        >
          <p v-if="i % (pianoRollSnap * (beatTop / beatBottom)) === 0">
            {{ (i / (pianoRollSnap * (beatTop / beatBottom))) + 1 }}
          </p>
        </div>
      </div>
      <div
        class="notes"
        v-bind:style="[
          `width: calc(50% + ${calcTotalLabelLen() * pianoRollTimesX * adjustTimesX}px);`
        ]"
        v-on:mouseup="unselectNotes"
        v-on:dblclick.stop="createNote"
      >
        <div
          class="note"
          v-if="text"
          v-for="(label, i) in text.labels"
          v-bind:style="[
            `width: ${label.length * pianoRollTimesX * adjustTimesX}px`,
            `left: ${calcPositionX(i) * pianoRollTimesX * adjustTimesX}px;`,
            `top: ${calcPositionY(i)}px;`
          ]"
          v-bind:class="[
            label.isSelected() ? 'selected' : '',
            ((label.kana === '、') && (label.length <= 0)) ? 'hide' : ''
          ]"
          v-on:click.stop="(event) => selectNote(event, label)"
          v-on:mousedown.stop="[
            noteMoving = true
          ]"
          v-on:dblclick.stop=""
        >
          <input
            type="text"
            v-bind:value="label.kana"
            v-on:change="(event) => changeKana(event, label)"
          >
          <div
            class="extend-area"
            v-if="label.isSelected() && (text.labels.filter((x) => x.isSelected()).length === 1)"
            v-for="direction in ['front', 'back']"
            v-bind:class="[
              direction
            ]"
            v-on:click.stop=""
            v-on:mousedown.stop="[
              noteResizing = true,
              noteResizeDirection = (direction === 'front') ? 'front' : 'back'
            ]"
          >
          </div>
        </div>
      </div>
      <div
        class="current-time-line"
        v-bind:style="[
          `left: ${currentTimeMs * pianoRollTimesX * adjustTimesX}px;`
        ]"
      ></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  #piano-roll {
    width: calc(100% - 32px); // margin
    height: calc(100% - 46px - 46px - 21px - 32px); // menus, piano-params, progress, margin
    position: relative;
    margin: 16px;
    border-radius: 8px;
    background-color: var(--color-main);
    overflow-x: scroll;
    overflow-y: scroll;

    &.hide {
      display: none;
    }
  }

  .beats {
    height: 16px;
    min-width: calc((100% - 60px) * 1.5);
    position: sticky;
    top: 0;
    left: 60px;
    border-bottom: 1px solid var(--color-line-sub);
    background-color: var(--color-main);
    z-index: 2;

    p {
      font-size: 12px;
      font-weight: 700;
      line-height: 14px;
      color: var(--color-text-main);
      position: absolute;
      margin: 0;
      margin-left: 4px;
      top: 0;
      left: 0;
      pointer-events: none;
    }
  }

  .keyboard {
    width: 60px;
    height: fit-content;
    position: sticky;
    top: 16px;
    left: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    z-index: 3;

    .keys {
      width: 100%;
      height: fit-content;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;

      .key {
        width: 100%;
        height: 20px;
        border: 1px solid var(--color-line-sub);
        border-left: 2px solid var(--color-line-sub);
        border-right: 2px solid var(--color-line-sub);

        &.white {
          background-color: var(--color-keyboard-main);
        }

        &.black {
          background: linear-gradient(
            90deg,
            var(--color-keyboard-sub) 0%,
            var(--color-keyboard-sub) 60%,
            var(--color-keyboard-main) 60%,
            var(--color-keyboard-main) 100%
          );
        }

        p {
          font-size: 12px;
          font-weight: 700;
          line-height: 18px;
          text-align: right;
          margin-right: 4px;
          color: var(--color-text-main);
        }
      }
    }
  }

  .roll {
    width: calc(100% - 60px); // keyboard
    height: fit-content;
    position: absolute;
    margin: auto;
    top: 16px;
    left: 60px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;

    .horizontal-lines {
      height: fit-content;
      min-width: 150%;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: flex-start;

      .horizontal-line {
        width: 100%;
        height: 20px;
        border: 1px solid var(--color-line-main);
        border-left: 0 solid transparent;
        border-right: 0 solid transparent;

        &.white {
          background-color: var(--color-roll-main);
        }

        &.black {
          background-color: var(--color-roll-sub);
        }
      }
    }

    .vertical-lines {
      height: 100%;
      min-width: 150%;
      position: absolute;
      margin: auto;
      top: 0;
      left: 0;

      .vertical-line {
        width: 2px;
        position: absolute;
        margin: auto;
        pointer-events: none;

        &.main-line {
          height: calc(100% + 16px); // beats
          top: -16px;
          background-color: var(--color-line-sub);
          z-index: 2;
        }

        &.sub-line {
          height: 100%;
          top: 0;
          background-color: var(--color-line-main);
        }

        p {
          font-size: 12px;
          font-weight: 700;
          line-height: 14px;
          color: var(--color-text-main);
          position: sticky;
          margin: 0;
          margin-left: 4px;
          top: 0;
          left: 0;
        }
      }
    }

    .notes {
      height: 100%;
      min-width: 150%;
      position: absolute;
      margin: auto;
      top: 0;
      left: 0;
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;

      .note {
        height: 20px;
        position: absolute;
        margin: auto;
        border: 2px solid var(--color-line-sub);
        border-radius: 4px;
        background-color: var(--color-note-main);
        z-index: 1;

        &.selected {
          background-color: var(--color-note-sub);

          input[type='text'] {
            color: var(--color-text-main);
          }
        }

        &.hide {
          display: none;
        }

        input[type='text'] {
          font-size: 12px;
          font-weight: 700;
          line-height: 16px;
          width: 30px;
          position: absolute;
          margin: auto;
          top: 0;
          left: 2px;
          color: var(--color-text-sub);
          white-space: nowrap;
        }

        .extend-area {
          width: 8px;
          height: calc(100% + 4px); // border
          position: absolute;
          margin: auto;
          top: -2px;
          cursor: ew-resize;

          &.front {
            left: -2px;
          }

          &.back {
            right: -2px;
          }
        }
      }
    }

    .current-time-line {
      width: 2px;
      height: calc(100% + 16px); // beats
      position: absolute;
      margin: auto;
      top: -16px;
      background-color: var(--color-current-time-line-main);
      z-index: 2;
    }
  }
</style>
