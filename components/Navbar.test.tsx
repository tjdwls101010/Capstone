import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} />;
  },
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('Navbar', () => {
  it('renders the navigation links', () => {
    render(<Navbar />);
    
    const homeLink = screen.getByText('홈');
    const aboutLink = screen.getByText('프로젝트 개요');
    const videoLink = screen.getByText('비디오처리');
    
    expect(homeLink).toBeInTheDocument();
    expect(aboutLink).toBeInTheDocument();
    expect(videoLink).toBeInTheDocument();
    
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
    expect(aboutLink.closest('a')).toHaveAttribute('href', '/about');
    expect(videoLink.closest('a')).toHaveAttribute('href', '/video');
  });

  it('renders the logo', () => {
    render(<Navbar />);
    
    const logo = screen.getByAltText('WandaVision Logo');
    expect(logo).toBeInTheDocument();
    expect(logo.closest('a')).toHaveAttribute('href', '/');
  });
}); 