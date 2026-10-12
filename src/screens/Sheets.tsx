import { motion, useDragControls } from 'motion/react';
import { type ReactNode } from 'react';

export function Sheet({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const controls = useDragControls();
  return (
    <>
      <motion.div className="scrim" style={{ position: 'fixed' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="sheet" style={{ position: 'fixed' }} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        drag="y" dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={(_, i) => { if (i.offset.y > 120 || i.velocity.y > 600) onClose(); }}>
        <div className="grabzone" onPointerDown={e => controls.start(e)}><div className="grab" /></div>
        {children}
      </motion.div>
    </>
  );
}
