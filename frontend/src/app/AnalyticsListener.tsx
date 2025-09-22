// app/analytics-listener.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { logEvent } from 'firebase/analytics';
import { initAnalytics } from '../../lib/firebase';

export default function AnalyticsListener() {
  const pathname = usePathname(); 

  useEffect(() => {
    (async () => {
      const analytics = await initAnalytics(); 
      if (!analytics) return;               
      logEvent(analytics, 'page_view', {
        page_location: window.location.href, 
        page_path: pathname,        
        page_title: document.title,   
      });
    })();
  }, [pathname]);       

  return null;
}
