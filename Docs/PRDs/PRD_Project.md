# 주차장 컨테이너 자동 감지 및 기록 시스템 요구사항 명세서
> **최종 수정일:** 2023-04-02

## 1. 개요 (Overview)

본 문서는 주차장 출입구 CCTV 영상에서 실시간으로 트럭 컨테이너를 감지하고, 컨테이너 번호를 인식하여 출입 기록을 자동 생성하는 웹 애플리케이션 개발을 위한 요구사항을 정의합니다. 사용자가 제공한 YOLOv8 모델(`WandaVisionYOLO.pt`)과 Gemini API를 활용하여 핵심 기능을 구현하고, 웹 인터페이스를 통해 시연 효과를 극대화하는 것을 목표로 합니다.

## 2. 목표 (Goals)

* **실시간 영상 처리 및 시각화:** 웹 페이지에서 CCTV 영상(또는 시연용 비디오 파일)을 실시간 스트리밍하고, YOLOv8 모델을 통해 감지된 트럭 컨테이너에 바운딩 박스를 표시합니다.
* **자동 컨테이너 번호 인식:** 특정 조건(예: 컨테이너가 가장 잘 보이는 시점)에서 컨테이너 이미지를 캡처 및 크롭하고, Gemini API를 이용해 컨테이너 번호를 추출합니다.
* **데이터 자동 기록 및 표시:** 추출된 컨테이너 번호와 감지 시간(타임스탬프)을 Supabase 데이터베이스에 실시간으로 저장하고, 웹 페이지의 테이블에 즉시 업데이트하여 표시합니다.
* **효과적인 시연:** 졸업 작품 시연 시, 전체 프로세스(영상 입력 -> 객체 감지 -> 번호 인식 -> 데이터 기록)가 원활하게 동작함을 명확하게 보여주어 시스템의 신뢰성을 입증합니다.

## 3. 기능 요구사항 (Functional Requirements)

### 3.1. 백엔드 (FastAPI)

* **[BE-1] 영상 처리 파이프라인:**
  * 입력: 시연용 비디오 파일 경로 또는 잠재적 실시간 스트림 URL. (우선순위: 비디오 파일 처리)
  * 처리:
    1. OpenCV를 사용하여 비디오 프레임 단위로 읽기.
    2. 각 프레임을 `WandaVisionYOLO.pt` 모델에 입력하여 'container' 객체 감지 수행.
    3. 사용자 제공 `object_detection.py`의 `ContainerCapture` 클래스 로직을 적용하여, 컨테이너 추적 및 최적 캡처 시점 판단.
       * IoU 기반 추적, 바운딩 박스 크기 변화 감지 로직 포함.
       * `min_area_ratio` (예: 0.2) 이상인 컨테이너만 추적 대상으로 고려.
    4. 최적 시점으로 판단된 프레임에서 컨테이너 영역(바운딩 박스 기준)을 크롭하여 이미지 파일로 임시 저장 또는 메모리 내 이미지 객체로 관리.
  * 출력: 처리된 프레임 (바운딩 박스 정보 포함), 캡처된 컨테이너 이미지.

* **[BE-2] 컨테이너 번호 인식 (Gemini API 연동):**
  * 입력: 캡처된 컨테이너 이미지 (파일 경로 또는 이미지 데이터).
  * 처리:
    1. 사용자 제공 `recognize_container_number` 함수 로직 활용.
    2. 이미지를 Gemini Vision 모델 (gemini-2.5-pro-exp-03-25)에 전달하여 컨테이너 번호 추출 요청. (프롬프트는 제공된 코드 내용 참조)
    3. Gemini API 응답 결과 파싱.
    4. `ContainerNumber` Pydantic 모델을 사용하여 결과 검증 및 owner/number 분리. (형식: `[A-Z]{4} \d{6}`)
    5. 인식 실패 또는 형식 불일치 시 "UNKNOWN" 또는 "ERROR" 처리 로직 포함.
  * 출력: 인식된 컨테이너 번호 (owner, number 분리) 또는 실패 상태.

* **[BE-3] 데이터베이스 연동 (Supabase):**
  * 입력: 인식된 컨테이너 번호 (owner, number), 캡처 시점 타임스탬프.
  * 처리: Supabase 클라이언트 라이브러리를 사용하여 지정된 테이블(`container_logs`)에 데이터 삽입.
  * 출력: 데이터베이스 저장 성공/실패 여부.

* **[BE-4] 실시간 스트리밍 (WebSocket):**
  * `/ws/video`:
    * 클라이언트(프론트엔드) 연결 시 영상 처리 시작.
    * 처리된 비디오 프레임(바운딩 박스 포함)을 주기적으로 클라이언트에 전송. (JPEG 또는 PNG 형식의 Base64 인코딩 문자열 권장)
    * 캡처 이벤트 발생 시 관련 정보(예: '캡처 시도 중', 'OCR 요청 중') 전송 가능.
  * `/ws/logs`:
    * 새로운 컨테이너 로그가 데이터베이스에 저장될 때마다 해당 로그 정보(타임스탬프, owner, number)를 연결된 모든 클라이언트에 푸시.

* **[BE-5] API 키 관리:**
  * Google API Key (`GOOGLE_API_KEY`; AIzaSyCr09Db8misnZKeqiUeS66CTrSQW26v2vw) 및 Supabase 접속 정보는 환경 변수 또는 보안 설정 파일을 통해 안전하게 관리. 코드에 하드코딩하지 않도록 주의.

### 3.2. 프론트엔드 (Next.js)

* **[FE-1] 실시간 비디오 스트리밍 뷰:**
  * 백엔드 WebSocket (`/ws/video`)에 연결하여 수신된 프레임 이미지 표시.
  * 수신된 바운딩 박스 좌표 정보를 기반으로 비디오 프레임 위에 실시간으로 사각형 오버레이 렌더링.
    * 일반 감지 박스 (예: 초록색)
    * 캡처 완료된 컨테이너 박스 (예: 빨간색 또는 다른 식별 가능한 스타일)

* **[FE-2] 실시간 로그 테이블:**
  * 백엔드 WebSocket (`/ws/logs`)에 연결하여 새로운 로그 데이터 수신.
  * 수신된 데이터를 테이블에 실시간으로 추가 (가장 최신 로그가 상단에 보이도록).
  * 테이블 컬럼: `시간 (Captured At)`, `소유자 코드 (Owner)`, `번호 (Number)`.

* **[FE-3] 상태 표시:**
  * 현재 시스템 상태 (예: "연결 중...", "영상 처리 중", "컨테이너 감지됨", "번호 인식 중", "로그 기록됨")를 사용자에게 시각적으로 표시하는 영역.

### 3.3. AI/ML 모델

* **[ML-1] 객체 탐지 모델:**
  * `WandaVisionYOLO.pt` 모델 파일을 백엔드 환경에서 로드하여 사용.
  * 모델 클래스 정보 (`model.names`) 확인 필요 (코드 상 'container' 클래스 사용).

* **[ML-2] 컨테이너 번호 인식 모델:**
  * Google Gemini API 사용 (`gemini-pro-vision` 또는 `gemini-2.0-flash` 등).
  * 제공된 Python 코드의 프롬프트 및 API 호출 로직 활용.

## 4. 기술 스택 (Technology Stack)

* **Frontend:** Next.js (React)
* **Backend:** FastAPI (Python)
* **Database:** Supabase (PostgreSQL)
* **Real-time Communication:** WebSockets
* **AI/ML:** YOLOv8 (Ultralytics), Google Gemini API, OpenCV, Pydantic
* **Libraries:** 
  * `ultralytics`
  * `opencv-python`
  * `fastapi`
  * `uvicorn`
  * `websockets`
  * `supabase-py`
  * `google-generativeai`
  * `python-dotenv`
  * `pydantic`

## 5. UI/UX 디자인 레퍼런스

* **레이아웃:**
  * **대시보드 스타일:** 화면을 크게 두 영역으로 분할. 좌측 또는 상단에 실시간 비디오 스트리밍 뷰, 우측 또는 하단에 실시간 로그 테이블 배치.
  * **참고:** 
    * Datadog Real-time Dashboards (https://www.datadoghq.com/product/dashboards/) - 실시간 데이터 시각화 및 로그 표시에 대한 아이디어 제공
    * Vercel Dashboard (https://vercel.com/dashboard) - 깔끔하고 현대적인 대시보드 레이아웃 참고

* **컴포넌트:**
  * **비디오 플레이어:** HTML5 `<video>` 태그 또는 React 비디오 라이브러리 사용. 위에 Canvas 등을 이용해 바운딩 박스 오버레이.
  * **테이블:** Material UI (MUI), Ant Design (AntD), 또는 Shadcn/ui 와 같은 React UI 라이브러리의 Table 컴포넌트 활용. 실시간 업데이트 시 애니메이션 효과(예: 새로운 행 하이라이트) 추가 고려.

* **색상 및 시각적 피드백:**
  * 전체적으로 깔끔하고 전문적인 느낌의 색상 팔레트 사용 (예: 다크 모드 또는 밝은 회색 톤).
  * 바운딩 박스 색상으로 상태 구분 (감지: 초록, 캡처/처리 완료: 파랑 또는 주황).
  * 로그 테이블에 새로운 행 추가 시 시각적 강조 효과.

* **애니메이션:**
  * 과도한 애니메이션은 지양하되, 실시간 업데이트(테이블 행 추가 등) 시 부드러운 전환 효과 적용.

## 6. 데이터베이스 스키마 (Supabase)

* **테이블명:** `container_logs`
* **컬럼:**
  * `id`: `uuid` (Primary Key, default: `gen_random_uuid()`)
  * `captured_at`: `timestamp with time zone` (default: `now()`)
  * `container_owner`: `text` (Not Null)
  * `container_number`: `text` (Not Null)
  * `source_video`: `text` (Optional, 처리된 비디오 파일명 또는 스트림 소스 식별자)
  * `cropped_image_ref`: `text` (Optional, 캡처된 이미지의 저장 경로 또는 식별자)

## 7. API 엔드포인트 (FastAPI)

* **WebSocket:**
  * `GET /ws/video`: 비디오 스트리밍 및 바운딩 박스 정보 전송용 WebSocket 엔드포인트.
  * `GET /ws/logs`: 새로운 컨테이너 로그 실시간 푸시용 WebSocket 엔드포인트.

* **(Optional) HTTP:**
  * `POST /start_processing`: 특정 비디오 파일 처리를 시작하는 엔드포인트 (WebSocket 연결 시 자동으로 시작하는 방식이 더 간단할 수 있음).
  * `GET /health`: 서버 상태 확인용 엔드포인트.

## 8. 주요 로직 상세 (Key Logic Details)

* **컨테이너 캡처 로직:** `object_detection.py`의 `ContainerCapture` 클래스 로직을 FastAPI 백엔드 내에서 상태를 유지하며 관리해야 함. 비디오 스트림 처리 세션별로 `ContainerCapture` 인스턴스를 생성하고 관리. 각 컨테이너의 ID 할당, 크기 변화 추적, 최대 크기 도달 후 감소 시점 감지, 캡처 플래그 관리 로직이 중요.

* **실시간 통신:** FastAPI의 WebSocket 지원을 활용하여, 비디오 처리 루프에서 생성된 프레임 데이터와 DB 저장 후 생성된 로그 데이터를 즉시 연결된 프론트엔드 클라이언트로 전송.

* **비동기 처리:** 영상 처리, 모델 추론, API 호출 등 잠재적으로 블로킹될 수 있는 작업은 FastAPI의 비동기(`async`/`await`) 기능을 최대한 활용하여 성능 저하 방지. 특히 Gemini API 호출은 비동기로 처리 필요.

## 9. 잠재적 고려사항 및 개선 제안

* **성능 최적화:**
  * 실시간 처리를 위해 프레임 스킵 또는 모델 추론 최적화(예: TensorRT 변환) 고려.
  * 프론트엔드로 전송하는 프레임 이미지 크기 및 품질 조절.

* **오류 처리:**
  * Gemini API 호출 실패, 타임아웃 등에 대한 재시도 또는 로깅 강화.
  * 모델 로드 실패, 비디오 파일 접근 오류 등 예외 상황 처리.
  * 컨테이너 번호 형식이 예상과 다를 경우 처리 방안 (로깅, 별도 표시 등).

* **확장성:** 
  * 현재는 시연용 단일 비디오 처리 중심이지만, 실제 환경에서는 다중 CCTV 스트림 처리, 분산 처리 등을 고려해야 할 수 있음.

* **보안:** 
  * API 키 및 데이터베이스 자격 증명 관리에 각별히 주의. 환경 변수 사용 필수.

* **사용성:** 
  * 시연 시 각 단계(감지, 캡처, OCR, 기록)가 명확히 보이도록 프론트엔드에 시각적 피드백 강화.

## 10. 구현 현황 및 문서화 상태

> **최종 수정일:** 2023-04-02

### 10.1. 세부 PRD 문서 작성 완료

프로젝트의 주요 기능별로 세부 PRD 문서가 작성되었습니다:

* **[PRD_VideoProcessing.md]** - 실시간 영상 처리 및 시각화 기능에 대한 상세 요구사항
* **[PRD_ContainerRecognition.md]** - 컨테이너 번호 인식 기능에 대한 상세 요구사항
* **[PRD_DataStorage.md]** - 데이터 자동 기록 및 저장 기능에 대한 상세 요구사항
* **[PRD_RealTimeComm.md]** - 실시간 통신 및 웹소켓 기능에 대한 상세 요구사항
* **[PRD_UserInterface.md]** - 사용자 인터페이스(UI/UX)에 대한 상세 요구사항

### 10.2. 디렉토리 구조

프로젝트의 디렉토리 구조는 현재 Next.js App Router를 기반으로 다음과 같이 구성되어 있습니다:

```
/
├── app/
│   ├── api/
│   │   └── video/
│   │       ├── route.ts          # 비디오 업로드 및 처리 API 엔드포인트
│   │       └── process_video.py  # 컨테이너 감지 및 추적 로직 구현
│   ├── video/
│   │   └── page.tsx              # 비디오 처리 대시보드 페이지
│   ├── about/
│   │   └── page.tsx              # 프로젝트 개요 페이지
│   ├── page.tsx                  # 메인 랜딩 페이지
│   └── layout.tsx                # 레이아웃 구성
│
├── components/
│   ├── ui/                       # 기본 UI 컴포넌트
│   │   ├── button.tsx            # 버튼 컴포넌트
│   │   ├── card.tsx              # 카드 컴포넌트
│   │   ├── shape-landing-hero.tsx # 랜딩 페이지 히어로 컴포넌트
│   │   └── shape-landing-demo.tsx # 히어로 컴포넌트 데모 래퍼
│   ├── dashboard/                # 대시보드 관련 컴포넌트
│   │   ├── Dashboard/            # 메인 대시보드 컴포넌트
│   │   ├── LogTable/             # 로그 테이블 컴포넌트
│   │   ├── StatusIndicator/      # 상태 표시 컴포넌트
│   │   ├── VideoPlayer/          # 비디오 플레이어 컴포넌트
│   │   └── VideoUpload/          # 비디오 업로드 컴포넌트
│   ├── Navbar.tsx                # 네비게이션 바 컴포넌트
│   └── common/                   # 공통 컴포넌트
│
├── public/
│   ├── images/                   # 이미지 파일
│   └── models/
│       └── WandaVisionYOLO.pt    # YOLOv8 모델 파일
│
├── uploads/
│   ├── videos/                   # 업로드된 비디오 저장 디렉토리
│   └── images/                   # 감지된 컨테이너 이미지 저장 디렉토리
│
├── lib/
│   └── utils.ts                  # 유틸리티 함수
│
├── venv/                         # Python 가상환경
│
└── Docs/
    └── PRDs/                     # 요구사항 명세서
        ├── PRD_Project.md         # 프로젝트 전체 PRD
        ├── PRD_VideoProcessing.md # 비디오 처리 세부 PRD
        ├── PRD_ContainerRecognition.md # 컨테이너 인식 세부 PRD
        ├── PRD_DataStorage.md     # 데이터 저장 세부 PRD
        ├── PRD_RealTimeComm.md    # 실시간 통신 세부 PRD
        └── PRD_UserInterface.md   # UI/UX 세부 PRD
```

### 10.3. 구현 현황

* **구현 완료:**
  * Next.js 애플리케이션 기본 구조 설정
  * 메인 랜딩 페이지 구현 (HeroGeometric 컴포넌트)
  * 대시보드 UI 레이아웃 구현 (실시간 영상 / 비디오 업로드 탭)
  * 비디오 업로드 컴포넌트 구현 (드래그 앤 드롭 + 파일 선택)
  * 비디오 처리 API 엔드포인트 구현
  * Python 객체 감지 및 컨테이너 추적 로직 구현
  * 가상환경 설정 및 필요한 Python 패키지 설치
  * 업로드 디렉토리 구조 설정
  * 네비게이션 바 구현

* **진행 중:**
  * WebSocket을 통한 실시간 비디오 스트리밍
  * 컨테이너 번호 인식 기능 구현
  * 로그 테이블 연동

* **다음 단계:**
  * Supabase 데이터베이스 연동
  * 실시간 로그 업데이트 구현
  * 컨테이너 번호 인식 결과 표시
  * 시스템 최적화 및 성능 개선
