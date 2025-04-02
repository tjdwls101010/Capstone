# 컨테이너 번호 인식 요구사항 명세서
> **최종 수정일:** 2023-04-01

## 1. 개요 (Overview)

본 문서는 주차장 출입구에서 촬영된 컨테이너 이미지에서 컨테이너 번호를 인식하는 기능에 대한 요구사항을 정의합니다. Google Gemini API를 활용하여 캡처된 컨테이너 이미지에서 표준화된 컨테이너 식별 번호(owner 코드와 number)를 추출하는 프로세스를 명세합니다.

## 2. 목표 (Goals)

* **정확한 컨테이너 번호 인식:** 캡처된 이미지에서 컨테이너 번호를 정확하게 추출합니다.
* **표준 형식 검증:** 인식된 번호가 국제 표준 형식(`[A-Z]{4} \d{6}`)을 준수하는지 검증합니다.
* **안정적인 API 통합:** Google Gemini API와의 안정적인 연동을 보장합니다.
* **오류 처리:** 인식 실패 또는 비표준 형식에 대한 적절한 오류 처리를 제공합니다.

## 3. 기능 요구사항 (Functional Requirements)

### 3.1. 컨테이너 번호 인식 (BE-2)

* **이미지 입력 처리:**
  * 영상 처리 모듈에서 캡처된 컨테이너 이미지를 입력으로 받습니다.
  * 이미지는 파일 경로 또는 메모리 내 이미지 객체의 형태로 전달될 수 있습니다.

* **Google Gemini API 통합:**
  * `gemini-2.5-pro-exp-03-25` 모델을 사용하여 이미지에서 컨테이너 번호를 인식합니다.
  * API 호출에 필요한 인증 정보(API 키)를 안전하게 관리합니다.
  * 최적화된 프롬프트를 사용하여 인식 정확도를 높입니다.

* **결과 파싱 및 검증:**
  * API 응답에서 컨테이너 번호 정보를 추출합니다.
  * 추출된 번호가 표준 형식(`[A-Z]{4} \d{6}`)을 준수하는지 검증합니다.
  * 소유자 코드(`owner`)와 컨테이너 번호(`number`)를 분리합니다.

* **오류 처리:**
  * API 호출 실패, 타임아웃 등에 대한 오류 처리 로직을 구현합니다.
  * 형식이 맞지 않는 경우 "UNKNOWN" 또는 오류 코드를 반환합니다.
  * 연속적인 인식 실패 시 로그 기록 및 알림 메커니즘을 구현합니다.

## 4. 구현 상세 (Implementation Details)

### 4.1. Gemini API 통합

```python
import google.generativeai as genai
import os
from PIL import Image
import io
import base64
from pydantic import BaseModel, validator

# API 키 설정 (환경 변수에서 로드)
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

# Pydantic 모델 정의
class ContainerNumber(BaseModel):
    owner: str
    number: str
    
    @validator('owner')
    def validate_owner(cls, v):
        if not (v and len(v) == 4 and v.isalpha() and v.isupper()):
            raise ValueError('Owner must be 4 uppercase letters')
        return v
        
    @validator('number')
    def validate_number(cls, v):
        if not (v and len(v) == 6 and v.isdigit()):
            raise ValueError('Number must be 6 digits')
        return v

async def recognize_container_number(image_path_or_data):
    """
    Gemini API를 사용하여 컨테이너 이미지에서 번호를 인식
    
    Args:
        image_path_or_data: 이미지 파일 경로 또는 바이너리 데이터
        
    Returns:
        ContainerNumber 객체 또는 오류 상태
    """
    try:
        # 이미지 로드
        if isinstance(image_path_or_data, str):
            image = Image.open(image_path_or_data)
        else:
            image = Image.open(io.BytesIO(image_path_or_data))
            
        # Gemini 모델 설정
        model = genai.GenerativeModel('gemini-2.5-pro-exp-03-25')
        
        # 프롬프트 구성
        prompt = """
        이 이미지에는 선박 컨테이너가 있습니다. 컨테이너 표면에 쓰여진 국제 표준 컨테이너 번호를 찾아 추출해주세요.
        
        국제 표준 컨테이너 번호는 다음 형식을 따릅니다:
        - 4개의 대문자 (소유자 코드)
        - 공백
        - 6자리 숫자 (일련 번호)
        
        예: "ABCD 123456"
        
        컨테이너 번호만을 정확히 추출하여 명확한 형식으로 표기해주세요.
        컨테이너 번호를 찾을 수 없거나 확실하지 않은 경우, "UNKNOWN"이라고 응답해주세요.
        """
        
        # API 호출
        response = await model.generate_content_async([prompt, image])
        result_text = response.text.strip()
        
        # 결과 처리
        if result_text == "UNKNOWN" or "ERROR" in result_text:
            return {"status": "failed", "message": "Cannot recognize container number"}
            
        # 형식 검증 및 파싱
        try:
            # 응답에서 컨테이너 번호 형식 추출 (정규 표현식 활용 가능)
            # 예시: "ABCD 123456" 형태 추출
            parts = result_text.split()
            if len(parts) >= 2:
                owner = parts[0]
                number = parts[1]
                
                container_number = ContainerNumber(owner=owner, number=number)
                return {"status": "success", "data": container_number.dict()}
            else:
                return {"status": "failed", "message": "Invalid format"}
                
        except Exception as e:
            return {"status": "failed", "message": str(e)}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}
```

### 4.2. 컨테이너 번호 인식 엔드포인트

```python
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import shutil
import tempfile
import os

app = FastAPI()

@app.post("/api/recognize-container")
async def recognize_container_api(file: UploadFile = File(...)):
    """
    업로드된 컨테이너 이미지에서 번호를 인식하는 API 엔드포인트
    """
    # 임시 파일 생성
    temp_file = tempfile.NamedTemporaryFile(delete=False)
    try:
        # 업로드된 파일을 임시 파일로 복사
        with temp_file as f:
            shutil.copyfileobj(file.file, f)
            
        # 컨테이너 번호 인식 처리
        result = await recognize_container_number(temp_file.name)
        
        return JSONResponse(content=result)
        
    finally:
        # 임시 파일 삭제
        os.unlink(temp_file.name)
```

## 5. 성능 고려사항 (Performance Considerations)

* **API 호출 최적화:**
  * 인식 요청 횟수 최소화를 위한 전략 구현
  * API 호출 전 이미지 전처리(해상도 조정, 대비 향상 등) 고려

* **비동기 처리:**
  * API 호출은 비동기(`async`/`await`) 방식으로 구현하여 성능 저하 방지
  * 여러 컨테이너에 대한 동시 인식 처리 지원

* **캐싱 전략:**
  * 동일 컨테이너에 대한 중복 인식 요청 방지를 위한 캐싱 메커니즘 고려
  * 특정 시간 동안 동일 이미지 해시에 대한 결과 캐싱

* **오류 복구:**
  * API 실패 시 자동 재시도 메커니즘 구현
  * 점진적 백오프 전략을 통한 API 리소스 효율적 사용

## 6. 테스트 계획 (Testing Plan)

* **단위 테스트:**
  * `recognize_container_number` 함수의 다양한 입력에 대한 동작 검증
  * `ContainerNumber` 모델의 검증 로직 테스트

* **통합 테스트:**
  * 실제 Gemini API와의 연동 테스트
  * 다양한 컨테이너 이미지에 대한 인식 성공률 측정

* **에지 케이스 테스트:**
  * 부분적으로 가려진 컨테이너 번호
  * 저해상도 또는 흐릿한 이미지
  * 다양한 각도에서 촬영된 컨테이너

* **성능 테스트:**
  * API 응답 시간 측정
  * 다수의 동시 요청에 대한 처리 능력 검증

## 7. 관련 코드 및 리소스

* **참조 코드:** `container_recognition.py`의 `recognize_container_number` 함수
* **API 문서:** Google Gemini API 문서 (https://ai.google.dev/docs)
* **환경 변수:** `GOOGLE_API_KEY` (AIzaSyCr09Db8misnZKeqiUeS66CTrSQW26v2vw)

## 8. 제한사항 및 고려사항

* **API 비용 및 할당량:**
  * Google Gemini API 사용에 따른 비용 및 일일 요청 한도 고려
  * 요청 실패 시 대체 처리 방안 마련

* **보안:**
  * API 키 노출 방지를 위한 보안 조치 필수
  * 환경 변수 또는 보안 서비스를 통한 API 키 관리

* **확장성:**
  * 추후 다른 AI 모델 또는 서비스 통합 가능성 고려
  * 인터페이스 설계 시 확장성 고려 