import React, { useEffect, useState } from 'react';
import { Shield, EyeOff, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SecurityGuardProps {
  children: React.ReactNode;
  active?: boolean;
}

export function SecurityGuard({ children, active = true }: SecurityGuardProps) {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!active) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Print Screen (doesn't stop OS but can clear clipboard)
      if (e.key === 'PrintScreen') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('Content Protected by LearningX').catch(() => {});
        }
        return false;
      }

      // Block Shortcuts
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (
        (cmdOrCtrl && e.key === 's') || // Save
        (cmdOrCtrl && e.key === 'p') || // Print
        (cmdOrCtrl && e.key === 'u') || // View Source
        (cmdOrCtrl && e.shiftKey && e.key === 'I') || // DevTools
        (cmdOrCtrl && e.shiftKey && e.key === 'J') || // DevTools Console
        (cmdOrCtrl && e.shiftKey && e.key === 'C') || // DevTools Inspect
        e.key === 'F12' // DevTools
      ) {
        e.preventDefault();
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 2000);
        return false;
      }
    };

    // Add event listeners
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return (
    <div className="relative h-full w-full select-none" style={{ WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none', userSelect: 'none' }}>
      {children}

      {/* Shortcut Warning */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] bg-rose-600 text-white px-6 py-3 rounded-2xl flex items-center space-x-3 shadow-2xl shadow-rose-900/40 border border-rose-400/20"
          >
            <Lock className="w-5 h-5 flex-shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-widest">Security Restriction Applied</span>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* Extra layer of protection: prevent CSS inspection tricks */
        * {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </div>
  );
}
