type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
  namespace: string
  enabled?: boolean
}

export class Logger {
  private namespace: string
  private enabled: boolean

  constructor(options: LoggerOptions) {
    this.namespace = options.namespace
    this.enabled = options.enabled ?? true
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }

  private log(level: LogLevel, ...args: unknown[]) {
    if (!this.enabled) return
    const prefix = `[${this.namespace}]`
    console[level === 'debug' ? 'log' : level]?.(prefix, ...args)
  }

  debug(...args: unknown[]) {
    this.log('debug', ...args)
  }

  info(...args: unknown[]) {
    this.log('info', ...args)
  }

  warn(...args: unknown[]) {
    this.log('warn', ...args)
  }

  error(...args: unknown[]) {
    this.log('error', ...args)
  }
}

