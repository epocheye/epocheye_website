"use client";

// Web Vitals performance monitoring
export function reportWebVitals(metric) {
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  }

  // Send to analytics in production
  // You can send to Google Analytics, custom endpoint, etc.
  const { name, value, id } = metric;
  
  // Example: Send to analytics
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', name, {
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true,
    });
  }
}

// Performance observer for additional metrics
export function setupPerformanceObserver() {
  if (typeof window === 'undefined') return;

  // Observe long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Long tasks not supported
    }
  }
}
