"use client";

import React from 'react';
import VideoPlayer from '../VideoPlayer';
import LogTable from '../LogTable';
import StatusIndicator from '../StatusIndicator';

interface DashboardProps {
  videoSocketUrl?: string;
  logsSocketUrl?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  videoSocketUrl = 'ws://localhost:8000/ws/video',
  logsSocketUrl = 'ws://localhost:8000/ws/logs'
}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex justify-between items-center px-6 py-4 border-b">
        <h1 className="text-2xl font-bold">주차장 컨테이너 감지 및 기록 시스템</h1>
        <StatusIndicator websocketUrl={videoSocketUrl} />
      </header>
      
      <main className="flex-1 p-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-2/3">
          <VideoPlayer websocketUrl={videoSocketUrl} />
        </div>
        
        <div className="w-full lg:w-1/3">
          <LogTable websocketUrl={logsSocketUrl} />
        </div>
      </main>
      
      <footer className="py-4 px-6 border-t text-center text-sm text-gray-500">
        <p>© 2023 컨테이너 감지 시스템</p>
      </footer>
    </div>
  );
};

export default Dashboard; 