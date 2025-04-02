# 실시간 영상 처리 및 시각화 요구사항 명세서
> **최종 수정일:** 2023-04-01

## 1. 개요 (Overview)

본 문서는 주차장 출입구 CCTV 영상에서 실시간으로 트럭 컨테이너를 감지하고 시각화하는 기능에 대한 요구사항을 정의합니다. YOLOv8 모델(`WandaVisionYOLO.pt`)을 활용하여 비디오 스트림에서 컨테이너를 감지하고, 웹 인터페이스를 통해 실시간으로 시각화하는 프로세스를 명세합니다.

## 2. 목표 (Goals)

* **실시간 객체 감지:** 비디오 스트림에서 YOLOv8 모델을 사용하여 컨테이너를 실시간으로 감지합니다.
* **트래킹 및 최적 시점 캡처:** 감지된 컨테이너를 프레임 간 추적하고, 최적의 캡처 시점을 식별합니다.
* **시각적 피드백:** 감지된 컨테이너에 바운딩 박스를 표시하고, 캡처 상태에 따라 시각적으로 구분합니다.
* **효율적인 처리:** 시스템 자원을 효율적으로 사용하여 실시간 성능을 보장합니다.

## 3. 기능 요구사항 (Functional Requirements)

### 3.1. 백엔드 영상 처리 (BE-1)

* **비디오 입력 처리:**
  * 시연용 비디오 파일 또는 실시간 CCTV 스트림 URL을 입력으로 받습니다.
  * OpenCV를 사용하여 프레임 단위로 비디오를 읽습니다.

* **객체 감지 모델 통합:**
  * `WandaVisionYOLO.pt` 모델을 백엔드에 로드합니다.
  * 각 프레임에서 'container' 클래스의 객체를 감지합니다.
  * 감지된 컨테이너의 바운딩 박스 좌표를 추출합니다.

* **컨테이너 추적 및 필터링:**
  * `ContainerCapture` 클래스를 사용하여 프레임 간 컨테이너를 추적합니다.
  * IoU(Intersection over Union) 기반 추적 알고리즘을 구현합니다.
  * 화면 크기 대비 최소 면적 비율(`min_area_ratio`, 예: 0.2) 조건을 충족하는 컨테이너만 추적합니다.

* **최적 시점 감지:**
  * 컨테이너의 바운딩 박스 크기 변화를 모니터링합니다.
  * 바운딩 박스가 최대 크기에 도달한 후 감소하기 시작하는 시점을 최적 캡처 시점으로 판단합니다.
  * 최적 시점에서 컨테이너 영역을 크롭하여 이미지로 저장합니다.

* **처리된 프레임 전송:**
  * 바운딩 박스 정보가 추가된 처리된 프레임을 WebSocket을 통해 프론트엔드로 전송합니다.

### 3.2. 프론트엔드 시각화 (FE-1)

* **실시간 스트리밍 뷰:**
  * WebSocket을 통해 수신된 프레임을 실시간으로 표시합니다.
  * 바운딩 박스를 프레임 위에 오버레이로 렌더링합니다.

* **시각적 피드백:**
  * 컨테이너 상태에 따라 다른 색상의 바운딩 박스를 표시합니다:
    * 일반 감지 상태: 초록색
    * 캡처 완료 상태: 빨간색 또는 파란색
  * 캡처 시도 중인 컨테이너에 대한 시각적 표시를 제공합니다.

## 4. 구현 상세 (Implementation Details)

### 4.1. `ContainerCapture` 클래스 구현

```python
class ContainerCapture:
    def __init__(self, min_area_ratio=0.2):
        self.containers = {}  # 추적 중인 컨테이너 정보 저장
        self.next_id = 0      # 고유 ID 할당용
        self.min_area_ratio = min_area_ratio  # 최소 면적 비율
        
    def update(self, frame, detections):
        """
        감지된 컨테이너 정보를 업데이트하고 캡처할 컨테이너를 결정
        
        Args:
            frame: 현재 비디오 프레임
            detections: YOLOv8 감지 결과
            
        Returns:
            capture_list: 캡처해야 할 컨테이너 목록
            updated_containers: 업데이트된 컨테이너 정보
        """
        # 구현 로직 (IoU 기반 추적, 크기 변화 감지 등)
        
        # 컨테이너 크기가 최대에 도달한 후 감소하기 시작하면 캡처
```

### 4.2. YOLOv8 모델 통합

```python
from ultralytics import YOLO

# 모델 로드
model = YOLO('WandaVisionYOLO.pt')

# 비디오 프레임에서 객체 감지
def process_frame(frame):
    results = model(frame)
    
    # 'container' 클래스에 해당하는 객체만 필터링
    container_detections = [
        det for det in results[0].boxes.data 
        if results[0].names[int(det[5])] == 'container'
    ]
    
    return container_detections
```

### 4.3. 비디오 처리 파이프라인

```python
import cv2
from fastapi import WebSocket
import asyncio
import base64

async def process_video_stream(video_source, websocket: WebSocket):
    """
    비디오 스트림을 처리하고 결과를 웹소켓으로 전송
    
    Args:
        video_source: 비디오 파일 경로 또는 CCTV URL
        websocket: 연결된 WebSocket 객체
    """
    cap = cv2.VideoCapture(video_source)
    container_capture = ContainerCapture()
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        # 객체 감지 수행
        detections = process_frame(frame)
        
        # 컨테이너 추적 및 캡처 로직 업데이트
        to_capture, container_info = container_capture.update(frame, detections)
        
        # 바운딩 박스 표시
        for container_id, info in container_info.items():
            x1, y1, x2, y2 = info['bbox']
            color = (0, 255, 0)  # 기본 초록색
            
            if info.get('captured', False):
                color = (0, 0, 255)  # 캡처된 경우 빨간색
                
            cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), color, 2)
            
        # 캡처할 컨테이너 처리
        for container_id in to_capture:
            info = container_info[container_id]
            x1, y1, x2, y2 = info['bbox']
            
            # 컨테이너 영역 크롭
            container_img = frame[int(y1):int(y2), int(x1):int(x2)]
            
            # 이미지 저장 또는 메모리에 보관
            # 크롭된 이미지는 컨테이너 번호 인식 모듈로 전달됨
            
        # 처리된 프레임을 WebSocket으로 전송
        _, buffer = cv2.imencode('.jpg', frame)
        encoded_frame = base64.b64encode(buffer).decode('utf-8')
        await websocket.send_json({
            'frame': encoded_frame,
            'container_info': container_info
        })
        
        # 프레임 속도 조절
        await asyncio.sleep(0.03)  # 약 30 FPS
        
    cap.release()
```

## 5. 성능 고려사항 (Performance Considerations)

* **프레임 처리 최적화:**
  * 필요 시 입력 해상도 조정 또는 프레임 스킵을 통한 성능 향상
  * GPU 가속 활용 (CUDA 지원 환경에서)

* **메모리 관리:**
  * 장시간 실행 시 메모리 누수 방지를 위한 주기적 자원 정리
  * 더 이상 추적되지 않는 컨테이너 객체 제거

* **전송 데이터 최적화:**
  * WebSocket으로 전송되는 이미지 품질과 크기 최적화
  * 필요한 정보만 포함하여 네트워크 부하 최소화

## 6. 테스트 계획 (Testing Plan)

* **단위 테스트:**
  * `ContainerCapture` 클래스의 추적 및 캡처 로직 테스트
  * 바운딩 박스 변환 및 렌더링 함수 테스트

* **통합 테스트:**
  * 다양한 비디오 입력에 대한 객체 감지 정확도 검증
  * WebSocket 통신을 통한 프레임 전송 성능 테스트

* **성능 테스트:**
  * 다양한 해상도에서의 프레임 처리 속도 측정
  * 장시간 실행 시 메모리 사용량 모니터링

## 7. 관련 코드 및 리소스

* **모델 파일:** `WandaVisionYOLO.pt`
* **참조 코드:** `object_detection.py`의 `ContainerCapture` 클래스 