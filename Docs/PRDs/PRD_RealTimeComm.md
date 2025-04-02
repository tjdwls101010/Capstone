# 실시간 통신 및 웹소켓 요구사항 명세서
> **최종 수정일:** 2023-04-01

## 1. 개요 (Overview)

본 문서는 주차장 출입구 CCTV 영상 처리 시스템에서 백엔드와 프론트엔드 간의 실시간 통신을 위한 WebSocket 기반 통신 아키텍처에 대한 요구사항을 정의합니다. 처리된 비디오 프레임과 감지된 컨테이너 정보, 그리고 데이터베이스에 기록된 로그를 실시간으로 프론트엔드에 전달하는 프로세스를 명세합니다.

## 2. 목표 (Goals)

* **효율적인 실시간 통신:** 백엔드에서 처리된 데이터를 최소한의 지연으로 프론트엔드에 전달합니다.
* **안정적인 연결 관리:** 네트워크 문제나 연결 끊김 시 자동 복구 메커니즘을 제공합니다.
* **확장성 있는 구조:** 다수의 클라이언트 연결을 효율적으로 처리할 수 있는 아키텍처를 구현합니다.
* **데이터 효율성:** 네트워크 대역폭을 고려하여 최적화된 데이터 전송 구조를 설계합니다.

## 3. 기능 요구사항 (Functional Requirements)

### 3.1. 실시간 비디오 스트리밍 (BE-4)

* **WebSocket 엔드포인트 (`/ws/video`):**
  * 클라이언트 연결 시 비디오 처리 파이프라인을 시작합니다.
  * 처리된 각 프레임(바운딩 박스 정보 포함)을 클라이언트에 전송합니다.
  * 성능을 위해 Base64 인코딩된 JPEG/PNG 형식으로 이미지 데이터를 전송합니다.
  * 바운딩 박스 좌표, 캡처 상태 등의 메타데이터를 함께 전송합니다.

* **연결 관리:**
  * 클라이언트 연결/연결 해제 이벤트를 적절히 처리합니다.
  * 활성 연결이 없을 때는 비디오 처리를 일시 중지하여 리소스를 절약합니다.
  * 다중 클라이언트 연결 시 효율적인 브로드캐스팅 메커니즘을 구현합니다.

* **이벤트 알림:**
  * 컨테이너 감지, 캡처 시도, OCR 요청 등의 주요 이벤트 발생 시 클라이언트에 알림을 전송합니다.
  * 시스템 상태 변경 시(예: 처리 시작/중지, 오류 발생) 적절한 알림을 제공합니다.

### 3.2. 실시간 로그 동기화 (`/ws/logs`)

* **WebSocket 엔드포인트 (`/ws/logs`):**
  * 클라이언트 연결 시 최근 로그 데이터를 초기에 전송합니다.
  * 새로운 컨테이너 로그가 데이터베이스에 저장될 때마다 연결된 모든 클라이언트에 해당 정보를 푸시합니다.
  * 로그 데이터는 타임스탬프, 컨테이너 소유자 코드(owner), 번호(number) 등을 포함합니다.

* **데이터 구독:**
  * Supabase의 실시간 구독 기능을 활용하여 데이터베이스 변경사항을 감지합니다.
  * 필터링된 변경사항만 클라이언트에 전달하여 불필요한 트래픽을 방지합니다.

* **페이지네이션 및 필터링:**
  * 대량의 로그 데이터에 대한 페이지 기반 로딩 지원합니다.
  * 클라이언트 요청에 따라 특정 기간 또는 특정 컨테이너 번호에 대한 필터링된 로그를 제공합니다.

## 4. 구현 상세 (Implementation Details)

### 4.1. WebSocket 연결 관리자

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import asyncio
import json

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.video_connections: List[WebSocket] = []
        self.log_connections: List[WebSocket] = []
        self.active_video_tasks: Dict[WebSocket, asyncio.Task] = {}
        
    async def connect_video(self, websocket: WebSocket):
        await websocket.accept()
        self.video_connections.append(websocket)
        
    async def connect_logs(self, websocket: WebSocket):
        await websocket.accept()
        self.log_connections.append(websocket)
        
    def disconnect_video(self, websocket: WebSocket):
        self.video_connections.remove(websocket)
        if websocket in self.active_video_tasks:
            self.active_video_tasks[websocket].cancel()
            del self.active_video_tasks[websocket]
            
    def disconnect_logs(self, websocket: WebSocket):
        self.log_connections.remove(websocket)
        
    async def send_video_frame(self, websocket: WebSocket, frame_data: Dict[str, Any]):
        try:
            await websocket.send_json(frame_data)
        except Exception:
            # 연결이 이미 닫혔거나 오류가 발생한 경우
            await self.disconnect_video(websocket)
            
    async def broadcast_video_frame(self, frame_data: Dict[str, Any]):
        for connection in self.video_connections:
            try:
                await connection.send_json(frame_data)
            except Exception:
                # 실패한 연결은 나중에 정리
                pass
                
    async def broadcast_log(self, log_data: Dict[str, Any]):
        for connection in self.log_connections:
            try:
                await connection.send_json({
                    "type": "new_log",
                    "data": log_data
                })
            except Exception:
                # 실패한 연결은 나중에 정리
                pass
                
    async def broadcast_event(self, event_type: str, event_data: Dict[str, Any] = None):
        """시스템 이벤트를 모든 연결된 클라이언트에 전달"""
        message = {
            "type": event_type,
            "data": event_data or {}
        }
        
        # 비디오 클라이언트에 전송
        for connection in self.video_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass
                
        # 로그 클라이언트에 전송
        for connection in self.log_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

# 연결 관리자 인스턴스
manager = ConnectionManager()
```

### 4.2. 비디오 스트리밍 WebSocket

```python
from ultralytics import YOLO
import cv2
import base64
import numpy as np
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
import time

# YOLOv8 모델 로드
model = YOLO('WandaVisionYOLO.pt')

@app.websocket("/ws/video")
async def websocket_video_endpoint(websocket: WebSocket):
    await manager.connect_video(websocket)
    
    # 비디오 처리 작업 시작
    video_task = asyncio.create_task(process_video_stream(websocket))
    manager.active_video_tasks[websocket] = video_task
    
    try:
        # 클라이언트로부터의 메시지 대기 (핑/퐁 또는 제어 명령)
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            
            # 클라이언트 제어 명령 처리 (선택사항)
            if data.get("command") == "pause":
                # 처리 일시 중지 로직
                pass
            elif data.get("command") == "resume":
                # 처리 재개 로직
                pass
    except WebSocketDisconnect:
        manager.disconnect_video(websocket)
    except Exception as e:
        print(f"Error in video WebSocket: {str(e)}")
        manager.disconnect_video(websocket)

async def process_video_stream(websocket: WebSocket):
    """비디오 스트림을 처리하고 프레임을 WebSocket으로 전송"""
    video_source = "path/to/video/file.mp4"  # 또는 CCTV URL
    
    # 비디오 캡처 객체 생성
    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        await manager.broadcast_event("error", {"message": "Failed to open video source"})
        return
        
    # 컨테이너 캡처 객체 초기화
    container_capture = ContainerCapture()
    
    # 이벤트 알림: 처리 시작
    await manager.broadcast_event("processing_started", {"source": video_source})
    
    frame_count = 0
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            frame_count += 1
            
            # 모든 프레임을 처리하지 않고 성능을 위해 스킵 (선택사항)
            if frame_count % 2 != 0:  # 2프레임마다 처리
                continue
                
            # 객체 감지 수행
            results = model(frame)
            
            # 컨테이너 감지 필터링
            containers = [
                box.data.cpu().numpy()[0] for box in results[0].boxes
                if results[0].names[int(box.cls[0])] == 'container'
            ]
            
            # 컨테이너 추적 및 캡처 로직 업데이트
            to_capture, containers_info = container_capture.update(frame, containers)
            
            # 프레임에 바운딩 박스 추가
            for container_id, info in containers_info.items():
                x1, y1, x2, y2 = info['bbox']
                # 캡처 상태에 따라 색상 결정
                color = (0, 255, 0)  # 기본 초록색
                if info.get('captured', False):
                    color = (0, 0, 255)  # 캡처 완료: 빨간색
                elif container_id in to_capture:
                    color = (255, 0, 0)  # 캡처 진행 중: 파란색
                    
                # 바운딩 박스 그리기
                cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
                
            # 캡처 대상 처리
            for container_id in to_capture:
                info = containers_info[container_id]
                
                # 이벤트 알림: 컨테이너 캡처 시도
                await manager.broadcast_event("container_capture", {"container_id": container_id})
                
                # 이미지 크롭 및 컨테이너 번호 인식 로직은 별도 비동기 함수로 처리
                asyncio.create_task(process_captured_container(frame, info))
                
            # 처리된 프레임을 WebSocket으로 전송
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            base64_frame = base64.b64encode(buffer).decode('utf-8')
            
            # 메타데이터와 함께 전송
            frame_data = {
                "type": "video_frame",
                "frame": base64_frame,
                "containers": containers_info,
                "timestamp": time.time()
            }
            
            # 연결된 모든 클라이언트에 브로드캐스트
            await manager.broadcast_video_frame(frame_data)
            
            # 처리 속도 제어 (CPU 사용량 감소)
            await asyncio.sleep(0.03)  # ~30 FPS
            
    except asyncio.CancelledError:
        # 작업이 취소된 경우 (클라이언트 연결 종료 등)
        pass
    except Exception as e:
        print(f"Error in video processing: {str(e)}")
        await manager.broadcast_event("error", {"message": str(e)})
    finally:
        cap.release()
        await manager.broadcast_event("processing_stopped")
```

### 4.3. 로그 WebSocket

```python
from fastapi import WebSocket, WebSocketDisconnect
import json
from typing import List, Dict

@app.websocket("/ws/logs")
async def websocket_logs_endpoint(websocket: WebSocket):
    await manager.connect_logs(websocket)
    
    try:
        # 초기 로그 데이터 전송
        recent_logs = get_recent_logs(limit=20)
        await websocket.send_json({
            "type": "initial_logs",
            "data": recent_logs
        })
        
        # Supabase 실시간 구독 설정 (선택사항)
        # supabase_client.table('container_logs').on('INSERT', handle_new_log).subscribe()
        
        # 클라이언트 연결 유지 및 메시지 처리
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)
            
            # 페이지네이션 요청 처리
            if data.get("action") == "fetch_more":
                page = data.get("page", 1)
                page_size = data.get("page_size", 20)
                additional_logs = get_paginated_logs(page=page, page_size=page_size)
                
                await websocket.send_json({
                    "type": "additional_logs",
                    "data": additional_logs,
                    "page": page
                })
                
            # 필터링 요청 처리
            elif data.get("action") == "filter":
                filters = data.get("filters", {})
                filtered_logs = filter_logs(filters)
                
                await websocket.send_json({
                    "type": "filtered_logs",
                    "data": filtered_logs,
                    "filters": filters
                })
    
    except WebSocketDisconnect:
        manager.disconnect_logs(websocket)
    except Exception as e:
        print(f"Error in logs WebSocket: {str(e)}")
        manager.disconnect_logs(websocket)

# 새 로그 알림 함수
async def handle_new_log(log_data):
    """새로운 로그 데이터를 모든 로그 WebSocket 클라이언트에 전송"""
    await manager.broadcast_log(log_data)
```

### 4.4. 데이터 구조 정의

```python
# WebSocket을 통해 전송되는 주요 메시지 형식

# 1. 비디오 프레임 메시지
video_frame_message = {
    "type": "video_frame",
    "frame": "base64_encoded_jpeg_image_data",
    "containers": {
        "container_id_1": {
            "bbox": [x1, y1, x2, y2],
            "confidence": 0.95,
            "captured": False
        },
        "container_id_2": {
            "bbox": [x1, y1, x2, y2],
            "confidence": 0.87,
            "captured": True
        }
    },
    "timestamp": 1648799400.123
}

# 2. 이벤트 알림 메시지
event_message = {
    "type": "event",
    "event_type": "container_capture",  # 또는 "processing_started", "error" 등
    "data": {
        "container_id": "container_id_1",
        # 이벤트 유형에 따른 추가 데이터
    },
    "timestamp": 1648799400.456
}

# 3. 로그 데이터 메시지
log_message = {
    "type": "new_log",
    "data": {
        "id": "uuid-string",
        "captured_at": "2023-04-01T12:34:56.789Z",
        "container_owner": "ABCD",
        "container_number": "123456",
        "source_video": "video1.mp4",
        "cropped_image_ref": "path/to/image.jpg"
    }
}

# 4. 초기 로그 데이터 메시지
initial_logs_message = {
    "type": "initial_logs",
    "data": [
        # 로그 객체 배열
        {
            "id": "uuid-string-1",
            "captured_at": "2023-04-01T12:34:56.789Z",
            "container_owner": "ABCD",
            "container_number": "123456",
            # 기타 필드
        },
        # ... 추가 로그 객체
    ],
    "total_count": 150  # 총 로그 수 (페이지네이션용)
}
```

## 5. 성능 고려사항 (Performance Considerations)

* **데이터 최적화:**
  * 이미지 압축률 조정을 통한 네트워크 부하 감소
  * 필요한 데이터만 선택적으로 전송하여 대역폭 절약

* **비동기 처리:**
  * 모든 I/O 작업은 비동기(`async`/`await`)로 구현하여 성능 최적화
  * 블로킹 작업(이미지 처리, DB 쿼리 등)은 별도 태스크로 분리

* **연결 관리:**
  * 연결 상태 주기적 확인 및 비활성 연결 정리 메커니즘 구현
  * 재연결 전략 및 연결 오류 처리 로직 마련

* **메모리 관리:**
  * 장시간 실행 시 메모리 누수 방지를 위한 리소스 정리
  * 대량의 프레임 데이터 처리 시 메모리 점유 최소화

## 6. 테스트 계획 (Testing Plan)

* **단위 테스트:**
  * WebSocket 엔드포인트의 연결 처리 및 메시지 전송 로직 테스트
  * 비디오 프레임 처리 및 인코딩 기능 테스트

* **통합 테스트:**
  * 클라이언트-서버 간 전체 통신 흐름 검증
  * 다양한 네트워크 조건에서의 동작 테스트

* **부하 테스트:**
  * 다수의 동시 클라이언트 연결 처리 성능 측정
  * 장시간 연속 운영 시 메모리 사용량 및 성능 저하 테스트

* **네트워크 오류 시나리오:**
  * 일시적 연결 끊김 및 재연결 상황에서의 동작 테스트
  * 서버 재시작 후 연결 복구 테스트

## 7. 관련 코드 및 리소스

* **라이브러리:** FastAPI, WebSockets, Supabase, asyncio, OpenCV
* **참조 코드:** WebSocket 관련 FastAPI 문서 및 예제 코드
* **클라이언트 구현:** Next.js의 WebSocket 클라이언트 구현 (별도 프론트엔드 PRD 참조)

## 8. 제한사항 및 고려사항

* **브라우저 호환성:**
  * 일부 오래된 브라우저에서의 WebSocket 지원 제한 고려
  * 필요 시 폴백 메커니즘(polling) 구현 검토

* **보안:**
  * WebSocket 연결의 인증 및 권한 관리 메커니즘 구현
  * 민감한 데이터 전송 시 암호화 고려

* **확장성:**
  * 대규모 사용자 지원을 위한 WebSocket 서버 클러스터링 방안 검토
  * 필요 시 로드 밸런싱 전략 수립 