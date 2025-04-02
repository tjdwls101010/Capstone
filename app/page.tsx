"use client";

import Dashboard from '@/components/dashboard/Dashboard';

export default function Home() {
  // WebSocket URL은 환경 변수에서 가져오거나 기본값 설정
  const videoSocketUrl = process.env.NEXT_PUBLIC_VIDEO_SOCKET_URL || 'ws://localhost:8000/ws/video';
  const logsSocketUrl = process.env.NEXT_PUBLIC_LOGS_SOCKET_URL || 'ws://localhost:8000/ws/logs';
  
  return (
    <div className="container mx-auto px-4 py-8 bg-background text-foreground">
      <h1 className="text-3xl font-bold mb-6 text-center text-foreground">WandaVision YOLO 모니터링 시스템</h1>
      <Dashboard
        videoSocketUrl={videoSocketUrl}
        logsSocketUrl={logsSocketUrl}
      />
    </div>
  );
}
