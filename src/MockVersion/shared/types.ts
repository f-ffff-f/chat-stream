// types.ts

// --- 기존 WebSocket 클라이언트 이벤트 타입 ---
export interface OpenEvent {
  type: 'open'
}
export interface MessageEvent {
  type: 'message'
  data: string
}
export interface CloseEvent {
  type: 'close'
  code: number
  reason: string
}
export interface ErrorEvent {
  type: 'error'
  message: string
}

export interface WebSocketEventMap {
  open: OpenEvent
  message: MessageEvent
  close: CloseEvent
  error: ErrorEvent
}

export type EventHandler<K extends keyof WebSocketEventMap> = (
  event: WebSocketEventMap[K]
) => void

export enum ReadyState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

// --- Emitter 내부 통신 이벤트 타입 ---
export interface EmitterEventMap {
  // 서버 인스턴스 관리
  'create-server-instance': (url: string) => void
  'destroy-server-instance': (url: string) => void

  // 클라이언트 -> 서버 이벤트
  'client-message': (url: string, message: string) => void
  'client-close': (url: string, code: number, reason: string) => void

  // 서버 -> 클라이언트 이벤트
  'server-initiate-connection': (url: string) => void // 클라이언트가 서버에 연결 시작 요청
  'server-open': (url: string) => void
  'server-message': (url: string, data: string) => void
  'server-close': (url: string, code: number, reason: string) => void
  'server-error': (url: string, message: string) => void

  // 필요에 따라 다른 내부 이벤트 추가 가능
}

// Emitter 이벤트 이름 타입을 명시적으로 정의 (선택적)
export type EmitterEventName = keyof EmitterEventMap
