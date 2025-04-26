# 사용할 Node.js 버전 지정 (예: LTS 버전)
FROM node:20-alpine

# 앱 디렉토리 설정
WORKDIR /Volumes/T31/Development/study/chat-stream/packages/app/ws-server

# 앱 의존성 설치
COPY package*.json ./
RUN npm install --only=production --ignore-scripts --prefer-offline

# 앱 소스 코드 복사
COPY . .

EXPOSE 8080

# 앱 실행 명령어
CMD [ "node", "server.js" ]