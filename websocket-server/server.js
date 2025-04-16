// server.js
const WebSocket = require('ws')
const { generateRandomChunk } = require('./generateRandomChunk')
// 8080 포트에서 웹소켓 서버를 시작합니다.
const wss = new WebSocket.Server({ port: 8080 })

console.log('웹소켓 서버 시작됨 (포트: 8080)')

// 랜덤 시간 간격(ms) 생성 함수 (예: 100ms ~ 500ms)
function getRandomDelay(min = 100, max = 500) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
// --- ---

// 클라이언트 연결 이벤트 처리 (이하 코드는 이전과 동일)
wss.on('connection', ws => {
  console.log('클라이언트 연결됨')
  ws.streamTimeoutId = null // 타임아웃 ID 초기화

  ws.on('message', message => {
    const messageString = message.toString()
    console.log('받은 메시지: %s', messageString)

    if (messageString === 'START_STREAM') {
      console.log(
        '스트림 시작 요청 받음. ASCII/가타카나 랜덤 데이터 전송 시작...'
      )

      if (ws.streamTimeoutId) {
        clearTimeout(ws.streamTimeoutId)
        ws.streamTimeoutId = null
        console.log('이전 스트림 타임아웃 클리어.')
      }

      let messagesSent = 0
      const maxMessagesToSend = 50 // 보낼 청크 개수

      function sendNextChunk() {
        if (messagesSent >= maxMessagesToSend) {
          const endMessage = 'STREAM_END'
          console.log(
            `전송 완료 (${messagesSent}개). 종료 메시지: ${endMessage}`
          )
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(endMessage)
          }
          ws.streamTimeoutId = null
          return
        }

        if (ws.readyState !== WebSocket.OPEN) {
          console.log('클라이언트 연결 끊김. 스트림 전송 중단.')
          clearTimeout(ws.streamTimeoutId)
          ws.streamTimeoutId = null
          return
        }

        // 랜덤 아스키/가타카나 청크 생성 및 전송
        const chunk = generateRandomChunk() // 수정된 함수 호출
        // console.log(`전송 중 (${messagesSent + 1}/${maxMessagesToSend}): ${chunk}`); // 로그 너무 많으면 주석처리
        ws.send(chunk)
        messagesSent++

        const delay = getRandomDelay()
        ws.streamTimeoutId = setTimeout(sendNextChunk, delay)
      }

      ws.streamTimeoutId = setTimeout(sendNextChunk, getRandomDelay(10, 50))
    } else {
      console.log('알 수 없는 메시지:', messageString)
    }
  })

  ws.on('close', () => {
    console.log('클라이언트 연결 끊김')
    if (ws.streamTimeoutId) {
      console.log('진행 중이던 스트림 타임아웃 정리.')
      clearTimeout(ws.streamTimeoutId)
      ws.streamTimeoutId = null
    }
  })

  ws.on('error', error => {
    console.error('웹소켓 오류 발생:', error)
    if (ws.streamTimeoutId) {
      clearTimeout(ws.streamTimeoutId)
      ws.streamTimeoutId = null
    }
  })

  ws.send(
    '웹소켓 서버에 연결되었습니다! "메세지 받기" 버튼을 누르면 랜덤 스트림을 시작합니다.'
  )
})
