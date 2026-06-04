/* Wrap Studio — inline lucide-style icons (1.6 stroke) */
(function () {
  const S = (paths, vb) => (props) => {
    const { size = 18, fill = 'none', ...rest } = props || {};
    return React.createElement('svg', {
      width: size, height: size, viewBox: vb || '0 0 24 24', fill,
      stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round',
      ...rest,
    }, paths.map((d, i) => React.createElement('path', { key: i, d })));
  };
  const Multi = (els) => (props) => {
    const { size = 18, ...rest } = props || {};
    return React.createElement('svg', {
      width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', ...rest,
    }, els);
  };
  const h = React.createElement;

  window.Icon = {
    Upload: S(['M12 16V4', 'M7 9l5-5 5 5', 'M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3']),
    Bolt: S(['M13 2 4 14h7l-1 8 9-12h-7l1-8z']),
    Sparkle: S(['M12 3v4M12 17v4M3 12h4M17 12h4', 'M6.5 6.5l2.5 2.5M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5']),
    Search: Multi([h('circle', { key: 'c', cx: 11, cy: 11, r: 7 }), h('path', { key: 'p', d: 'm21 21-4.3-4.3' })]),
    X: S(['M18 6 6 18M6 6l12 12']),
    Star: S(['M12 3l2.6 5.6 6 .8-4.4 4.1 1.1 6L12 16.8 6.7 19.6l1.1-6L3.4 9.4l6-.8L12 3z']),
    Heart: S(['M19 5.5a4.4 4.4 0 0 0-6.2 0L12 6.3l-.8-.8A4.4 4.4 0 1 0 5 11.7l7 7 7-7a4.4 4.4 0 0 0 0-6.2z']),
    Share: Multi([
      h('circle', { key: 1, cx: 18, cy: 5, r: 2.4 }), h('circle', { key: 2, cx: 6, cy: 12, r: 2.4 }),
      h('circle', { key: 3, cx: 18, cy: 19, r: 2.4 }),
      h('path', { key: 4, d: 'm8.1 13.2 7.8 4.6M15.9 6.2 8.1 10.8' }),
    ]),
    Save: S(['M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z', 'M17 21v-8H7v8M7 3v5h8']),
    Send: S(['M22 2 11 13', 'M22 2 15 22l-4-9-9-4 20-7z']),
    Download: S(['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14']),
    Compare: Multi([
      h('rect', { key: 1, x: 3, y: 5, width: 18, height: 14, rx: 1.5 }),
      h('path', { key: 2, d: 'M12 4v16' }),
    ]),
    Split: S(['M12 3v18', 'M5 8l-3 4 3 4M19 8l3 4-3 4']),
    Plus: S(['M12 5v14M5 12h14']),
    Minus: S(['M5 12h14']),
    Layers: S(['M12 2 2 7l10 5 10-5-10-5z', 'M2 12l10 5 10-5', 'M2 17l10 5 10-5']),
    Info: Multi([h('circle', { key: 1, cx: 12, cy: 12, r: 9 }), h('path', { key: 2, d: 'M12 16v-4M12 8h.01' })]),
    Image: Multi([
      h('rect', { key: 1, x: 3, y: 3, width: 18, height: 18, rx: 2 }),
      h('circle', { key: 2, cx: 8.5, cy: 8.5, r: 1.4 }), h('path', { key: 3, d: 'm21 15-5-5L5 21' }),
    ]),
    Check: S(['M20 6 9 17l-5-5']),
    Crop: S(['M6 2v14a2 2 0 0 0 2 2h14', 'M18 22V8a2 2 0 0 0-2-2H2']),
    Refresh: S(['M21 12a9 9 0 1 1-2.6-6.4', 'M21 3v5h-5']),
    Chevron: S(['m9 18 6-6-6-6']),
  };
})();
