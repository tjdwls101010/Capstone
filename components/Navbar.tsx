"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  
  return (
    <nav className="bg-background/90 backdrop-blur-sm border-b border-border shadow-md py-4 fixed w-full top-0 z-50">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/images/logo.jpeg" 
            alt="WandaVision Logo" 
            width={40} 
            height={40} 
            className="object-contain rounded-full border-2 border-primary/50"
          />
          <span className="text-xl font-bold text-primary">WandaVision</span>
        </Link>
        
        <div className="flex space-x-6">
          <Link 
            href="/" 
            className={`transition-colors font-medium ${
              pathname === '/' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-foreground hover:text-primary'
            }`}
          >
            홈
          </Link>
          <Link 
            href="/about" 
            className={`transition-colors font-medium ${
              pathname === '/about' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-foreground hover:text-primary'
            }`}
          >
            프로젝트 개요
          </Link>
          <Link 
            href="/video" 
            className={`transition-colors font-medium ${
              pathname === '/video' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-foreground hover:text-primary'
            }`}
          >
            비디오처리
          </Link>
        </div>
      </div>
    </nav>
  );
} 