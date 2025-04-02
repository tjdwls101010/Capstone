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
    
    expect(homeLink).toBeInTheDocument();
    expect(aboutLink).toBeInTheDocument();
    
    expect(homeLink.closest('a')).toHaveAttribute('href', '/');
    expect(aboutLink.closest('a')).toHaveAttribute('href', '/about');
  });

  it('renders the logo', () => {
    render(<Navbar />);
    
    const logo = screen.getByAltText('NGL Logo');
    expect(logo).toBeInTheDocument();
    expect(logo.closest('a')).toHaveAttribute('href', '/');
  });
}); 