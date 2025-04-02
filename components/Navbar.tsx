import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="bg-background border-b border-border shadow-md py-4">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/images/logo.jpeg" 
            alt="WandaVision Logo" 
            width={40} 
            height={40} 
            className="object-contain rounded-full"
          />
          <span className="text-xl font-bold text-primary">WandaVision</span>
        </Link>
        
        <div className="flex space-x-6">
          <Link 
            href="/" 
            className="text-foreground hover:text-primary transition-colors font-medium"
          >
            홈
          </Link>
          <Link 
            href="/about" 
            className="text-foreground hover:text-primary transition-colors font-medium"
          >
            프로젝트 개요
          </Link>
        </div>
      </div>
    </nav>
  );
} 