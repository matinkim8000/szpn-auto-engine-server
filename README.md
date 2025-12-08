# SZPN Auto Engine (Vercel Version)

## 기능
- Moralis Streams → webhook.js → Firestore 저장
- Firestore → auto-engine.js → AutoSendTokens 자동 실행
- 테스트 모드: 1분 간격 실행

## 설치 방법
1. 이 프로젝트를 ZIP으로 업로드
2. .env 설정 입력
3. Moralis Streams에서 Webhook URL 등록
4. Firestore에 지갑 문서(users/{address}) 추가

## 실전 모드 전환 방법
auto-engine.js 에서:

INTERVAL = 60 * 1000 → INTERVAL = 902999 * 1000
