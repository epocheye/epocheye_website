'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from './NotificationContext';
import NotificationPanel from './NotificationPanel';
import './notifications.css';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount, isConnected } = useNotifications();
  const bellRef = useRef(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div ref={bellRef} style={{ position: 'relative' }}>
      <motion.button
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.95 }}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              className="notification-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {displayCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <NotificationPanel 
              onClose={() => setIsOpen(false)} 
              isConnected={isConnected}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
