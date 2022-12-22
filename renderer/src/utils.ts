export function extractNumbers(str: string) {
  const numStr = [...[...new Array(10)].map((_, i) => String(i)), '.']
  return [...str].filter((x) => numStr.includes(x)).join('')
}
