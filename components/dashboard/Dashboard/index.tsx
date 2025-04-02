"use client";

import React, { useState } from 'react';
import VideoPlayer from '../VideoPlayer';
import LogTable from '../LogTable';
import StatusIndicator from '../StatusIndicator';
import VideoUpload from '../VideoUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DashboardProps {
  videoSocketUrl?: string;
  logsSocketUrl?: string;
}

const Dashboard: React.FC<DashboardProps> = ({
  videoSocketUrl = 'ws://localhost:8000/ws/video',
  logsSocketUrl = 'ws://localhost:8000/ws/logs'
}) => {
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  
  const handleUploadSuccess = (videoId: string) => {
    setUploadedVideoId(videoId);
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex justify-between items-center px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-foreground"><span className="text-primary">주차장</span> 컨테이너 감지 및 기록 시스템</h1>
        <StatusIndicator websocketUrl={videoSocketUrl} />
      </header>
      
      <main className="flex-1 p-6 flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-2/3">
          <Tabs defaultValue="stream" className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-muted/70">
              <TabsTrigger value="stream" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">실시간 영상</TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">비디오 업로드</TabsTrigger>
            </TabsList>
            <TabsContent value="stream" className="mt-4">
              <VideoPlayer websocketUrl={videoSocketUrl} />
            </TabsContent>
            <TabsContent value="upload" className="mt-4">
              <VideoUpload onUploadSuccess={handleUploadSuccess} />
              {uploadedVideoId && (
                <div className="mt-4 p-4 bg-card rounded-md border border-border">
                  <h3 className="font-medium mb-2 text-foreground">최근 업로드된 비디오: <span className="text-primary">{uploadedVideoId}</span></h3>
                  <p className="text-sm text-muted-foreground">비디오가 백그라운드에서 처리 중입니다. 처리가 완료되면 로그 테이블에 결과가 표시됩니다.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="w-full lg:w-1/3">
          <LogTable websocketUrl={logsSocketUrl} />
        </div>
      </main>
      
      <footer className="py-4 px-6 border-t border-border text-center text-sm text-muted-foreground bg-background/80 backdrop-blur-sm">
        <p>© 2023 컨테이너 감지 시스템</p>
      </footer>
    </div>
  );
};

export default Dashboard; 