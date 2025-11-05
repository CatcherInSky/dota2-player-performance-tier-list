/**
 * 路由Hook
 */

import { useState, useEffect } from 'react';

export function useRouter() {
  const [currentPath, setCurrentPath] = useState(getHashPath());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getHashPath());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
  };

  return {
    currentPath,
    navigate,
  };
}

function getHashPath(): string {
  const hash = window.location.hash;
  return hash ? hash.slice(1) : '/';
}

