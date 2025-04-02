import { render, screen } from '@testing-library/react';
import AboutPage from './page';

// Mock modules
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} />;
  },
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<any>) => (
      <div {...props}>{children}</div>
    ),
    h1: ({ children, ...props }: React.PropsWithChildren<any>) => (
      <h1 {...props}>{children}</h1>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<any>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

describe('About Page', () => {
  it('renders the banner title', () => {
    render(<AboutPage />);
    expect(screen.getByText('WandaVision YOLO 프로젝트')).toBeInTheDocument();
  });

  it('renders the company introduction', () => {
    render(<AboutPage />);
    expect(screen.getByText('NGL Transportation 기업 소개')).toBeInTheDocument();
    expect(screen.getByText(/NGL Transportation은 2006년부터 운영되어온 종합 물류 서비스/)).toBeInTheDocument();
  });

  it('renders project goals', () => {
    render(<AboutPage />);
    expect(screen.getByText('프로젝트 목표')).toBeInTheDocument();
    expect(screen.getByText('실시간 컨테이너 트럭 감지')).toBeInTheDocument();
    expect(screen.getByText('컨테이너 번호 인식 및 기록')).toBeInTheDocument();
    expect(screen.getByText('시간별 출입 내역 관리')).toBeInTheDocument();
    expect(screen.getByText('직관적인 웹 인터페이스')).toBeInTheDocument();
  });

  it('renders project timeline', () => {
    render(<AboutPage />);
    expect(screen.getByText('프로젝트 진행 과정')).toBeInTheDocument();
    expect(screen.getByText('CCTV 영상 수집')).toBeInTheDocument();
    expect(screen.getByText('모델 학습 이미지 수집')).toBeInTheDocument();
    expect(screen.getByText('RoboFlow에서 모델 학습')).toBeInTheDocument();
    expect(screen.getByText('OCR 모델 구성')).toBeInTheDocument();
  });

  it('renders project gallery', () => {
    render(<AboutPage />);
    expect(screen.getByText('프로젝트 갤러리')).toBeInTheDocument();
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(0);
  });

  it('renders call to action section', () => {
    render(<AboutPage />);
    expect(screen.getByText('WandaVision YOLO 모니터링 시스템 체험하기')).toBeInTheDocument();
    expect(screen.getByText('메인 화면으로 이동')).toBeInTheDocument();
  });
}); 