# 사용자 인터페이스(UI/UX) 요구사항 명세서
> **최종 수정일:** 2023-04-01

## 1. 개요 (Overview)

본 문서는 주차장 출입구 CCTV 영상에서 감지된 컨테이너를 시각화하고 인식된 컨테이너 번호를 기록하는 웹 애플리케이션의 사용자 인터페이스(UI/UX) 요구사항을 정의합니다. 효과적인 정보 전달과 사용자 경험을 위한 프론트엔드 구현 가이드라인을 제시합니다.

## 2. 목표 (Goals)

* **직관적인 대시보드:** 실시간 영상과 감지 정보, 로그 기록을 한눈에 파악할 수 있는 대시보드를 제공합니다.
* **실시간 피드백:** 시스템 처리 과정 및 상태 변화를 시각적으로 명확하게 표시합니다.
* **반응형 디자인:** 다양한 화면 크기와 디바이스에서 일관된 사용자 경험을 제공합니다.
* **접근성 고려:** 다양한 사용자가 쉽게 이용할 수 있는 접근성 높은 인터페이스를 구현합니다.

## 3. 기능 요구사항 (Functional Requirements)

### 3.1. 대시보드 레이아웃 (FE-1, FE-2, FE-3)

* **화면 구성:**
  * 화면을 두 주요 영역으로 분할:
    * 좌측 또는 상단: 실시간 비디오 스트리밍 뷰
    * 우측 또는 하단: 실시간 로그 테이블 및 상태 정보
  * 반응형 레이아웃으로 다양한 화면 크기에 적응

* **네비게이션 및 컨트롤:**
  * 간결한 상단 헤더 또는 사이드바를 통한 내비게이션
  * 시스템 제어를 위한 직관적인 버튼 및 컨트롤 요소
  * 다크/라이트 모드 전환 옵션 (선택사항)

### 3.2. 실시간 비디오 뷰 (FE-1)

* **비디오 표시 영역:**
  * WebSocket을 통해 수신된 처리된 비디오 프레임을 표시
  * 적절한 크기와 비율로 비디오 렌더링
  * 전체 화면 모드 지원 (선택사항)

* **바운딩 박스 오버레이:**
  * 감지된 컨테이너에 바운딩 박스 표시
  * 컨테이너 상태에 따라 다른 색상 적용:
    * 일반 감지: 초록색
    * 캡처 진행 중: 파란색 또는 노란색
    * 캡처 완료: 빨간색
  * 바운딩 박스 주변에 신뢰도 점수 또는 상태 표시 (선택사항)

* **비디오 컨트롤:**
  * 필요 시 비디오 일시 정지/재개 버튼
  * 화면 캡처 또는 녹화 기능 (선택사항)

### 3.3. 실시간 로그 테이블 (FE-2)

* **테이블 구조:**
  * 최신 로그가 상단에 표시되는 실시간 업데이트 테이블
  * 주요 컬럼:
    * 시간 (Captured At)
    * 소유자 코드 (Owner)
    * 번호 (Number)
    * 상태 또는 추가 정보 (선택사항)

* **데이터 표시:**
  * 시간 형식: "YYYY-MM-DD HH:MM:SS" 또는 현지화된 형식
  * 새로운 로그 추가 시 시각적 강조 효과 (예: 임시 하이라이트)
  * 페이지네이션 또는 무한 스크롤 지원 (대량 데이터 처리)

* **필터 및 검색:**
  * 날짜 범위 필터링
  * 컨테이너 번호 또는 소유자 코드 검색
  * 필터 상태 표시 및 초기화 옵션

### 3.4. 상태 표시 영역 (FE-3)

* **현재 시스템 상태:**
  * 텍스트 및 아이콘을 통한 시스템 상태 표시:
    * "연결 중..."
    * "영상 처리 중"
    * "컨테이너 감지됨"
    * "번호 인식 중"
    * "로그 기록됨"
  * 상태 변경 시 자연스러운 전환 효과

* **알림 및 경고:**
  * 중요 이벤트 발생 시 알림 표시 (예: 토스트 메시지)
  * 오류 발생 시 명확한 오류 메시지 제공
  * 시스템 연결 상태 표시

## 4. 디자인 가이드라인 (Design Guidelines)

### 4.1. 색상 팔레트

```css
:root {
  /* 기본 색상 */
  --primary-color: #a3ff12;      /* 형광 초록 강조 색상 */
  --secondary-color: #c8ff32;    /* 보조 강조 색상 */
  --warning-color: #e2ff41;      /* 경고 색상 */
  --danger-color: #ff3b5c;       /* 오류/위험 색상 */
  
  /* 중립 색상 */
  --background-color: #262626;   /* 배경색 - 진한 회색 */
  --text-color: #f0f0f0;         /* 기본 텍스트 색상 - 밝은 회색 */
  --border-color: #5a5a5a;       /* 테두리 색상 - 중간 회색 */
  
  /* 상태 표시 색상 */
  --detected-color: #a3ff12;     /* 감지됨 (형광 초록) */
  --processing-color: #41e2bb;   /* 처리 중 (청록) */
  --captured-color: #ff3b5c;     /* 캡처됨 (빨강) */
  
  /* 다크 모드 */
  --dark-background: #171717;    /* 다크 모드 배경 - 매우 진한 회색 */
  --dark-text: #f0f0f0;          /* 다크 모드 텍스트 - 밝은 회색 */
}
```

### 4.2. 타이포그래피

```css
:root {
  /* 폰트 패밀리 */
  --font-primary: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  
  /* 폰트 크기 */
  --font-size-xs: 0.75rem;   /* 12px */
  --font-size-sm: 0.875rem;  /* 14px */
  --font-size-md: 1rem;      /* 16px */
  --font-size-lg: 1.125rem;  /* 18px */
  --font-size-xl: 1.25rem;   /* 20px */
  --font-size-2xl: 1.5rem;   /* 24px */
  
  /* 폰트 두께 */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-bold: 700;
}
```

### 4.3. 반응형 브레이크포인트

```css
/* 반응형 브레이크포인트 */
/* 모바일 우선 접근법 */

/* 스몰 디바이스 (가로 모드 폰, 576px 이상) */
@media (min-width: 576px) {
  /* 스몰 디바이스 스타일 */
}

/* 미디엄 디바이스 (태블릿, 768px 이상) */
@media (min-width: 768px) {
  /* 미디엄 디바이스 스타일 */
}

/* 라지 디바이스 (노트북, 992px 이상) */
@media (min-width: 992px) {
  /* 라지 디바이스 스타일 */
}

/* 엑스트라 라지 디바이스 (대형 노트북 및 데스크톱, 1200px 이상) */
@media (min-width: 1200px) {
  /* 엑스트라 라지 디바이스 스타일 */
}
```

## 5. 컴포넌트 명세 (Component Specifications)

### 5.1. 비디오 플레이어 컴포넌트

```jsx
// VideoPlayer.tsx
import React, { useEffect, useRef, useState } from 'react';
import styles from './VideoPlayer.module.css';

interface BoundingBox {
  bbox: [number, number, number, number];
  captured: boolean;
  confidence: number;
}

interface VideoPlayerProps {
  websocketUrl: string;
  width?: string | number;
  height?: string | number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  websocketUrl, 
  width = '100%', 
  height = 'auto'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containers, setContainers] = useState<Record<string, BoundingBox>>({});
  
  useEffect(() => {
    const socket = new WebSocket(websocketUrl);
    const ctx = canvasRef.current?.getContext('2d');
    const img = new Image();
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'video_frame') {
        // 이미지 업데이트
        img.onload = () => {
          if (!canvasRef.current || !ctx) return;
          
          // 캔버스 크기 조절
          canvasRef.current.width = img.width;
          canvasRef.current.height = img.height;
          
          // 이미지 그리기
          ctx.drawImage(img, 0, 0);
          
          // 바운딩 박스 그리기
          if (data.containers) {
            setContainers(data.containers);
            drawBoundingBoxes(ctx, data.containers);
          }
        };
        
        // Base64 이미지 로드
        img.src = `data:image/jpeg;base64,${data.frame}`;
      }
    };
    
    return () => {
      socket.close();
    };
  }, [websocketUrl]);
  
  const drawBoundingBoxes = (
    ctx: CanvasRenderingContext2D, 
    containers: Record<string, BoundingBox>
  ) => {
    // 각 컨테이너별 바운딩 박스 그리기
    Object.entries(containers).forEach(([id, info]) => {
      const [x1, y1, x2, y2] = info.bbox;
      
      // 상태에 따른 색상 설정
      let color = 'rgba(46, 204, 113, 0.8)'; // 기본 감지 색상
      if (info.captured) {
        color = 'rgba(231, 76, 60, 0.8)'; // 캡처 완료
      }
      
      // 바운딩 박스 그리기
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      
      // 신뢰도 점수 표시 (선택사항)
      if (info.confidence) {
        ctx.font = '14px Arial';
        ctx.fillStyle = color;
        ctx.fillText(
          `${Math.round(info.confidence * 100)}%`, 
          x1, y1 > 20 ? y1 - 5 : y1 + 20
        );
      }
    });
  };
  
  return (
    <div className={styles.videoPlayerContainer} style={{ width, height }}>
      <canvas ref={canvasRef} className={styles.videoCanvas} />
      {/* 추가 컨트롤 버튼 등 */}
    </div>
  );
};

export default VideoPlayer;
```

### 5.2. 로그 테이블 컴포넌트

```jsx
// LogTable.tsx
import React, { useEffect, useState } from 'react';
import styles from './LogTable.module.css';

interface ContainerLog {
  id: string;
  captured_at: string;
  container_owner: string;
  container_number: string;
  source_video?: string;
}

interface LogTableProps {
  websocketUrl: string;
  limit?: number;
}

const LogTable: React.FC<LogTableProps> = ({ websocketUrl, limit = 10 }) => {
  const [logs, setLogs] = useState<ContainerLog[]>([]);
  const [newLogId, setNewLogId] = useState<string | null>(null);
  
  useEffect(() => {
    const socket = new WebSocket(websocketUrl);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'initial_logs') {
        // 초기 로그 데이터 설정
        setLogs(data.data);
      } 
      else if (data.type === 'new_log') {
        // 새 로그 추가
        setLogs(prevLogs => {
          const updatedLogs = [data.data, ...prevLogs].slice(0, limit);
          return updatedLogs;
        });
        
        // 하이라이트 효과용 ID 설정
        setNewLogId(data.data.id);
        
        // 일정 시간 후 하이라이트 제거
        setTimeout(() => {
          setNewLogId(null);
        }, 3000);
      }
    };
    
    return () => {
      socket.close();
    };
  }, [websocketUrl, limit]);
  
  // 날짜 형식화 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className={styles.logTableContainer}>
      <h2 className={styles.tableTitle}>컨테이너 로그</h2>
      
      <table className={styles.logTable}>
        <thead>
          <tr>
            <th>시간</th>
            <th>소유자 코드</th>
            <th>번호</th>
            <th>소스</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={4} className={styles.emptyState}>
                로그 데이터가 없습니다.
              </td>
            </tr>
          ) : (
            logs.map(log => (
              <tr 
                key={log.id} 
                className={`${styles.logRow} ${log.id === newLogId ? styles.highlightRow : ''}`}
              >
                <td>{formatDate(log.captured_at)}</td>
                <td>{log.container_owner}</td>
                <td>{log.container_number}</td>
                <td>{log.source_video || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LogTable;
```

### 5.3. 상태 표시 컴포넌트

```jsx
// StatusIndicator.tsx
import React, { useEffect, useState } from 'react';
import styles from './StatusIndicator.module.css';

type SystemStatus = 
  | 'connecting' 
  | 'processing' 
  | 'container_detected' 
  | 'recognizing' 
  | 'logged' 
  | 'error' 
  | 'idle';

interface StatusIndicatorProps {
  websocketUrl: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ websocketUrl }) => {
  const [status, setStatus] = useState<SystemStatus>('connecting');
  const [message, setMessage] = useState<string>('서버에 연결 중...');
  
  useEffect(() => {
    const socket = new WebSocket(websocketUrl);
    
    socket.onopen = () => {
      setStatus('idle');
      setMessage('대기 중');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'event') {
        switch (data.event_type) {
          case 'processing_started':
            setStatus('processing');
            setMessage('영상 처리 중');
            break;
            
          case 'container_detect':
            setStatus('container_detected');
            setMessage('컨테이너 감지됨');
            break;
            
          case 'container_capture':
            setStatus('recognizing');
            setMessage('컨테이너 번호 인식 중');
            break;
            
          case 'new_log':
            setStatus('logged');
            setMessage('로그 기록됨');
            
            // 3초 후 처리 중 상태로 복귀
            setTimeout(() => {
              setStatus('processing');
              setMessage('영상 처리 중');
            }, 3000);
            break;
            
          case 'error':
            setStatus('error');
            setMessage(`오류: ${data.data.message || '알 수 없는 오류'}`);
            break;
            
          default:
            break;
        }
      }
    };
    
    socket.onclose = () => {
      setStatus('connecting');
      setMessage('연결이 끊겼습니다. 재연결 중...');
    };
    
    socket.onerror = () => {
      setStatus('error');
      setMessage('연결 오류가 발생했습니다.');
    };
    
    return () => {
      socket.close();
    };
  }, [websocketUrl]);
  
  return (
    <div className={`${styles.statusIndicator} ${styles[status]}`}>
      <div className={styles.statusIcon}></div>
      <div className={styles.statusMessage}>{message}</div>
    </div>
  );
};

export default StatusIndicator;
```

### 5.4. 메인 대시보드 페이지

```jsx
// pages/index.tsx
import React from 'react';
import VideoPlayer from '../components/VideoPlayer';
import LogTable from '../components/LogTable';
import StatusIndicator from '../components/StatusIndicator';
import styles from '../styles/Home.module.css';

const HomePage: React.FC = () => {
  // WebSocket URL은 환경 변수에서 가져오거나 설정
  const videoSocketUrl = process.env.NEXT_PUBLIC_VIDEO_SOCKET_URL || 'ws://localhost:8000/ws/video';
  const logsSocketUrl = process.env.NEXT_PUBLIC_LOGS_SOCKET_URL || 'ws://localhost:8000/ws/logs';
  
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>주차장 컨테이너 감지 및 기록 시스템</h1>
        <StatusIndicator websocketUrl={videoSocketUrl} />
      </header>
      
      <main className={styles.main}>
        <div className={styles.videoSection}>
          <VideoPlayer websocketUrl={videoSocketUrl} />
        </div>
        
        <div className={styles.logsSection}>
          <LogTable websocketUrl={logsSocketUrl} />
        </div>
      </main>
      
      <footer className={styles.footer}>
        <p>© 2023 컨테이너 감지 시스템</p>
      </footer>
    </div>
  );
};

export default HomePage;
```

## 6. 스타일 명세 (CSS Modules)

### 6.1. 비디오 플레이어 스타일

```css
/* VideoPlayer.module.css */
.videoPlayerContainer {
  position: relative;
  background-color: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.videoCanvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* 전체 화면 버튼 등 추가 컨트롤 스타일 */
.controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.videoPlayerContainer:hover .controls {
  opacity: 1;
}
```

### 6.2. 로그 테이블 스타일

```css
/* LogTable.module.css */
.logTableContainer {
  background-color: var(--background-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.tableTitle {
  padding: 16px;
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-medium);
  border-bottom: 1px solid var(--border-color);
}

.logTable {
  width: 100%;
  border-collapse: collapse;
}

.logTable th,
.logTable td {
  padding: 12px 16px;
  text-align: left;
}

.logTable th {
  background-color: rgba(0, 0, 0, 0.02);
  font-weight: var(--font-weight-medium);
  color: var(--text-color);
}

.logTable tr {
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.3s ease;
}

.logTable tr:last-child {
  border-bottom: none;
}

.logTable tr:hover {
  background-color: rgba(0, 0, 0, 0.02);
}

.highlightRow {
  animation: highlight 3s ease;
}

.emptyState {
  text-align: center;
  padding: 24px;
  color: rgba(0, 0, 0, 0.4);
}

@keyframes highlight {
  0% { background-color: rgba(52, 152, 219, 0.1); }
  70% { background-color: rgba(52, 152, 219, 0.1); }
  100% { background-color: transparent; }
}
```

### 6.3. 메인 페이지 레이아웃 스타일

```css
/* Home.module.css */
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0;
  margin: 0;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: var(--background-color);
  border-bottom: 1px solid var(--border-color);
}

.header h1 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-color);
}

.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 2rem;
  gap: 2rem;
}

.videoSection {
  width: 100%;
}

.logsSection {
  width: 100%;
}

.footer {
  padding: 1rem 2rem;
  border-top: 1px solid var(--border-color);
  text-align: center;
  font-size: var(--font-size-sm);
  color: rgba(0, 0, 0, 0.5);
}

/* 반응형 레이아웃 */
@media (min-width: 992px) {
  .main {
    flex-direction: row;
  }
  
  .videoSection {
    width: 65%;
  }
  
  .logsSection {
    width: 35%;
  }
}
```

## 7. 구현 현황

### 7.1. 네비게이션 바 업데이트 (2023-04-02)
- 상단 네비게이션 바에 '홈', '프로젝트 개요', '비디오처리' 세 개의 메뉴 구현
- 네비게이션 바를 fixed 포지션으로 설정하여 스크롤 시에도 상단에 고정되도록 구현
- 메인 콘텐츠에 적절한 상단 패딩 추가하여 네비게이션 바와 겹치지 않도록 조정

### 7.2. 디자인 일관성 작업 (2023-04-02)
- 메인 페이지의 디자인 컬러 스키마를 전체 웹사이트에 적용
- 비디오 처리 페이지와 프로젝트 개요 페이지에 통일된 스타일 적용
  - 페이지 헤더에 Badge 컴포넌트 추가
  - 주요 텍스트에 primary 컬러 강조
  - 애니메이션 효과 추가 (framer-motion 활용)
- 아이콘에 primary 컬러 적용하여 시각적 일관성 확보
- 그라데이션 배경과 테두리 스타일 통일

### 7.3. CSS 수정 및 네비게이션 바 개선 (2023-04-02)
- CSS 오류 수정: 미디어 쿼리 블록의 유효하지 않은 플레이스홀더(`...`) 제거
- 네비게이션 바를 클라이언트 컴포넌트로 변환하여 현재 페이지 하이라이트 기능 추가
- 네비게이션 바에 반투명 배경과 블러 효과 적용으로 모던한 디자인 구현
- primary 색상(#a3ff12)을 활용한 강조 요소 일관성 있게 적용
- 로고 이미지에 primary 색상 테두리 추가

### 7.4. 페이지 스타일 통일 작업 (2023-04-02)
- 모든 페이지에 일관된 색상 테마와 스타일 가이드 적용
- About 페이지에 메인 페이지와 동일한 그라데이션 배경 적용
- 비디오 처리 페이지에 부드러운 배경 효과 추가
- Card 및 Button 컴포넌트에 hover 효과 개선 및 primary 색상 강조
- TabsList 및 TabsTrigger 컴포넌트의 active 상태에 primary 색상 적용

### 7.5. 디렉토리 구조
```
app/
├── about/
│   └── page.tsx          # 프로젝트 개요 페이지
├── video/
│   └── page.tsx          # 비디오 처리 페이지
├── page.tsx              # 메인 페이지
├── globals.css           # 전역 CSS 설정
└── layout.tsx            # 루트 레이아웃 (네비게이션 바 포함)
components/
├── Navbar.tsx            # 네비게이션 바 컴포넌트
├── dashboard/            # 대시보드 관련 컴포넌트
└── ui/                   # UI 컴포넌트
```

## 8. 테스트 계획 (Testing Plan)

* **유닛 테스트:**
  * 개별 컴포넌트의 렌더링 및 기본 기능 테스트
  * 프롭스 변경에 따른 컴포넌트 동작 검증

* **통합 테스트:**
  * WebSocket 연동 및 데이터 표시 검증
  * 여러 컴포넌트 간 상호작용 테스트

* **브라우저 호환성 테스트:**
  * 다양한 브라우저(Chrome, Firefox, Safari, Edge)에서의 동작 검증
  * 반응형 디자인 테스트

* **접근성 테스트:**
  * 스크린 리더 호환성 검사
  * 키보드 내비게이션 테스트
  * WCAG 2.1 가이드라인 준수 여부 확인

## 9. 관련 자원 및 참고자료

* **UI 컴포넌트 라이브러리 옵션:**
  * Material UI (MUI): https://mui.com/
  * Ant Design (AntD): https://ant.design/
  * Shadcn/ui: https://ui.shadcn.com/
  * Tailwind UI: https://tailwindui.com/

* **아이콘 및 시각 자료:**
  * Heroicons: https://heroicons.com/
  * Font Awesome: https://fontawesome.com/
  * Material Design Icons: https://materialdesignicons.com/

* **차트 및 시각화 라이브러리 (선택사항):**
  * Chart.js: https://www.chartjs.org/
  * D3.js: https://d3js.org/
  * Recharts: https://recharts.org/ 

## 10. 구현 현황 (Implementation Status)

> **최종 업데이트:** 2023-04-02

### 10.1. 구현된 기능

* **[✅] 대시보드 레이아웃 (FE-1, FE-2, FE-3):**
  * 반응형 레이아웃 구현 (모바일, 태블릿, 데스크톱)
  * 헤더, 메인 콘텐츠, 푸터 구조 적용

* **[✅] 실시간 비디오 뷰 (FE-1):**
  * Canvas 기반 비디오 프레임 표시
  * 바운딩 박스 오버레이 지원
  * 컨테이너 상태에 따른 색상 차별화
  * 연결 상태 표시

* **[✅] 실시간 로그 테이블 (FE-2):**
  * 최신 로그가 상단에 표시되는 테이블
  * 페이지네이션 구현
  * 새 로그 추가 시 하이라이트 효과
  * 시간, 소유자 코드, 번호, 소스 정보 표시

* **[✅] 상태 표시 영역 (FE-3):**
  * 현재 시스템 상태 시각적 표시
  * 상태별 색상 및 애니메이션 차별화
  * 연결, 처리, 감지, 인식, 로깅 상태 지원

### 10.2. 디렉토리 구조

```
/components
├── ui/                           # shadcn UI 기본 컴포넌트
│   ├── card.tsx
│   ├── table.tsx 
│   ├── pagination.tsx
│   └── button.tsx
└── dashboard/                    # 대시보드 컴포넌트
    ├── Dashboard/                # 메인 대시보드 컴포넌트
    │   └── index.tsx
    ├── VideoPlayer/              # 비디오 플레이어 컴포넌트
    │   └── index.tsx
    ├── LogTable/                 # 로그 테이블 컴포넌트 
    │   └── index.tsx
    └── StatusIndicator/          # 상태 표시 컴포넌트
        └── index.tsx
```

### 10.3. 사용된 기술

* **프레임워크:** Next.js 15.2.4
* **스타일링:** Tailwind CSS 4.x
* **UI 컴포넌트:** shadcn/ui
* **상태 관리:** React Hooks (useState, useEffect, usePathname)
* **실시간 처리:** WebSocket 모의 기능 구현
* **애니메이션:** Framer Motion, CSS 애니메이션 + Tailwind 확장
* **이미지 처리:** Next.js Image 컴포넌트
* **클라이언트/서버 컴포넌트:** Next.js App Router 아키텍처 적용
* **색상 테마:** CSS 변수 기반의 일관된 색상 팔레트
* **아이콘:** Lucide React 아이콘 라이브러리

### 10.4. 다음 단계 계획

* **백엔드 연동:**
  * 실제 WebSocket 연결 활성화
  * 실시간 데이터 통신 구현

* **기능 최적화:**
  * 비디오 프레임 처리 성능 향상
  * 대량 로그 처리시 페이지네이션 최적화

* **사용자 경험 개선:**
  * 다크 모드 전환 기능 추가
  * 로그 필터링 및 검색 기능 추가
  * 설정 페이지 구현

* **접근성 개선:**
  * 스크린 리더 호환성 테스트 및 개선
  * 키보드 내비게이션 지원 확대 