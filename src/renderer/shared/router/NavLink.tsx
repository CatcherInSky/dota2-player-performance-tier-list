/**
 * 导航链接组件
 */

import React, { ReactNode } from 'react';

interface NavLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
}

export function NavLink({ to, children, className = '', activeClassName = '' }: NavLinkProps) {
  const currentPath = window.location.hash.slice(1) || '/';
  const isActive = currentPath === to;
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.hash = to;
  };

  const finalClassName = `${className} ${isActive ? activeClassName : ''}`.trim();

  return (
    <a href={`#${to}`} onClick={handleClick} className={finalClassName}>
      {children}
    </a>
  );
}

