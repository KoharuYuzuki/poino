import fs from 'fs/promises'

export class KVS {
  kvs:          any
  saved:        boolean
  timeoutId:    NodeJS.Timeout | null
  saveInterval: number
  jsonIndent:   number
  filePath:     string

  constructor(savePath: string) {
    this.kvs          = {}
    this.saved        = false
    this.timeoutId    = null
    this.saveInterval = 1000
    this.jsonIndent   = 2
    this.filePath     = savePath
  }

  load(): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.open(this.filePath, 'a')
      .then((fileHandle: fs.FileHandle) => {
        fileHandle.close()
      })
      .catch((e: any) => {
        console.log('KVSファイルのオープンに失敗しました', e)
        reject(e)
      })
      .then(() => {
        return fs.readFile(this.filePath, {encoding: 'utf-8', flag: 'r'})
      })
      .then((json: string) => {
        if (new RegExp('^\s*$').test(json)) {
          this.save()
          resolve()
          return
        }

        try {
          this.kvs = JSON.parse(json)
        } catch (e: any) {
          console.log('KVSファイルのデコードに失敗しました', e)
          reject(e)
        }

        if (this.isHash(this.kvs)) {
          this.save()
          resolve()
        } else {
          throw new Error('無効なKVSです')
        }
      })
      .catch((e: any) => {
        console.log('KVSファイルの読み取りに失敗しました', e)
        reject(e)
      })
    })
  }

  save() {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }

    if (this.saved) {
      this.nextSave()
      return
    }

    let json: string

    try {
      json = JSON.stringify(this.kvs, null, this.jsonIndent)
    } catch (e: any) {
      console.log('KVSファイルのエンコードに失敗しました', e)
      this.nextSave()
      return
    }

    fs.writeFile(this.filePath, json, {encoding: 'utf-8', flag: 'w'})
    .then(() => {
      this.saved = true
    })
    .catch((e: any) => {
      console.log('KVSファイルの保存に失敗しました', e)
    })
    .finally(() => {
      this.nextSave()
    })
  }

  nextSave() {
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null
      this.save()
    }, this.saveInterval)
  }

  isHash(value: any): boolean {
    return (
      ![undefined, null].includes(value) &&
      (Object.getPrototypeOf(value).constructor.name === 'Object')
    )
  }

  get(key: string): any {
    return (this.has(key)) ? this.kvs[key] : null
  }

  set(key: string, value: any) {
    this.kvs[key] = value
    this.saved = false
  }

  has(key: string): boolean {
    return (key in this.kvs)
  }

  del(key: string): boolean {
    const has = this.has(key)
    delete this.kvs[key]
    this.saved = false
    return has
  }

  clear() {
    this.kvs = {}
    this.saved = false
  }
}
