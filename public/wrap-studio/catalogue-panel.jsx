/* Wrap Studio — Film library: search · brand tabs · finish filter · grid · specimen · quote */
(function () {
  const { useMemo } = React;
  const h = React.createElement;
  const I = window.Icon;

  // finish-true chip preview (gloss sweep / matte / chrome bands / shift gradient)
  function chipInner(sw) {
    if (sw.finish === 'chrome') {
      return h('span', { className: 'chrome', style: { '--c1': sw.hex, '--c2': sw.hex2 || sw.hex } });
    }
    if (sw.finish === 'shift') {
      return h('span', { className: 'gloss', style: { background: `linear-gradient(120deg,${sw.hex},${sw.hex2 || sw.hex})`, opacity: 1 } });
    }
    if (sw.finish === 'matte' || sw.finish === 'ppf-matte') return h('span', { className: 'matte' });
    return h('span', { className: 'gloss' });
  }
  function chipBg(sw) {
    if (sw.finish === 'chrome') return '#999';
    return sw.hex;
  }

  function Swatch(props) {
    const { sw, on, fav, onSelect, onFav } = props;
    return h('button', { className: 'swatch' + (on ? ' on' : ''), onClick: () => onSelect(sw),
      title: sw.name + ' · ' + sw.code },
      h('div', { className: 'sw-chip', style: { background: chipBg(sw) } },
        sw.swatchUrl ? h('img', { src: sw.swatchUrl, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', top: 0, left: 0, borderRadius: 'inherit' } }) : null,
        chipInner(sw),
        sw.hexConfidence === 'low' ? h('span', { className: 'sw-approx', title: 'Colour is approximate — ' + sw.finish + ' films shift with angle and light' }, '~') : null,
        h('span', { className: 'sw-tier' + (sw.tier === 'specialist' ? ' specialist' : '') }, sw.tier),
        h('span', { className: 'sw-fav' + (fav ? ' on' : ''), onClick: (e) => { e.stopPropagation(); onFav(sw); } },
          h(I.Heart, { size: 13, fill: fav ? 'currentColor' : 'none' }))),
      h('div', { className: 'sw-meta' },
        h('div', { className: 'sw-name' }, sw.name),
        h('div', { className: 'sw-code' }, sw.code)));
  }

  function CataloguePanel(props) {
    const { query, setQuery, brandTab, setBrandTab, finish, setFinish, favOnly, setFavOnly,
            selectedId, onSelect, favs, toggleFav, pins, togglePin, openCompare,
            panelColors, activePanel, panels, onQuote } = props;

    const all = window.WRAP_CATALOGUE;
    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      return all.filter((s) => {
        if (brandTab !== 'All' && s.brand !== brandTab) return false;
        if (finish !== 'all' && s.finish !== finish) return false;
        if (favOnly && !favs[s.id]) return false;
        if (q && !(s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.series.toLowerCase().includes(q))) return false;
        return true;
      });
    }, [all, brandTab, finish, favOnly, query, favs]);

    const sel = selectedId ? all.find((s) => s.id === selectedId) : null;

    // assigned panels (used for quote footer display)
    const assigned = Object.values(panelColors).map((id) => all.find((s) => s.id === id)).filter(Boolean);
    const activePanelLabel = (panels.find((p) => p.key === activePanel) || {}).label || 'Full body';
    const assignedCount = assigned.length;

    return h('aside', { className: 'panel' },
      // head + search
      h('div', { className: 'panel-head' },
        h('div', { className: 'panel-kicker' }, 'Film library'),
        h('div', { className: 'panel-title' },
          h('div', { className: 't' }, 'Choose your film'),
          h('div', { className: 'ct' }, filtered.length + ' / ' + all.length)),
        h('div', { className: 'search' },
          h(I.Search, null),
          h('input', { value: query, placeholder: 'Search name, series or code',
            onChange: (e) => setQuery(e.target.value) }),
          query ? h('button', { className: 'clr', onClick: () => setQuery('') }, h(I.X, { size: 14 })) : null)),

      // brand segmented control
      h('div', { className: 'brand-tabs' },
        ['All'].concat(window.BRANDS).map((b) =>
          h('button', { key: b, className: brandTab === b ? 'on' : '', onClick: () => setBrandTab(b) },
            b === 'Avery Dennison' ? 'Avery' : b))),

      // finish filter
      h('div', { className: 'finish-row' },
        h('button', { className: 'fchip' + (finish === 'all' && !favOnly ? ' on' : ''),
          onClick: () => { setFinish('all'); setFavOnly(false); } }, 'All'),
        window.FINISHES.map((f) =>
          h('button', { key: f.key, className: 'fchip' + (finish === f.key ? ' on' : ''),
            onClick: () => setFinish(f.key) }, f.label)),
        h('button', { className: 'fchip' + (favOnly ? ' on' : ''), onClick: () => setFavOnly(!favOnly) },
          '♥ Saved')),

      // grid
      h('div', { className: 'cat-scroll' },
        filtered.length
          ? h('div', { className: 'grid' },
              filtered.map((sw) => h(Swatch, { key: sw.id, sw, on: sw.id === selectedId,
                fav: !!favs[sw.id], onSelect, onFav: toggleFav })))
          : h('div', { className: 'cat-empty' }, 'No films match. Try another brand or finish.')),

      // specimen detail + compare + quote
      h('div', { className: 'panel-foot' },
        sel ? h('div', { className: 'detail show' },
          h('div', { className: 'd-top' },
            h('div', { className: 'd-chip', style: { background: chipBg(sel) } }, chipInner(sel)),
            h('div', { style: { minWidth: 0, flex: 1 } },
              h('div', { className: 'd-name' }, sel.name),
              h('div', { className: 'd-series' }, sel.brand + ' · ' + sel.series + ' · ' + sel.code),
              h('div', { className: 'd-actions' },
                h('button', { className: 'btn btn--sm btn--ghost', onClick: () => toggleFav(sel) },
                  h(I.Heart, { size: 12, fill: favs[sel.id] ? 'currentColor' : 'none' }), favs[sel.id] ? 'Saved' : 'Save'),
                h('button', { className: 'btn btn--sm btn--ghost', onClick: () => togglePin(sel),
                  disabled: !pins.includes(sel.id) && pins.filter(Boolean).length >= 4 },
                  h(I.Plus, { size: 12 }), pins.includes(sel.id) ? 'Pinned' : 'Pin')))),
          h('div', { className: 'd-specs' },
            h('div', { className: 'd-spec' }, h('div', { className: 'k' }, 'Thickness'), h('div', { className: 'v' }, sel.thickness)),
            h('div', { className: 'd-spec' }, h('div', { className: 'k' }, 'Conform.'), h('div', { className: 'v' }, sel.conform)),
            h('div', { className: 'd-spec' }, h('div', { className: 'k' }, 'Warranty'), h('div', { className: 'v' }, sel.warranty))),
          sel.proTip ? h('div', { className: 'd-tip' },
            h(I.Info, { size: 15 }),
            h('p', null, h('b', null, 'Pro tip: '), sel.proTip)) : null) : null,

        // compare pins
        h('div', { className: 'pins' },
          h('span', { className: 'pl' }, 'Compare'),
          h('div', { className: 'pin-list' },
            [0, 1, 2, 3].map((i) => {
              const id = pins[i];
              const ps = id ? all.find((s) => s.id === id) : null;
              return ps
                ? h('div', { key: i, className: 'pin', title: ps.name + ' · tap to remove',
                    style: { background: chipBg(ps) }, onClick: () => togglePin(ps) })
                : h('div', { key: i, className: 'pin-empty' });
            })),
          h('button', { className: 'btn btn--sm cmp', disabled: pins.filter(Boolean).length < 2,
            style: pins.filter(Boolean).length < 2 ? { opacity: .4, cursor: 'default' } : null,
            onClick: openCompare }, h(I.Compare, { size: 13 }), 'View 2×2')),

        // quote footer
        h('div', { className: 'quote' },
          h('div', { className: 'quote-row' },
            h('div', { className: 'quote-sel' },
              h('div', { className: 'ql' }, assignedCount > 1 ? assignedCount + ' panels assigned' : 'Applying to'),
              h('div', { className: 'qv' },
                sel ? h('span', { className: 'swdot', style: { background: chipBg(sel) } }) : null,
                sel ? sel.name : 'Pick a film',
                h('span', { className: 'pn' }, ' · ' + activePanelLabel)))),
          h('button', { className: 'btn btn--primary', disabled: !sel, onClick: onQuote },
            h(I.Send, { size: 15 }), 'Get a quote for this wrap'))));
  }

  window.CataloguePanel = CataloguePanel;
  window.swChipBg = chipBg;
  window.swChipInner = chipInner;
})();
