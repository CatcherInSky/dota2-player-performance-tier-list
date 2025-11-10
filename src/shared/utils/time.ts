export function now() {
  return Date.now()
}

export function toDateTimeInputValue(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 16)
}

