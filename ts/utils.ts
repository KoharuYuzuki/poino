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
