export function extractNumbers (str: string) {
  const numStr = [...[...new Array(10)].map((_, i) => String(i)), '.']
  let existedDot = false
  return (
    [...str]
    .filter((x) => numStr.includes(x))
    .reduce((joined, x) => {
      if (x !== '.') return joined + x
      if (!existedDot) {
        existedDot = true
        return joined + x
      } else {
        return joined
      }
    }, '')
  )
}

export function deepCopy (val: any) {
  return JSON.parse(JSON.stringify(val))
}
