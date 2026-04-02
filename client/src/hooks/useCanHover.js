import { useEffect, useState } from 'react';

const getCanHover = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover)').matches;

const useCanHover = () => {
  const [canHover, setCanHover] = useState(getCanHover);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover)');
    const updateCanHover = () => setCanHover(mediaQuery.matches);

    updateCanHover();
    mediaQuery.addEventListener?.('change', updateCanHover);
    window.addEventListener('resize', updateCanHover);

    return () => {
      mediaQuery.removeEventListener?.('change', updateCanHover);
      window.removeEventListener('resize', updateCanHover);
    };
  }, []);

  return canHover;
};

export default useCanHover;