import { contextBridge } from 'electron'
import { ipcRenderer } from './ipc'

const ipc = new ipcRenderer()

contextBridge.exposeInMainWorld('openjtalk', {
  run: (text: string, speed: number) => {
    return ipc.send('openjtalk:run', {text, speed})
  }
})

contextBridge.exposeInMainWorld('voices', {
  get: () => {
    return ipc.send('voices:get', null)
  }
})

contextBridge.exposeInMainWorld('synth', {
  run: (
    labels: any,
    voiceId: string,
    speed: number,
    volume: number,
    pitchMax: number,
    pitchMin: number
  ) => {
    return ipc.send('synth:run', {
      labels,
      voiceId,
      speed,
      volume,
      pitchMax,
      pitchMin
    })
  }
})

contextBridge.exposeInMainWorld('project', {
  open: (overwriteAlert: boolean = false) => {
    return ipc.send('project:open', overwriteAlert)
  },
  save: (data: string, newSave: boolean) => {
    return ipc.send('project:save', {data, newSave})
  }
})

contextBridge.exposeInMainWorld('wav', {
  export: (files: {name: string, path: string}) => {
    return ipc.send('wav:export', files)
  }
})

contextBridge.exposeInMainWorld('licenses', {
  get: () => {
    return ipc.send('licenses:get', null)
  }
})

ipc.on('project:isSaved', (_, reply) => {
  window.addEventListener('resProjectIsSaved', (event: any) => {
    reply(event.detail)
  }, {once: true})
  window.dispatchEvent(new Event('reqProjectIsSaved'))
})
