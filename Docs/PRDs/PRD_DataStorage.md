# 데이터 자동 기록 및 저장 요구사항 명세서
> **최종 수정일:** 2023-04-01

## 1. 개요 (Overview)

본 문서는 주차장 출입구 CCTV 영상에서 감지 및 인식된 컨테이너 번호 데이터를 Supabase 데이터베이스에 자동으로 기록하고 관리하는 기능에 대한 요구사항을 정의합니다. 컨테이너 번호 인식 모듈에서 추출된 정보를 구조화된 형태로 저장하고 웹 인터페이스를 통해 조회할 수 있는 프로세스를 명세합니다.

## 2. 목표 (Goals)

* **실시간 데이터 저장:** 인식된 컨테이너 번호 정보를 실시간으로 데이터베이스에 저장합니다.
* **안정적인 데이터 관리:** 네트워크 문제나 서버 장애 시에도 데이터 손실을 최소화합니다.
* **효율적인 데이터 검색:** 저장된 데이터를 다양한 기준으로 빠르게 검색하고 필터링할 수 있습니다.
* **데이터 무결성 유지:** 중복 데이터 방지 및 데이터 일관성을 보장합니다.

## 3. 기능 요구사항 (Functional Requirements)

### 3.1. 데이터베이스 연동 (BE-3)

* **Supabase 연결 관리:**
  * Supabase 클라이언트 라이브러리를 사용하여 데이터베이스 연결을 설정합니다.
  * 연결 정보(URL, API 키)를 환경 변수로 안전하게 관리합니다.
  * 연결 실패 시 자동 재연결 메커니즘을 구현합니다.

* **데이터 저장 로직:**
  * 인식된 컨테이너 번호(owner, number), 캡처 시점 타임스탬프를 데이터베이스에 저장합니다.
  * 추가 메타데이터(원본 영상 소스, 캡처된 이미지 참조 등)도 함께 저장합니다.
  * 저장 실패 시 로컬 캐시에 임시 저장 후 재시도 메커니즘을 구현합니다.

* **데이터 검증:**
  * 저장 전 데이터 형식 및 유효성을 검증합니다.
  * 필수 필드(타임스탬프, owner, number) 누락 시 적절한 오류 처리를 수행합니다.

* **중복 데이터 방지:**
  * 동일 컨테이너의 단시간 내 반복 인식을 필터링하는 로직을 구현합니다.
  * 특정 시간 창(예: 5분) 내 동일한 컨테이너 번호가 감지될 경우 중복으로 처리합니다.

### 3.2. 실시간 데이터 동기화

* **이벤트 기반 알림:**
  * 새로운 데이터가 저장될 때마다 WebSocket을 통해 프론트엔드에 알림을 전송합니다.
  * 저장 실패 시 적절한 오류 메시지를 전송합니다.

* **데이터 변경사항 추적:**
  * Supabase의 실시간 구독 기능을 활용하여 데이터베이스 변경사항을 추적합니다.
  * 새로운 로그 추가 시 자동으로 프론트엔드에 반영됩니다.

## 4. 구현 상세 (Implementation Details)

### 4.1. Supabase 클라이언트 설정

```python
from supabase import create_client
import os
from dotenv import load_dotenv
from fastapi import HTTPException

# 환경 변수 로드
load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Supabase 클라이언트 초기화
def get_supabase_client():
    """
    Supabase 클라이언트 인스턴스를 반환
    """
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Supabase URL or API key not found in environment variables")
            
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        return client
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize Supabase client: {str(e)}")
```

### 4.2. 컨테이너 로그 저장 함수

```python
from datetime import datetime
from typing import Optional, Dict, Any

async def save_container_log(
    owner: str,
    number: str,
    source_video: Optional[str] = None,
    cropped_image_ref: Optional[str] = None
) -> Dict[str, Any]:
    """
    인식된 컨테이너 번호를 데이터베이스에 저장
    
    Args:
        owner: 컨테이너 소유자 코드 (4글자)
        number: 컨테이너 번호 (6자리)
        source_video: 원본 비디오 소스 (선택사항)
        cropped_image_ref: 캡처된 이미지 참조 (선택사항)
        
    Returns:
        저장된 레코드 정보
    """
    try:
        supabase = get_supabase_client()
        
        # 데이터 검증
        if not owner or not number:
            raise ValueError("Container owner and number are required")
            
        # 중복 체크 (최근 5분 이내 동일 컨테이너)
        time_threshold = datetime.now().isoformat()
        
        existing_records = supabase.table("container_logs") \
            .select("*") \
            .eq("container_owner", owner) \
            .eq("container_number", number) \
            .gte("captured_at", time_threshold) \
            .execute()
            
        if existing_records.data:
            return {"status": "skipped", "message": "Duplicate record", "data": existing_records.data[0]}
            
        # 새 레코드 저장
        new_record = {
            "container_owner": owner,
            "container_number": number,
            "captured_at": datetime.now().isoformat(),
            "source_video": source_video,
            "cropped_image_ref": cropped_image_ref
        }
        
        result = supabase.table("container_logs").insert(new_record).execute()
        
        return {"status": "success", "data": result.data[0]}
        
    except ValueError as ve:
        return {"status": "error", "message": str(ve)}
    except Exception as e:
        return {"status": "error", "message": f"Failed to save container log: {str(e)}"}
```

### 4.3. WebSocket 알림 기능

```python
from fastapi import WebSocket, WebSocketDisconnect
import json
from typing import List, Dict

# 연결된 WebSocket 클라이언트 관리
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        
    async def broadcast(self, message: Dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass  # 실패한 연결은 무시

# WebSocket 연결 관리자 인스턴스
manager = ConnectionManager()

# 로그 WebSocket 엔드포인트
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        # 최근 로그 데이터 전송
        recent_logs = get_recent_logs(limit=10)
        await websocket.send_json({
            "type": "initial_data",
            "logs": recent_logs
        })
        
        # 클라이언트 연결 유지 및 메시지 대기
        while True:
            await websocket.receive_text()  # 클라이언트로부터 메시지를 기다림 (핑/퐁)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# 새 로그 저장 후 모든 클라이언트에 알림
async def notify_new_log(log_data):
    await manager.broadcast({
        "type": "new_log",
        "log": log_data
    })
```

### 4.4. 데이터베이스 스키마

```sql
-- container_logs 테이블
CREATE TABLE container_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    container_owner TEXT NOT NULL,
    container_number TEXT NOT NULL,
    source_video TEXT,
    cropped_image_ref TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 인덱스 (조회 성능 최적화)
CREATE INDEX idx_container_logs_owner_number ON container_logs(container_owner, container_number);
CREATE INDEX idx_container_logs_captured_at ON container_logs(captured_at DESC);

-- 중복 체크를 위한 고유 제약조건 (선택사항)
-- ALTER TABLE container_logs ADD CONSTRAINT unique_container_time 
--    UNIQUE (container_owner, container_number, date_trunc('minute', captured_at));
```

## 5. 성능 고려사항 (Performance Considerations)

* **데이터베이스 연결 최적화:**
  * 연결 풀링을 통한 효율적인 리소스 관리
  * 장기 실행 연결 대신 필요 시 연결 생성/해제 전략 사용

* **배치 처리:**
  * 높은 처리량 시나리오에서 개별 삽입 대신 배치 삽입 고려
  * 주기적인 일괄 처리를 통한 데이터베이스 부하 분산

* **인덱싱 전략:**
  * 검색 패턴에 최적화된 인덱스 구성
  * 불필요한 인덱스 제거로 삽입 성능 향상

* **데이터 보존 정책:**
  * 오래된 로그 데이터 처리를 위한 보존 정책 설정
  * 필요 시 자동 아카이빙 또는 삭제 메커니즘 구현

## 6. 테스트 계획 (Testing Plan)

* **단위 테스트:**
  * `save_container_log` 함수의 정상 동작 및 오류 처리 검증
  * 중복 데이터 필터링 로직 테스트

* **통합 테스트:**
  * 실제 Supabase 데이터베이스와의 연동 테스트
  * WebSocket 알림 메커니즘 테스트

* **부하 테스트:**
  * 다량의 동시 저장 요청 처리 성능 측정
  * 장시간 연속 운영 시 안정성 검증

* **장애 복구 테스트:**
  * 네트워크 연결 끊김 시나리오에서의 동작 테스트
  * 데이터베이스 연결 실패 시 복구 메커니즘 검증

## 7. 관련 코드 및 리소스

* **데이터베이스:** Supabase (PostgreSQL)
* **라이브러리:** `supabase-py`, `fastapi`, `websockets`
* **환경 변수:** `SUPABASE_URL`, `SUPABASE_KEY`

## 8. 제한사항 및 고려사항

* **데이터 보안:**
  * 민감한 데이터 접근 제어 방안 마련
  * API 키 및 접속 정보 보호

* **확장성:**
  * 데이터 증가에 따른 쿼리 성능 저하 대비책 마련
  * 장기적으로 샤딩 또는 파티셔닝 전략 고려

* **백업 및 복구:**
  * 정기적인 데이터 백업 메커니즘 구현
  * 데이터 손실 시 복구 전략 수립 