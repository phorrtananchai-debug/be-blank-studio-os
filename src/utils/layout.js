export function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function easeOutCubic(value) {
  const clampedValue = clampNumber(value, 0, 1);
  return 1 - Math.pow(1 - clampedValue, 3);
}

export function normalizeLayoutPercent(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : fallback;
}

export function toLayoutNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getPortfolioLayout(item, index) {
  const defaultLayouts = [
    { x: 7, y: 8, width: 24, height: 34, zIndex: 3 },
    { x: 70, y: 18, width: 18, height: 26, zIndex: 3 },
    { x: 18, y: 58, width: 15, height: 19, zIndex: 2 },
    { x: 57, y: 62, width: 22, height: 20, zIndex: 2 },
  ];
  const scatteredLayout = defaultLayouts[index % defaultLayouts.length];
  const defaultLayout = {
    ...scatteredLayout,
    y: scatteredLayout.y + Math.floor(index / defaultLayouts.length) * 78,
  };
  const hasLegacyPixelLayout = Number(item.width) > 100 || Number(item.height) > 100;
  const rawX = hasLegacyPixelLayout ? defaultLayout.x : normalizeLayoutPercent(item.x, defaultLayout.x);
  const rawY = hasLegacyPixelLayout ? defaultLayout.y : toLayoutNumber(item.y, defaultLayout.y);
  const rawWidth = hasLegacyPixelLayout ? defaultLayout.width : normalizeLayoutPercent(item.width, defaultLayout.width);
  const rawHeight = hasLegacyPixelLayout ? defaultLayout.height : normalizeLayoutPercent(item.height, defaultLayout.height);
  const rawZIndex = hasLegacyPixelLayout ? defaultLayout.zIndex : toLayoutNumber(item.zIndex, defaultLayout.zIndex);

  return {
    x: clampNumber(rawX, 2, 84),
    y: clampNumber(rawY, 4, 320),
    width: clampNumber(rawWidth, 14, 42),
    height: clampNumber(rawHeight, 14, 48),
    zIndex: clampNumber(Math.round(rawZIndex), 1, 20),
  };
}

export function hasExplicitPortfolioLayout(item) {
  return ['x', 'y', 'width', 'height'].every((key) => item[key] !== undefined && item[key] !== '');
}

export function getAutoPortfolioLayout(existingItems = []) {
  const layouts = existingItems.map((item, index) => getPortfolioLayout(item, index));
  const lastLayout = layouts.sort((left, right) => (left.y + left.height) - (right.y + right.height)).at(-1);
  const index = existingItems.length;
  const isLeft = index % 2 === 0;
  const verticalBase = lastLayout ? lastLayout.y + lastLayout.height + 18 : 8;
  const rhythmOffset = index % 4 === 1 ? 10 : index % 4 === 2 ? 4 : 0;
  const width = isLeft ? 24 : 20;
  const height = isLeft ? 34 : 28;

  return {
    x: isLeft ? 8 + (index % 3) * 5 : 63 - (index % 3) * 4,
    y: Math.max(8, verticalBase + rhythmOffset),
    width,
    height,
    zIndex: clampNumber((lastLayout?.zIndex || 2) + 1, 1, 20),
  };
}

export function getNormalizedPortfolioLayouts(items = []) {
  return items.reduce((layouts, item, index) => {
    if (hasExplicitPortfolioLayout(item)) {
      return { ...layouts, [item.id]: getPortfolioLayout(item, index) };
    }

    const previousItems = items.slice(0, index).map((previousItem) => ({
      ...previousItem,
      ...(layouts[previousItem.id] ? stringifyLayout(layouts[previousItem.id]) : {}),
    }));

    return { ...layouts, [item.id]: getAutoPortfolioLayout(previousItems) };
  }, {});
}

export function getNextInteractionLayout(mode, initial, dxPercent, dyPercent) {
  if (mode === 'resize-se') {
    return {
      width: clampNumber(initial.width + dxPercent, 14, 42),
      height: clampNumber(initial.height + dyPercent, 14, 48),
    };
  }

  if (mode === 'resize-sw') {
    const width = clampNumber(initial.width - dxPercent, 14, 42);
    return {
      x: clampNumber(initial.x + (initial.width - width), 2, 84),
      width,
      height: clampNumber(initial.height + dyPercent, 14, 48),
    };
  }

  if (mode === 'resize-ne') {
    const height = clampNumber(initial.height - dyPercent, 14, 48);
    return {
      y: clampNumber(initial.y + (initial.height - height), 5, 78),
      width: clampNumber(initial.width + dxPercent, 14, 42),
      height,
    };
  }

  if (mode === 'resize-nw') {
    const width = clampNumber(initial.width - dxPercent, 14, 42);
    const height = clampNumber(initial.height - dyPercent, 14, 48);
    return {
      x: clampNumber(initial.x + (initial.width - width), 2, 84),
      y: clampNumber(initial.y + (initial.height - height), 5, 78),
      width,
      height,
    };
  }

  return {
    x: clampNumber(initial.x + dxPercent, 2, 84),
    y: clampNumber(initial.y + dyPercent, 4, 320),
  };
}

export function getPortfolioImageObjectPosition(index) {
  return ['50% 44%', '58% 50%', '44% 60%', '52% 42%'][index % 4];
}

export function stringifyLayout(layout) {
  return {
    x: String(Math.round(layout.x * 10) / 10),
    y: String(Math.round(layout.y * 10) / 10),
    width: String(Math.round(layout.width * 10) / 10),
    height: String(Math.round(layout.height * 10) / 10),
    zIndex: String(Math.round(layout.zIndex)),
  };
}

export function getMaxLayer(items) {
  return Math.max(1, ...items.map((item, index) => getPortfolioLayout(item, index).zIndex));
}
