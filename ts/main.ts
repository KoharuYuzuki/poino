import { app, BrowserWindow, dialog, Menu } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { createHash } from 'crypto'
import { ipcMain } from './ipc'
import { KVS } from './kvs'
import { OpenJTalk } from './openjtalk'
import { VocieManager } from './voice'
import { Synthesizer } from './synthesizer'
import { isNumber, isString, isHash } from './utils'

const appName    = app.getName()
const version    = app.getVersion()
const tmpDirPath = app.getPath('userData')
const appDirPath = app.getAppPath()

const projectSalt   = '89e69d32-ee4f-4bd9-9ba7-dc46cab8a719'
let projectSavePath = ''

const ipc          = new ipcMain()
const kvs          = new KVS(path.join(tmpDirPath, 'kvs.json'))
const openjtalk    = new OpenJTalk(tmpDirPath, appDirPath)
const vocieManager = new VocieManager(path.join(appDirPath, './voices'))
const synthesizer  = new Synthesizer(tmpDirPath)

let mainWindow: BrowserWindow
let quitting = false

Promise.all([
  kvs.load(),
  openjtalk.init(),
  vocieManager.load()
])
.then(() => app.whenReady())
.then(() => {
  const {
    width,
    height,
    x,
    y
  } = getWindowState()

  const win = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
      sandbox: false
    }
  })

  win.loadFile('./renderer/dist/index.html')
  win.setTitle(`${appName} v${version}`)

  const menu = Menu.buildFromTemplate([
    {
      label: appName,
      submenu: [
        {role: 'quit'}
      ]
    }, {
      label: 'Edit',
      submenu: [
        {role: 'cut'},
        {role: 'copy'},
        {role: 'paste'},
        {role: 'selectAll'}
      ]
    }
  ])
  Menu.setApplicationMenu(menu)

  if (process.argv.includes('--DEBUG')) {
    win.webContents.openDevTools()
  }

  win.on('resize', saveWindowState)
  win.on('move',   saveWindowState)

  win.on('close', async (event) => {
    event.preventDefault()

    const discard = await projectDiscardConfirm().catch(console.error)
    if (!discard) return

    win.destroy()
  })

  mainWindow = win
})
.catch(console.error)

app.on('will-quit', (event) => {
  event.preventDefault()

  if (quitting) return
  quitting = true

  Promise.all([
    removeTmpFiles(),
    waitSave(kvs)
  ])
  .catch(console.error)
  .finally(() => app.exit())
})

ipc.on('openjtalk:run', ({text, speed}, reply) => {
  let labels: any = null
  openjtalk.run(text, speed)
  .then((_labels) => labels = _labels)
  .catch(console.error)
  .finally(() => reply(labels))
})

ipc.on('voices:get', (_, reply) => {
  reply(vocieManager.voices)
})

ipc.on('synth:run', ({
  labels,
  voiceId,
  speed,
  volume,
  pitchMax,
  pitchMin
}, reply) => {
  const filtered = vocieManager.voices.filter((voice) => voice.id === voiceId)
  if (filtered.length <= 0) return

  const voice = filtered[0]
  let filePath: string | null

  synthesizer.run(
    labels,
    voice,
    speed,
    volume,
    pitchMax,
    pitchMin
  )
  .then((_filePath) => filePath = _filePath as string)
  .catch(console.error)
  .finally(() => reply(filePath))
})

ipc.on('project:open', async (overwriteAlert, reply) => {
  let project: any = null

  if (overwriteAlert) {
    const discard = await projectDiscardConfirm().catch(console.error)

    if (!discard) {
      reply(project)
      return
    }
  }


  dialog.showOpenDialog(mainWindow, {
    filters: [
      {
        name: 'poino project',
        extensions: ['.ppj']
      }
    ],
    properties: [
      'openFile',
      'createDirectory'
    ]
  })
  .then((result) => {
    if (result.canceled) return

    projectSavePath = result.filePaths[0]
    return fs.readFile(projectSavePath, {encoding: 'utf-8'})
  })
  .then((json) => {
    if (!json) return

    try {
      const data = JSON.parse(json)

      if (!(
        ('data' in data) && isString(data.data) &&
        ('hash' in data) && isString(data.hash)
      )) {
        return Promise.reject('無効なプロジェクトファイルです')
      }

      const hash = createHash('md5').update(data.data + projectSalt).digest('hex')
      if (hash === data.hash) {
        project = JSON.parse(data.data)
      } else {
        return Promise.reject('不正なプロジェクトファイルです')
      }
    } catch (e) {
      return Promise.reject(e)
    }
  })
  .catch((err) => {
    console.error(err)
    dialog.showErrorBox(
      'プロジェクトファイルの読み込みに失敗しました',
      err
    )
  })
  .finally(() => reply(project))
})

ipc.on('project:save', ({data, newSave}, reply) => {
  const hash = createHash('md5').update(data + projectSalt).digest('hex')
  const json = JSON.stringify({data, hash})

  let success = false
  let promise: Promise<string>

  if (!newSave && projectSavePath) {
    promise = Promise.resolve(projectSavePath)
  } else {
    promise = new Promise((resolve, reject) => {
      dialog.showSaveDialog(mainWindow, {
        filters: [
          {
            name: 'poino project',
            extensions: ['.ppj']
          }
        ],
        properties: [
          'createDirectory'
        ]
      })
      .then((result) => {
        if (result.canceled) {
          reject('保存がキャンセルされました')
          return
        }

        resolve(result.filePath as string)
      })
      .catch(reject)
    })
  }

  promise
  .then((filePath) => {
    projectSavePath = filePath
    return fs.writeFile(filePath, json, {encoding: 'utf-8'})
  })
  .then(() => success = true)
  .catch((err) => {
    console.error(err)
    dialog.showErrorBox(
      '保存に失敗しました',
      err
    )
  })
  .finally(() => reply(success))
})

ipc.on('wav:export', (files, reply) => {
  if (files.length <= 0) {
    dialog.showErrorBox(
      '書き出しできるテキストがありません',
      '未記入のテキストは無視されます\n1つだけテキストを書き出す場合はテキストを選択する必要があります'
    )
    reply()
    return
  }

  let promise: Promise<string>

  if (files.length > 1) {
    promise = new Promise((resolve, reject) => {
      dialog.showOpenDialog(mainWindow, {
        properties: [
          'openDirectory',
          'createDirectory'
        ]
      })
      .then((result) => {
        if (result.canceled) {
          reject('書き出しがキャンセルされました')
          return
        }

        resolve(result.filePaths[0])
      })
      .catch(reject)
    })
  } else {
    promise = new Promise((resolve, reject) => {
      dialog.showSaveDialog(mainWindow, {
        defaultPath: files[0].name,
        filters: [
          {
            name: 'WAV',
            extensions: ['.wav']
          }
        ],
        properties: [
          'createDirectory'
        ]
      })
      .then((result) => {
        if (result.canceled) {
          reject('書き出しがキャンセルされました')
          return
        }

        resolve(result.filePath as string)
      })
      .catch(reject)
    })
  }

  promise
  .then((fileOrDirPath) => {
    if (files.length > 1) {
      return Promise.all(files.map((file: any) => {
        return fs.copyFile(
          file.path,
          path.join(fileOrDirPath, file.name)
        )
      }))
    } else {
      return Promise.all([
        fs.copyFile(
          files[0].path,
          fileOrDirPath
        )
      ])
    }
  })
  .catch((err) => {
    console.error(err)
    dialog.showErrorBox(
      '書き出しに失敗しました',
      err
    )
  })
  .finally(() => reply())
})

ipc.on('licenses:get', (_, reply) => {
  const filePath = path.join(appDirPath, './licenses.json')
  let licenses: any = null

  fs.readFile(filePath, {encoding: 'utf-8'})
  .then((json) => {
    try {
      const obj = JSON.parse(json)

      if (
        isHash(obj) &&
        Object.entries(obj).every(([licensesClass, licenses]) => {
          if (!isHash(licenses)) return false
          return Object.entries(licenses as object).every(([name, license]) => {
            if (
              isHash(license) &&
              ('type' in license) && isString(license.type) &&
              ('repo' in license) && isString(license.repo) &&
              ('text' in license) && isString(license.text)
            ) {
              return true
            } else {
              return false
            }
          })
        })
      ) {
        licenses = obj
      }
    } catch (e) {
      return Promise.reject(e)
    }
  })
  .catch(console.error)
  .finally(() => reply(licenses))
})

function getWindowState () {
  let width  = 1000
  let height = 700
  let x      = undefined
  let y      = undefined

  const windowState = kvs.get('window_state')
  if (isHash(windowState)) {
    if (
      ('width' in windowState) &&
      isNumber(windowState.width) &&
      (windowState.width >= width)
    ) {
      width = windowState.width
    }

    if (
      ('height' in windowState) &&
      isNumber(windowState.height) &&
      (windowState.height >= height)
    ) {
      height = windowState.height
    }

    if (
      ('x' in windowState) &&
      isNumber(windowState.x)
    ) {
      x = windowState.x
    }

    if (
      ('y' in windowState) &&
      isNumber(windowState.y)
    ) {
      y = windowState.y
    }
  }

  return {
    width,
    height,
    x,
    y
  }
}

function saveWindowState () {
  kvs.set('window_state', mainWindow.getBounds())
}

function waitSave (
  target: KVS,
  cancelTimeMs: number = 5000,
  startTimeMs: number = 0
): Promise<void> {
  if (startTimeMs === 0) {
    startTimeMs = Date.now()
  }

  return new Promise((resolve, reject) => {
    const delayTimeMs = 100
    setTimeout(() => {
      if (target.saved) {
        resolve()
        return
      }

      const diff = Date.now() - startTimeMs
      if (diff >= cancelTimeMs) {
        reject('制限時間を超えたためキャンセルしました')
        return
      }

      waitSave(target, cancelTimeMs, startTimeMs)
      .then(resolve)
      .catch(reject)
    }, delayTimeMs)
  })
}

function removeTmpFiles () {
  return new Promise((resolve, reject) => {
    fs.readdir(tmpDirPath)
    .then((paths) => {
      const tmpFilePaths = paths.filter((_path) => path.extname(_path) === '.tmp')
      return Promise.all(
        tmpFilePaths.map((filePath) => {
          return fs.rm(
            path.join(tmpDirPath, filePath),
            {force: true}
          )
        })
      )
    })
    .then(resolve)
    .catch(reject)
  })
}

function projectDiscardConfirm () {
  return new Promise<boolean>((resolve, reject) => {
    ipc.send(mainWindow, 'project:isSaved', null)
    .then((saved) => {
      if (saved) {
        resolve(true)
        return
      }

      return dialog.showMessageBox(
        mainWindow,
        {
          message: '保存していない内容は破棄されます',
          type: 'question',
          buttons: ['キャンセル', 'OK']
        }
      )
    })
    .then((result) => {
      if (!result) return

      const index = result.response
      resolve((index !== 0))
    })
    .catch(reject)
  })
}
