// 모의 웹소켓 클래스 구현
export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  private _readyState: number = MockWebSocket.CONNECTING
  private _handlers: Record<string, Function[]> = {
    open: [],
    message: [],
    close: [],
    error: [],
  }
  private _streamTimeoutId: number | null = null
  private _connectTimeout: number | null = null

  constructor(url: string) {
    console.log(`모의 웹소켓 생성 시도 (URL: ${url})`)

    // 가짜 연결 지연 시뮬레이션 (200ms 후 연결)
    this._connectTimeout = window.setTimeout(() => {
      this._readyState = MockWebSocket.OPEN
      this._trigger('open', {})
    }, 200)
  }

  get readyState(): number {
    return this._readyState
  }

  // 이벤트 핸들러 등록 메서드
  addEventListener(type: string, handler: Function): void {
    if (!this._handlers[type]) {
      this._handlers[type] = []
    }
    this._handlers[type].push(handler)
  }

  // 이벤트 트리거 유틸리티
  private _trigger(type: string, event: any): void {
    if (this._handlers[type]) {
      this._handlers[type].forEach(handler => handler(event))
    }

    // 기존 on{event} 호환성 유지
    const onHandler = `on${type}` as keyof MockWebSocket
    if (this[onHandler] && typeof this[onHandler] === 'function') {
      ;(this[onHandler] as Function)(event)
    }
  }

  // 메시지 전송 메서드
  send(message: string): void {
    if (this._readyState !== MockWebSocket.OPEN) {
      this._trigger('error', {
        message: '연결이, 닫혀있는 상태에서 메시지를 보낼 수 없습니다',
      })
      return
    }

    console.log(`모의 서버로 메시지 전송: ${message}`)

    if (message === 'START_STREAM') {
      this._startMockStream()
    } else if (message === 'STOP_STREAM') {
      if (this._streamTimeoutId !== null) {
        window.clearTimeout(this._streamTimeoutId)
        this._streamTimeoutId = null
        console.log('스트림 중단됨')
      }
    }
  }

  // 가짜 스트림 시작 메서드
  private _startMockStream(): void {
    if (this._streamTimeoutId !== null) {
      window.clearTimeout(this._streamTimeoutId)
    }

    let messagesSent = 0
    const maxMessages = 30

    const sendNextChunk = (): void => {
      if (this._readyState !== MockWebSocket.OPEN) return

      if (messagesSent >= maxMessages) {
        console.log(`모의 스트리밍 완료 (${messagesSent}개 청크)`)
        this._trigger('message', { data: 'STREAM_END' })
        this._streamTimeoutId = null
        return
      }

      const chunk = mockServerUtils.generateRandomChunk()
      this._trigger('message', { data: chunk })
      messagesSent++

      const delay = mockServerUtils.getRandomDelay()
      this._streamTimeoutId = window.setTimeout(sendNextChunk, delay)
    }

    this._streamTimeoutId = window.setTimeout(
      sendNextChunk,
      mockServerUtils.getRandomDelay(1, 50)
    )
  }

  // 연결 종료 메서드
  close(): void {
    if (this._readyState >= MockWebSocket.CLOSING) return

    this._readyState = MockWebSocket.CLOSING
    console.log('모의 웹소켓 연결 종료 중...')

    // 종료 지연 시뮬레이션 (100ms 후 종료)
    window.setTimeout(() => {
      this._readyState = MockWebSocket.CLOSED
      this._trigger('close', { code: 1000, reason: '정상 종료' })

      // 진행 중인 모든 타이머 정리
      if (this._streamTimeoutId !== null) {
        window.clearTimeout(this._streamTimeoutId)
        this._streamTimeoutId = null
      }

      if (this._connectTimeout !== null) {
        window.clearTimeout(this._connectTimeout)
        this._connectTimeout = null
      }
    }, 100)
  }

  // 이벤트 핸들러 (인터페이스 호환성을 위해 정의)
  onopen: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onclose: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
}

// 서버 모킹 유틸리티 함수들
const mockServerUtils = {
  // 랜덤 시간 간격(ms) 생성 함수 (예: 100ms ~ 500ms)
  getRandomDelay: (min = 1, max = 500): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },

  // 지정된 길이 범위 내에서 랜덤 아스키/가타카나 문자열 청크 생성 함수
  generateRandomChunk: (minLength = 5, maxLength = 100): string => {
    const chunkLength =
      Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength
    let randomChunk = ''

    // 사용할 유니코드 코드 포인트 범위 정의
    const asciiRange = { min: 33, max: 300 } // 출력 가능 ASCII
    const katakanaRange = { min: 12448, max: 12543 } // 가타카나 (U+30A0 - U+30FF)

    // 어떤 종류의 문자를 생성할지 결정 (예: 70% 아스키, 30% 가타카나)
    const katakanaProbability = 0.4 // 가타카나 생성 확률 (0.0 ~ 1.0)

    for (let i = 0; i < chunkLength; i++) {
      let randomCode

      // 확률에 따라 아스키 또는 가타카나 범위 선택
      if (Math.random() < katakanaProbability) {
        // 가타카나 범위에서 랜덤 코드 생성
        randomCode =
          Math.floor(
            Math.random() * (katakanaRange.max - katakanaRange.min + 1)
          ) + katakanaRange.min
      } else {
        // 아스키 범위에서 랜덤 코드 생성
        randomCode =
          Math.floor(Math.random() * (asciiRange.max - asciiRange.min + 1)) +
          asciiRange.min
      }

      // 유니코드 코드 포인트를 문자로 변환하여 문자열에 추가
      randomChunk += String.fromCharCode(randomCode)
    }
    return randomChunk
  },
}
