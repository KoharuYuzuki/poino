import { toRaw } from 'vue'

export class Label {
  _id:       string
  _kana:     string
  _length:   number
  _accent:   number
  _selected: boolean

  constructor(
    kana:     string,
    length:   number,
    accent:   number,
    id:       string = '',
    selected: boolean = false
  ) {
    this._id       = (id) ? id : crypto.randomUUID()
    this._kana     = kana
    this._length   = length
    this._accent   = accent
    this._selected = selected
  }

  get id() {
    return this._id
  }

  get kana() {
    return this._kana
  }

  get length() {
    return this._length
  }

  get accent() {
    return this._accent
  }

  set kana(kana: string) {
    this._kana = kana
    this.changeId()
  }

  set length(length: number) {
    this._length = length
    this.changeId()
  }

  set accent(accent: number) {
    this._accent = accent
    this.changeId()
  }

  changeId() {
    this._id = crypto.randomUUID()
  }

  select() {
    this._selected = true
  }

  unselect() {
    this._selected = false
  }

  isSelected() {
    return this._selected
  }
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
  labels:    Label[]
  speed:     number
  volume:    number
  pitchMax:  number
  pitchMin:  number
  voiceId:   string
  cacheFile: string

  constructor(
    voice: Voice,
    text = '',
    labels: Label[] = [],
    speed    = -1,
    volume   = -1,
    pitchMax = -1,
    pitchMin = -1,
    selected = false
  ) {
    this.id        = crypto.randomUUID()
    this.text      = text
    this.selected  = selected
    this.labels    = labels.map((x) => new Label(x.kana, x.length, x.accent, x.id))
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
    .then((labels: any[][] | null) => {
      if (labels === null) return
      this.labels = labels.flat().map((label) => {
        return new Label(
          label.kana,
          label.length,
          label.accent
        )
      })
      window.dispatchEvent(new Event('updateProject'))
    })
    .catch(console.error)
  }

  text2voice(progressStep: number = 1) {
    return new Promise<string>((resolve, reject) => {
      (window as any).synth.run(
        toRaw(this.labels),
        this.voiceId,
        Number(this.speed),
        Number(this.volume),
        Number(this.pitchMax),
        Number(this.pitchMin),
        progressStep
      )
      .then((data: Uint8Array | null) => {
        if (data === null) return Promise.reject('invalid data')
        const blob = new Blob([data], {type: 'audio/wav'})
        return URL.createObjectURL(blob)
      })
      .then((url: string) => {
        this.cacheFile = url
        resolve(this.cacheFile)
      })
      .catch(reject)
    })
  }

  cacheClear() {
    this.cacheFile = ''
  }

  changeLabelIdAll() {
    this.labels.forEach((label) => label.changeId())
  }
}
