# chrome-extension-factory

매일 새벽 3시 30분(한국 시간)에 실효성 큰 크롬 확장 프로그램 5개를 만들어 쌓는 저장소입니다.

## 만드는 원칙
- 만들기 전에 비슷한 기존 확장 3개를 조사하고, 각 확장 폴더의 `BENCHMARK.md`에 부족한 점과 차별점을 적습니다.
- Manifest V3, 꼭 필요한 권한만 요청, 서버 없이 브라우저 안에서 동작, 사용자 데이터 외부 전송 없음.
- 분류 폴더 40개를 8일에 한 바퀴 돌며 하루 5개씩 만듭니다.

## 설치 방법 (개발자 모드)
1. 크롬 주소창에 `chrome://extensions` 입력 후 Enter
2. 오른쪽 위 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. 원하는 확장 폴더(`manifest.json`이 있는 폴더) 선택

## 폴더 구조
`분류폴더/확장-이름/` 안에 `manifest.json`, `README.md`, `BENCHMARK.md`와 코드가 들어갑니다. 전체 목록은 [INDEX.md](INDEX.md)에 있습니다.

## 분류 40개와 확장 개수
| 분류 폴더 | 이름 | 확장 수 |
|---|---|---|
| 01-productivity | 생산성 | 1 |
| 02-tab-management | 탭 관리 | 1 |
| 03-bookmarks | 북마크 | 1 |
| 04-note-taking | 메모 | 1 |
| 05-web-clipper | 웹 클리퍼 | 1 |
| 06-reading-mode | 읽기 모드 | 0 |
| 07-translation | 번역 | 0 |
| 08-language-learning | 언어 학습 | 0 |
| 09-text-tools | 텍스트 도구 | 0 |
| 10-writing-assistant | 글쓰기 도우미 | 0 |
| 11-ai-assistant | AI 도우미 | 0 |
| 12-prompt-tools | 프롬프트 도구 | 0 |
| 13-seo-tools | SEO 도구 | 0 |
| 14-marketing | 마케팅 | 0 |
| 15-blog-tools | 블로그 도구 | 0 |
| 16-social-media | 소셜 미디어 | 0 |
| 17-ecommerce | 전자상거래 | 0 |
| 18-price-tracker | 가격 추적 | 0 |
| 19-finance-trading | 금융·트레이딩 | 0 |
| 20-stock-crypto | 주식·코인 | 0 |
| 21-developer-tools | 개발자 도구 | 0 |
| 22-devtools-debugging | 디버깅 | 0 |
| 23-api-testing | API 테스트 | 0 |
| 24-css-design-tools | CSS·디자인 | 0 |
| 25-color-font-tools | 색상·글꼴 | 0 |
| 26-screenshot-recording | 화면 캡처·녹화 | 0 |
| 27-image-tools | 이미지 도구 | 0 |
| 28-video-tools | 동영상 도구 | 0 |
| 29-audio-tools | 오디오 도구 | 0 |
| 30-pdf-document | PDF·문서 | 0 |
| 31-data-scraping | 데이터 수집 | 0 |
| 32-form-autofill | 양식 자동 채우기 | 0 |
| 33-password-security | 비밀번호·보안 | 0 |
| 34-privacy-adblock | 개인정보·광고 차단 | 0 |
| 35-accessibility | 접근성 | 0 |
| 36-email-tools | 이메일 도구 | 0 |
| 37-calendar-time | 일정·시간 | 0 |
| 38-shopping-coupon | 쇼핑·쿠폰 | 0 |
| 39-education-study | 학습·공부 | 0 |
| 40-automation-webhook | 자동화·웹훅 | 0 |
