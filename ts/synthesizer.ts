import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { Voice } from './voice'

class Complex {
  real: number;
  imag: number;

  constructor(real: number, imag: number) {
    this.real = real;
    this.imag = imag;
  }

  add(x: Complex) {
    return new Complex(this.real + x.real, this.imag + x.imag);
  }

  sub(x: Complex) {
    return new Complex(this.real - x.real, this.imag - x.imag);
  }

  mult(x: Complex) {
    return new Complex(
      this.real * x.real - this.imag * x.imag,
      this.real * x.imag + this.imag * x.real
    );
  }

  div(x: Complex) {
    return new Complex(
      (this.real * x.real + this.imag * x.imag) / (x.real ** 2 + x.imag ** 2),
      (this.imag * x.real - this.real * x.imag) / (x.real ** 2 + x.imag ** 2)
    )
  }

  static exp(x: Complex) {
    const comp = new Complex(Math.cos(x.imag), Math.sin(x.imag));
    comp.real *= Math.exp(x.real);
    comp.imag *= Math.exp(x.real);
    return comp;
  }
}

function envelope2wave (
  envelope: [number, number][],
  sampleRate: number,
  f0: number,
  length: number,
  volume: number
) {
  if (length <= 0) return []

  const bufferSizeList = [...new Array(20)].map((_, i) => 2 ** i)
  const originalSize = Math.round(sampleRate * length / 1000)

  const filtered = bufferSizeList.filter((x) => x >= originalSize)
  if (filtered.length <= 0) return []
  const bufferSize = filtered[0]

  const xList: number[] = []
  const yList: number[] = []

  envelope.forEach((point) => {
    xList.push(point[0] * 100)
    yList.push(point[1])
  })

  const newXList: number[] = []
  let counter = 0

  if (f0 > 0) {
    const maxFreq = 48000

    while (true) {
      counter++
      const newX = f0 * counter
      if (newX > maxFreq) {
        break
      }
      newXList.push(newX)
    }
  }

  const formants = lerp(xList, yList, newXList)
  const data: number[] = new Array(bufferSize).fill(0)
  const freqs = fftfreq(bufferSize, 1.0 / sampleRate)

  for (let i = 0; i < newXList.length; i++) {
    const x     = newXList[i]
    const y     = formants[i]
    const index = approximateIndex(x, freqs)
    const value = Math.pow(10, y) - 1
    data[index] += value
  }

  let wave =
    fft(data.map((x) => new Complex(x, 1)), true)
    .map((x) => x.real)
    .slice(0, originalSize)

  const waveMax = wave.reduce((a, b) => Math.max(a, b))
  if (waveMax > 0) {
    wave = wave.map((x) => x * volume / waveMax)
  } else {
    wave.fill(0)
  }

  return wave
}

function fade (wave: number[], inLength: number, outLength: number) {
  if (
    ((inLength <= 0) || (inLength > wave.length)) ||
    ((outLength <= 0) || (outLength > wave.length))
  ) return wave

  const inStep = linspace(0, 1, inLength)
  const outStep = linspace(0, 1, outLength)

  for (let i = 0; i < inLength; i++) {
    wave[i] *= inStep[i]
  }

  for (let i = 0; i < outLength; i++) {
    wave[(wave.length - 1) - i] *= outStep[i]
  }

  return wave
}

function fft (x: Complex[], inverse: boolean = false, recursion: boolean = false) {
  const n = x.length;
  if (n === 1) return x;

  const even = fft(x.filter((_, i) => i % 2 === 0), inverse, true);
  const odd  = fft(x.filter((_, i) => i % 2 === 1), inverse, true);

  const y: Complex[] = new Array(n).fill(0);
  const circle = (inverse ? 2 : -2) * Math.PI;

  for (let i = 0; i < (n / 2); i++) {
    const theta = Complex.exp(new Complex(0, circle * i / n)).mult(odd[i]);
    y[i]           = even[i].add(theta);
    y[i + (n / 2)] = even[i].sub(theta);
  }

  if (inverse && !recursion) {
    return y.map((y) => new Complex(y.real / n, y.imag / n));
  } else {
    return y;
  }
}

function fftfreq (length: number, space: number) {
  const start = 0.0
  const end = 1.0 / space
  return linspace(start, end, length).filter((x) => x < (end / 2))
}

function linspace (start: number, end: number, num: number) {
  const diff = end - start
  const step = diff / (num - 1)
  const samples = [start]
  let counter = 0

  while (true) {
    counter++
    const sample = (step * counter) + start
    if (sample > end) {
      break
    }
    samples.push(sample)
  }

  return samples
}

function lerp (xList: number[], yList: number[], newXList: number[]) {
  const length = ((xList.length <= yList.length) ? xList.length : yList.length)
  const lastIndex = length - 1
  const envelope: number[] = new Array(newXList.length).fill(0)

  for (let i = 0; i < newXList.length; i++) {
    const x = newXList[i]

    let x0: number | null = null
    let y0: number | null = null
    let x1: number | null = null
    let y1: number | null = null

    for (let j = 0; j < length; j++) {
      if ((x >= xList[j]) && (j < lastIndex) && (x < xList[j + 1])) {
        const j1 = j + 1

        x0 = xList[j]
        y0 = yList[j]
        x1 = xList[j1]
        y1 = yList[j1]

        break
      }

      if ((j === lastIndex) && (x === xList[j])) {
        envelope[i] = yList[j]
        break
      }
    }

    if ((x0 !== null) && (y0 !== null) && (x1 !== null) && (y1 !== null)) {
      envelope[i] = (y0 + (y1 - y0) * (x - x0) / (x1 - x0))
    }
  }

  return envelope
}

function approximateIndex (value: number, list: number[]) {
  const diffs = list.map((x) => (x > value) ? (x - value) : -(x - value))
  const min   = diffs.reduce((a, b) => Math.min(a, b))
  const index = diffs.indexOf(min)
  return index
}

type label = {
  kana:   string
  length: number
  accent: number
}

export class Synthesizer {
  tmpDir: string
  sampleRate: number

  constructor(tmpDir: string) {
    this.tmpDir = tmpDir
    this.sampleRate = 48000
  }

  run(
    labels: label[],
    voice: Voice,
    speed: number,
    volume: number,
    pitchMax: number,
    pitchMin: number
  ) {
    const voiceEntries = Object.entries(voice.voices)
    const phonemeEntries = Object.entries(voice.phonemes)
    const pitchDiff = pitchMax - pitchMin

    for (let i = labels.length - 1; i >= 0; i--) {
      const label = labels[i]

      if (label.kana === 'ー') {
        const prevLabel = labels[i - 1]
        prevLabel.length += label.length
        label.length = 0
      }
    }

    const waves = labels.map((label) => {
      const kana = label.kana
      const filtered = voiceEntries.filter((entry) => entry[0] === kana)
      if (filtered.length <= 0) return this.genSilence(label.length)
      const voice = filtered[0][1].map((phoneme) => {return {...phoneme}})

      voice.reduce((remaining, phoneme) => {
        if (phoneme.length !== -1) {
          phoneme.length *= (1 / speed)
        } else {
          phoneme.length = remaining
        }

        if (phoneme.fade) {
          const regexp = new RegExp('([0-9]+)(ms|%)$')
          const inResult = regexp.exec(phoneme.fade.in)
          const outResult = regexp.exec(phoneme.fade.out)

          phoneme.fadeInMs =
            (!inResult) ? 0 :
            (inResult[2] === 'ms') ? Number(inResult[1]) :
            Math.round(phoneme.length * Number(inResult[1]) / 100)

          phoneme.fadeOutMs =
            (!outResult) ? 0 :
            (outResult[2] === 'ms') ? Number(outResult[1]) :
            Math.round(phoneme.length * Number(outResult[1]) / 100)
        } else {
          phoneme.fadeInMs = 0
          phoneme.fadeOutMs = 0
        }

        if (phoneme.overlap) {
          const regexp = new RegExp('([0-9]+)(ms|%)$')
          const result = regexp.exec(phoneme.overlap)

          phoneme.overlapMs =
            (!result) ? 0 :
            (result[2] === 'ms') ? Number(result[1]) :
            Math.round(phoneme.length * Number(result[1]) / 100)
        } else {
          phoneme.overlapMs = 0
        }

        if (phoneme.length !== -1) {
          remaining -= phoneme.length - phoneme.overlapMs
          return (remaining > 0) ? remaining : 0
        } else {
          return 0
        }
      }, label.length)

      let wave: number[] = []
      let prevOverlapLen = 0

      for (let i = 0; i < voice.length; i++) {
        const phoneme = voice[i]
        const filtered = phonemeEntries.filter((entry) => entry[0] === phoneme.phoneme)

        if (filtered.length <= 0) {
          const silence = this.genSilence(phoneme.length - prevOverlapLen)
          wave = [...wave, ...silence]
          prevOverlapLen = Math.round(this.sampleRate * (phoneme.overlapMs as number) / 1000)
          continue
        }

        const envelope      = filtered[0][1]
        const sampleRate    = this.sampleRate
        const f0            = (pitchDiff * label.accent) + pitchMin
        const length        = phoneme.length
        const phonemeVolume = phoneme.volume * volume

        let _wave = envelope2wave(
          envelope,
          sampleRate,
          f0,
          length,
          phonemeVolume
        )

        _wave = fade(
          _wave,
          Math.round(this.sampleRate * (phoneme.fadeInMs as number) / 1000),
          Math.round(this.sampleRate * (phoneme.fadeOutMs as number) / 1000)
        )

        const overlapped = wave.slice(wave.length - prevOverlapLen).map((x, i) => {
          return (i <= _wave.length) ? x + _wave[i] : x
        })

        wave = [
          ...wave.slice(0, wave.length - prevOverlapLen),
          ...overlapped,
          ..._wave.slice(prevOverlapLen)
        ]
        prevOverlapLen = Math.round(this.sampleRate * (phoneme.overlapMs as number) / 1000)
      }

      return wave
    })

    const waveLen = waves.reduce((sum, wave) => sum + wave.length, 0)
    const header = this.genWavHeader(waveLen)

    const nanRemovedWaves = waves.map((wave) => {
      return wave.map((x) => (Number.isNaN(x)) ? 0 : x)
    })

    const wavData = [
      Uint8Array.from(header),
      ...nanRemovedWaves.map((wave) => {
        return Uint8Array.from(
          new Int8Array(Float32Array.from(wave).buffer)
        )
      })
    ]

    const filePath = path.join(this.tmpDir, `${randomUUID()}.tmp`)

    return new Promise(async (resolve, reject) => {
      for (let i = 0; i < wavData.length; i++) {
        await fs.appendFile(filePath, wavData[i]).catch(reject)
      }
      resolve(filePath)
    })
  }

  genSilence(length: number) {
    const size = Math.round(this.sampleRate * length / 1000)
    return new Array(size).fill(0)
  }

  genWavHeader(length: number) {
    length *= 4 // float32 to uint8

    const header = Uint8Array.from([
      this.str2hex('RIFF'),                 // 'RIFF'
      this.num2hex(36 + length, 4),         // RIFF chunk size
      this.str2hex('WAVE'),                 // 'WAVE'
      this.str2hex('fmt '),                 // 'fmt '
      this.num2hex(16, 4),                  // fmt chunk size
      this.num2hex(3, 2),                   // fotmant
      this.num2hex(1, 2),                   // number of channels
      this.num2hex(this.sampleRate, 4),     // sample rate
      this.num2hex(this.sampleRate * 4, 4), // byte/s
      this.num2hex(4, 2),                   // block size
      this.num2hex(32, 2),                  // bit depth
      this.str2hex('data'),                 // 'data'
      this.num2hex(length, 4)               // size
    ].flat().map((x) => parseInt(x, 16)))

    return header
  }

  str2hex(str: string) {
    return [...str].map((char) => char.charCodeAt(0).toString(16))
  }

  num2hex(num: number, length: number) {
    const str = `${Array(length).fill('00').join('')}${num.toString(16)}`.slice(-length * 2)
    return this.sliceByLen(str, 2).reverse()
  }

  sliceByLen(str: string, length: number) {
    return [...str].reduce((arr, char, i) => {
      (i % length === 0) ? arr.push(char) : arr[arr.length - 1] += char
      return arr
    }, [] as string[])
  }
}
