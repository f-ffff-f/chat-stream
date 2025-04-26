// WebSocket.ts
import { eventEmitter, EventEmitter } from './shared/emitter' // 이벤트 이미터 가져오기
import { EventHandler, WebSocketEventMap, ReadyState } from './shared/types'

export class WebSocket {
  static readonly CONNECTING = ReadyState.CONNECTING
  static readonly OPEN = ReadyState.OPEN
  static readonly CLOSING = ReadyState.CLOSING
  static readonly CLOSED = ReadyState.CLOSED

  private _readyState: ReadyState = ReadyState.CONNECTING
  private _url: string
  private _emitter: EventEmitter // 이벤트 이미터 참조

  private _handlers: {
    [K in keyof WebSocketEventMap]?: EventHandler<K>[]
  } = { open: [], message: [], close: [], error: [] }

  onopen: EventHandler<'open'> | null = null
  onmessage: EventHandler<'message'> | null = null
  onclose: EventHandler<'close'> | null = null
  onerror: EventHandler<'error'> | null = null

  constructor(url: string) {
    this._url = url
    this._emitter = eventEmitter // 공유 이미터 사용
    console.log(`[클라이언트 ${this._url}] 모의 웹소켓 생성 및 연결 시도`)
    this._readyState = ReadyState.CONNECTING

    // 서버로부터 오는 이벤트 리스너 등록
    this._emitter.on('server-open', this._handleServerOpen)
    this._emitter.on('server-message', this._handleServerMessage)
    this._emitter.on('server-close', this._handleServerClose)
    this._emitter.on('server-error', this._handleServerError)

    // 서버 인스턴스 생성 요청 (서버가 스스로 리스너를 등록하도록)
    this._emitter.emit('create-server-instance', url)
    // 서버에게 연결 시작 요청
    this._emitter.emit('server-initiate-connection', this._url)
  }

  // --- 리스너 핸들러 (this 컨텍스트 유지를 위해 화살표 함수 사용) ---
  private _handleServerOpen = (eventUrl: string): void => {
    if (eventUrl === this._url) this._receiveOpen()
  }

  private _handleServerMessage = (eventUrl: string, data: string): void => {
    if (eventUrl === this._url) this._receiveMessage(data)
  }

  private _handleServerClose = (
    eventUrl: string,
    code: number,
    reason: string
  ): void => {
    if (eventUrl === this._url) this._receiveClose(code, reason)
  }

  private _handleServerError = (eventUrl: string, message: string): void => {
    if (eventUrl === this._url) this._receiveError(message)
  }

  // --- WebSocket API ---
  get readyState(): ReadyState {
    return this._readyState
  }
  get url(): string {
    return this._url
  }

  send(message: string): void {
    if (this._readyState !== ReadyState.OPEN) {
      const errorMsg =
        '연결이 열려있지 않은 상태에서 메시지를 보낼 수 없습니다.'
      console.error(`[클라이언트 ${this._url}] ${errorMsg}`)
      this._receiveError(errorMsg) // 내부 에러 처리
      return
    }
    console.log(
      `[클라이언트 ${this._url}] 서버로 메시지 전송 (emit): ${message}`
    )
    this._emitter.emit('client-message', this._url, message) // 이벤트 발생
  }

  close(code: number = 1000, reason: string = '클라이언트 정상 종료'): void {
    if (
      this._readyState === ReadyState.CLOSING ||
      this._readyState === ReadyState.CLOSED
    ) {
      console.log(
        `[클라이언트 ${this._url}] 이미 닫히는 중이거나 닫힌 연결 종료 시도 무시됨`
      )
      return
    }
    console.log(
      `[클라이언트 ${this._url}] 연결 종료 시작 (emit)... (Code: ${code}, Reason: ${reason})`
    )
    this._readyState = ReadyState.CLOSING
    this._emitter.emit('client-close', this._url, code, reason) // 이벤트 발생
    // 실제 CLOSED 상태는 'server-close' 이벤트를 받았을 때 _receiveClose에서 변경됨
  }

  // --- 이벤트 수신 처리 메서드 (내부 로직은 거의 동일) ---
  _receiveOpen(): void {
    if (this._readyState === ReadyState.CONNECTING) {
      console.log(
        `[클라이언트 ${this._url}] 'open' 이벤트 수신. 상태 변경: OPEN`
      )
      this._readyState = ReadyState.OPEN
      this._trigger('open', { type: 'open' })
    } else {
      console.warn(
        `[클라이언트 ${this._url}] 예상치 못한 상태에서 'open' 이벤트 수신:`,
        this._readyState
      )
    }
  }

  _receiveMessage(data: string): void {
    if (this._readyState === ReadyState.OPEN) {
      // console.log(`[클라이언트 ${this._url}] 'message' 이벤트 수신: ${data.substring(0, 50)}...`);
      this._trigger('message', { type: 'message', data })
    } else {
      console.warn(
        `[클라이언트 ${this._url}] Open 상태가 아닐 때 'message' 이벤트 수신 시도 무시됨:`,
        this._readyState
      )
    }
  }

  _receiveClose(code: number, reason: string): void {
    if (this._readyState !== ReadyState.CLOSED) {
      console.log(
        `[클라이언트 ${this._url}] 'close' 이벤트 수신. 상태 변경: CLOSED (Code: ${code}, Reason: ${reason})`
      )
      this._readyState = ReadyState.CLOSED
      this._trigger('close', { type: 'close', code, reason })
      this.cleanup() // 연결 종료 시 리스너 정리
    } else {
      console.warn(
        `[클라이언트 ${this._url}] 이미 CLOSED 상태에서 'close' 이벤트 수신:`,
        this._readyState
      )
    }
  }

  _receiveError(message: string): void {
    console.error(`[클라이언트 ${this._url}] 'error' 이벤트 수신: ${message}`)
    this._trigger('error', { type: 'error', message })
    // 에러 발생 시 연결 강제 종료 (선택적)
    if (
      this._readyState !== ReadyState.CLOSED &&
      this._readyState !== ReadyState.CLOSING
    ) {
      this.close(1006, `오류 발생: ${message}`)
    }
  }

  // --- 클라이언트 측 이벤트 리스너 호출 (동일) ---
  private _trigger<K extends keyof WebSocketEventMap>(
    type: K,
    event: WebSocketEventMap[K]
  ): void {
    // on<event> 핸들러 호출
    const onHandlerKey = `on${String(type)}` as keyof this
    const onHandler = this[onHandlerKey]
    if (typeof onHandler === 'function') {
      try {
        ;(onHandler as EventHandler<K>)(event)
      } catch (error) {
        console.error(
          `[클라이언트 ${this._url}] ${String(
            onHandlerKey
          )} 핸들러 실행 중 오류:`,
          error
        )
      }
    }
    // addEventListener로 추가된 핸들러 호출
    const handlers = this._handlers[type]
    if (handlers) {
      ;[...handlers].forEach((handler: EventHandler<K>) => {
        try {
          handler(event)
        } catch (error) {
          console.error(
            `[클라이언트 ${this._url}] ${String(
              type
            )} 이벤트 리스너 실행 중 오류:`,
            error
          )
        }
      })
    }
  }

  // --- 리소스 정리 ---
  cleanup(): void {
    console.log(`[클라이언트 ${this._url}] 리스너 정리 중...`)
    this._emitter.off('server-open', this._handleServerOpen)
    this._emitter.off('server-message', this._handleServerMessage)
    this._emitter.off('server-close', this._handleServerClose)
    this._emitter.off('server-error', this._handleServerError)
    // 서버 인스턴스 제거 요청 (선택적)
    this._emitter.emit('destroy-server-instance', this._url)
  }
}
