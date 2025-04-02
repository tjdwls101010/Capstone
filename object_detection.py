import os
import cv2
import numpy as np
import pandas as pd
from ultralytics import YOLO
from PIL import Image
from datetime import timedelta
import time
from google.generativeai import GenerativeModel
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
import os
from openpyxl import Workbook, load_workbook
import math
from pydantic import BaseModel, Field, validator
import re

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

# Gemini API 키 설정
os.environ["GOOGLE_API_KEY"] = "AIzaSyCr09Db8misnZKeqiUeS66CTrSQW26v2vw"
genai.configure(api_key=os.environ["GOOGLE_API_KEY"])

# 모델 로드
model = YOLO('WandaVisionYOLO.pt')

# 모델 클래스 정보 출력
class_names = model.names
print("모델 클래스 정보:", class_names)

# 비디오 파일 경로
video_folder = './videos/'
image_folder = './images/'
excel_path = './container_logs.xlsx'

# 이미지 폴더가 없다면 생성
if not os.path.exists(image_folder):
    os.makedirs(image_folder)

# 엑셀 파일 확인 및 생성
def prepare_excel_file():
    if os.path.exists(excel_path):
        try:
            # 기존 파일 로드
            df = pd.read_excel(excel_path)
        except Exception as e:
            print(f"엑셀 파일을 읽는 중 오류가 발생했습니다: {e}")
            # 새로운 파일 생성
            df = pd.DataFrame(columns=["시간", "owner", "number"])
    else:
        # 새로운 파일 생성
        df = pd.DataFrame(columns=["시간", "owner", "number"])
    
    return df

# 컨테이너 번호 인식 함수
def recognize_container_number(image_path):
    try:
        # 이미지를 base64로 인코딩
        with open(image_path, "rb") as img_file:
            import base64
            image_bytes = img_file.read()
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Gemini AI 모델 설정
        llm = ChatGoogleGenerativeAI(
            model="models/gemini-2.0-flash",
            temperature=0.0,
            convert_system_message_to_human=True
        )
        
        # 시스템 프롬프트 설정
        system_prompt = """
        이 이미지는 트럭 컨테이너 사진입니다. 컨테이너의 오른쪽 위 부분에 있는 번호를 정확히 추출해주세요.
        번호는 대문자 4개와 숫자 6자리로 구성되어 있습니다 (예: 'TCNU 897179', 'BMOU 491266', 'FFAU 344955').
        번호만 정확히 추출하여 응답해주세요. 확실하지 않은 경우 'UNKNOWN'이라고 답변해주세요.
        """
        
        # 이미지와 프롬프트로 질의
        response = llm.invoke([
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": [
                {"type": "text", "text": "이 트럭 컨테이너 이미지에서 컨테이너 번호를 추출해주세요."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
            ]}
        ])
        
        # 응답 처리
        container_number = response.content.strip()
        
        # 형식 검증 (4글자 대문자 + 공백 + 6자리 숫자)
        import re
        if re.match(r'^[A-Z]{4}\s\d{6}$', container_number):
            return container_number
        else:
            return "UNKNOWN"
            
    except Exception as e:
        print(f"컨테이너 번호 인식 중 오류 발생: {e}")
        return "ERROR"

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

# 엑셀 파일 준비
container_df = prepare_excel_file()

# 비디오 폴더 내의 모든 파일 순회
for filename in os.listdir(video_folder):
    if filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):  # 비디오 파일 형식 필터링
        video_path = os.path.join(video_folder, filename)
        print(f"처리 중인 비디오: {video_path}")

        # 비디오 캡처 객체 생성
        cap = cv2.VideoCapture(video_path)
        
        # 비디오 FPS 가져오기
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        print(f"비디오 FPS: {fps}")
        
        # 원본 비디오 크기 가져오기
        original_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        original_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # 디스플레이 크기 계산 (원본의 50%)
        display_width = int(original_width * 0.5)
        display_height = int(original_height * 0.5)
        
        # 창 크기 설정
        cv2.namedWindow('Container Detection', cv2.WINDOW_NORMAL)
        cv2.resizeWindow('Container Detection', display_width, display_height)

        frame_count = 0
        
        # 컨테이너 캡처 객체 초기화 (화면의 20% 이상일 때만 추적)
        container_capture = ContainerCapture(min_area_ratio=0.2)

        start_time = time.time()

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            
            # 현재 프레임의 시간 계산 (비디오 시작부터 경과 시간)
            current_time_seconds = frame_count / fps
            current_time = str(timedelta(seconds=int(current_time_seconds)))
            
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
                    detected_classes = []
                    
                    if result.boxes is not None and len(result.boxes) > 0:
                        frame_height, frame_width, _ = frame.shape
                        frame_area = frame_height * frame_width
                        
                        for box in result.boxes:
                            cls = int(box.cls[0])
                            class_name = result.names[cls]
                            detected_classes.append(class_name)
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
                            area_ratio = container_info['area_ratio']
                            container_frame = container_info['frame']
                            frame_time = container_info['frame_time']
                            
                            # 크롭된 이미지 생성
                            x1, y1, x2, y2 = bbox
                            container_image = container_frame[y1:y2, x1:x2]
                            
                            # 이미지 파일 이름 생성
                            base_filename = os.path.splitext(filename)[0]
                            image_name = f"{base_filename}_container_{container_id:04d}.jpg"
                            image_path = os.path.join(image_folder, image_name)
                            
                            # 이미지 저장
                            success = cv2.imwrite(image_path, container_image)
                            if success:
                                print(f"  컨테이너 #{container_id} 이미지 저장 성공: {image_path}")
                                
                                # OCR로 컨테이너 번호 인식
                                container_number = recognize_container_number(image_path)
                                print(f"  인식된 컨테이너 번호: {container_number}")
                                
                                # 엑셀에 기록
                                if container_number != "UNKNOWN" and container_number != "ERROR":
                                    container_time = str(timedelta(seconds=int(frame_time)))
                                    
                                    # 컨테이너 번호 파싱
                                    parsed_container = ContainerNumber.parse(container_number)
                                    if parsed_container:
                                        # 새 행 추가
                                        new_row = pd.DataFrame({
                                            "시간": [container_time], 
                                            "owner": [parsed_container.owner],
                                            "number": [parsed_container.number]
                                        })
                                        container_df = pd.concat([container_df, new_row], ignore_index=True)
                                        
                                        # 엑셀 파일 저장
                                        container_df.to_excel(excel_path, index=False)
                                        print(f"  엑셀에 기록: 시간 {container_time}, 소유자 {parsed_container.owner}, 번호 {parsed_container.number}")
                                    else:
                                        print(f"  컨테이너 번호 파싱 실패: {container_number}")
                            else:
                                print(f"  컨테이너 #{container_id} 이미지 저장 실패: {image_path}")
                        
                        # 추적 중인 컨테이너를 화면에 표시
                        for container_id, container_info in active_containers.items():
                            x1, y1, x2, y2 = container_info['bbox']
                            conf = container_info['conf']
                            area_ratio = container_info['area_ratio']
                            
                            # 바운딩 박스와 정보 표시
                            cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            
                            # 이미 캡처된 컨테이너는 색상 변경
                            if container_id in container_capture.captured_containers:
                                cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                                label = f'Container #{container_id} [CAPTURED] {conf:.2f}'
                            else:
                                cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                label = f'Container #{container_id} {conf:.2f} Area: {area_ratio:.2%}'
                            
                            cv2.putText(display_frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                    else:
                        display_frame = frame.copy()  # 감지된 객체가 없을 때 원본 프레임 표시
                else:
                    display_frame = frame.copy()  # 결과가 없을 때 원본 프레임 표시
            except Exception as e:
                print(f"예측 중 오류 발생: {e}")
                display_frame = frame.copy()  # 오류 발생 시 원본 프레임 표시

            # 프레임 표시
            cv2.imshow('Container Detection', display_frame)
            
            # 'q' 키를 누르면 종료
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

            # 실제 비디오 속도에 맞추기 위한 딜레이 계산
            elapsed_time = time.time() - start_time
            frame_time = frame_count / fps
            sleep_time = max(0, frame_time - elapsed_time)
            time.sleep(sleep_time)

        # 비디오 캡처 객체 해제 및 창 닫기
        cap.release()
        cv2.destroyAllWindows()

print("모든 비디오 처리 완료!")