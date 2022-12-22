import openjtalk from '../openjtalk/openjtalk.js'
import path from 'path'
import { randomUUID } from 'crypto'
import fs from 'fs/promises'

const romaji2kana: [RegExp, string][] = [
  ['pau', '、'],
  ['kya', 'キャ'],
  ['kyu', 'キュ'],
  ['kye', 'キェ'],
  ['kyo', 'キョ'],
  ['gya', 'ギャ'],
  ['gyu', 'ギュ'],
  ['gye', 'ギェ'],
  ['gyo', 'ギョ'],
  ['kwa', 'クヮ'],
  ['gwa', 'グヮ'],
  ['sha', 'シャ'],
  ['shi', 'シ'],
  ['shu', 'シュ'],
  ['she', 'シェ'],
  ['sho', 'ショ'],
  ['cha', 'チャ'],
  ['chi', 'チ'],
  ['chu', 'チュ'],
  ['che', 'チェ'],
  ['cho', 'チョ'],
  ['tsa', 'ツァ'],
  ['tsi', 'ツィ'],
  ['tsu', 'ツ'],
  ['tse', 'ツェ'],
  ['tso', 'ツォ'],
  ['tya', 'テャ'],
  ['tyu', 'テュ'],
  ['tyo', 'テョ'],
  ['dya', 'デャ'],
  ['dyu', 'デュ'],
  ['dyo', 'デョ'],
  ['nya', 'ニャ'],
  ['nyu', 'ニュ'],
  ['nye', 'ニェ'],
  ['nyo', 'ニョ'],
  ['hya', 'ヒャ'],
  ['hyu', 'ヒュ'],
  ['hye', 'ヒェ'],
  ['hyo', 'ヒョ'],
  ['bya', 'ビャ'],
  ['byu', 'ビュ'],
  ['bye', 'ビェ'],
  ['byo', 'ビョ'],
  ['pya', 'ピャ'],
  ['pyu', 'ピュ'],
  ['pye', 'ピェ'],
  ['pyo', 'ピョ'],
  ['mya', 'ミャ'],
  ['myu', 'ミュ'],
  ['mye', 'ミェ'],
  ['myo', 'ミョ'],
  ['rya', 'リャ'],
  ['ryu', 'リュ'],
  ['rye', 'リェ'],
  ['ryo', 'リョ'],
  ['cl', 'ッ'],
  ['ye', 'イェ'],
  ['ka', 'カ'],
  ['ki', 'キ'],
  ['ku', 'ク'],
  ['ke', 'ケ'],
  ['ko', 'コ'],
  ['sa', 'サ'],
  ['si', 'スィ'],
  ['su', 'ス'],
  ['se', 'セ'],
  ['so', 'ソ'],
  ['ta', 'タ'],
  ['ti', 'ティ'],
  ['tu', 'トゥ'],
  ['te', 'テ'],
  ['to', 'ト'],
  ['na', 'ナ'],
  ['ni', 'ニ'],
  ['nu', 'ヌ'],
  ['ne', 'ネ'],
  ['no', 'ノ'],
  ['ha', 'ハ'],
  ['hi', 'ヒ'],
  ['he', 'ヘ'],
  ['ho', 'ホ'],
  ['ma', 'マ'],
  ['mi', 'ミ'],
  ['mu', 'ム'],
  ['me', 'メ'],
  ['mo', 'モ'],
  ['ya', 'ヤ'],
  ['yu', 'ユ'],
  ['yo', 'ヨ'],
  ['ra', 'ラ'],
  ['ri', 'リ'],
  ['ru', 'ル'],
  ['re', 'レ'],
  ['ro', 'ロ'],
  ['wa', 'ワ'],
  ['wi', 'ウィ'],
  ['we', 'ウェ'],
  ['wo', 'ウォ'],
  ['fa', 'ファ'],
  ['fi', 'フィ'],
  ['fu', 'フ'],
  ['fe', 'フェ'],
  ['fo', 'フォ'],
  ['va', 'ヴァ'],
  ['vi', 'ヴィ'],
  ['vu', 'ヴ'],
  ['ve', 'ヴェ'],
  ['vo', 'ヴォ'],
  ['ga', 'ガ'],
  ['gi', 'ギ'],
  ['gu', 'グ'],
  ['ge', 'ゲ'],
  ['go', 'ゴ'],
  ['za', 'ザ'],
  ['zi', 'ズィ'],
  ['zu', 'ズ'],
  ['ze', 'ゼ'],
  ['zo', 'ゾ'],
  ['ja', 'ジャ'],
  ['ji', 'ジ'],
  ['ju', 'ジュ'],
  ['je', 'ジェ'],
  ['jo', 'ジョ'],
  ['da', 'ダ'],
  ['di', 'ディ'],
  ['du', 'ドゥ'],
  ['de', 'デ'],
  ['do', 'ド'],
  ['ba', 'バ'],
  ['bi', 'ビ'],
  ['bu', 'ブ'],
  ['be', 'ベ'],
  ['bo', 'ボ'],
  ['pa', 'パ'],
  ['pi', 'ピ'],
  ['pu', 'プ'],
  ['pe', 'ペ'],
  ['po', 'ポ'],
  ['a', 'ア'],
  ['i', 'イ'],
  ['u', 'ウ'],
  ['e', 'エ'],
  ['o', 'オ'],
  ['N', 'ン'],
  ['\\^', 'ー']
].map((x) => [new RegExp(x[0], 'ig'), x[1]]);

function labelParser (log: string) {
  const labelRegexp = new RegExp('^([0-9]+) ([0-9]+) [a-z]+\\^[a-z]+-([a-z]+)\\+[a-z]+=[a-z]+\\/A:(-*[0-9|a-z]+)', 'gmi')
  const matches = [...log.matchAll(labelRegexp)].slice(1, -1)
  const labels: {
    phoneme: string
    length:  number
    accent:  number | null
  }[][] = []

  for (let i = 0, prev1 = 1, prev2 = 1; i < matches.length; i++) {
    const match    = matches[i]
    const start    = Number(match[1])
    const end      = Number(match[2])
    const phoneme  = match[3]
    const accent   = (match[4] === 'xx') ? null : Number(match[4])
    const length   = Math.round((end - start) / 10000)

    const isNull       = (accent === null)
    const isSmaller    = (!isNull && (accent <= 0) && (prev1 >= 0) && (accent < prev1))
    const isContinuous = ((accent === prev1) && (accent === prev2))
    const isSokuon     = (phoneme === 'cl')

    const split = (isNull || isSmaller || isContinuous)
    if (split) labels.unshift([])

    labels[0].push({phoneme, length, accent})
    ;[prev2, prev1] = (isNull) ? [1, 1] : (isContinuous) ? [1, accent] : (isSokuon) ? [2, 1] : [prev1, accent]
  }

  return labels.reverse().map((group) => {
    for (let i = 0, prevPhoneme = null; i < group.length; i++) {
      const label = group[i]

      if (label.phoneme === prevPhoneme) {
        label.phoneme = '^'
      } else {
        prevPhoneme = label.phoneme
      }
    }

    const accents = [...new Set(group.map((label) => label.accent))]
    const index = accents.indexOf(0)
    let newAccent: number[]

    if (index === 0) {
      newAccent = [1, ...new Array(accents.length - 1).fill(0)]
    } else if (index >= 1) {
      newAccent = [0, ...new Array(index).fill(1), ...new Array(accents.length - (index + 1)).fill(0)]
    } else {
      newAccent = [...new Array(accents.length).fill(0)]
    }

    return accents.map((_accent) => {
      const filtered = group.filter((label) => label.accent === _accent)
      const romaji   = filtered.reduce((str, label) => str + label.phoneme, '')
      const length   = filtered.reduce((num, label) => num + label.length, 0)
      const index    = accents.indexOf(_accent)
      const accent   = newAccent[index]

      const kana = romaji2kana.reduce((kana, x) => {
        const src = x[0]
        const dest = x[1]
        return kana.replace(src, dest)
      }, romaji).replace(new RegExp('[a-z]', 'gim'), '')

      return {kana, length, accent}
    })
  })
}

export class OpenJTalk {
  instance: any
  tmpDir: string
  appDir: string

  constructor(tmpDir: string, appDir: string) {
    this.instance = null
    this.tmpDir = tmpDir
    this.appDir = appDir
  }

  init() {
    return new Promise<void>((resolve, reject) => {
      openjtalk()
      .then((instance: any) => {
        this.instance = instance
        resolve()
      })
      .catch(reject)
    })
  }

  run(text: string, speed: number) {
    return new Promise<{
      kana:   string
      length: number
      accent: number
    }[][]>((resolve, reject) => {
      if (this.instance === null) {
        reject('not initialized')
        return
      }

      const dicDirPath   = path.join(this.appDir, './openjtalk/open_jtalk_dic_utf_8-1.11')
      const htsFilePath  = path.join(this.appDir, './openjtalk/hts_voice_nitech_jp_atr503_m001-1.05/nitech_jp_atr503_m001.htsvoice')
      const logFilePath  = path.join(this.tmpDir, `${randomUUID()}.tmp`)
      const textFilePath = path.join(this.tmpDir, `${randomUUID()}.tmp`)

      const args = [
        '',
        '-x', dicDirPath,
        '-m', htsFilePath,
        '-r', `${speed}`,
        '-ot', logFilePath,
        textFilePath
      ]

      fs.writeFile(textFilePath, text, { encoding: 'utf-8' })
      .then(() => this.instance.callMain(args))
      .then(() => fs.readFile(logFilePath, { encoding: 'utf-8' }))
      .then((log) => {
        const labels = labelParser(log)
        resolve(labels)
      })
      .catch(reject)
    })
  }
}
