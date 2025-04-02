"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { AlertCircle, Upload, CheckCircle2, Video } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface VideoUploadProps {
  onUploadSuccess?: (videoId: string) => void;
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    
    // 파일 유형 검증
    const validTypes = ['video/mp4', 'video/avi', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska'];
    if (!validTypes.includes(file.type)) {
      setError('지원되지 않는 파일 형식입니다. MP4, AVI, MOV, MKV 파일만 업로드 가능합니다.');
      return;
    }
    
    // 파일 크기 검증 (500MB)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setError('파일 크기가 너무 큽니다. 최대 500MB까지 업로드 가능합니다.');
      return;
    }
    
    setFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    console.log('업로드 버튼 클릭됨');

    if (!file) {
      console.log('파일이 선택되지 않았습니다.');
      return;
    }
    
    console.log('업로드 시작:', file.name, file.type, file.size);
    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('FormData 생성 완료');
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          console.log('업로드 진행률:', percentComplete);
          setProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        console.log('응답 수신:', xhr.status, xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          setSuccess(true);
          setFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          if (onUploadSuccess) {
            onUploadSuccess(response.videoId);
          }
        } else {
          let errorMsg = '업로드 중 오류가 발생했습니다.';
          try {
            const response = JSON.parse(xhr.responseText);
            errorMsg = response.error || errorMsg;
          } catch (e) {
            console.error('응답 파싱 오류:', e);
          }
          setError(errorMsg);
        }
        setUploading(false);
      });
      
      xhr.addEventListener('error', (e) => {
        console.error('XHR 오류 발생:', e);
        setError('네트워크 오류가 발생했습니다.');
        setUploading(false);
      });
      
      console.log('API 엔드포인트로 요청 전송');
      xhr.open('POST', '/api/video');
      xhr.send(formData);
      
    } catch (err) {
      console.error('업로드 try/catch 오류:', err);
      setError('업로드 중 오류가 발생했습니다.');
      setUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>비디오 업로드</CardTitle>
        <CardDescription>
          컨테이너 감지를 위한 동영상 파일을 업로드하세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragging 
              ? 'border-primary bg-primary/10' 
              : file 
                ? 'border-success bg-success/10' 
                : 'border-border hover:border-border/80'
          } transition-all cursor-pointer`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            accept="video/mp4,video/avi,video/x-msvideo,video/quicktime,video/x-matroska" 
            className="hidden" 
            onChange={handleFileChange} 
            ref={fileInputRef}
          />
          
          <div className="flex flex-col items-center justify-center py-4">
            {file ? (
              <>
                <CheckCircle2 className="w-10 h-10 text-success mb-2" />
                <p className="text-lg font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(file.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                <p className="text-lg font-medium">파일을 드래그하거나 클릭하여 선택하세요</p>
                <p className="text-sm text-muted-foreground mt-1">
                  MP4, AVI, MOV, MKV 비디오 파일 (최대 500MB)
                </p>
              </>
            )}
          </div>
        </div>
        
        {uploading && (
          <div className="mt-4">
            <Progress value={progress} className="w-full h-2" />
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {progress}% 업로드 중...
            </p>
          </div>
        )}
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mt-4 bg-success/10 border-success text-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>성공</AlertTitle>
            <AlertDescription>비디오가 성공적으로 업로드되었으며, 배경에서 처리 중입니다.</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading} 
          className="w-full"
          id="upload-button"
        >
          {uploading ? '업로드 중...' : '업로드'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VideoUpload; 