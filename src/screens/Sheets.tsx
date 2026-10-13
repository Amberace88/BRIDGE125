import { motion, useDragControls } from 'motion/react';
import { useEffect, type ReactNode } from 'react';

export function Sheet({ children, onClose, closeLabel = 'Close' }: { children: ReactNode; onClose: () => void; closeLabel?: string }) {
  const controls = useDragControls();
  // Esc closes every sheet (desktop)
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <motion.div className="scrim" style={{ position: 'fixed' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet" style={{ position: 'fixed' }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        drag="y" dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose(); }}>
        <div className="grabzone" onPointerDown={e => controls.start(e)}><div className="grab" /></div>
        {/* always-visible close (sticky in the sheet's top-right corner, also while scrolled) */}
        <div className="sheet-xbar"><button type="button" className="sheet-x" aria-label={closeLabel} title={closeLabel} onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button></div>
        {children}
      </motion.div>
    </>
  );
}
