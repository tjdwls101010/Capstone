"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ContainerLog {
  id: string;
  captured_at: string;
  container_owner: string;
  container_number: string;
  source_video?: string;
}

interface LogTableProps {
  websocketUrl?: string;
  limit?: number;
}

const LogTable: React.FC<LogTableProps> = ({ 
  websocketUrl = 'ws://localhost:8000/ws/logs', 
  limit = 10 
}) => {
  const [logs, setLogs] = useState<ContainerLog[]>([]);
  const [newLogId, setNewLogId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  useEffect(() => {
    // 실제 WebSocket 연결은 백엔드가 준비된 후 활성화
    const mockLogData = () => {
      console.log('Mocking log data for websocket:', websocketUrl);
      
      // 더미 로그 데이터
      const dummyLogs: ContainerLog[] = [
        {
          id: '1',
          captured_at: new Date().toISOString(),
          container_owner: 'ABCD',
          container_number: '123456',
          source_video: 'camera1'
        },
        {
          id: '2',
          captured_at: new Date(Date.now() - 60000).toISOString(),
          container_owner: 'EFGH',
          container_number: '789012',
          source_video: 'camera1'
        },
        {
          id: '3',
          captured_at: new Date(Date.now() - 120000).toISOString(),
          container_owner: 'IJKL',
          container_number: '345678',
          source_video: 'camera2'
        }
      ];
      
      setLogs(dummyLogs);
      setTotalPages(Math.ceil(dummyLogs.length / limit));
      
      // 5초 후에 새 로그 추가 (데모용)
      setTimeout(() => {
        const newLog: ContainerLog = {
          id: '4',
          captured_at: new Date().toISOString(),
          container_owner: 'MNOP',
          container_number: '901234',
          source_video: 'camera1'
        };
        
        setLogs(prevLogs => [newLog, ...prevLogs]);
        setNewLogId(newLog.id);
        
        // 3초 후 하이라이트 제거
        setTimeout(() => {
          setNewLogId(null);
        }, 3000);
      }, 5000);
    };
    
    mockLogData();
    
    // 실제 WebSocket 연결 코드 (백엔드 준비 후 활성화)
    // const socket = new WebSocket(websocketUrl);
    // 
    // socket.onopen = () => {
    //   console.log('WebSocket connection established for logs');
    // };
    // 
    // socket.onmessage = (event) => {
    //   const data = JSON.parse(event.data);
    //   
    //   if (data.type === 'initial_logs') {
    //     // 초기 로그 데이터 설정
    //     setLogs(data.data);
    //     setTotalPages(Math.ceil(data.data.length / limit));
    //   } 
    //   else if (data.type === 'new_log') {
    //     // 새 로그 추가
    //     setLogs(prevLogs => {
    //       const updatedLogs = [data.data, ...prevLogs];
    //       setTotalPages(Math.ceil(updatedLogs.length / limit));
    //       return updatedLogs;
    //     });
    //     
    //     // 하이라이트 효과용 ID 설정
    //     setNewLogId(data.data.id);
    //     
    //     // 3초 후 하이라이트 제거
    //     setTimeout(() => {
    //       setNewLogId(null);
    //     }, 3000);
    //   }
    // };
    // 
    // socket.onclose = () => {
    //   console.log('WebSocket connection closed for logs');
    // };
    // 
    // socket.onerror = (error) => {
    //   console.error('WebSocket error for logs:', error);
    // };
    // 
    // return () => {
    //   socket.close();
    // };
  }, [websocketUrl, limit]);
  
  // 날짜 형식화 함수
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // 현재 페이지의 로그만 보여주기
  const paginatedLogs = logs.slice((page - 1) * limit, page * limit);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>컨테이너 로그</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>시간</TableHead>
                <TableHead>소유자 코드</TableHead>
                <TableHead>번호</TableHead>
                <TableHead>소스</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    로그 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLogs.map(log => (
                  <TableRow 
                    key={log.id} 
                    className={log.id === newLogId ? "bg-blue-100/20 transition-colors" : ""}
                  >
                    <TableCell>{formatDate(log.captured_at)}</TableCell>
                    <TableCell>{log.container_owner}</TableCell>
                    <TableCell>{log.container_number}</TableCell>
                    <TableCell>{log.source_video || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                    className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <PaginationItem key={pageNum}>
                    <PaginationLink 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(pageNum);
                      }}
                      isActive={page === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                    className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LogTable; 