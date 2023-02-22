import { ipcMain as _ipcMain, ipcRenderer as _ipcRenderer, WebContents } from 'electron'
import { randomUUID } from 'crypto'

type callback = (detail: any, replay: (detail?: any) => void) => void

interface Callbacks {
  [key: string]: Function
}

interface Message {
  id:     string
  type:   string
  detail: any
}

interface Window {
  webContents: WebContents
}

class IpcEvent extends Event {
  detail?: any

  constructor(type: string, detail: any) {
    super(type)
    this.detail = detail
  }
}

export class IPCMain extends EventTarget {
  ipc:       typeof _ipcMain
  ids:       string[]
  callbacks: Callbacks

  constructor() {
    super()
    this.ipc = _ipcMain
    this.ids = []
    this.callbacks = {}

    this.ipc.on('ipc-message', (event, message: Message) => {
      if (this.ids.includes(message.id)) {
        this.ids = this.ids.filter((id) => id !== message.id)
        this.dispatchEvent(new IpcEvent(message.id, message.detail))
      } else
      if (message.type in this.callbacks) {
        const callback = this.callbacks[message.type]
        const window = {webContents: event.sender}
        const reply = (detail: any = null) => this.send(window, message.type, detail, message.id)
        callback(message.detail, reply)
      }
    })
  }

  send(
    window: Window,
    type:   string,
    detail: any,
    id?:    string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (id === undefined) {
        id = randomUUID()
        this.ids.push(id)
        this.addEventListener(id, (event: IpcEvent) => {
          resolve(event.detail)
        }, {once: true})
      } else {
        resolve(null)
      }

      window.webContents.send('ipc-message', {id, type, detail})
    })
  }

  on(type: string, callback: callback) {
    this.callbacks[type] = callback
  }
}

export class IPCRenderer extends EventTarget {
  ipc:       typeof _ipcRenderer
  ids:       string[]
  callbacks: Callbacks

  constructor() {
    super()
    this.ipc = _ipcRenderer
    this.ids = []
    this.callbacks = {}

    this.ipc.on('ipc-message', (event, message: Message) => {
      if (this.ids.includes(message.id)) {
        this.ids = this.ids.filter((id) => id !== message.id)
        this.dispatchEvent(new IpcEvent(message.id, message.detail))
      } else
      if (message.type in this.callbacks) {
        const callback = this.callbacks[message.type]
        const reply = (detail: any = null) => this.send(message.type, detail, message.id)
        callback(message.detail, reply)
      }
    })
  }

  send(
    type:   string,
    detail: any,
    id?:    string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (id === undefined) {
        id = randomUUID()
        this.ids.push(id)
        this.addEventListener(id, (event: IpcEvent) => {
          resolve(event.detail)
        }, {once: true})
      } else {
        resolve(null)
      }

      this.ipc.send('ipc-message', {id, type, detail})
    })
  }

  on(type: string, callback: callback) {
    this.callbacks[type] = callback
  }
}
