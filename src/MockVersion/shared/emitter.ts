// emitter.ts
import { EmitterEventMap } from './types'

export class EventEmitter {
  private listeners: { [K in keyof EmitterEventMap]?: EmitterEventMap[K][] } =
    {}

  // on 메서드 타입 강화
  on<K extends keyof EmitterEventMap>(
    eventName: K,
    listener: EmitterEventMap[K]
  ): void {
    const listeners = (this.listeners[eventName] as any) ?? []

    listeners.push(listener)
    this.listeners[eventName] = listeners as any
    console.log(`[Emitter] Listener added for: ${String(eventName)}`)
  }

  // off 메서드 타입 강화
  off<K extends keyof EmitterEventMap>(
    eventName: K,
    listener: EmitterEventMap[K]
  ): void {
    const listeners = this.listeners[eventName]
    if (listeners) {
      this.listeners[eventName] = listeners.filter(l => l !== listener) as any
      console.log(`[Emitter] Listener removed for: ${String(eventName)}`)
    }
  }

  // emit 메서드 타입 강화 (Parameters<T> 유틸리티 타입 사용)
  emit<K extends keyof EmitterEventMap>(
    eventName: K,
    ...args: Parameters<EmitterEventMap[K]>
  ): void {
    console.log(
      `[Emitter] Emitting event: ${String(eventName)} with args:`,
      args
    )
    const listeners = this.listeners[eventName]
    if (listeners) {
      ;[...listeners].forEach(listener => {
        try {
          // Use explicit type casting to fix the spread arguments issue
          ;(listener as (...args: any[]) => void)(...(args as unknown as any[]))
        } catch (e) {
          console.error(
            `[Emitter] Error in listener for ${String(eventName)}:`,
            e
          )
        }
      })
    } else {
      console.log(`[Emitter] No listeners for: ${String(eventName)}`)
    }
  }

  // removeAllListeners 타입 강화 (선택적)
  removeAllListeners<K extends keyof EmitterEventMap>(eventName?: K): void {
    if (eventName) {
      delete this.listeners[eventName]
      console.log(`[Emitter] All listeners removed for: ${String(eventName)}`)
    } else {
      this.listeners = {}
      console.log(`[Emitter] All listeners removed.`)
    }
  }
}

// 공유 인스턴스 생성 (타입 적용됨)
export const eventEmitter = new EventEmitter()
