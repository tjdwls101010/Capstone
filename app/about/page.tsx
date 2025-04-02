"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Camera, 
  BookOpen, 
  Database, 
  LineChart, 
  Video, 
  MonitorPlay, 
  Clock, 
  ArrowRight,
  Search
} from 'lucide-react';
import { 
  Calendar, 
  Code, 
  FileText, 
  Lightbulb, 
  Rocket, 
  Users, 
  Settings 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Project Banner Component
interface ProjectBannerProps {
  backgroundImage?: string;
  title: string;
  description: string;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  className?: string;
}

const ease = [0.16, 1, 0.3, 1];

const ProjectBanner = ({
  backgroundImage = "/images/NGL_width.png",
  title,
  description,
  badge,
  className,
}: ProjectBannerProps) => {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-lg border border-border bg-background",
        className
      )}
    >
      <div className="absolute inset-0 z-0">
        {backgroundImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          >
            <div className="absolute inset-0 bg-black/60" />
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-start justify-between gap-6 p-6 md:p-10">
        <div className="w-full max-w-3xl">
          {badge && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              <Badge
                variant={badge.variant || "default"}
                className="mb-4 px-3 py-1 text-xs"
              >
                {badge.text}
              </Badge>
            </motion.div>
          )}

          <motion.h1
            className="mb-4 text-3xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            {title}
          </motion.h1>

          <motion.p
            className="max-w-2xl text-base text-foreground/80 md:text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
          >
            {description}
          </motion.p>
        </div>
      </div>
    </div>
  );
};

// Project Goal Component
interface ProjectGoalProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

const ProjectGoal = ({ icon, title, description, className }: ProjectGoalProps) => {
  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-md ${className}`}
    >
      <CardContent className="p-6">
        <div className="mb-4 text-primary">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2 text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  );
};

// Project Timeline Component
interface TimelineItem {
  id: string;
  date: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  image?: string;
}

interface ProjectTimelineProps {
  items: TimelineItem[];
  className?: string;
}

const Timeline = ({ items, className }: ProjectTimelineProps) => {
  return (
    <div className={cn("w-full bg-background font-sans", className)}>
      <div className="max-w-4xl mx-auto py-8 px-4 md:px-8">
        <div className="relative">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex flex-col md:flex-row md:gap-10 mb-10 md:mb-16 relative"
            >
              {/* Timeline line */}
              {index < items.length - 1 && (
                <div className="absolute left-6 md:left-8 top-12 bottom-0 w-[2px] bg-border" />
              )}
              
              {/* Date and Icon */}
              <div className="flex items-start mb-4 md:mb-0">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center z-10 border border-border">
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground mt-2 md:hidden">
                    {item.date}
                  </span>
                </div>
                <div className="hidden md:block ml-6">
                  <span className="text-base font-semibold text-foreground">
                    {item.date}
                  </span>
                </div>
              </div>
              
              {/* Content */}
              <div className="pl-16 md:pl-0 flex-1">
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm md:text-base text-muted-foreground mb-4">
                  {item.description}
                </p>
                {item.image && (
                  <div className="mt-4 overflow-hidden rounded-md">
                    <Image 
                      src={item.image}
                      alt={item.title}
                      width={400}
                      height={225}
                      className="object-cover w-full h-auto"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Image Gallery Component
interface ImageItem {
  id: string | number;
  title: string;
  src: string;
  alt?: string;
}

export default function AboutPage() {
  // Define project goals
  const projectGoals = [
    {
      icon: <Video className="h-6 w-6" />,
      title: "실시간 컨테이너 트럭 감지",
      description: "CCTV 영상에서 실시간으로 컨테이너 트럭을 감지하여 출입 상황을 모니터링합니다.",
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: "컨테이너 번호 인식 및 기록",
      description: "감지된 컨테이너의 번호를 인식하고 정확하게 기록합니다.",
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "시간별 출입 내역 관리",
      description: "시간별로 컨테이너 출입 내역을 자동으로 관리하여 효율적인 모니터링을 제공합니다.",
    },
    {
      icon: <MonitorPlay className="h-6 w-6" />,
      title: "직관적인 웹 인터페이스",
      description: "웹 인터페이스를 통해 직관적인 모니터링 시스템을 구축하여 사용자 경험을 향상시킵니다.",
    },
  ];

  // Define timeline items
  const timelineItems: TimelineItem[] = [
    {
      id: "1",
      date: "1단계",
      title: "CCTV 영상 수집",
      description: "프로젝트의 첫 단계로 수십 시간의 CCTV 영상을 분석하여 화질이 좋고 트럭이 지나다니는 장면이 잘 포착된 영상만을 선별했습니다.",
      icon: <Camera className="h-6 w-6 text-blue-500" />,
    },
    {
      id: "2",
      date: "2단계",
      title: "모델 학습 이미지 수집",
      description: "YOLO 모델 파인튜닝을 위해 객체 탐지하고자 하는 컨테이너 트럭이 포함된 다양한 이미지를 수집했습니다. 이미지는 다양한 각도, 조명 조건, 거리에서 촬영되어 모델이 다양한 환경에서도 컨테이너를 정확하게 인식할 수 있도록 했습니다.",
      icon: <Search className="h-6 w-6 text-green-500" />,
      image: "/images/dataset_example1.jpg"
    },
    {
      id: "3",
      date: "3단계",
      title: "RoboFlow에서 모델 학습",
      description: "Roboflow 플랫폼을 활용하여 이미지 라벨링, 데이터셋 구성, 전처리, 데이터 증강, 그리고 YOLOv12 모델 파인튜닝을 진행했습니다.",
      icon: <Code className="h-6 w-6 text-purple-500" />,
      image: "/images/roboflow_dataset.png"
    },
    {
      id: "4",
      date: "4단계",
      title: "OCR 모델 구성",
      description: "YOLO 모델로 감지된 컨테이너 영역에서 Google Gemini AI를 활용하여 컨테이너 번호를 추출하는 OCR 시스템을 구축했습니다.",
      icon: <FileText className="h-6 w-6 text-orange-500" />,
      image: "/images/container_number_format.png"
    },
    {
      id: "5",
      date: "5단계",
      title: "실시간 처리 시스템 구축",
      description: "영상에서 컨테이너가 감지되면 해당 영역을 추출하여 OCR 모델에 입력하는 실시간 처리 시스템을 구축했습니다. 프레임 면적의 20% 이상을 차지하는 경우만 처리하고, 10초 간격으로 캡처하여 중복 인식을 방지합니다.",
      icon: <Settings className="h-6 w-6 text-red-500" />,
    },
    {
      id: "6",
      date: "6단계",
      title: "데이터 저장 및 관리 시스템",
      description: "인식된 컨테이너 번호와 시간 정보를 엑셀 파일에 기록하여 물류 관리자가 쉽게 확인하고 관리할 수 있는 시스템을 구축했습니다.",
      icon: <Database className="h-6 w-6 text-amber-500" />,
    },
    {
      id: "7",
      date: "7단계",
      title: "웹 인터페이스 구현",
      description: "Next.js와 Tailwind CSS를 사용하여 프로젝트 정보를 직관적으로 보여주는 웹 인터페이스를 구현했습니다.",
      icon: <Rocket className="h-6 w-6 text-indigo-500" />,
    },
  ];

  // Define gallery images
  const galleryImages: ImageItem[] = [
    {
      id: 1,
      title: "데이터셋 예시 1",
      src: "/images/dataset_example1.jpg",
      alt: "컨테이너 트럭 데이터셋 예시 1"
    },
    {
      id: 2,
      title: "데이터셋 예시 2",
      src: "/images/dataset_example2.jpg",
      alt: "컨테이너 트럭 데이터셋 예시 2"
    },
    {
      id: 3,
      title: "Roboflow 라벨링 예시",
      src: "/images/roboflow_labeling_example.png",
      alt: "Roboflow 라벨링 과정"
    },
    {
      id: 4,
      title: "Roboflow 데이터셋",
      src: "/images/roboflow_dataset.png",
      alt: "Roboflow에서 구성한 데이터셋"
    },
    {
      id: 5,
      title: "파인튜닝 과정",
      src: "/images/fine-tuning_colab.png",
      alt: "YOLO 모델 파인튜닝 과정"
    },
    {
      id: 6,
      title: "컨테이너 번호 형식",
      src: "/images/container_number_format.png",
      alt: "표준 컨테이너 번호 형식"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <ProjectBanner
        backgroundImage="/images/NGL_width.png"
        title="WandaVision YOLO 프로젝트"
        description="CCTV 영상을 활용하여 물류 창고나 항만 출입구에서 컨테이너 트럭의 출입을 자동으로 감지하고, 컨테이너 번호를 인식하여 기록하는 시스템"
        badge={{
          text: "AI 기반 물류 관리 솔루션",
          variant: "secondary",
        }}
        className="mb-12"
      />

      {/* Company Introduction */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-full md:w-1/2">
            <h2 className="text-3xl font-bold mb-4">NGL Transportation 기업 소개</h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-6">
              NGL Transportation은 2006년부터 운영되어온 종합 물류 서비스 제공업체입니다. 현재 미국 전역에서 화물 운송, 창고 관리, 트럭 운송, 특수 프로젝트 서비스 등을 제공하고 있습니다.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              캘리포니아, 애리조나, 텍사스, 조지아주에 설비를 갖추고 있으며, 300대 이상의 트럭과 1000대 이상의 섀시를 보유하고 있습니다. 또한 한국 서울에도 아시아 본부를 두고 있어 글로벌 기업들의 물류 요구를 충족시키고 있습니다.
            </p>
          </div>
          <div className="w-full md:w-1/2 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-lg overflow-hidden shadow-xl"
            >
              <Image 
                src="/images/NGL_width.png" 
                alt="NGL Logo" 
                width={500} 
                height={300} 
                className="object-contain"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Project Goals */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">프로젝트 목표</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              WandaVision YOLO 프로젝트의 핵심 목표는 물류 관리 효율성을 높이고, 인력에 의존하던 컨테이너 출입 기록을 자동화하여 인적 오류를 줄이는 것입니다.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {projectGoals.map((goal, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <ProjectGoal {...goal} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Timeline */}
      <section className="container mx-auto py-16">
        <h2 className="text-3xl font-bold text-center mb-12">프로젝트 진행 과정</h2>
        <Timeline items={timelineItems} />
      </section>

      {/* Image Gallery */}
      <section className="bg-background py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">프로젝트 갤러리</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryImages.map((image, index) => (
              <motion.div 
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-lg bg-background border border-border shadow-md"
              >
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  <Image 
                    src={image.src}
                    alt={image.alt || image.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-all duration-300 ease-in-out group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium">{image.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">WandaVision YOLO 모니터링 시스템 체험하기</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            물류 창고나 항만 출입구에서 컨테이너 트럭의 출입을 자동으로 감지하고, 실시간으로 모니터링 하는 시스템을 체험해보세요.
          </p>
          <Link href="/">
            <Button size="lg" className="gap-2">
              메인 화면으로 이동
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
} 