import { useEffect, useState } from 'react';

function usePostingStatusNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  return now;
}

export default usePostingStatusNow;
