/**
 * Inventory Explorer - Application
 *
 * Start page shows owners with their games & inventory.
 * Clicking any item opens a dedicated window with panels
 * tailored to that asset type. References between assets
 * are clickable, opening new windows.
 */

let world = null;
let openWindows = [];
let windowIdCounter = 0;
let topZ = 100;

// ─────────────────────────────────────────────────────────────────────────────
// Start Page
// ─────────────────────────────────────────────────────────────────────────────

function renderStartPage() {
    const container = document.getElementById('owners-container');
    container.innerHTML = '';

    for (const owner of world.owners) {
        const card = el('div', 'owner-card');

        // Header
        const hdr = el('div', 'owner-header');
        hdr.innerHTML = `<span class="owner-icon">${owner.type === 'group' ? '👥' : '👤'}</span>
            <span class="owner-name">${owner.id}</span>
            <span class="owner-type">${owner.type}</span>`;
        card.appendChild(hdr);

        // Games section
        const gSec = el('div', 'owner-section');
        gSec.innerHTML = `<h3>Games <span class="badge">${owner.games.length}</span></h3>`;
        const gList = el('div', 'start-grid');
        for (const game of owner.games) {
            gList.appendChild(makeStartTile(game.id, '🎮', game.name, `${game.places.length} place${game.places.length !== 1 ? 's' : ''}`));
        }
        gSec.appendChild(gList);
        card.appendChild(gSec);

        // Inventory section
        const iSec = el('div', 'owner-section');
        iSec.innerHTML = `<h3>Inventory <span class="badge">${owner.inventory.length}</span></h3>`;
        const iList = el('div', 'start-grid');
        for (const asset of owner.inventory) {
            iList.appendChild(makeStartTile(asset.id, Model.iconFor(asset), asset.name, asset.type));
        }
        iSec.appendChild(iList);
        card.appendChild(iSec);

        container.appendChild(card);
    }
}

function makeStartTile(id, icon, name, subtitle) {
    const tile = el('div', 'start-tile');
    tile.innerHTML = `<span class="tile-icon">${icon}</span>
        <span class="tile-name">${name}</span>
        <span class="tile-sub">${subtitle}</span>`;
    tile.addEventListener('click', () => openAssetWindow(id));
    return tile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Window Management
// ─────────────────────────────────────────────────────────────────────────────

function openAssetWindow(id) {
    // Don't duplicate
    const existing = openWindows.find(w => w.assetId === id);
    if (existing) {
        bringToFront(existing);
        existing.el.classList.add('window-flash');
        setTimeout(() => existing.el.classList.remove('window-flash'), 300);
        return;
    }

    const node = world.get(id);
    if (!node) return;

    const winId = ++windowIdCounter;
    const offset = (openWindows.length % 8) * 28;
    const win = {
        id: winId,
        assetId: id,
        node,
        el: null,
        x: 80 + offset,
        y: 60 + offset,
        width: windowSizeFor(node).w,
        height: windowSizeFor(node).h,
        selection: null,          // selected child id within this window
        onSelectionChange: [],    // callbacks
    };

    openWindows.push(win);
    renderWindow(win);
}

function windowSizeFor(node) {
    switch (node.kind) {
        case 'game': return { w: 540, h: 370 };
        case 'place': return { w: 720, h: 420 };
        case 'asset':
            if (node.type === 'package') return { w: 400, h: 320 };
            return { w: 380, h: 340 };
        default: return { w: 400, h: 300 };
    }
}

function closeWindow(winId) {
    const idx = openWindows.findIndex(w => w.id === winId);
    if (idx === -1) return;
    openWindows[idx].el.remove();
    openWindows.splice(idx, 1);
}

function bringToFront(win) {
    win.el.style.zIndex = ++topZ;
}

function setWindowSelection(win, childId) {
    win.selection = childId;
    for (const cb of win.onSelectionChange) cb();
}

// ─────────────────────────────────────────────────────────────────────────────
// Window Rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderWindow(win) {
    const node = win.node;
    const winEl = el('div', 'window');
    winEl.style.left = `${win.x}px`;
    winEl.style.top = `${win.y}px`;
    winEl.style.width = `${win.width}px`;
    winEl.style.height = `${win.height}px`;
    winEl.style.zIndex = ++topZ;

    // Title bar
    const titleBar = el('div', 'window-titlebar');
    const kindLabel = node.kind === 'asset' ? node.type : node.kind;
    titleBar.innerHTML = `
        <div class="titlebar-left">
            <span class="titlebar-icon">${titleIcon(node)}</span>
            <span class="titlebar-name">${titleName(node)}</span>
            <span class="titlebar-kind">${kindLabel}</span>
        </div>
        <div class="titlebar-controls">
            <span class="win-btn win-close" title="Close">&times;</span>
        </div>`;
    titleBar.querySelector('.win-close').addEventListener('click', (e) => {
        e.stopPropagation();
        closeWindow(win.id);
    });
    winEl.appendChild(titleBar);

    // Body: panels laid out depending on asset kind
    const body = el('div', 'window-body');
    buildPanels(body, win);
    winEl.appendChild(body);

    // Dragging
    setupWindowDrag(winEl, titleBar, win);
    // Resizing
    setupWindowResize(winEl, win);

    winEl.addEventListener('mousedown', () => bringToFront(win));

    document.getElementById('windows-layer').appendChild(winEl);
    win.el = winEl;
}

function titleIcon(node) {
    if (node.kind === 'game') return '🎮';
    if (node.kind === 'place') return '🗺️';
    return Model.iconFor(node);
}

function titleName(node) {
    return node.name || node.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Panels per asset type
// ─────────────────────────────────────────────────────────────────────────────

function buildPanels(body, win) {
    const node = win.node;

    switch (node.kind) {
        case 'game':
            body.classList.add('layout-2col');
            body.appendChild(panelPlacesList(win));
            body.appendChild(panelGameProperties(win));
            break;

        case 'place':
            body.classList.add('layout-3col');
            body.appendChild(panelInstanceTree(win));
            body.appendChild(panelViewport(win));
            body.appendChild(panelInstanceProperties(win));
            break;

        case 'asset':
            switch (node.type) {
                case 'package':
                    body.classList.add('layout-2col');
                    body.appendChild(panelAssetPreview(win));
                    body.appendChild(panelUsages(win));
                    break;
                case 'mesh':
                    body.classList.add('layout-2col');
                    body.appendChild(panelAssetPreview(win));
                    body.appendChild(panelUsages(win));
                    break;
                case 'image':
                    body.classList.add('layout-2col');
                    body.appendChild(panelImagePreview(win));
                    body.appendChild(panelUsages(win));
                    break;
                case 'audio':
                    body.classList.add('layout-2col');
                    body.appendChild(panelAudioPreview(win));
                    body.appendChild(panelUsages(win));
                    break;
                default:
                    body.appendChild(panelAssetPreview(win));
                    break;
            }
            break;

        default:
            body.appendChild(panelGenericProperties(win));
            break;
    }
}

// ─── Panel: Places list (for game windows) ───────────────────────────────────

function panelPlacesList(win) {
    const game = win.node;
    const panel = makePanel('Places', '🗺️');
    const list = el('div', 'panel-list');

    for (const place of game.places) {
        const row = el('div', 'list-row');
        row.innerHTML = `<span class="row-icon">🗺️</span>
            <span class="row-name">${place.name}</span>
            <span class="row-detail">${place.instances.length} instances</span>
            <span class="row-open" title="Open">&#x2197;</span>`;
        row.addEventListener('click', () => setWindowSelection(win, place.id));
        row.querySelector('.row-open').addEventListener('click', (e) => {
            e.stopPropagation();
            openAssetWindow(place.id);
        });
        row.dataset.itemId = place.id;
        list.appendChild(row);
    }

    win.onSelectionChange.push(() => {
        list.querySelectorAll('.list-row').forEach(r =>
            r.classList.toggle('selected', r.dataset.itemId === win.selection));
    });

    panel.querySelector('.panel-body').appendChild(list);
    return panel;
}

// ─── Panel: Game properties ──────────────────────────────────────────────────

function panelGameProperties(win) {
    const game = win.node;
    const panel = makePanel('Details', '⚙');
    const body = panel.querySelector('.panel-body');

    const props = el('div', 'props');
    props.innerHTML = `
        <div class="prop-group">
            <div class="prop-group-title">Game Info</div>
            ${propRow('Name', game.name)}
            ${propRow('ID', game.id)}
            ${propRow('Owner', game.ownerId)}
            ${propRow('Places', game.places.length)}
        </div>`;
    body.appendChild(props);

    // Show selected place details
    const detail = el('div', 'props selected-detail');
    body.appendChild(detail);

    win.onSelectionChange.push(() => {
        if (!win.selection) { detail.innerHTML = '<div class="empty-hint">Select a place for details</div>'; return; }
        const place = world.get(win.selection);
        if (!place) { detail.innerHTML = ''; return; }
        detail.innerHTML = `
            <div class="prop-group">
                <div class="prop-group-title">Selected Place</div>
                ${propRow('Name', place.name)}
                ${propRow('ID', place.id)}
                ${propRow('Instances', place.instances.length)}
            </div>
            <button class="open-btn" data-id="${place.id}">Open Place &rarr;</button>`;
        detail.querySelector('.open-btn').addEventListener('click', () => openAssetWindow(place.id));
    });
    // trigger initial
    setTimeout(() => setWindowSelection(win, null), 0);

    return panel;
}

// ─── Panel: Instance tree (for place windows) ───────────────────────────────

function panelInstanceTree(win) {
    const place = win.node;
    const panel = makePanel('Instances', '📋');
    const body = panel.querySelector('.panel-body');
    body.classList.add('tree-panel');

    const tree = el('div', 'instance-tree');
    for (const inst of place.instances) {
        tree.appendChild(makeInstanceRow(inst, win, 0));
    }
    body.appendChild(tree);

    return panel;
}

function makeInstanceRow(inst, win, depth) {
    const row = el('div', 'tree-row');
    row.style.paddingLeft = `${8 + depth * 16}px`;
    row.dataset.itemId = inst.id;

    // Build content with reference links
    let refs = '';
    if (inst.meshId) refs += refBadge(inst.meshId, 'mesh');
    if (inst.textureId) refs += refBadge(inst.textureId, 'image');
    if (inst.imageId) refs += refBadge(inst.imageId, 'image');
    if (inst.packageId) refs += refBadge(inst.packageId, 'package');

    row.innerHTML = `<span class="row-icon">${Model.iconFor(inst)}</span>
        <span class="row-name">${inst.name}</span>
        <span class="row-class">${inst.class}</span>
        <span class="row-refs">${refs}</span>`;

    // Click row to select
    row.addEventListener('click', (e) => {
        if (e.target.closest('.ref-badge')) return;
        setWindowSelection(win, inst.id);
    });

    // Wire up reference badges
    row.querySelectorAll('.ref-badge').forEach(badge => {
        badge.addEventListener('click', (e) => {
            e.stopPropagation();
            openAssetWindow(badge.dataset.refId);
        });
    });

    win.onSelectionChange.push(() => {
        row.classList.toggle('selected', win.selection === inst.id);
    });

    return row;
}

function refBadge(assetId, type) {
    const asset = world.get(assetId);
    const name = asset ? asset.name : assetId;
    return `<span class="ref-badge ref-${type}" data-ref-id="${assetId}" title="Open ${name}">${Model.ICONS[type] || '📎'} ${name}</span>`;
}

// ─── Panel: Viewport (for place windows) ────────────────────────────────────

function panelViewport(win) {
    const place = win.node;
    const panel = makePanel('Viewport', '🌐');
    const body = panel.querySelector('.panel-body');
    body.classList.add('viewport-body');

    const canvas = el('div', 'viewport-canvas');

    // Grid floor
    const grid = el('div', 'viewport-grid');
    canvas.appendChild(grid);

    // Render instances as faux 3D objects
    const scale = 2.5;
    const cx = 200, cy = 180;

    for (const inst of place.instances) {
        if (inst.class === 'Script' || inst.class === 'LocalScript') continue; // don't show scripts in viewport

        const objEl = el('div', 'viewport-obj');
        objEl.dataset.itemId = inst.id;

        const pos = inst.position || [0, 0, 0];
        const sx = cx + (pos[0] - pos[2] * 0.5) * scale;
        const sy = cy + (pos[2] * 0.4 - pos[1]) * scale;

        objEl.style.left = `${sx}px`;
        objEl.style.top = `${sy}px`;

        // Size hint
        if (inst.size) {
            const w = Math.max(30, inst.size[0] * scale * 0.5);
            const h = Math.max(20, inst.size[1] * scale * 2);
            objEl.style.width = `${Math.min(w, 120)}px`;
            objEl.style.minHeight = `${Math.min(h, 60)}px`;
            objEl.style.opacity = '0.7';
        }

        // Color tint
        if (inst.color) {
            const [r, g, b] = inst.color;
            objEl.style.background = `rgba(${r * 255 | 0}, ${g * 255 | 0}, ${b * 255 | 0}, 0.35)`;
            objEl.style.borderColor = `rgba(${r * 255 | 0}, ${g * 255 | 0}, ${b * 255 | 0}, 0.6)`;
        }

        objEl.innerHTML = `<span class="obj-icon">${Model.iconFor(inst)}</span><span class="obj-label">${inst.name}</span>`;

        objEl.addEventListener('click', (e) => {
            e.stopPropagation();
            setWindowSelection(win, inst.id);
        });
        canvas.appendChild(objEl);
    }

    canvas.addEventListener('click', () => setWindowSelection(win, null));

    win.onSelectionChange.push(() => {
        canvas.querySelectorAll('.viewport-obj').forEach(o =>
            o.classList.toggle('selected', o.dataset.itemId === win.selection));
    });

    body.appendChild(canvas);
    return panel;
}

// ─── Panel: Instance properties (for place windows) ─────────────────────────

function panelInstanceProperties(win) {
    const place = win.node;
    const panel = makePanel('Properties', '⚙');
    const body = panel.querySelector('.panel-body');

    const content = el('div', 'props');
    body.appendChild(content);

    function render() {
        if (!win.selection) {
            content.innerHTML = '<div class="empty-hint">Select an instance</div>';
            return;
        }
        const inst = world.get(win.selection);
        if (!inst || inst.kind !== 'instance') {
            content.innerHTML = '<div class="empty-hint">Select an instance</div>';
            return;
        }

        let refsHtml = '';
        const refPairs = [
            ['Mesh', inst.meshId],
            ['Texture', inst.textureId],
            ['Image', inst.imageId],
            ['Package', inst.packageId],
        ].filter(([, v]) => v);

        if (refPairs.length > 0) {
            refsHtml = `<div class="prop-group">
                <div class="prop-group-title">References</div>
                ${refPairs.map(([label, id]) => {
                    const target = world.get(id);
                    const name = target ? target.name : id;
                    return `<div class="prop-row">
                        <span class="prop-label">${label}</span>
                        <span class="prop-value ref-link" data-ref-id="${id}">${Model.iconFor(target)} ${name} &#x2197;</span>
                    </div>`;
                }).join('')}
            </div>`;
        }

        let sizeHtml = '';
        if (inst.size) sizeHtml = propRow('Size', `[${inst.size.join(', ')}]`);
        if (inst.position) sizeHtml += propRow('Position', `[${inst.position.join(', ')}]`);

        content.innerHTML = `
            <div class="prop-group">
                <div class="prop-group-title">Identity</div>
                ${propRow('Name', inst.name)}
                ${propRow('Class', inst.class)}
                ${propRow('ID', inst.id)}
            </div>
            ${sizeHtml ? `<div class="prop-group"><div class="prop-group-title">Transform</div>${sizeHtml}</div>` : ''}
            ${refsHtml}`;

        content.querySelectorAll('.ref-link').forEach(link => {
            link.addEventListener('click', () => openAssetWindow(link.dataset.refId));
        });
    }

    win.onSelectionChange.push(render);
    render();
    return panel;
}

// ─── Panel: Asset preview (mesh, package) ───────────────────────────────────

function panelAssetPreview(win) {
    const asset = win.node;
    const panel = makePanel('Preview', Model.iconFor(asset));
    const body = panel.querySelector('.panel-body');

    const preview = el('div', 'asset-preview');
    preview.innerHTML = `
        <div class="preview-icon-large">${Model.iconFor(asset)}</div>
        <div class="preview-name">${asset.name}</div>
        <div class="preview-type">${asset.type}</div>
        <div class="prop-group" style="margin-top:16px; text-align:left; width:100%;">
            <div class="prop-group-title">Properties</div>
            ${propRow('Name', asset.name)}
            ${propRow('Type', asset.type)}
            ${propRow('ID', asset.id)}
            ${propRow('Owner', asset.ownerId)}
        </div>`;
    body.appendChild(preview);
    return panel;
}

// ─── Panel: Image preview ───────────────────────────────────────────────────

function panelImagePreview(win) {
    const asset = win.node;
    const panel = makePanel('Preview', '🖼️');
    const body = panel.querySelector('.panel-body');

    const preview = el('div', 'asset-preview');
    // Faux image preview with a colored placeholder
    const hue = hashToHue(asset.id);
    preview.innerHTML = `
        <div class="image-placeholder" style="background: hsl(${hue}, 40%, 30%);">
            <span>🖼️</span>
            <span class="placeholder-label">${asset.name}</span>
        </div>
        <div class="prop-group" style="margin-top:12px; text-align:left; width:100%;">
            <div class="prop-group-title">Properties</div>
            ${propRow('Name', asset.name)}
            ${propRow('Type', asset.type)}
            ${propRow('ID', asset.id)}
            ${propRow('Owner', asset.ownerId)}
        </div>`;
    body.appendChild(preview);
    return panel;
}

// ─── Panel: Audio preview ───────────────────────────────────────────────────

function panelAudioPreview(win) {
    const asset = win.node;
    const panel = makePanel('Player', '🔊');
    const body = panel.querySelector('.panel-body');

    const preview = el('div', 'asset-preview');
    preview.innerHTML = `
        <div class="audio-player-mock">
            <div class="audio-icon">🔊</div>
            <div class="audio-waveform">
                ${Array.from({ length: 24 }, () => {
                    const h = 10 + Math.random() * 40;
                    return `<div class="wave-bar" style="height:${h}px"></div>`;
                }).join('')}
            </div>
            <div class="audio-controls">
                <span class="audio-btn">⏮</span>
                <span class="audio-btn play-btn">▶</span>
                <span class="audio-btn">⏭</span>
            </div>
            <div class="audio-time">0:00 / 0:30</div>
        </div>
        <div class="prop-group" style="margin-top:12px; text-align:left; width:100%;">
            <div class="prop-group-title">Properties</div>
            ${propRow('Name', asset.name)}
            ${propRow('Type', asset.type)}
            ${propRow('ID', asset.id)}
            ${propRow('Owner', asset.ownerId)}
        </div>`;
    body.appendChild(preview);
    return panel;
}

// ─── Panel: Usages ──────────────────────────────────────────────────────────

function panelUsages(win) {
    const asset = win.node;
    const panel = makePanel('Usages', '🔗');
    const body = panel.querySelector('.panel-body');

    const usages = world.getUsages(asset.id);

    if (usages.length === 0) {
        body.innerHTML = '<div class="empty-hint">No usages found</div>';
        return panel;
    }

    const list = el('div', 'panel-list');
    for (const usage of usages) {
        const row = el('div', 'list-row');
        row.innerHTML = `
            <span class="row-icon">🔗</span>
            <span class="row-name">${usage.instanceName}</span>
            <span class="row-detail">in ${usage.placeName}</span>
            <span class="row-open" title="Open place">&#x2197;</span>`;
        row.querySelector('.row-open').addEventListener('click', (e) => {
            e.stopPropagation();
            openAssetWindow(usage.placeId);
        });
        list.appendChild(row);
    }
    body.appendChild(list);
    return panel;
}

// ─── Panel: Generic properties ──────────────────────────────────────────────

function panelGenericProperties(win) {
    const node = win.node;
    const panel = makePanel('Properties', '⚙');
    const body = panel.querySelector('.panel-body');

    const props = el('div', 'props');
    props.innerHTML = `<div class="prop-group">
        <div class="prop-group-title">Info</div>
        ${propRow('ID', node.id)}
        ${propRow('Kind', node.kind)}
        ${node.name ? propRow('Name', node.name) : ''}
    </div>`;
    body.appendChild(props);
    return panel;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makePanel(title, icon) {
    const panel = el('div', 'panel');
    panel.innerHTML = `<div class="panel-header"><span class="panel-hdr-icon">${icon}</span><span class="panel-hdr-title">${title}</span></div>`;
    const body = el('div', 'panel-body');
    panel.appendChild(body);
    return panel;
}

function propRow(label, value) {
    return `<div class="prop-row"><span class="prop-label">${label}</span><span class="prop-value">${value}</span></div>`;
}

function el(tag, cls) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
}

function hashToHue(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffff;
    return h % 360;
}

// ─────────────────────────────────────────────────────────────────────────────
// Window dragging
// ─────────────────────────────────────────────────────────────────────────────

function setupWindowDrag(winEl, titleBar, win) {
    let dragging = false, sx, sy, ix, iy;

    titleBar.addEventListener('mousedown', (e) => {
        if (e.target.closest('.win-btn')) return;
        dragging = true;
        sx = e.clientX; sy = e.clientY;
        ix = winEl.offsetLeft; iy = winEl.offsetTop;
        winEl.classList.add('dragging');
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    function onMove(e) {
        if (!dragging) return;
        const nx = ix + e.clientX - sx;
        const ny = iy + e.clientY - sy;
        winEl.style.left = `${nx}px`;
        winEl.style.top = `${ny}px`;
        win.x = nx; win.y = ny;
    }

    function onUp() {
        dragging = false;
        winEl.classList.remove('dragging');
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Window resizing
// ─────────────────────────────────────────────────────────────────────────────

function setupWindowResize(winEl, win) {
    const handle = el('div', 'resize-handle');
    winEl.appendChild(handle);

    let resizing = false, sx, sy, iw, ih;

    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        resizing = true;
        sx = e.clientX; sy = e.clientY;
        iw = winEl.offsetWidth; ih = winEl.offsetHeight;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });

    function onMove(e) {
        if (!resizing) return;
        const nw = Math.max(300, iw + e.clientX - sx);
        const nh = Math.max(200, ih + e.clientY - sy);
        winEl.style.width = `${nw}px`;
        winEl.style.height = `${nh}px`;
        win.width = nw; win.height = nh;
    }

    function onUp() {
        resizing = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Home button
// ─────────────────────────────────────────────────────────────────────────────

function toggleStartPage() {
    const sp = document.getElementById('start-page');
    sp.classList.toggle('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// Init
// ─────────────────────────────────────────────────────────────────────────────

async function init() {
    world = await Model.loadWorld();
    renderStartPage();

    document.getElementById('home-btn').addEventListener('click', toggleStartPage);

    // Open a demo window to show the concept
    openAssetWindow('obby');
}

document.addEventListener('DOMContentLoaded', init);
