export interface PaneWidths {
  left: number;
  right: number;
}

export const DEFAULT_PANE_WIDTHS: PaneWidths = {
  left: 336,
  right: 320,
};

const LEFT_PANEL_MIN = 296;
const LEFT_PANEL_MAX = 460;
const RIGHT_PANEL_MIN = 288;
const RIGHT_PANEL_MAX = 420;
const RESIZE_HANDLE_WIDTH = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getMinimumMainWidth(containerWidth: number) {
  return Math.min(820, Math.max(480, containerWidth - LEFT_PANEL_MIN - RIGHT_PANEL_MIN - RESIZE_HANDLE_WIDTH * 2));
}

export function clampPaneWidths(containerWidth: number, left: number, right: number): PaneWidths {
  const minMainWidth = getMinimumMainWidth(containerWidth);
  const maxRightForLeftMin = containerWidth - RESIZE_HANDLE_WIDTH * 2 - LEFT_PANEL_MIN - minMainWidth;
  const nextRight = clamp(
    right,
    RIGHT_PANEL_MIN,
    Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, maxRightForLeftMin)),
  );

  const maxLeft = containerWidth - RESIZE_HANDLE_WIDTH * 2 - nextRight - minMainWidth;
  const nextLeft = clamp(
    left,
    LEFT_PANEL_MIN,
    Math.max(LEFT_PANEL_MIN, Math.min(LEFT_PANEL_MAX, maxLeft)),
  );

  const maxRight = containerWidth - RESIZE_HANDLE_WIDTH * 2 - nextLeft - minMainWidth;
  return {
    left: nextLeft,
    right: clamp(
      nextRight,
      RIGHT_PANEL_MIN,
      Math.max(RIGHT_PANEL_MIN, Math.min(RIGHT_PANEL_MAX, maxRight)),
    ),
  };
}
