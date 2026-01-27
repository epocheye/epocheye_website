'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { useNotifications } from './NotificationContext';
import './notifications.css';

export default function NotificationToast() {
  const { newNotification, clearNewNotification } = useNotifications();

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (newNotification) {
      const timer = setTimeout(() => {
        clearNewNotification();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [newNotification, clearNewNotification]);

  return (
    <AnimatePresence>
      {newNotification && (
        <motion.div
          className="notification-toast"
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ 
            type: 'spring', 
            stiffness: 400, 
            damping: 30 
          }}
        >
          <div className="notification-icon">
            <Bell size={20} />
          </div>
          
          <div className="notification-content">
            <div className="notification-title">{newNotification.title}</div>
            <div className="notification-message">{newNotification.message}</div>
          </div>

          <button 
            className="notification-toast-close"
            onClick={clearNewNotification}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>

          {/* Progress bar for auto-dismiss */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
              borderRadius: '0 0 14px 14px',
              transformOrigin: 'left',
            }}
            initial={{ scaleX: 1 }}
            animate={{ scaleX: 0 }}
            transition={{ duration: 5, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
