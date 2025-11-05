/**
 * 简单的Hash路由器实现
 * 用于Desktop Window的页面导航
 */

import React, { useState, useEffect, ReactNode } from 'react';

export interface Route {
  path: string;
  component: React.ComponentType;
}

interface RouterProps {
  routes: Route[];
  fallback?: React.ComponentType;
}

export function Router({ routes, fallback: Fallback }: RouterProps) {
  const [currentPath, setCurrentPath] = useState(getHashPath());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getHashPath());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const route = routes.find((r) => r.path === currentPath);
  
  if (route) {
    const Component = route.component;
    return <Component />;
  }

  if (Fallback) {
    return <Fallback />;
  }

  // 默认重定向到第一个路由
  if (routes.length > 0) {
    window.location.hash = routes[0].path;
    return null;
  }

  return <div>No routes configured</div>;
}

function getHashPath(): string {
  const hash = window.location.hash;
  return hash ? hash.slice(1) : '/';
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function getCurrentPath(): string {
  return getHashPath();
}

