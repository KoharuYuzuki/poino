<script lang="ts">
  import Menus from './components/Menus.vue'
  import Texts from './components/Texts.vue'
  import Params from './components/Params.vue'
  import Adjusters from './components/Adjusters.vue'
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
      editor: 'text' | 'pianoroll'
    } {
      return {
        text: undefined,
        editor: 'text'
      }
    },
    components: {
      Menus,
      Texts,
      Params,
      Adjusters,
      Progress,
      Licenses
    }
  }
</script>

<template>
  <Menus/>
  <Texts
    @updateText="(x) => text = x"
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
  <Progress/>
  <Licenses/>
</template>

<style lang="scss">
  :root {
    --color-white: #FFFFFF;
    --color-blue: #B1D7DD;
    --color-blue-dark: #697E82;
    --color-blue-strong: #58A9B5;

    --color-main: var(--color-white);
    --color-sub: var(--color-blue);

    --color-scrollbar-main: var(--color-blue-dark);

    --color-text-main: var(--color-blue-dark);
    --color-text-sub: var(--color-white);

    --color-line-main: var(--color-blue);
    --color-line-sub: var(--color-blue-strong);

    --color-rangebar-main: var(--color-blue-strong);

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
