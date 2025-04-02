"use client";

import React, { useEffect, useState } from 'react';

type SystemStatus = 
  | 'connecting' 
  | 'processing' 
  | 'container_detected' 
  | 'recognizing' 
  | 'logged' 
  | 'error' 
  | 'idle';

interface StatusIndicatorProps {
  websocketUrl?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  websocketUrl = 'ws://localhost:8000/ws/video' 
}) => {
  const [status, setStatus] = useState<SystemStatus>('connecting');
  const [message, setMessage] = useState<string>('서버에 연결 중...');
  
  useEffect(() => {
    // 실제 WebSocket 연결은 백엔드가 준비된 후 활성화
    const mockStatus = () => {
      console.log('Mocking status indicators for websocket:', websocketUrl);
      
      // 초기 상태 설정
      setStatus('connecting');
      setMessage('서버에 연결 중...');
      
      // 상태 변화 시뮬레이션 (데모용)
      setTimeout(() => {
        setStatus('idle');
        setMessage('대기 중');
        
        setTimeout(() => {
          setStatus('processing');
          setMessage('영상 처리 중');
          
          setTimeout(() => {
            setStatus('container_detected');
            setMessage('컨테이너 감지됨');
            
            setTimeout(() => {
              setStatus('recognizing');
              setMessage('컨테이너 번호 인식 중');
              
              setTimeout(() => {
                setStatus('logged');
                setMessage('로그 기록됨');
                
                // 3초 후 처리 중 상태로 복귀
                setTimeout(() => {
                  setStatus('processing');
                  setMessage('영상 처리 중');
                }, 3000);
              }, 2000);
            }, 2000);
          }, 2000);
        }, 2000);
      }, 2000);
    };
    
    mockStatus();
    
    // 실제 WebSocket 연결 코드 (백엔드 준비 후 활성화)
    // const socket = new WebSocket(websocketUrl);
    // 
    // socket.onopen = () => {
    //   setStatus('idle');
    //   setMessage('대기 중');
    // };
    // 
    // socket.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   
    //   if (data.type === 'event') {
    //     switch (data.event_type) {
    //       case 'processing_started':
    //         setStatus('processing');
    //         setMessage('영상 처리 중');
    //         break;
    //         
    //       case 'container_detect':
    //         setStatus('container_detected');
    //         setMessage('컨테이너 감지됨');
    //         break;
    //         
    //       case 'container_capture':
    //         setStatus('recognizing');
    //         setMessage('컨테이너 번호 인식 중');
    //         break;
    //         
    //       case 'new_log':
    //         setStatus('logged');
    //         setMessage('로그 기록됨');
    //         
    //         // 3초 후 처리 중 상태로 복귀
    //         setTimeout(() => {
    //           setStatus('processing');
    //           setMessage('영상 처리 중');
    //         }, 3000);
    //         break;
    //         
    //       case 'error':
    //         setStatus('error');
    //         setMessage(`오류: ${data.data.message || '알 수 없는 오류'}`);
    //         break;
    //         
    //       default:
    //         break;
    //     }
    //   }
    // };
    // 
    // socket.onclose = () => {
    //   setStatus('connecting');
    //   setMessage('연결이 끊겼습니다. 재연결 중...');
    // };
    // 
    // socket.onerror = () => {
    //   setStatus('error');
    //   setMessage('연결 오류가 발생했습니다.');
    // };
    // 
    // return () => {
    //   socket.close();
    // };
  }, [websocketUrl]);
  
  // 상태에 따른 스타일 설정
  const getStatusStyles = () => {
    switch (status) {
      case 'connecting':
        return {
          bg: 'bg-yellow-500',
          text: 'text-yellow-800',
          ring: 'ring-yellow-500',
          pulseEffect: true
        };
      case 'idle':
        return {
          bg: 'bg-gray-500',
          text: 'text-gray-800',
          ring: 'ring-gray-500',
          pulseEffect: false
        };
      case 'processing':
        return {
          bg: 'bg-blue-500',
          text: 'text-blue-800',
          ring: 'ring-blue-500',
          pulseEffect: true
        };
      case 'container_detected':
        return {
          bg: 'bg-green-500',
          text: 'text-green-800',
          ring: 'ring-green-500',
          pulseEffect: true
        };
      case 'recognizing':
        return {
          bg: 'bg-purple-500',
          text: 'text-purple-800',
          ring: 'ring-purple-500',
          pulseEffect: true
        };
      case 'logged':
        return {
          bg: 'bg-green-600',
          text: 'text-green-800',
          ring: 'ring-green-600',
          pulseEffect: false
        };
      case 'error':
        return {
          bg: 'bg-red-500',
          text: 'text-red-800',
          ring: 'ring-red-500',
          pulseEffect: true
        };
      default:
        return {
          bg: 'bg-gray-500',
          text: 'text-gray-800',
          ring: 'ring-gray-500',
          pulseEffect: false
        };
    }
  };
  
  const styles = getStatusStyles();
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`
        relative flex items-center justify-center 
        h-3 w-3 
        ${styles.pulseEffect ? "animate-ping-slow" : ""}
      `}>
        <div className={`
          absolute inset-0
          rounded-full ${styles.bg} 
          ${styles.pulseEffect ? "animate-ping opacity-75" : "opacity-75"}
        `} />
        <div className={`
          relative rounded-full h-2 w-2 ${styles.bg}
        `} />
      </div>
      <span className={`text-sm font-medium ${styles.text}`}>
        {message}
      </span>
    </div>
  );
};

export default StatusIndicator; 