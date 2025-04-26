import { useState, useEffect, useRef, useCallback, JSX } from 'react'

const CHAR_RENDER_DELAY = 20 // 타이핑 효과 딜레이 (ms)

function App(): JSX.Element {
  // 상태 변수
  const [displayedText, setDisplayedText] = useState<string>('')
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isStreaming, setIsStreaming] = useState<boolean>(false)
  const [chunkQueue, setChunkQueue] = useState<string[]>([])

  // Ref 변수
  const ws = useRef<WebSocket | null>(null)
  const charRenderIntervalId = useRef<number | null>(null)
  const currentChunkRef = useRef<string | null>(null)
  const currentCharIndexRef = useRef<number>(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null) // 스크롤 대상 div 참조

  // --- 유틸리티 함수: 인터벌 정리 ---
  const clearCharRenderInterval = useCallback(() => {
    if (charRenderIntervalId.current) {
      clearInterval(charRenderIntervalId.current)
      charRenderIntervalId.current = null
    }
    currentChunkRef.current = null
    currentCharIndexRef.current = 0
  }, [])

  // --- 유틸리티 함수: 맨 아래로 스크롤 ---
  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight
    }
  }, [])

  // --- 글자 렌더링 로직 ---
  const renderNextChar = useCallback(() => {
    if (!currentChunkRef.current) {
      clearCharRenderInterval()
      return
    }

    const chunk = currentChunkRef.current
    const charIndex = currentCharIndexRef.current

    if (charIndex < chunk.length) {
      const nextChar = chunk[charIndex]
      setDisplayedText(prev => prev + nextChar) // 글자 추가
      currentCharIndexRef.current++
      // 스크롤은 displayedText 변경 후 effect에서 처리
    } else {
      clearCharRenderInterval()
    }
  }, [clearCharRenderInterval])

  // --- 웹소켓 연결 ---
  const connectWebSocket = useCallback(() => {
    // 초기화 (연결 시에는 이전 내용 모두 지움)
    clearCharRenderInterval()
    setDisplayedText('')
    setChunkQueue([])
    setIsStreaming(false)
    setIsConnected(false) // 연결 상태 초기화

    if (ws.current && ws.current.readyState < WebSocket.CLOSING) {
      console.log('이미 연결되어 있거나 연결 중입니다.')
      return
    }

    const serverAddress = import.meta.env.VITE_WS_SERVER_ADDRESS
    ws.current = new WebSocket(serverAddress)
    console.log('웹소켓 서버에 연결 시도 중...')

    ws.current.onopen = () => {
      console.log('웹소켓 연결 성공!')
      setIsConnected(true)
      setDisplayedText('서버에 연결되었습니다.\n')
    }

    ws.current.onmessage = (event: MessageEvent) => {
      const receivedData = event.data

      if (typeof receivedData === 'string') {
        if (receivedData === 'STREAM_END') {
          console.log('스트림 종료 메시지 수신')
          setIsStreaming(false)
        } else {
          setChunkQueue(prev => [...prev, receivedData])
        }
      } else if (receivedData instanceof Blob) {
        receivedData.text().then((text: string) => {
          if (text === 'STREAM_END') {
            console.log('스트림 종료 메시지 수신 (Blob)')
            setIsStreaming(false)
          } else {
            setChunkQueue(prev => [...prev, text])
          }
        })
      } else {
        console.warn('수신된 데이터 타입 처리 불가:', typeof receivedData)
      }
    }

    ws.current.onclose = (event: CloseEvent) => {
      console.log('웹소켓 연결 끊김:', event.reason, `코드: ${event.code}`)
      setIsConnected(false)
      setIsStreaming(false)
      clearCharRenderInterval()
      setDisplayedText(
        prev => prev + `\n--- 서버 연결 끊김 (코드: ${event.code}) ---`
      )
    }

    ws.current.onerror = (/* error: Event */) => {
      console.error('웹소켓 오류 발생')
      setIsConnected(false)
      setIsStreaming(false)
      clearCharRenderInterval()
      setDisplayedText(prev => prev + '\n--- 웹소켓 오류 발생 ---')
    }
  }, [clearCharRenderInterval]) // useCallback

  // --- Effect: 마운트/언마운트 시 웹소켓 관리 ---
  useEffect(() => {
    connectWebSocket()
    return (): void => {
      clearCharRenderInterval()
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log('웹소켓 연결 종료 중...')
        ws.current.close()
      }
    }
  }, [connectWebSocket, clearCharRenderInterval])

  // --- Effect: 청크 큐 처리 ---
  useEffect(() => {
    if (charRenderIntervalId.current === null && chunkQueue.length > 0) {
      const nextChunk = chunkQueue[0]
      setChunkQueue(prev => prev.slice(1))

      currentChunkRef.current = nextChunk
      currentCharIndexRef.current = 0

      charRenderIntervalId.current = setInterval(
        renderNextChar,
        CHAR_RENDER_DELAY
      )
    }
  }, [chunkQueue, renderNextChar])

  // --- Effect: 텍스트 변경 시 자동 스크롤 ---
  useEffect(() => {
    scrollToBottom()
  }, [displayedText, scrollToBottom]) // displayedText가 변경될 때마다 스크롤

  // --- 스트림 시작 요청 함수 ---
  const startStreaming = (): void => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      // 이전 상태 초기화 (큐와 인터벌만)
      setChunkQueue([])
      clearCharRenderInterval()

      // 새 스트림 시작을 알리는 구분자와 로딩 메시지 추가 (*** 이전 내용 유지 ***)
      setDisplayedText(prev => prev + '\n')

      const startMessage = 'START_STREAM'
      console.log('서버에 스트림 시작 요청:', startMessage)
      ws.current.send(startMessage)
      setIsStreaming(true)
    } else {
      console.log('웹소켓이 연결되지 않았습니다.')
      alert('웹소켓이 연결되지 않았습니다.')
    }
  }

  const stopStreaming = (): void => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send('STOP_STREAM')
      setIsStreaming(false)
      clearCharRenderInterval()
    }
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const input = event.currentTarget.elements[0] as HTMLInputElement
    const message = input.value
    setDisplayedText(
      prev =>
        prev +
        '\n' +
        `<div style="text-align: right; font-weight: bold;">${message}</div>`
    )
    startStreaming()
  }

  const endWebsocket = (): void => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.close()
    }
  }

  // --- JSX 렌더링 ---
  return (
    <div>
      <p>연결 상태: {isConnected ? '연결됨' : '끊김'}</p>
      <p>
        스트리밍 상태:{' '}
        {isStreaming ? '수신 중...' : isConnected ? '대기/완료' : '연결 끊김'}
      </p>

      {!isConnected ? (
        <button onClick={connectWebSocket}>재연결 시도</button>
      ) : (
        <button onClick={endWebsocket}>웹소켓 종료</button>
      )}

      <button
        onClick={isStreaming ? stopStreaming : startStreaming}
        style={{ width: '200px' }}
      >
        {isStreaming ? '중지' : '메세지 받기'}
      </button>

      <h2>수신된 텍스트:</h2>
      {/* 스크롤 컨테이너 설정: ref, overflowY, maxHeight */}
      <div
        ref={scrollContainerRef} // Ref 연결
        style={{
          border: '1px solid #eee',
          padding: '10px',
          height: '200px', // 스크롤이 생기도록 최대 높이 지정
          overflowY: 'auto', // 내용이 넘칠 경우 세로 스크롤 자동 생성
          width: '300px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
        }}
        dangerouslySetInnerHTML={{ __html: displayedText }}
      />
      <form onSubmit={handleSubmit}>
        <input type="text" />
        <button type="submit">전송</button>
      </form>
    </div>
  )
}

export default App
