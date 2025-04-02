"use client";

import { Button } from "@/components/ui/button";
import { DemoHeroGeometric } from "@/components/ui/shape-landing-demo";
import Link from "next/link";

export default function Home() {
  return (
    <div>
      <DemoHeroGeometric />
      
      <div className="absolute bottom-12 w-full flex justify-center gap-4 z-20">
        <Button asChild className="bg-primary/80 hover:bg-primary/90 text-white font-medium px-8 py-6 text-lg">
          <Link href="/video">비디오 처리 대시보드</Link>
        </Button>
        
        <Button asChild variant="outline" className="border-white/20 bg-black/30 text-white hover:bg-black/40 font-medium px-8 py-6 text-lg">
          <Link href="/about">프로젝트 개요</Link>
        </Button>
      </div>
    </div>
  );
}
