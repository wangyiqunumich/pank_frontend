/* Offline navigation canvas. The editable hierarchy lives in navigation-data.js. */
const NavigationTree = (() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {page:'Page', state:'View / state', overlay:'Overlay', error:'Recovery', group:'Section', external:'External exit'};
  const W = 222, H = 96, GAP = 110, ROW = 24, PAD = 32;

  function mount(host, atlas, requested) {
    const source = NAVIGATION_MAP;
    const nodes = new Map(), parents = new Map(), order = new Map();
    const screens = new Map(atlas.pages.map(p => [p.id, p]));
    function index(node, parent, depth = 0) {
      order.set(node.id, nodes.size); nodes.set(node.id, node);
      if (parent) parents.set(node.id, parent);
      (node.children || []).forEach(child => index(child, node.id, depth + 1));
    }
    index(source.root);
    const descendants = node => [node, ...(node.children || []).flatMap(descendants)];
    const count = node => descendants(node).filter(n => n.screen).length;
    const path = id => parents.has(id) ? [...path(parents.get(id)), id] : [id];
    let selected = nodes.has(requested) ? requested : source.root.id;
    let scope = source.root.id, zoom = 1, query = '', coordinates = [], size = {width:1, height:1};
    const expanded = new Set([source.root.id]);
    path(selected).slice(0, -1).forEach(id => expanded.add(id));
    host.innerHTML = `
      <section class="tree-heading"><div><div class="eyebrow">Explore the structure</div><h1>Navigation tree</h1>
        <p>Follow a journey, open its states, then jump into the screen you want to improve.</p></div>
        <span class="tree-total">${atlas.pages.length} captured screens <span>·</span> one connected map</span></section>
      <div class="tree-workspace">
        <div class="tree-tools"><label class="tree-search"><span>Find in tree</span><input id="treeSearch" type="search" placeholder="Page, route or error…" autocomplete="off"></label>
          <label class="tree-scope"><span>Focus on</span><select id="treeScope"><option value="${source.root.id}">Full site</option>${source.root.children.map(n => `<option value="${escape(n.id)}">${escape(n.title)}</option>`).join('')}</select></label>
          <div class="tree-actions"><button id="treeExpand">Expand all</button><button id="treeCollapse">Collapse all</button></div>
        </div>
        <div class="tree-search-results" id="treeSearchResults" aria-live="polite" hidden></div>
        <div class="tree-legend"><span><i class="legend-page"></i>Page</span><span><i class="legend-state"></i>View / overlay</span><span><i class="legend-error"></i>Recovery</span><span><i class="legend-group"></i>Section / exit</span><span class="legend-note">Lines show the primary hierarchy. Other paths appear in the detail panel.</span></div>
        <div class="tree-body"><section class="tree-map" aria-label="Interactive page hierarchy">
          <div class="tree-map-top"><span id="treeVisible" role="status"></span><span>Click a card to inspect · + to unfold</span></div>
          <div class="tree-viewport" id="treeViewport" tabindex="0" aria-label="Scrollable navigation diagram"><div id="treeExtent" class="tree-extent"><div id="treeCanvas" class="tree-canvas"></div></div></div>
          <div class="tree-map-bottom"><span id="treeLocation">Full site</span><div class="tree-zoom"><button id="treeZoomOut" aria-label="Zoom out">−</button><output id="treeZoomValue" aria-live="polite">100%</output><button id="treeZoomIn" aria-label="Zoom in">+</button><button id="treeFit">Fit</button><button id="treeReset">100%</button></div></div>
        </section><section class="tree-detail" id="treeDetail" aria-label="Selected node details" aria-live="polite"></section></div>
      </div>
      <div class="tree-footnote"><b>Reading the map.</b> A section groups related screens; it is not an extra application page. Tabs, dialogs and loading states can share the same URL. The tree covers the existing captured interface; follow-up, shared result and recovery paths are listed separately so they do not create misleading parent relationships. <a href="inventories/page-inventory.json">Source route inventory ↗</a></div>`;
    const $ = selector => host.querySelector(selector);
    const viewport = $('#treeViewport'), canvas = $('#treeCanvas'), extent = $('#treeExtent');

    function visibleLayout() {
      const positions = [], edges = [];
      function layout(node, depth, top) {
        const children = expanded.has(node.id) ? (node.children || []) : [];
        let height = H, childTop = top;
        const childPositions = [];
        if (children.length) {
          for (const child of children) {
            const result = layout(child, depth + 1, childTop);
            childPositions.push(result.node); childTop += result.height + ROW;
          }
          height = Math.max(H, childTop - top - ROW);
        }
        const position = {id:node.id, node, x:PAD + depth * (W + GAP), y:top + (height - H) / 2};
        positions.push(position);
        childPositions.forEach(child => edges.push({from:position, to:child}));
        return {node:position, height};
      }
      const tree = layout(nodes.get(scope), 0, PAD);
      return {positions, edges, width:Math.max(...positions.map(n => n.x + W)) + PAD, height:tree.height + PAD * 2};
    }

    function draw({fit = false, reveal = false, focusToggle = null} = {}) {
      const layout = visibleLayout(); coordinates = layout.positions.sort((a,b) => order.get(a.id)-order.get(b.id)); size = layout;
      const activePath = new Set(path(selected));
      const connections = layout.edges.map(({from, to}) => {
        const x1 = from.x + W, y1 = from.y + H / 2, x2 = to.x, y2 = to.y + H / 2, mid = x1 + GAP / 2;
        const active = activePath.has(from.id) && activePath.has(to.id);
        const state = ['state','overlay','error'].includes(to.node.kind);
        return `<path class="tree-line ${active ? 'is-path' : ''} ${state ? 'is-state' : ''}" d="M${x1},${y1} H${mid - 12} Q${mid},${y1} ${mid},${y1 + Math.sign(y2-y1)*Math.min(12,Math.abs(y2-y1)/2)} V${y2 - Math.sign(y2-y1)*Math.min(12,Math.abs(y2-y1)/2)} Q${mid},${y2} ${mid+12},${y2} H${x2}"/>`;
      }).join('');
      canvas.style.width = layout.width + 'px'; canvas.style.height = layout.height + 'px';
      canvas.innerHTML = `<svg class="tree-lines" width="${layout.width}" height="${layout.height}" aria-hidden="true">${connections}</svg>` + coordinates.map(({node, x, y}) => {
        const children = node.children || [], page = screens.get(node.screen);
        const subtitle = page ? page.route.split('?')[0] : node.kind === 'external' ? 'Leaves PanKgraph' : `${count(node)} captured screens`;
        return `<div class="tree-node kind-${escape(node.kind)} ${node.id === selected ? 'is-selected' : ''} ${activePath.has(node.id) ? 'on-path' : ''}" style="left:${x}px;top:${y}px" data-node="${escape(node.id)}">
          <button class="tree-node-select" data-select="${escape(node.id)}" aria-pressed="${node.id === selected}"><span class="tree-node-meta"><span>${labels[node.kind] || 'Section'}</span>${node.edge ? `<span class="tree-edge-label" title="${escape(node.edge)}">${escape(node.edge)}</span>` : ''}</span><strong>${escape(node.title)}</strong><small>${escape(subtitle)}</small></button>
          ${children.length ? `<button class="tree-node-toggle" data-toggle="${escape(node.id)}" aria-label="${expanded.has(node.id) ? 'Collapse' : 'Expand'} ${escape(node.title)}" aria-expanded="${expanded.has(node.id)}"><span>${expanded.has(node.id) ? '−' : '+'}</span><small>${count(node) - (node.screen ? 1 : 0)}</small></button>` : ''}</div>`;
      }).join('');
      $('#treeVisible').textContent = `${coordinates.length} nodes shown · ${count(nodes.get(scope))} screens in this branch`;
      $('#treeLocation').textContent = scope === source.root.id ? 'Full site' : nodes.get(scope).title;
      if (fit) fitCanvas(); else applyZoom();
      if (reveal) centerSelected();
      if (focusToggle) canvas.querySelector(`[data-toggle="${focusToggle}"]`)?.focus({preventScroll:true});
    }

    function applyZoom() {
      canvas.style.transform = `scale(${zoom})`;
      extent.style.width = Math.ceil(size.width * zoom) + 'px';
      extent.style.height = Math.ceil(size.height * zoom) + 'px';
      $('#treeZoomValue').textContent = Math.round(zoom * 100) + '%';
      $('#treeZoomOut').disabled = zoom <= 0.25;
      $('#treeZoomIn').disabled = zoom >= 1.5;
    }
    function fitCanvas() {
      zoom = Math.max(0.25, Math.min(1, (viewport.clientWidth - 24) / size.width, (viewport.clientHeight - 24) / size.height));
      applyZoom(); viewport.scrollTo({left:0,top:0});
    }
    function changeZoom(next) {
      const ratio = Math.max(0.25, Math.min(1.5, next)) / zoom;
      const left = (viewport.scrollLeft + viewport.clientWidth / 2) * ratio - viewport.clientWidth / 2;
      const top = (viewport.scrollTop + viewport.clientHeight / 2) * ratio - viewport.clientHeight / 2;
      zoom = Math.max(0.25, Math.min(1.5, next)); applyZoom(); viewport.scrollTo({left, top});
    }
    function centerSelected() {
      const found = coordinates.find(p => p.id === selected);
      if (!found) return;
      viewport.scrollTo({left:(found.x + W / 2)*zoom - viewport.clientWidth/2, top:(found.y + H/2)*zoom - viewport.clientHeight/2});
    }

    function syncSelection() {
      try {history.replaceState(null, '', '#view=navigation&node=' + encodeURIComponent(selected));} catch {}
    }
    function jump(id) {
      selected = id;
      if (!path(id).includes(scope)) {scope = source.root.id; $('#treeScope').value = scope;}
      path(id).slice(0,-1).forEach(parent => expanded.add(parent));
      syncSelection(); draw({reveal:true}); detail();
      canvas.querySelector(`[data-select="${selected}"]`)?.focus({preventScroll:true});
    }

    function detail() {
      const node = nodes.get(selected), page = screens.get(node.screen), children = node.children || [];
      const outgoing = source.links.filter(link => link.from === node.id && link.kind !== 'related');
      const incoming = source.links.filter(link => link.to === node.id && link.kind !== 'related');
      const references = source.links.filter(link => (link.to === node.id || link.from === node.id) && link.kind === 'related');
      const trail = path(selected);
      const related = links => links.map(link => {
        const id = link.from === selected ? link.to : link.from, target = nodes.get(id);
        const direction = link.kind === 'related' ? '' : link.to === selected ? 'From: ' : 'To: ';
        return `<button class="tree-relation" data-jump="${escape(id)}"><span>${escape(link.label)}</span><b>${direction}${escape(target.title)}</b></button>`;
      }).join('');
      $('#treeDetail').innerHTML = `<div class="tree-detail-label">${labels[node.kind] || 'Section'}<span>${page ? 'Captured screen' : 'Navigation structure'}</span></div>
        <h2>${escape(node.title)}</h2>
        ${page ? `<a class="tree-screen-thumb" href="#screen=${encodeURIComponent(page.id)}" aria-label="Open ${escape(page.title)}"><img src="screenshots/${page.id}.png" alt="${escape(page.title)} preview"><span>Open editable screen ↗</span></a><code class="tree-route">${escape(page.route)}</code>` : ''}
        <p>${escape(node.description || page?.description || 'Expand this section to explore its pages and states.')}</p>
        <div class="tree-detail-section"><h3>Path from landing</h3><ol class="tree-breadcrumb">${trail.map(id => `<li><button data-jump="${escape(id)}" ${id===selected?'aria-current="location"':''}>${escape(nodes.get(id).title)}</button></li>`).join('')}</ol></div>
        ${children.length ? `<div class="tree-detail-section"><h3>Inside this ${node.kind === 'group' ? 'section' : 'branch'} <span>${children.length}</span></h3>${children.map(child => `<button class="tree-relation" data-jump="${escape(child.id)}"><span>${escape(child.edge || labels[child.kind])}</span><b>${escape(child.title)} →</b></button>`).join('')}</div>` : ''}
        ${outgoing.length ? `<div class="tree-detail-section"><h3>Other paths from here</h3>${related(outgoing)}</div>` : ''}
        ${incoming.length ? `<div class="tree-detail-section"><h3>Also reached from</h3>${related(incoming)}</div>` : ''}
        ${references.length ? `<div class="tree-detail-section"><h3>Related references</h3>${related(references)}</div>` : ''}
        ${node.kind === 'error' ? '<a class="tree-error-link" href="errors.html">Exact messages & recovery conditions ↗</a>' : ''}
        ${page ? `<div class="tree-detail-source">Source: ${escape(page.source || atlas.routeSource)}</div>` : ''}`;
    }

    function search() {
      query = $('#treeSearch').value.trim().toLowerCase();
      const results = $('#treeSearchResults');
      results.hidden = !query;
      if (!query) {results.innerHTML = ''; return;}
      const matches = [...nodes.values()].filter(node => {
        const page = screens.get(node.screen);
        return `${node.title} ${node.id} ${page?.title || ''} ${page?.route || ''}`.toLowerCase().includes(query);
      });
      results.innerHTML = `<div class="tree-search-count">${matches.length} ${matches.length === 1 ? 'match' : 'matches'}. Choose one to reveal its path.</div>${matches.map(node => `<button data-jump="${escape(node.id)}"><span>${labels[node.kind]}</span>${escape(node.title)}<small>${escape(screens.get(node.screen)?.route.split('?')[0] || 'Section')}</small></button>`).join('') || ''}`;
    }

    host.addEventListener('click', click);
    function click(event) {
      const toggle = event.target.closest('[data-toggle]');
      if (toggle) {
        const id = toggle.dataset.toggle;
        if (expanded.has(id)) {
          expanded.delete(id);
        } else expanded.add(id);
        selected = id; syncSelection(); detail();
        draw({focusToggle:id,reveal:true}); return;
      }
      const target = event.target.closest('[data-select], [data-jump]');
      if (target) {
        if (target.closest('#treeSearchResults')) {$('#treeSearch').value = ''; search();}
        jump(target.dataset.select || target.dataset.jump);
      }
    }
    $('#treeSearch').addEventListener('input', search);
    $('#treeScope').onchange = event => {
      scope = event.target.value; selected = scope;
      expanded.add(scope); syncSelection(); detail(); draw({fit:true});
    };
    $('#treeExpand').onclick = () => {descendants(nodes.get(scope)).forEach(n => expanded.add(n.id)); draw();};
    $('#treeCollapse').onclick = () => {expanded.clear(); expanded.add(scope); selected=scope; syncSelection(); detail(); draw({fit:true});};
    $('#treeFit').onclick = fitCanvas;
    $('#treeReset').onclick = () => changeZoom(1);
    $('#treeZoomIn').onclick = () => changeZoom(zoom + 0.15);
    $('#treeZoomOut').onclick = () => changeZoom(zoom - 0.15);
    viewport.addEventListener('keydown', event => {
      if (event.target !== viewport) return;
      if (event.key === '+' || event.key === '=') {event.preventDefault(); changeZoom(zoom + .15);}
      if (event.key === '-') {event.preventDefault(); changeZoom(zoom - .15);}
      if (event.key === '0') {event.preventDefault(); fitCanvas();}
    });
    draw({fit:!requested, reveal:!!requested}); detail();
    return () => host.removeEventListener('click', click);
  }
  return {mount};
})();
