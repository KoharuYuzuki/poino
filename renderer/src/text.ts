import { toRaw } from 'vue'

export type label = {
  kana:   string
  length: number
  accent: number
}

export interface Voice {
  isValid: boolean
  id:      string
  name:    string
  ruby:    string
  icon:    string
  pitch: {
    min: number
    max: number
  }
  phonemes: {
    [index: string]: [number, number][]
  }
  voices: {
    [index: string]: {
      phoneme: string
      length:  number
      volume:  number
      fade?:   {
        in:  string
        out: string
      }
      overlap?: string
      fadeInMs?:  number
      fadeOutMs?: number
      overlapMs?: number
    }[]
  }
}

export class Text {
  id:        string
  text:      string
  selected:  boolean
  labels:    label[]
  speed:     number
  volume:    number
  pitchMax:  number
  pitchMin:  number
  voiceId:   string
  cacheFile: string

  constructor(
    voice: Voice,
    text = '',
    labels: label[] = [],
    speed    = -1,
    volume   = -1,
    pitchMax = -1,
    pitchMin = -1,
    selected = false
  ) {
    this.id        = crypto.randomUUID()
    this.text      = text
    this.selected  = selected
    this.labels    = deepCopy(labels)
    this.speed     = (speed > 0)     ? speed    : -1
    this.volume    = (volume >= 0)   ? volume   : -1
    this.pitchMax  = (pitchMax >= 0) ? pitchMax : -voice.pitch.max
    this.pitchMin  = (pitchMin >= 0) ? pitchMin : -voice.pitch.min
    this.voiceId   = voice.id
    this.cacheFile = ''
  }

  text2label() {
    const text = this.text.replace(new RegExp('(\\r\\n|\\n|\\r)', 'gm'), ' ')
    const speed = Number(this.speed)

    ;(window as any).openjtalk.run(text, speed)
    .then((labels: label[][] | null) => {
      if (labels === null) return
      this.labels = labels.flat()
      window.dispatchEvent(new Event('updateProject'))
    })
    .catch(console.error)
  }

  text2voice() {
    return new Promise<string>((resolve, reject) => {
      (window as any).synth.run(
        toRaw(this.labels),
        this.voiceId,
        Number(this.speed),
        Number(this.volume),
        Number(this.pitchMax),
        Number(this.pitchMin)
      )
      .then((filePath: string | null) => {
        if (filePath === null) return
        this.cacheFile = filePath
        resolve(this.cacheFile)
      })
      .catch(reject)
    })
  }

  cacheClear() {
    this.cacheFile = ''
  }
}
