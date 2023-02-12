<script lang="ts">
  import { Text, Label } from '../text'
  import type { Voice } from '../text'
  import { deepCopy } from '../utils'
  import { toRaw } from 'vue'

  export default {
    created() {
      window.addEventListener('updateProject', () => {
        const filtered = this.texts.filter((text) => text.id === this.text?.id)
        const selectedId = (filtered.length > 0) ? filtered[0].id : null

        const texts = toRaw(this.texts).map((text) => {
          const filtered = this.voices.filter((voice) => voice.id === text.voiceId)
          const voice = (filtered.length > 0) ? filtered[0] : this.voices[0]

          return {
            voice:    deepCopy(voice),
            text:     text.text,
            labels:   text.labels.map((x) => new Label(x.kana, x.length, x.accent)),
            speed:    text.speed,
            volume:   text.volume,
            pitchMax: text.pitchMax,
            pitchMin: text.pitchMin,
            selected: (text.id === selectedId)
          }
        })

        const isLast = (this.historyIndex === (this.history.length - 1))
        if (!isLast) {
          this.history.splice(this.historyIndex + 1, this.history.length)
        }

        this.history.push(texts)
        this.historyIndex++
      })

      window.addEventListener('undo', () => {
        if (this.historyIndex <= 0) return
        this.historyIndex--
        this.loadFromHistory()
      })

      window.addEventListener('redo', () => {
        if (this.historyIndex >= (this.history.length - 1)) return
        this.historyIndex++
        this.loadFromHistory()
      })

      window.addEventListener('beforeinput', (event) => {
        const inputType = (event as InputEvent).inputType

        if (['historyUndo', 'historyRedo'].includes(inputType)) {
          event.preventDefault()

          if (inputType === 'historyUndo') {
            window.dispatchEvent(new Event('undo'))
          } else if (inputType === 'historyRedo') {
            window.dispatchEvent(new Event('redo'))
          }
        }
      })

      ;(window as any).voices.get()
      .then((voices: Voice[]) => {
        if (voices.length <= 0) return
        this.voices = voices
        this.voice = this.voices[0]
        this.texts.push(new Text(this.voice))
        this.updateProject()
      })
      .catch(console.error)
    },
    data(): {
      saved: boolean
      voices: Voice[]
      voice: Voice | undefined
      texts: Text[]
      text: Text | undefined
      showVoiceSelector: boolean
      player: HTMLAudioElement
      playing: boolean
      playingIndex: number
      cacheFilePaths: string[]
      opening: boolean
      saving: boolean
      exporting: boolean
      synthesizing: boolean
      history: any[][],
      historyIndex: number
    } {
      return {
        saved: true,
        voices: [] as Voice[],
        voice: undefined,
        texts: [] as Text[],
        text: undefined,
        showVoiceSelector: false,
        player: new Audio(),
        playing: false,
        playingIndex: 0,
        cacheFilePaths: [],
        opening: false,
        saving: false,
        exporting: false,
        synthesizing: false,
        history: [] as any[][],
        historyIndex: -1
      }
    },
    props: {
      editor: String
    },
    methods: {
      addText() {
        if (!this.voice) return
        const maxLen = 999
        if (this.texts.length >= maxLen) return
        const text = new Text(this.voice)
        this.texts.push(text)
        this.saved = false
        this.updateProject()
      },
      removeText(text: Text) {
        this.texts = this.texts.filter((x) => x !== text)
        this.text = undefined
        this.emitText()
        this.saved = false
        this.updateProject()
      },
      selectText(text: Text) {
        this.unselectTexts()
        text.selected = true
        this.text = text
        this.emitText()
      },
      unselectTexts() {
        this.texts.forEach((text) => text.selected = false)
      },
      emitText() {
        this.$emit('updateText', this.text)
      },
      updateVoice(voice: Voice) {
        this.voice = voice
        if (this.text && (this.text.voiceId !== voice.id)) {
          this.text.voiceId = voice.id
          this.text.changeLabelIdAll()
          this.text.cacheClear()
          this.saved = false
          this.updateProject()
        }
        this.showVoiceSelector = false
      },
      playVoice(all=false, playbackPosition=0) {
        if (!all && !this.text) return
        if (this.synthesizing) return

        if (!this.playing) {
          this.playing = true
        } else {
          this.playing = false
          return
        }

        const texts = (all ? this.texts : [this.text as Text])
        this.synthesizing = true

        Promise.all(
          texts
          .filter((text) => text.labels.length > 0)
          .map((text) => {
            return text.cacheFile ? Promise.resolve(text.cacheFile) : text.text2voice()
          })
        )
        .then((filePaths) => {
          this.cacheFilePaths = filePaths
          if (this.cacheFilePaths.length <= 0) {
            this.playing = false
            return
          }

          const filePath = this.cacheFilePaths[this.playingIndex]
          this.playingIndex = 0
          this.player.src = filePath
          if (!all) {
            this.player.currentTime =
              (playbackPosition < 0) ? 0 :
              (playbackPosition > this.player.duration) ? this.player.duration :
              playbackPosition
          }
          this.selectTextByCacheFile(filePath)
          this.player.play()
        })
        .catch(console.error)
        .finally(() => this.synthesizing = false)
      },
      selectTextByCacheFile(filePath: string) {
        const filtered = this.texts.filter((text) => text.cacheFile === filePath)
        if (filtered.length <= 0) return
        this.selectText(filtered[0])
      },
      moveText(text: Text, direction: string) {
        const index = this.texts.indexOf(text)
        if (index === -1) return

        const newIndex = (direction === 'up') ? index - 1 : index + 1
        if ((newIndex < 0) || (newIndex > (this.texts.length - 1))) return

        const filtered = this.texts.filter((x) => x !== text)
        filtered.splice(newIndex, 0, text)

        this.texts = filtered
        this.saved = false
        this.updateProject()
      },
      getIcon(voiceId: string) {
        const filtered = this.voices.filter((voice) => voice.id === voiceId)
        return (filtered.length > 0) ? filtered[0].icon : ''
      },
      openProject() {
        if (!this.voice) return

        if (this.opening) return
        this.opening = true

        ;(window as any).project.open(!this.saved)
        .then((texts: any[] | null) => {
          if (texts === null) return
          if (texts.length <= 0) return

          this.texts = texts.map((text) => {
            const filtered = this.voices.filter((voice) => voice.id === text.voiceId)
            const voice = (filtered.length > 0) ? filtered[0] : this.voices[0]
            const labels = text.labels.map((label: any) => {
              return new Label(label.kana, label.length, label.accent)
            })

            return new Text(
              voice,
              text.text,
              labels,
              text.speed,
              text.volume,
              text.pitchMax,
              text.pitchMin
            )
          })

          this.selectText(this.texts[0])
          this.saved = true
          this.updateProject()
        })
        .catch(console.error)
        .finally(() => this.opening = false)
      },
      saveProject(newSave = false) {
        if (this.saving) return
        this.saving = true

        const texts = toRaw(this.texts).map((text) => {
          const labels = text.labels.map((label) => {
            return {
              kana:   label.kana,
              length: label.length,
              accent: label.accent
            }
          })

          return {
            text:     text.text,
            labels:   labels,
            speed:    text.speed,
            volume:   text.volume,
            pitchMax: text.pitchMax,
            pitchMin: text.pitchMin,
            voiceId:  text.voiceId
          }
        })

        const data = JSON.stringify(texts)

        ;(window as any).project.save(data, newSave)
        .then((success: boolean | null) => {
          if (success) {
            this.saved = true
          }
        })
        .catch(console.error)
        .finally(() => this.saving = false)
      },
      exportWav(all = false) {
        if (this.exporting) return
        this.exporting = true

        Promise.all(
          (
            (all) ? this.texts :
            (this.text) ? [this.text] : []
          )
          .filter((text) => text.labels.length > 0)
          .map((text) => {
            return text.cacheFile ? Promise.resolve(text.cacheFile) : text.text2voice()
          })
        )
        .then((filePaths) => {
          this.cacheFilePaths = filePaths

          const files = toRaw(this.cacheFilePaths).map((filePath) => {
            const filteredText = this.texts.filter((text) => text.cacheFile === filePath)
            const index = (filteredText.length > 0) ? this.texts.indexOf(filteredText[0]) + 1 : 0
            const text = (filteredText.length > 0) ? filteredText[0].text : '？？？'
            const voiceId = (filteredText.length > 0) ? filteredText[0].voiceId : '？？？'

            const filteredVoice = this.voices.filter((voice) => voice.id === voiceId)
            const voiceName = (filteredVoice.length > 0) ? filteredVoice[0].name : '？？？'

            const fileName = `${('000' + index).slice(-3)}_${voiceName}_${(text.length < 10) ? text : text.slice(0, 9) + '…'}.wav`

            return {name: fileName, path: filePath}
          })

          return (window as any).wav.export(files)
        })
        .catch(console.error)
        .finally(() => this.exporting = false)
      },
      updateProject() {
        window.dispatchEvent(new Event('updateProject'))
      },
      loadFromHistory() {
        const texts = this.history[this.historyIndex]
        this.texts = texts.map((text) => {
          return new Text(
            text.voice,
            text.text,
            text.labels,
            text.speed,
            text.volume,
            text.pitchMax,
            text.pitchMin,
            text.selected
          )
        })

        const filtered = this.texts.filter((x) => x.selected)
        if (filtered.length > 0) {
          this.selectText(filtered[0])
        } else {
          this.text = undefined
          this.unselectTexts()
          this.emitText()
        }
      },
      sendPlayer() {
        this.$emit('sendPlayer', this.player)
      }
    },
    watch: {
      text: {
        handler: function (newVal: Text | undefined, oldVal: Text | undefined) {
          newVal = toRaw(newVal)
          oldVal = toRaw(oldVal)

          const newId = newVal?.id
          const oldId = oldVal?.id

          if (
            (newId && oldId) &&
            (newId === oldId)
          ) {
            this.saved = false
          }
        },
        deep: true
      },
      playing() {
        if (this.playing) return
        this.player.pause()
        this.playingIndex = 0
        this.cacheFilePaths = []
        this.player.src = ''
      }
    },
    mounted() {
      this.player.addEventListener('ended', () => {
        this.playingIndex++
        if (this.playingIndex >= this.cacheFilePaths.length) {
          this.playing = false
          return
        }

        const waitTimeMs = 500

        setTimeout(() => {
          const filePath = this.cacheFilePaths[this.playingIndex]
          this.player.src = filePath
          this.selectTextByCacheFile(filePath)
          this.player.play()
        }, waitTimeMs)
      })

      window.addEventListener('openProject', () => {
        this.openProject()
      })

      window.addEventListener('newSaveProject', () => {
        this.saveProject(true)
      })

      window.addEventListener('overwriteSaveProject', () => {
        this.saveProject()
      })

      window.addEventListener('exportWav', () => {
        this.exportWav()
      })

      window.addEventListener('exportWavAll', () => {
        this.exportWav(true)
      })

      window.addEventListener('reqProjectIsSaved', () => {
        window.dispatchEvent(
          new CustomEvent('resProjectIsSaved', {
            detail: this.saved
          })
        )
      })

      window.addEventListener('play', (event) => {
        const playbackPosition = (event as CustomEvent).detail
        this.playVoice(false, playbackPosition)
      })

      this.sendPlayer()
    }
  }
</script>

<template>
  <div
    id="texts"
    v-bind:class="[(editor !== 'text') ? 'hide' : '']"
  >
    <div
      class="wrapper"
      v-on:click="unselectTexts"
    >
      <div class="text" v-for="text in texts" v-on:click.stop>
        <button class="change-voice-button">
          <img
            class="back"
            v-bind:src="getIcon(text.voiceId)"
            v-on:click="(selectText(text), showVoiceSelector = true)"
          >
        </button>
        <textarea
          placeholder="ここにテキストを入力"
          v-model="text.text"
          v-on:click="(selectText(text))"
          v-on:input="[
            text.changeLabelIdAll(),
            text.cacheClear()
          ]"
          v-on:change="(text.text2label())"
          v-bind:class="[(text.selected ? 'selected' : '')]"
        ></textarea>
        <button
          class="move-up-button"
          v-on:click="(moveText(text, 'up'))"
          v-if="(texts.length > 1)"
        ></button>
        <button
          class="move-down-button"
          v-on:click="(moveText(text, 'down'))"
          v-if="(texts.length > 1)"
        ></button>
        <button
          class="remove-text-button"
          v-on:click="(removeText(text))"
          v-if="(texts.length > 1)"
        >
          <div class="back"></div>
          <div class="line"></div>
          <div class="line"></div>
        </button>
      </div>
    </div>
    <div class="buttons">
      <button class="play-voice-button" v-on:click="(playVoice())">
        <div class="back"></div>
        <div
          class="triangle"
          v-if="!playing"
        >
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="fill"></div>
        </div>
        <div
          class="pause"
          v-else
        >
          <div class="box"></div>
          <div class="box"></div>
        </div>
      </button>
      <button class="play-voice-all-button" v-on:click="(playVoice(true))">
        <div class="back"></div>
        <div
          class="triangle"
          v-if="!playing"
        >
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="fill"></div>
        </div>
        <div
          class="triangle"
          v-if="!playing"
        >
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="line-box">
            <div class="line"></div>
          </div>
          <div class="fill"></div>
        </div>
        <div
          class="pause"
          v-else
        >
          <div class="box"></div>
          <div class="box"></div>
        </div>
      </button>
      <button class="add-text-button" v-on:click="addText">
        <div class="back"></div>
        <div class="line"></div>
        <div class="line"></div>
      </button>
    </div>
  </div>
  <div
    id="voice-selector"
    v-on:click="showVoiceSelector = false"
    v-if="showVoiceSelector">
    <div class="dialog" v-on:click.stop>
      <p class="label">声を選択</p>
      <div class="wrapper">
        <button
          class="voice"
          v-for="voice in voices"
          v-on:click="(updateVoice(voice))"
        >
          <img class="back" v-bind:src="voice.icon">
          <p>{{ voice.name }}</p>
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  #texts {
    width: calc(100% - 300px - 24px); // params, margin
    height: calc(100% - 46px - 250px - 21px - 24px); // menus, adjusters, progress, margin
    position: relative;
    margin: 16px 8px 8px 16px;
    border-radius: 8px;
    background-color: var(--color-main);

    &.hide {
      display: none;
    }
  }

  .wrapper {
    width: calc(100% - 16px); // margin
    height: calc(100% - 16px); // margin
    margin: 8px;
    overflow-y: scroll;
  }

  .text {
    width: calc(100% - 16px); // margin
    height: fit-content;
    position: relative;
    margin: 16px 8px;
    margin-bottom: 0;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;

    .change-voice-button {
      width: 46px;
      height: 46px;
      margin-right: 16px;

      img {
        width: 100%;
        height: 100%;
        border: 3px solid var(--color-line-main);
        border-radius: 8px;
      }
    }

    textarea {
      width: calc(100% - 62px); // img
      height: 46px;
      min-height: 46px;
      max-height: 200px;
      padding: 8px;
      border: 3px solid var(--color-line-main);
      border-radius: 8px;
      resize: vertical;
      font-size: 16px;
      color: var(--color-text-main);
      transition: border-color 0.2s;

      &::placeholder {
        color: var(--color-text-main);
        opacity: 0.5;
      }

      &.selected {
        border-color: var(--color-line-sub);
      }
    }

    .move-up-button,
    .move-down-button {
      width: 0;
      height: 0;
      position: absolute;
      margin: auto;
      right: 44px;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-bottom: 12px solid var(--color-sub);
      opacity: 0;
      transition:
        transform 0.2s,
        opacity 0.2s;
    }

    .move-up-button {
      top: 8px;

      &:hover {
        transform: scale(1.1);
      }

      &:active {
        transform: scale(0.9);
      }
    }

    .move-down-button {
      bottom: 8px;
      transform: rotateZ(180deg);

      &:hover {
        transform: rotateZ(180deg) scale(1.1);
      }

      &:active {
        transform: rotateZ(180deg) scale(1.0);
      }
    }

    .remove-text-button {
      width: 24px;
      height: 24px;
      position: absolute;
      margin: auto;
      top: 0;
      right: 11px;
      bottom: 0;
      opacity: 0;
      transition: opacity 0.2s;

      .back {
        width: 100%;
        height: 100%;
        position: absolute;
        margin: auto;
        top: 0;
        left: 0;
        border-radius: 50%;
        background-color: var(--color-sub);
      }

      .line {
        width: 12px;
        height: 3px;
        position: absolute;
        margin: auto;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 2px;
        background-color: var(--color-main);

        &:nth-child(2) {
          transform: rotateZ(45deg);
        }
        &:nth-child(3) {
          transform: rotateZ(-45deg);
        }
      }
    }

    &:first-child {
      margin-top: 8px;
    }

    &:last-child {
      margin-bottom: 64px;
    }

    &:hover {
      button {
        opacity: 1;
      }
    }
  }

  .buttons {
    width: fit-content;
    height: fit-content;
    position: absolute;
    margin: auto;
    right: 12px;
    bottom: 12px;

    button {
      width: 50px;
      height: 50px;
      position: relative;

      &:not(:last-child) {
        margin-right: 12px;
      }

      .back {
        width: 100%;
        height: 100%;
        position: absolute;
        margin: auto;
        top: 0;
        left: 0;
        border-radius: 50%;
        background-color: var(--color-sub);
      }
    }

    .play-voice-button,
    .play-voice-all-button {
      .triangle {
        width: 30px;
        height: 30px;
        position: absolute;
        margin: auto;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;

        .line-box {
          width: 18px;
          height: 18px * 0.75;
          position: absolute;
          margin: auto;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;

          .line {
            width: 100%;
            height: 4px;
            position: absolute;
            margin: auto;
            top: 0;
            left: 0;
            border-radius: 2px;
            background-color: var(--color-main);
          }

          &:nth-child(1) {
            transform: rotateZ(30deg);
          }
          &:nth-child(2) {
            transform: rotateZ(-90deg);
          }
          &:nth-child(3) {
            transform: rotateZ(150deg);
          }
        }

        .fill {
          width: 0;
          height: 0;
          position: absolute;
          margin: auto;
          top: 0;
          left: 4px;
          right: 0;
          bottom: 0;
          border-style: solid;
          border-width: 8px 0 8px 16px;
          border-color: transparent transparent transparent var(--color-main);
        }
      }

      .pause {
        width: 20px;
        height: 20px;
        position: absolute;
        margin: auto;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;

        .box {
          width: 5px;
          height: 20px;
          position: absolute;
          margin: auto;
          top: 0;
          border-radius: 2px;
          background-color: var(--color-main);

          &:nth-child(1) {
            left: 1px;
          }
          &:nth-child(2) {
            right: 1px;
          }
        }
      }
    }

    .play-voice-all-button {
      .triangle {
        &:nth-child(2) {
          transform: translateX(-8px);
        }
        &:nth-child(3) {
          transform: translateX(6px);
        }
      }
    }

    .add-text-button {
      .line {
        width: 30px;
        height: 5px;
        position: absolute;
        margin: auto;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border-radius: 2.5px;
        background-color: var(--color-main);

        &:nth-child(3) {
          transform: rotateZ(90deg);
        }
      }
    }
  }

  #voice-selector {
    width: 100vw;
    height: 100vh;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    display: flex;
    justify-content: center;
    align-items: center;

    .dialog {
      width: 400px;
      height: 300px;
      border: 3px solid var(--color-line-sub);
      border-radius: 8px;
      background-color: var(--color-main);

      .label {
        width: 100%;
        font-size: 16px;
        font-weight: 700;
        line-height: 40px;
        text-align: center;
        color: var(--color-text-main);
      }

      .wrapper {
        width: calc(100% - 24px); // margin
        height: calc(100% - 40px - 8px); // label, margin
        margin: 8px;
        margin-top: 0;
        margin-left: 16px;
        overflow-y: scroll;
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        align-items: flex-start;
        align-content: flex-start;

        .voice {
          width: calc(50% - 12px); // margin
          height: fit-content;
          margin-bottom: 16px;
          border: 3px solid var(--color-line-main);
          border-radius: 8px;
          overflow: hidden;
          background-color: var(--color-main);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: center;

          &:nth-child(odd) {
            margin-right: 16px;
          }

          img {
            width: 50px;
            height: 50px;
            margin-top: 8px;
            border-radius: 8px;
          }

          p {
            font-size: 14px;
            font-weight: 700;
            line-height: 30px;
            color: var(--color-text-main);
          }
        }
      }
    }
  }
</style>
