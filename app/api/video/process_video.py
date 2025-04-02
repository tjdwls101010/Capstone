#!/usr/bin/env python3
import os
import sys
import cv2
import numpy as np
import json
import time
from datetime import timedelta
import re
from pathlib import Path
from PIL import Image
from ultralytics import YOLO
from pydantic import BaseModel, Field, validator

# 인자 검증
if len(sys.argv) < 4:
    print("사용법: python process_video.py <비디오_경로> <모델_경로> <출력_디렉토리>")
    sys.exit(1)

# 인자 가져오기
video_path = sys.argv[1]
model_path = sys.argv[2]
output_dir = sys.argv[3]

# 출력 디렉토리 확인 및 생성
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

# 로그 파일 설정
log_file = os.path.join(output_dir, os.path.basename(video_path) + "_log.json")

# Container Number Pydantic model
class ContainerNumber(BaseModel):
    owner: str = Field(..., description="Container owner code (4 uppercase letters)")
    number: str = Field(..., description="Container number (6 digits)")
    
    @validator('owner')
    def validate_owner(cls, v):
        if not re.match(r'^[A-Z]{4}$', v):
            raise ValueError('Owner code must be 4 uppercase letters')
        return v
    
    @validator('number')
    def validate_number(cls, v):
        if not re.match(r'^\d{6}$', v):
            raise ValueError('Container number must be 6 digits')
        return v
    
    @classmethod
    def parse(cls, container_code: str):
        """Parse a container code string into owner and number components"""
        if not container_code or container_code in ["UNKNOWN", "ERROR"]:
            return None
            
        # Try to parse the container code (format: "XXXX 123456")
        match = re.match(r'^([A-Z]{4})\s+(\d{6})$', container_code.strip())
        if match:
            return cls(owner=match.group(1), number=match.group(2))
        return None
    
    def __str__(self):
        return f"{self.owner} {self.number}"
    
    def dict(self):
        return {
            "owner": self.owner,
            "number": self.number
        }

# 바운딩 박스 크기 변화 감지 및 최대 크기 시점에 캡처하는 클래스
class ContainerCapture:
    def __init__(self, min_area_ratio=0.2):
        # 이미 캡쳐한 컨테이너 목록 (중복 방지)
        self.captured_containers = set()
        # 각 컨테이너 ID 별 바운딩 박스 크기 변화 기록
        self.container_sizes = {}
        # 캡처를 위한 최소 면적 비율 (화면 대비)
        self.min_area_ratio = min_area_ratio
        # 컨테이너 ID 부여를 위한 카운터
        self.next_id = 0
        # IoU 임계값
        self.iou_threshold = 0.6
        # 각 컨테이너 정보 저장
        self.containers = {}
        # 추적 내역 보존 프레임 수
        self.max_age = 10
    
    def iou(self, bbox1, bbox2):
        """두 바운딩 박스 간의 IoU(Intersection over Union) 계산"""
        x1_1, y1_1, x2_1, y2_1 = bbox1
        x1_2, y1_2, x2_2, y2_2 = bbox2
        
        # 교차 영역 계산
        x1_i = max(x1_1, x1_2)
        y1_i = max(y1_1, y1_2)
        x2_i = min(x2_1, x2_2)
        y2_i = min(y2_1, y2_2)
        
        if x2_i < x1_i or y2_i < y1_i:
            return 0.0  # 교차하지 않음
        
        intersection = (x2_i - x1_i) * (y2_i - y1_i)
        bbox1_area = (x2_1 - x1_1) * (y2_1 - y1_1)
        bbox2_area = (x2_2 - x1_2) * (y2_2 - y1_2)
        union = bbox1_area + bbox2_area - intersection
        
        return intersection / union if union > 0 else 0.0
    
    def update(self, detections, frame, frame_count, fps):
        """현재 프레임의 감지 결과로 업데이트하고 캡처할 컨테이너 반환"""
        frame_height, frame_width, _ = frame.shape
        frame_area = frame_height * frame_width
        
        # 각 컨테이너의 수명 증가
        for container_id in list(self.containers.keys()):
            self.containers[container_id]['age'] += 1
            if self.containers[container_id]['age'] > self.max_age:
                # 추적 내역에서 제거
                del self.containers[container_id]
                if container_id in self.container_sizes:
                    del self.container_sizes[container_id]
        
        # 할당된 감지 목록
        assigned_detections = set()
        
        # 현재 추적 중인 컨테이너와 새 감지 결과 매칭
        for container_id in list(self.containers.keys()):
            best_iou = self.iou_threshold
            best_detection_idx = -1
            
            for i, (bbox, conf, cls) in enumerate(detections):
                if i in assigned_detections:
                    continue
                
                iou = self.iou(self.containers[container_id]['bbox'], bbox)
                if iou > best_iou:
                    best_iou = iou
                    best_detection_idx = i
            
            # 매칭된 컨테이너 업데이트
            if best_detection_idx >= 0:
                bbox, conf, cls = detections[best_detection_idx]
                old_area = self.containers[container_id]['area']
                
                # 새 바운딩 박스 면적 계산
                x1, y1, x2, y2 = bbox
                new_area = (x2 - x1) * (y2 - y1)
                area_ratio = new_area / frame_area
                
                # 컨테이너 정보 업데이트
                self.containers[container_id].update({
                    'bbox': bbox,
                    'conf': conf,
                    'age': 0,
                    'area': new_area,
                    'area_ratio': area_ratio
                })
                
                # 컨테이너 크기 변화 기록
                if container_id not in self.container_sizes:
                    self.container_sizes[container_id] = {'areas': [new_area], 'frames': [frame_count], 'max_area': new_area, 'max_frame': frame_count, 'is_growing': True, 'captured': False}
                else:
                    self.container_sizes[container_id]['areas'].append(new_area)
                    self.container_sizes[container_id]['frames'].append(frame_count)
                    
                    # 크기가 이전보다 커졌는지 확인
                    if new_area > self.container_sizes[container_id]['max_area']:
                        self.container_sizes[container_id]['max_area'] = new_area
                        self.container_sizes[container_id]['max_frame'] = frame_count
                        self.container_sizes[container_id]['is_growing'] = True
                    
                    # 크기가 감소하기 시작했는지 확인 (이전에 증가 중이었고, 이제 감소한 경우)
                    elif self.container_sizes[container_id]['is_growing'] and new_area < old_area:
                        self.container_sizes[container_id]['is_growing'] = False
                
                assigned_detections.add(best_detection_idx)
        
        # 할당되지 않은 감지 결과는 새 컨테이너로 추가
        for i, (bbox, conf, cls) in enumerate(detections):
            if i not in assigned_detections:
                x1, y1, x2, y2 = bbox
                area = (x2 - x1) * (y2 - y1)
                area_ratio = area / frame_area
                
                # 면적 비율이 최소 요구사항 이상인 경우만 추적
                if area_ratio >= self.min_area_ratio:
                    container_id = self.next_id
                    self.next_id += 1
                    
                    # 새 컨테이너 추가
                    self.containers[container_id] = {
                        'bbox': bbox,
                        'conf': conf,
                        'age': 0,
                        'area': area,
                        'area_ratio': area_ratio
                    }
                    
                    # 크기 변화 기록 초기화
                    self.container_sizes[container_id] = {
                        'areas': [area],
                        'frames': [frame_count],
                        'max_area': area,
                        'max_frame': frame_count,
                        'is_growing': True,
                        'captured': False
                    }
        
        # 캡처할 컨테이너 찾기 (크기가 감소하기 시작했고, 아직 캡처하지 않은 컨테이너)
        containers_to_capture = []
        
        for container_id, size_info in self.container_sizes.items():
            # 감소하기 시작했고, 아직 캡처하지 않았으며, 면적 비율이 충분히 큰 경우
            if (not size_info['is_growing'] and 
                not size_info['captured'] and 
                container_id in self.containers and
                self.containers[container_id]['area_ratio'] >= self.min_area_ratio and
                container_id not in self.captured_containers):
                
                # 캡처할 컨테이너 정보 추가
                containers_to_capture.append({
                    'id': container_id,
                    'bbox': self.containers[container_id]['bbox'],
                    'conf': self.containers[container_id]['conf'],
                    'area_ratio': self.containers[container_id]['area_ratio'],
                    'frame': frame.copy(),
                    'frame_time': frame_count / fps
                })
                
                # 캡처 완료 표시
                size_info['captured'] = True
                self.captured_containers.add(container_id)
        
        return containers_to_capture, self.containers

def main():
    # 모델 로드
    print(f"모델 로드 중: {model_path}")
    model = YOLO(model_path)
    
    # 모델 클래스 정보 출력
    class_names = model.names
    print("모델 클래스 정보:", class_names)
    
    # 비디오 캡처 객체 생성
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"비디오를 열 수 없습니다: {video_path}")
        sys.exit(1)
    
    # 비디오 FPS 및 크기 가져오기
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"비디오 FPS: {fps}, 크기: {width}x{height}")
    
    # 컨테이너 캡처 객체 초기화 (화면의 20% 이상일 때만 추적)
    container_capture = ContainerCapture(min_area_ratio=0.2)
    
    # 로그 데이터 초기화
    logs = []
    
    # 비디오 재생 및 객체 감지
    frame_count = 0
    
    # 임시 디스플레이 설정 (지울 예정)
    # cv2.namedWindow('Container Detection', cv2.WINDOW_NORMAL)
    # cv2.resizeWindow('Container Detection', width // 2, height // 2)
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_count += 1
        
        # 현재 프레임의 시간 계산 (비디오 시작부터 경과 시간)
        current_time_seconds = frame_count / fps
        current_time = str(timedelta(seconds=int(current_time_seconds)))
        
        # 100번째 프레임마다 처리 상태 출력
        if frame_count % 100 == 0:
            print(f"처리 중... 프레임: {frame_count}, 시간: {current_time}")
        
        # YOLO 모델로 객체 감지
        try:
            results = model.predict(frame, stream=False)
            
            # 결과가 있는 경우 처리
            if len(results) > 0:
                result = results[0]  # 첫 번째 결과만 사용
                
                # 결과를 표시할 프레임 복사
                display_frame = frame.copy()
                
                # 감지 결과 수집
                detections = []
                
                if result.boxes is not None and len(result.boxes) > 0:
                    
                    for box in result.boxes:
                        cls = int(box.cls[0])
                        class_name = result.names[cls]
                        conf = float(box.conf[0])
                        
                        # 바운딩 박스 좌표 추출
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        
                        # 컨테이너 클래스만 추적
                        if class_name.lower() == 'container':
                            detections.append(([x1, y1, x2, y2], conf, cls))
                    
                    # 캡처 객체 업데이트 및 캡처할 컨테이너 가져오기
                    containers_to_capture, active_containers = container_capture.update(detections, frame, frame_count, fps)
                    
                    # 캡처할 컨테이너가 있으면 처리
                    for container_info in containers_to_capture:
                        container_id = container_info['id']
                        bbox = container_info['bbox']
                        conf = container_info['conf']
                        container_frame = container_info['frame']
                        frame_time = container_info['frame_time']
                        
                        # 크롭된 이미지 생성
                        x1, y1, x2, y2 = bbox
                        container_image = container_frame[y1:y2, x1:x2]
                        
                        # 이미지 파일 이름 생성
                        base_filename = os.path.splitext(os.path.basename(video_path))[0]
                        image_name = f"{base_filename}_container_{container_id:04d}.jpg"
                        image_path = os.path.join(output_dir, image_name)
                        
                        # 이미지 저장
                        success = cv2.imwrite(image_path, container_image)
                        if success:
                            print(f"  컨테이너 #{container_id} 이미지 저장 성공: {image_path}")
                            
                            # 로그 기록
                            container_time = str(timedelta(seconds=int(frame_time)))
                            log_entry = {
                                "id": str(container_id),
                                "time": container_time,
                                "frame": frame_count,
                                "bbox": [int(x) for x in bbox],
                                "confidence": float(conf),
                                "image_path": image_path
                            }
                            logs.append(log_entry)
                        else:
                            print(f"  컨테이너 #{container_id} 이미지 저장 실패: {image_path}")
                    
                    # 이미지 표시 (디버깅용)
                    # for container_id, container_info in active_containers.items():
                    #     x1, y1, x2, y2 = container_info['bbox']
                    #     conf = container_info['conf']
                    #     
                    #     # 이미 캡처된 컨테이너는 색상 변경
                    #     if container_id in container_capture.captured_containers:
                    #         cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    #     else:
                    #         cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        except Exception as e:
            print(f"예측 중 오류 발생: {e}")
        
        # 프레임 표시 (디버깅용)
        # cv2.imshow('Container Detection', display_frame)
        # if cv2.waitKey(1) & 0xFF == ord('q'):
        #     break
    
    # 비디오 캡처 객체 해제 및 창 닫기
    cap.release()
    # cv2.destroyAllWindows()
    
    # 처리 결과 로그를 파일로 저장
    with open(log_file, 'w') as f:
        json.dump(logs, f, indent=2)
    
    print(f"비디오 처리 완료! 감지된 컨테이너: {len(logs)}")
    print(f"로그 파일 저장됨: {log_file}")

if __name__ == "__main__":
    main() 