import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

// 업로드 디렉토리 설정
const uploadDir = path.join(process.cwd(), 'uploads/videos');
const imagesDir = path.join(process.cwd(), 'uploads/images');

// 디렉토리 확인 함수
async function ensureDirectoryExists(dirPath: string) {
  try {
    // 디렉토리 존재 여부 확인
    await fs.promises.access(dirPath, fs.constants.F_OK);
    console.log(`디렉토리 존재: ${dirPath}`);
  } catch (error) {
    // 디렉토리가 없으면 생성
    console.log(`디렉토리 생성 중: ${dirPath}`);
    await mkdir(dirPath, { recursive: true });
    console.log(`디렉토리 생성 완료: ${dirPath}`);
  }
}

export async function POST(request: NextRequest) {
  console.log('POST 요청 수신');
  
  try {
    // 디렉토리 존재 확인 및 생성
    await ensureDirectoryExists(uploadDir);
    await ensureDirectoryExists(imagesDir);
    
    console.log('FormData 추출 시작');
    const formData = await request.formData();
    console.log('FormData 추출 완료');
    
    const file = formData.get('file') as File;
    
    if (!file) {
      console.log('파일이 제공되지 않음');
      return NextResponse.json({ error: '파일이 제공되지 않았습니다.' }, { status: 400 });
    }
    
    console.log(`파일 정보: 이름=${file.name}, 크기=${file.size}, 타입=${file.type}`);
    
    // 허용된 비디오 형식 확인
    const validTypes = ['video/mp4', 'video/avi', 'video/x-msvideo', 'video/quicktime', 'video/x-matroska'];
    if (!validTypes.includes(file.type)) {
      console.log(`지원되지 않는 파일 형식: ${file.type}`);
      return NextResponse.json({ error: '지원되지 않는 파일 형식입니다. MP4, AVI, MOV, MKV 파일만 업로드 가능합니다.' }, { status: 400 });
    }
    
    // 고유 파일명 생성 (타임스탬프 추가)
    const timestamp = new Date().getTime();
    const originalName = file.name;
    const fileExt = path.extname(originalName);
    const baseName = path.basename(originalName, fileExt);
    const fileName = `${baseName}_${timestamp}${fileExt}`;
    const filePath = path.join(uploadDir, fileName);
    
    console.log(`저장할 파일 경로: ${filePath}`);
    
    // 파일 저장
    console.log('파일 저장 시작');
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, fileBuffer);
    console.log('파일 저장 완료');
    
    // 파이썬 스크립트 호출 (비동기로 실행)
    const scriptPath = path.join(process.cwd(), 'app/api/video/process_video.py');
    const modelPath = path.join(process.cwd(), 'public/models/WandaVisionYOLO.pt');
    const outputDir = imagesDir;
    
    // Python 명령어가 가용한지 확인
    try {
      console.log('Python 버전 확인');
      const { stdout } = await execAsync('source venv/bin/activate && python3 --version');
      console.log(`Python 버전: ${stdout}`);
    } catch (error) {
      console.error('Python 실행 불가:', error);
    }
    
    // 스크립트 존재 여부 확인
    try {
      await fs.promises.access(scriptPath, fs.constants.F_OK);
      console.log(`스크립트 파일 존재: ${scriptPath}`);
    } catch (error) {
      console.error(`스크립트 파일 없음: ${scriptPath}`);
    }
    
    const command = `source venv/bin/activate && python3 "${scriptPath}" "${filePath}" "${modelPath}" "${outputDir}"`;
    console.log(`실행할 명령어: ${command}`);
    
    // 비동기로 프로세스 실행 (결과를 기다리지 않음)
    execAsync(command)
      .then(({ stdout, stderr }) => {
        console.log('Python 스크립트 실행 완료');
        console.log('스크립트 출력:', stdout);
        if (stderr) console.error('스크립트 오류:', stderr);
      })
      .catch(error => {
        console.error('스크립트 실행 중 오류:', error);
      });
    
    console.log('응답 반환');
    return NextResponse.json({ 
      success: true, 
      message: '비디오가 성공적으로 업로드되었습니다. 배경에서 처리 중입니다.',
      videoId: fileName,
      filePath: filePath
    });
    
  } catch (error) {
    console.error('비디오 업로드 중 오류 발생:', error);
    return NextResponse.json({ 
      error: '비디오 업로드 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

// GET 요청으로 업로드된 비디오 목록 조회
export async function GET() {
  console.log('GET 요청 수신 (비디오 목록)');
  
  try {
    // 디렉토리 존재 확인 및 생성
    await ensureDirectoryExists(uploadDir);
    
    const { readdir, stat } = require('fs/promises');
    
    // 비디오 디렉토리의 모든 파일 읽기
    const files = await readdir(uploadDir);
    console.log(`읽어온 파일 수: ${files.length}`);
    
    // 비디오 파일 정보 수집
    const videoFiles = await Promise.all(
      files
        .filter(file => ['.mp4', '.avi', '.mov', '.mkv'].some(ext => file.toLowerCase().endsWith(ext)))
        .map(async (file) => {
          const filePath = path.join(uploadDir, file);
          const stats = await stat(filePath);
          
          return {
            id: file,
            name: file,
            size: stats.size,
            createdAt: stats.birthtime
          };
        })
    );
    
    // 최신 파일을 먼저 보여주도록 정렬
    videoFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`필터링된 비디오 파일 수: ${videoFiles.length}`);
    return NextResponse.json({ videos: videoFiles });
    
  } catch (error) {
    console.error('비디오 목록 조회 중 오류 발생:', error);
    return NextResponse.json({ 
      error: '비디오 목록을 조회하는 중 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 