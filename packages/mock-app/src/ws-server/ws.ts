// ws.ts
import { eventEmitter, EventEmitter } from '../shared/emitter' // 이벤트 이미터 가져오기
import { serverUtils } from './utills' // 서버 유틸리티 (랜덤 데이터 생성 등)

// 서버 인스턴스를 관리하는 간단한 레지스트리
const serverInstances: { [url: string]: ws } = {}

// 서버 인스턴스 생성 요청 리스너
eventEmitter.on('create-server-instance', (url: string) => {
  if (!serverInstances[url]) {
    console.log(`[서버 관리자] ${url}에 대한 서버 인스턴스 생성`)
    serverInstances[url] = new ws(url, eventEmitter)
  } else {
    console.log(`[서버 관리자] ${url}에 대한 서버 인스턴스가 이미 존재합니다.`)
  }
})

// 서버 인스턴스 제거 요청 리스너
eventEmitter.on('destroy-server-instance', (url: string) => {
  if (serverInstances[url]) {
    console.log(`[서버 관리자] ${url}에 대한 서버 인스턴스 제거 시도`)
    // 서버 내부 정리 로직 호출 (타이머, 리스너 등)
    serverInstances[url].cleanupInternal()
    delete serverInstances[url]
    console.log(`[서버 관리자] ${url}에 대한 서버 인스턴스 제거 완료`)
  }
})

// 서버 로직
class ws {
  private _emitter: EventEmitter
  private _url: string
  private _isConnected: boolean = false
  private _isClosing: boolean = false
  private _streamTimeoutId: number | null = null
  private _connectTimeout: number | null = null

  constructor(url: string, emitter: EventEmitter) {
    this._url = url
    this._emitter = emitter // 공유 이미터 사용
    console.log(`[서버 ${this._url}] 생성됨. 이벤트 리스너 등록.`)

    // 클라이언트로부터 오는 이벤트 리스너 등록
    this._emitter.on('client-message', this._handleClientMessage)
    this._emitter.on('client-close', this._handleClientCloseEvent)
    // 클라이언트의 연결 시작 요청 리스너
    this._emitter.on(
      'server-initiate-connection',
      this._handleConnectionRequest
    )
  }

  // --- 리스너 핸들러 ---
  private _handleConnectionRequest = (eventUrl: string): void => {
    if (eventUrl === this._url) {
      this.connection() // 연결 시뮬레이션 시작
    }
  }

  private _handleClientMessage = (eventUrl: string, message: string): void => {
    if (eventUrl !== this._url) return // 자신의 URL에 해당하는 메시지만 처리

    if (!this._isConnected || this._isClosing) {
      console.warn(
        `[서버 ${this._url}] 연결되지 않았거나 닫히는 중 메시지 수신 무시: ${message}`
      )
      return
    }
    console.log(`[서버 ${this._url}] 클라이언트로부터 메시지 수신: ${message}`)

    // 메시지 기반 서버 로직
    if (message === 'START_STREAM') {
      this._startStream() // 스트림 시작 호출
    } else if (message === 'STOP_STREAM') {
      this._stopStream() // 스트림 중지 호출
    } else {
      // 다른 메시지 처리 로직 (예: 에코)
      // const response = `Server received: ${message}`;
      // this._sendMessageToClient(response);
    }
  }

  private _handleClientCloseEvent = (
    eventUrl: string,
    code: number,
    reason: string
  ): void => {
    if (eventUrl !== this._url) return

    if (!this._isConnected || this._isClosing) {
      console.log(
        `[서버 ${this._url}] 이미 닫혔거나 닫히는 중 닫기 이벤트 수신 무시 (Code: ${code}, Reason: ${reason})`
      )
      return
    }
    console.log(
      `[서버 ${this._url}] 클라이언트로부터 연결 종료 요청 받음 (Code: ${code}, Reason: ${reason})`
    )
    // 클라이언트가 시작했으므로, 다시 클라이언트에 close 이벤트를 보내지 않음 (notifyClient: false)
    this._initiateServerClose(code, reason, false)
  }

  // --- 서버 핵심 로직 ---
  connection(): void {
    if (this._connectTimeout) window.clearTimeout(this._connectTimeout) // 중복 방지

    console.log(`[서버 ${this._url}] 연결 처리 중...`)
    this._connectTimeout = window.setTimeout(() => {
      if (this._isClosing) return // 지연 시간 동안 close가 시작되었으면 open하지 않음

      this._isConnected = true
      this._connectTimeout = null
      console.log(`[서버 ${this._url}] 연결 수립됨. 'server-open' 이벤트 발생.`)
      this._emitter.emit('server-open', this._url) // 'server-open' 이벤트 발생
    }, 200) // 연결 지연 시뮬레이션
  }

  private _sendMessageToClient(data: string): void {
    if (!this._isConnected || this._isClosing) return
    // console.log(`[서버 ${this._url}] 클라이언트로 메시지 전송 (emit): ${data.substring(0, 50)}...`);
    this._emitter.emit('server-message', this._url, data) // 'server-message' 이벤트 발생
  }

  _initiateServerClose(
    code: number = 1000,
    reason: string = '서버 종료',
    notifyClient: boolean = true
  ): void {
    if (!this._isConnected || this._isClosing) {
      console.log(
        `[서버 ${this._url}] 이미 닫혔거나 닫히는 중인 연결 종료 시도 무시됨`
      )
      return
    }

    console.log(
      `[서버 ${this._url}] 연결 종료 시작... (Code: ${code}, Reason: ${reason})`
    )
    this._isClosing = true
    this._stopStream() // *** 스트리밍 중지 ***

    if (this._connectTimeout !== null) {
      // 연결 중이었다면 타임아웃 클리어
      window.clearTimeout(this._connectTimeout)
      this._connectTimeout = null
    }

    // 종료 지연 시뮬레이션
    window.setTimeout(() => {
      this._isConnected = false
      this._isClosing = false // 종료 완료 후 상태 초기화
      console.log(`[서버 ${this._url}] 연결 완전히 종료됨.`)
      if (notifyClient) {
        console.log(`[서버 ${this._url}] 'server-close' 이벤트 발생.`)
        this._emitter.emit('server-close', this._url, code, reason) // 'server-close' 이벤트 발생
      }
      // 서버 인스턴스 정리 로직 호출 (리스너 제거 등)
      this.cleanupInternal()
    }, 50)
  }

  // --- 스트리밍 관련 메서드 (Full Version) ---

  /**
   * 클라이언트로 메시지 스트림 전송을 시작합니다.
   * serverUtils 유틸리티를 사용하여 랜덤 데이터를 생성하고 지연 시간을 적용합니다.
   */
  private _startStream(): void {
    this._stopStream() // 기존 스트림이 있다면 먼저 중지

    console.log(`[서버 ${this._url}] 모의 스트림 시작...`)
    let messagesSent = 0
    const maxMessages = 30 // 최대 전송 메시지 수
    const delay = serverUtils.getRandomDelay() // 메시지 간 랜덤 지연 시간 (utills.ts 필요)

    const sendNextChunk = (): void => {
      // 스트림 전송 중 연결 상태 확인
      if (!this._isConnected || this._isClosing) {
        console.log(`[서버 ${this._url}] 연결이 끊겨 스트림 중단됨.`)
        this._streamTimeoutId = null
        return
      }

      // 최대 메시지 수 도달 시 종료
      if (messagesSent >= maxMessages) {
        console.log(
          `[서버 ${this._url}] 모의 스트리밍 완료 (${messagesSent}개 청크). 'STREAM_END' 전송.`
        )
        this._sendMessageToClient('STREAM_END') // 종료 메시지 전송
        this._streamTimeoutId = null
        return
      }

      // 랜덤 데이터 청크 생성 및 전송
      const chunk = serverUtils.generateRandomChunk() // (utills.ts 필요)
      this._sendMessageToClient(chunk) // 메시지 전송 (내부적으로 emit 호출)
      messagesSent++

      // 다음 청크 전송 예약
      this._streamTimeoutId = window.setTimeout(sendNextChunk, delay)
    }

    // 첫 청크 전송 시작 (약간의 지연 후)
    this._streamTimeoutId = window.setTimeout(sendNextChunk, delay)
  }

  /**
   * 현재 진행 중인 메시지 스트림을 중지합니다.
   * 예약된 setTimeout을 취소합니다.
   */
  private _stopStream(): void {
    if (this._streamTimeoutId !== null) {
      window.clearTimeout(this._streamTimeoutId)
      this._streamTimeoutId = null
      console.log(`[서버 ${this._url}] 스트림 중단됨.`)
    }
  }

  // 서버 강제 종료 유틸리티
  forceClose(code: number = 1006, reason: string = '서버 강제 종료'): void {
    console.log(`[서버 ${this._url}] 강제 연결 종료 실행...`)
    this._initiateServerClose(code, reason, true) // 클라이언트에게 알림
  }

  // --- 내부 리소스 및 리스너 정리 ---
  cleanupInternal(): void {
    console.log(`[서버 ${this._url}] 내부 리소스 및 리스너 정리 중...`)
    // 타임아웃 클리어
    if (this._connectTimeout) window.clearTimeout(this._connectTimeout)
    this._stopStream() // *** 스트림 타임아웃 포함하여 중지 ***

    // 이벤트 리스너 제거
    this._emitter.off('client-message', this._handleClientMessage)
    this._emitter.off('client-close', this._handleClientCloseEvent)
    this._emitter.off(
      'server-initiate-connection',
      this._handleConnectionRequest
    )
  }
}
