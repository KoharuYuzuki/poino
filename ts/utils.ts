export function isNumber (value: any) {
  return ((typeof value === 'number') && (isFinite(value)))
}

export function isString (value: any) {
  return (typeof value === 'string' || value instanceof String)
}

export function isHash (value: any) {
  return (
    ![undefined, null].includes(value) &&
    (Object.getPrototypeOf(value).constructor.name === 'Object')
  )
}

export function hira2kana (str: string) {
  return str.replace(new RegExp('[\u3041-\u3096]', 'g'), (char) => {
    return String.fromCharCode(char.charCodeAt(0) + 0x60)
  })
}

export function kanaOnly (str: string) {
  return str.replace(new RegExp('[^\u30A1-\u30FA]', 'g'), '')
}
