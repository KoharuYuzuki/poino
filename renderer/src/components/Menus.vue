<script lang="ts">
  export default {
    data() {
      return {
        menus: {
          left: [
            {
              id:    'open',
              label: '開く',
              event: 'openProject'
            },
            {
              id:    'newSave',
              label: '新規保存',
              event: 'newSaveProject'
            },
            {
              id:    'overwriteSave',
              label: '上書き保存',
              event: 'overwriteSaveProject'
            },
            {
              id:    'undo',
              label: '元に戻す',
              event: 'undo'
            },
            {
              id:    'redo',
              label: 'やり直し',
              event: 'redo'
            },
            {
              id:    'export',
              label: '書き出し',
              event: 'exportWav'
            },
            {
              id:    'exportAll',
              label: 'すべて書き出し',
              event: 'exportWavAll'
            },
            {
              id:    'changeEditor',
              label: 'エディタを切り替え',
              event: 'changeEditor'
            }
          ],
          right: [
            {
              id:    'licenses',
              label: 'ライセンス',
              event: 'showLicenses'
            }
          ]
        }
      }
    },
    methods: {
      dispatchEvent(type: string) {
        window.dispatchEvent(new Event(type))
      }
    }
  }
</script>

<template>
  <div id="menus">
    <div class="left">
      <button
        class="menu"
        v-for="menu in menus.left"
        v-on:click="(dispatchEvent(menu.event))"
      >
        <p>{{ menu.label }}</p>
      </button>
    </div>
    <div class="right">
      <button
        class="menu"
        v-for="menu in menus.right"
        v-on:click="(dispatchEvent(menu.event))"
      >
        <p>{{ menu.label }}</p>
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
  #menus {
    width: calc(100% - 32px); // margin
    height: 30px;
    margin: 16px;
    margin-bottom: 0;
    border-radius: 8px;
    background-color: var(--color-main);
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .left,
  .right {
    width: fit-content;
    height: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
  }

  .left {
    .menu:not(:last-child)::after {
      content: '';
      width: 2px;
      height: 16px;
      background-color: var(--color-line-main);
    }
  }

  .right {
    .menu:not(:first-child)::before {
      content: '';
      width: 2px;
      height: 16px;
      background-color: var(--color-line-main);
    }
  }

  .menu {
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

    p {
      margin: 0 12px;
      font-size: 14px;
      color: var(--color-text-main);
    }
  }
</style>
