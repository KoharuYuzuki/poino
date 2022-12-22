import fs from 'fs/promises'
import path from 'path'
import { isNumber, isString } from './utils'

export class Voice {
  isValid: boolean
  id:      string | null
  name:    string | null
  ruby:    string | null
  icon:    string | null
  pitch: {
    min: number | null
    max: number | null
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

  constructor(parsed: any) {
    this.isValid = false
    this.id   = (parsed?.id   ? parsed.id   : null)
    this.name = (parsed?.name ? parsed.name : null)
    this.ruby = (parsed?.ruby ? parsed.ruby : null)
    this.icon = (parsed?.icon ? parsed.icon : null)
    this.pitch    = (parsed?.pitch    ? parsed.pitch    : {})
    this.phonemes = (parsed?.phonemes ? parsed.phonemes : {})
    this.voices   = (parsed?.voices   ? parsed.voices   : {})

    if (
      ![this.id, this.name, this.ruby, this.icon].includes(null) &&
      (isNumber(this.pitch?.min) && isNumber(this.pitch?.max)) &&
      Object.values(this.phonemes).every((x) => {
        return (
          Array.isArray(x) &&
          x.every((y) => {
            return (
              Array.isArray(y) &&
              y.every((z) => isNumber(z))
            )
          })
        )
      }) &&
      Object.values(this.voices).every((x) => {
        return (
          Array.isArray(x) &&
          x.every((y) => {
            return (
              ('phoneme' in y) && isString(y.phoneme) &&
              ('length'  in y) && isNumber(y.length)  &&
              ('volume'  in y) && isNumber(y.volume)  &&
              (
                !y.fade ? true :
                (
                  ('in'  in y.fade) && isString(y.fade.in)  &&
                  ('out' in y.fade) && isString(y.fade.out)
                ) ? true : false
              ) &&
              (!y.overlap ? true : isString(y.overlap))
            )
          })
        )
      })
    ) {
      this.isValid = true
    }
  }
}

export class VocieManager {
  voicesDir: string
  voices:    Voice[]

  constructor(voicesDir: string) {
    this.voicesDir = voicesDir
    this.voices = []
  }

  load() {
    return new Promise<void>((resolve, reject) => {
      fs.readdir(this.voicesDir)
      .then((items) => {
        return Promise.all(
          items.map((item) => {
            return new Promise<string | null>((resolve, reject) => {
              const itemPath = path.join(this.voicesDir, item)
              fs.stat(itemPath)
              .then((stat) => {
                if (stat.isFile() && (path.extname(itemPath) === '.json')) {
                  resolve(itemPath)
                } else {
                  resolve(null)
                }
              })
              .catch(reject)
            })
          })
        )
      })
      .then((jsonPaths) => {
        jsonPaths = jsonPaths.filter((jsonPath) => jsonPath !== null)

        return Promise.all(
          jsonPaths.map((jsonPath) => {
            return fs.readFile(jsonPath as string, { encoding: 'utf-8' })
          })
        )
      })
      .then((jsons) => {
        const voices = jsons.map((json) => {
          try {
            const parsed = JSON.parse(json)
            return new Voice(parsed)
          } catch (e) {
            console.error(e)
            return null
          }
        })
        .filter((voice) => voice?.isValid)
        .sort((a, b) => (a?.ruby as string).localeCompare((b?.ruby as string), 'ja'))

        this.voices = voices as Voice[]
        resolve()
      })
      .catch(reject)
    })
  }
}
