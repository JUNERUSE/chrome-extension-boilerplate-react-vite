import { useAnimation } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

export interface DragState {
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
}

export interface DragAndDropState {
  isDragging: boolean;
  controls: ReturnType<typeof useAnimation>;
  handleDragEnter: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
}

export const useDragAndDrop = (onFileDrop: (file: File) => void): DragAndDropState => {
  const [isDragging, setIsDragging] = useState(false);
  const controls = useAnimation();

  // 重置拖拽状态
  const resetDragState = useCallback(
    (dragState: DragState) => {
      const { setIsDragging } = dragState;
      setIsDragging(false);
      controls.start({
        scale: 1,
        transition: { duration: 0.1 },
      });
    },
    [controls],
  );

  // 处理全局拖拽事件
  useEffect(() => {
    const dragState: DragState = { isDragging, setIsDragging };

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging && e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
        controls.start({
          scale: 1,
          transition: { duration: 0.1 },
        });
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        resetDragState(dragState);
      }
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      resetDragState(dragState);

      const file = e.dataTransfer?.files[0];
      if (file) {
        onFileDrop(file);
      }
    };

    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, [isDragging, controls, onFileDrop, resetDragState]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      controls.start({
        scale: 1,
        transition: { duration: 0.2 },
      });
    },
    [controls],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.relatedTarget as Node | null;
      const dropzone = e.currentTarget as HTMLElement;
      if (!target || !dropzone.contains(target)) {
        setIsDragging(false);
        controls.start({
          scale: 1,
          transition: { duration: 0.2 },
        });
      }
    },
    [controls],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      controls.start({
        scale: 1,
        transition: { duration: 0.2 },
      });

      const file = e.dataTransfer.files[0];
      if (file) {
        onFileDrop(file);
      }
    },
    [controls, onFileDrop],
  );

  return {
    isDragging,
    controls,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
};
