"use client";

import Dashboard from '@/components/dashboard/Dashboard';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

export default function VideoPage() {
  // WebSocket URL은 환경 변수에서 가져오거나 기본값 설정
  const videoSocketUrl = process.env.NEXT_PUBLIC_VIDEO_SOCKET_URL || 'ws://localhost:8000/ws/video';
  const logsSocketUrl = process.env.NEXT_PUBLIC_LOGS_SOCKET_URL || 'ws://localhost:8000/ws/logs';
  
  return (
    <div className="relative flex flex-col items-center bg-background text-foreground min-h-screen">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03] blur-3xl" />
      <div className="relative z-10 w-full max-w-7xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Badge className="mb-2 px-3 py-1 bg-primary/20 text-primary border-primary/30">모니터링 시스템</Badge>
          <h1 className="text-4xl font-bold mb-4 text-foreground">WandaVision YOLO <span className="text-primary">비디오 처리</span></h1>
          <p className="text-muted-foreground text-lg">실시간 컨테이너 번호 인식 및 모니터링 대시보드</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Dashboard
            videoSocketUrl={videoSocketUrl}
            logsSocketUrl={logsSocketUrl}
          />
        </motion.div>
      </div>
    </div>
  );
} 