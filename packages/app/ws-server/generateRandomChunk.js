// 지정된 길이 범위 내에서 랜덤 아스키/가타카나 문자열 청크 생성 함수
function generateRandomChunk(minLength = 5, maxLength = 100) {
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
}

module.exports = { generateRandomChunk }
