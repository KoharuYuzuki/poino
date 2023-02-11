<script lang="ts">
  import Menus from './components/Menus.vue'
  import Texts from './components/Texts.vue'
  import Params from './components/Params.vue'
  import Adjusters from './components/Adjusters.vue'
  import PianoParams from './components/PianoParams.vue'
  import PianoController from './components/PianoController.vue'
  import PianoRoll from './components/PianoRoll.vue'
  import Progress from './components/Progress.vue'
  import Licenses from './components/Licenses.vue'
  import { Text } from './text'

  export default {
    mounted() {
      window.addEventListener('changeEditor', () => {
        this.editor = (this.editor === 'text') ? 'pianoroll' : 'text'
      })
    },
    data(): {
      text: Text | undefined
      editor: 'text' | 'pianoroll',
      bpm: number
      beatTop: number
      beatBottom: number
      pianoRollSnap: number
      pianoRollTimesX: number
      player: HTMLAudioElement | undefined
    } {
      return {
        text: undefined,
        editor: 'text',
        bpm: 120,
        beatTop: 4,
        beatBottom: 4,
        pianoRollSnap: 4,
        pianoRollTimesX: 1,
        player: undefined
      }
    },
    components: {
      Menus,
      Texts,
      Params,
      Adjusters,
      PianoParams,
      PianoController,
      PianoRoll,
      Progress,
      Licenses
    }
  }
</script>

<template>
  <Menus/>
  <Texts
    @updateText="(x) => text = x"
    @sendPlayer="(x) => player = x"
    v-bind:editor="editor"
  />
  <Params
    v-bind:text="text"
    v-bind:editor="editor"
  />
  <Adjusters
    v-bind:text="text"
    v-bind:editor="editor"
  />
  <PianoParams
    @updateBpm="(x) => bpm = x"
    @updateBeatTop="(x) => beatTop = x"
    @updateBeatBottom="(x) => beatBottom = x"
    @updatePianoRollSnap="(x) => pianoRollSnap = x"
    @updatePianoRollTimesX="(x) => pianoRollTimesX = x"
    v-bind:editor="editor"
    v-bind:bpm="bpm"
    v-bind:beatTop="beatTop"
    v-bind:beatBottom="beatBottom"
    v-bind:pianoRollSnap="pianoRollSnap"
    v-bind:pianoRollTimesX="pianoRollTimesX"
  />
  <PianoController
    v-bind:editor="editor"
  />
  <PianoRoll
    v-bind:text="text"
    v-bind:editor="editor"
    v-bind:bpm="bpm"
    v-bind:beatTop="beatTop"
    v-bind:beatBottom="beatBottom"
    v-bind:pianoRollSnap="pianoRollSnap"
    v-bind:pianoRollTimesX="pianoRollTimesX"
    v-bind:player="player"
  />
  <Progress/>
  <Licenses/>
</template>

<style lang="scss">
  :root {
    --color-white: #FFFFFF;
    --color-blue: #B1D7DD;
    --color-blue-dark: #697E82;
    --color-blue-strong: #58A9B5;
    --color-blue-light: #D1E4E4;

    --color-main: var(--color-white);
    --color-sub: var(--color-blue);

    --color-scrollbar-main: var(--color-blue-dark);

    --color-text-main: var(--color-blue-dark);
    --color-text-sub: var(--color-white);

    --color-line-main: var(--color-blue);
    --color-line-sub: var(--color-blue-strong);

    --color-rangebar-main: var(--color-blue-strong);

    --color-keyboard-main: var(--color-white);
    --color-keyboard-sub: var(--color-blue-strong);

    --color-roll-main: var(--color-white);
    --color-roll-sub: var(--color-blue-light);

    --color-note-main: var(--color-blue-strong);
    --color-note-sub: var(--color-blue);

    --color-current-time-line-main: var(--color-blue-dark);

    * {
      margin: 0;
      padding: 0;
      border: none;
      background-color: transparent;
      box-sizing: border-box;
      appearance: none;
      user-select: none;
      outline: none;
      -webkit-user-drag: none;

      ::-webkit-scrollbar {
        width: 5px;
        height: 5px;
      }

      ::-webkit-scrollbar-thumb {
        border-radius: 2.5px;
        background-color: var(--color-scrollbar-main);
      }
    }

    body {
      width: 100vw;
      height: 100vh;
      position: relative;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-start;
      align-items: flex-start;
      align-content: flex-start;
      background-color: var(--color-sub);
    }

    button {
      .back {
        transition:
          transform 0.2s,
          filter 0.2s;
      }

      &:hover {
        .back {
          transform: scale(1.1);
        }
      }

      &:active {
        .back {
          transform: scale(1.05);
          filter: brightness(95%);
        }
      }
    }
  }
</style>
