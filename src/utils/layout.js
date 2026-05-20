export function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function easeOutCubic(value) {
  const clampedValue = clampNumber(value, 0, 1);
  return 1 - Math.pow(1 - clampedValue, 3);
}

export function normalizeLayoutPercent(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function toLayoutNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getPortfolioLayout(item, index) {
  const defaultLayouts = [
    { x: -8, y: -22, width: 28, height: 38, zIndex: 3 },
    { x: 72, y: -6, width: 24, height: 30, zIndex: 4 },
    { x: 16, y: 42, width: 17, height: 22, zIndex: 2 },
    { x: 56, y: 34, width: 26, height: 24, zIndex: 2 },
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
  const width = clampNumber(rawWidth, 10, 58);
  const height = clampNumber(rawHeight, 10, 70);
  const visibleX = Math.min(14, width * 0.62);
  const visibleY = Math.min(18, height * 0.62);

  return {
    x: clampNumber(rawX, -width + visibleX, 100 - visibleX),
    y: clampNumber(rawY, -height + visibleY, 520),
    width,
    height,
    zIndex: clampNumber(Math.round(rawZIndex), 1, 40),
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
  const width = isLeft ? 28 : 23;
  const height = isLeft ? 38 : 30;

  return {
    x: isLeft ? -6 + (index % 3) * 7 : 66 - (index % 3) * 5,
    y: Math.max(-18, verticalBase + rhythmOffset),
    width,
    height,
    zIndex: clampNumber((lastLayout?.zIndex || 2) + 1, 1, 40),
  };
}

export function getNormalizedPortfolioLayouts(items = []) {
  return items.reduce((layouts, item, index) => {
    if (hasExplicitPortfolioLayout(item)) {
      return { ...layouts, [item.id]: getPortfolioLayout(item, index) };
    }

    const previousItems = items.slice(0, index).map((previousItem, previousIndex) => ({
      ...previousItem,
      ...(layouts[previousItem.id] ? stringifyLayout(layouts[previousItem.id]) : {}),
    }));

    return { ...layouts, [item.id]: getAutoPortfolioLayout(previousItems) };
  }, {});
}

export function getNextInteractionLayout(mode, initial, dxPercent, dyPercent) {
  const constrain = (layout) => {
    const width = clampNumber(layout.width ?? initial.width, 10, 58);
    const height = clampNumber(layout.height ?? initial.height, 10, 70);
    const visibleX = Math.min(14, width * 0.62);
    const visibleY = Math.min(18, height * 0.62);
    return {
      ...layout,
      width,
      height,
      x: clampNumber(layout.x ?? initial.x, -width + visibleX, 100 - visibleX),
      y: clampNumber(layout.y ?? initial.y, -height + visibleY, 520),
    };
  };

  if (mode === 'resize-se') {
    return constrain({
      ...initial,
      width: initial.width + dxPercent,
      height: initial.height + dyPercent,
    });
  }

  if (mode === 'resize-sw') {
    const width = clampNumber(initial.width - dxPercent, 10, 58);
    return constrain({
      ...initial,
      x: initial.x + (initial.width - width),
      width,
      height: initial.height + dyPercent,
    });
  }

  if (mode === 'resize-ne') {
    const height = clampNumber(initial.height - dyPercent, 10, 70);
    return constrain({
      ...initial,
      y: initial.y + (initial.height - height),
      width: initial.width + dxPercent,
      height,
    });
  }

  if (mode === 'resize-nw') {
    const width = clampNumber(initial.width - dxPercent, 10, 58);
    const height = clampNumber(initial.height - dyPercent, 10, 70);
    return constrain({
      ...initial,
      x: initial.x + (initial.width - width),
      y: initial.y + (initial.height - height),
      width,
      height,
    });
  }

  return constrain({
    ...initial,
    x: initial.x + dxPercent,
    y: initial.y + dyPercent,
  });
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
    zIndex: String(clampNumber(Math.round(layout.zIndex), 1, 40)),
  };
}

export function getMaxLayer(items) {
  return Math.max(1, ...items.map((item, index) => getPortfolioLayout(item, index).zIndex));
}
