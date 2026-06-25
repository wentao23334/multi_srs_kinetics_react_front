import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { clampPaneWidths, DEFAULT_PANE_WIDTHS, type PaneWidths } from '../lib/layoutUtils';

const LAYOUT_STORAGE_KEY = 'multi-srs-layout-widths';

export type ResizeSide = 'left' | 'right';

function readStoredPaneWidths() {
  if (typeof window === 'undefined') return DEFAULT_PANE_WIDTHS;

  try {
    const raw = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) return DEFAULT_PANE_WIDTHS;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.left === 'number' && typeof parsed?.right === 'number') {
      return { left: parsed.left, right: parsed.right };
    }
  } catch {
    // Ignore invalid persisted layout state.
  }

  return DEFAULT_PANE_WIDTHS;
}

export function useResizablePanes() {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    side: ResizeSide;
    startX: number;
    startLeft: number;
    startRight: number;
  } | null>(null);

  const [draggingSide, setDraggingSide] = useState<ResizeSide | null>(null);
  const [paneWidths, setPaneWidths] = useState<PaneWidths>(readStoredPaneWidths);

  useEffect(() => {
    const updateLayoutBounds = () => {
      const containerWidth = layoutRef.current?.clientWidth;
      if (!containerWidth) return;
      setPaneWidths((prev) => clampPaneWidths(containerWidth, prev.left, prev.right));
    };

    updateLayoutBounds();
    window.addEventListener('resize', updateLayoutBounds);
    return () => {
      window.removeEventListener('resize', updateLayoutBounds);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(paneWidths));
  }, [paneWidths]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = dragRef.current;
      const containerWidth = layoutRef.current?.clientWidth;
      if (!dragState || !containerWidth) return;

      const delta = event.clientX - dragState.startX;
      const nextLeft = dragState.side === 'left' ? dragState.startLeft + delta : dragState.startLeft;
      const nextRight = dragState.side === 'right' ? dragState.startRight - delta : dragState.startRight;
      setPaneWidths(clampPaneWidths(containerWidth, nextLeft, nextRight));
    };

    const stopResize = () => {
      dragRef.current = null;
      setDraggingSide(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);

  const handleResizeStart = (side: ResizeSide) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    if (event.pointerType === 'touch') return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      side,
      startX: event.clientX,
      startLeft: paneWidths.left,
      startRight: paneWidths.right,
    };
    setDraggingSide(side);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  return {
    layoutRef,
    paneWidths,
    draggingSide,
    handleResizeStart,
  };
}
