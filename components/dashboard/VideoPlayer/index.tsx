"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BoundingBox {
  bbox: [number, number, number, number];
  captured: boolean;
  confidence: number;
}

interface VideoPlayerProps {
  websocketUrl?: string;
  width?: string | number;
  height?: string | number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  websocketUrl = 'ws://localhost:8000/ws/video', 
  width = '100%', 
  height = 'auto'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containers, setContainers] = useState<Record<string, BoundingBox>>({});
  const [connected, setConnected] = useState<boolean>(false);
  const [connection, setConnection] = useState<WebSocket | null>(null);
  
  useEffect(() => {
    // 실제 WebSocket 연결은 백엔드가 준비된 후 활성화
    const mockSocketConnection = () => {
      console.log('Mocking WebSocket connection to:', websocketUrl);
      setConnected(true);
      
      // 더미 데이터를 사용한 테스트 목적의 임시 코드
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // 캔버스 크기 설정
      canvas.width = 640;
      canvas.height = 480;
      
      // 검은 배경으로 채우기
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 미리보기 텍스트 추가
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.fillText('비디오 스트림 대기 중...', canvas.width / 2 - 140, canvas.height / 2);
      
      // 더미 컨테이너 데이터
      const dummyContainers: Record<string, BoundingBox> = {
        'container1': {
          bbox: [100, 100, 300, 250],
          captured: false,
          confidence: 0.85
        },
        'container2': {
          bbox: [400, 150, 550, 350],
          captured: true,
          confidence: 0.92
        }
      };
      
      // 더미 컨테이너 데이터로 상태 업데이트
      setContainers(dummyContainers);
      
      // 더미 바운딩 박스 그리기
      drawBoundingBoxes(ctx, dummyContainers);
    };
    
    mockSocketConnection();
    
    // 실제 WebSocket 연결 코드 (백엔드 준비 후 활성화)
    // const socket = new WebSocket(websocketUrl);
    // setConnection(socket);
    // 
    // socket.onopen = () => {
    //   console.log('WebSocket connection established');
    //   setConnected(true);
    // };
    // 
    // socket.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   
    //   if (data.type === 'video_frame') {
    //     const img = new Image();
    //     
    //     img.onload = () => {
    //       const canvas = canvasRef.current;
    //       if (!canvas) return;
    //       
    //       const ctx = canvas.getContext('2d');
    //       if (!ctx) return;
    //       
    //       // 캔버스 크기 조절
    //       canvas.width = img.width;
    //       canvas.height = img.height;
    //       
    //       // 이미지 그리기
    //       ctx.drawImage(img, 0, 0);
    //       
    //       // 바운딩 박스 그리기
    //       if (data.containers) {
    //         setContainers(data.containers);
    //         drawBoundingBoxes(ctx, data.containers);
    //       }
    //     };
    //     
    //     // Base64 이미지 로드
    //     img.src = `data:image/jpeg;base64,${data.frame}`;
    //   }
    // };
    // 
    // socket.onclose = () => {
    //   console.log('WebSocket connection closed');
    //   setConnected(false);
    // };
    // 
    // socket.onerror = (error) => {
    //   console.error('WebSocket error:', error);
    //   setConnected(false);
    // };
    // 
    // return () => {
    //   socket.close();
    // };
  }, [websocketUrl]);
  
  const drawBoundingBoxes = (
    ctx: CanvasRenderingContext2D, 
    containers: Record<string, BoundingBox>
  ) => {
    // 각 컨테이너별 바운딩 박스 그리기
    Object.entries(containers).forEach(([id, info]) => {
      const [x1, y1, x2, y2] = info.bbox;
      
      // 상태에 따른 색상 설정
      let color = 'rgba(46, 204, 113, 0.8)'; // 기본 감지 색상 (초록)
      if (info.captured) {
        color = 'rgba(231, 76, 60, 0.8)'; // 캡처 완료 (빨강)
      }
      
      // 바운딩 박스 그리기
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
      
      // 신뢰도 점수 표시
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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>실시간 영상</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-auto bg-black rounded-md overflow-hidden">
          <canvas 
            ref={canvasRef} 
            className="w-full h-auto object-contain"
            style={{ width, height }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-sm">
            {connected ? '연결됨' : '연결 대기 중...'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPlayer; 