export const serverUtils = {
  getRandomDelay: (min: number = 1, max: number = 500): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },
  generateRandomChunk: (
    minLength: number = 5,
    maxLength: number = 100
  ): string => {
    const chunkLength =
      Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength
    let randomChunk = ''
    const asciiRange = { min: 33, max: 300 } // Note: max 300 is beyond standard ASCII
    const katakanaRange = { min: 12448, max: 12543 }
    const katakanaProbability = 0.4

    for (let i = 0; i < chunkLength; i++) {
      let randomCode
      if (Math.random() < katakanaProbability) {
        randomCode =
          Math.floor(
            Math.random() * (katakanaRange.max - katakanaRange.min + 1)
          ) + katakanaRange.min
      } else {
        randomCode =
          Math.floor(Math.random() * (asciiRange.max - asciiRange.min + 1)) +
          asciiRange.min
      }
      randomChunk += String.fromCharCode(randomCode)
    }
    return randomChunk
  },
}
