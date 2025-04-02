"use client";

import Dashboard from '@/components/dashboard/Dashboard';

export default function Home() {
  // WebSocket URL은 환경 변수에서 가져오거나 기본값 설정
  const videoSocketUrl = process.env.NEXT_PUBLIC_VIDEO_SOCKET_URL || 'ws://localhost:8000/ws/video';
  const logsSocketUrl = process.env.NEXT_PUBLIC_LOGS_SOCKET_URL || 'ws://localhost:8000/ws/logs';
  
  return (
    <Dashboard
      videoSocketUrl={videoSocketUrl}
      logsSocketUrl={logsSocketUrl}
    />
  );
}
