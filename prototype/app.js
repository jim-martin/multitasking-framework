/**
 * View Coordination Prototype - View Layer
 */

// =============================================================================
// State
// =============================================================================

let world = null;
let panels = [];
let panelIdCounter = 0;
let topZIndex = 100;
let selectedScope = null;

const selectionByContext = new Map();
const contextColors = new Map();
const CONTEXT_COLORS = [
    '#5b8def', '#ef5b5b', '#5bef8f', '#efb85b',
    '#b85bef', '#5befc4', '#ef5bb8', '#c4ef5b',
];
let colorIndex = 0;

// =============================================================================
// Context & Selection
// =============================================================================

function getContextKey(scope, state) {
    return `${Model.scopeKey(scope)}|${state}`;
}

function getContextColor(contextKey) {
    if (!contextColors.has(contextKey)) {
        contextColors.set(contextKey, CONTEXT_COLORS[colorIndex % CONTEXT_COLORS.length]);
        colorIndex++;
    }
    return contextColors.get(contextKey);
}

function getSelection(contextKey) {
    return selectionByContext.get(contextKey) || null;
}

function setSelection(contextKey, itemId) {
    selectionByContext.set(contextKey, itemId);
    broadcastSelectionChange(contextKey);
}

function broadcastSelectionChange(contextKey) {
    panels.forEach(panel => {
        if (panel.contextKey === contextKey && panel.onSelectionChange) {
            panel.onSelectionChange();
        }
    });
}

// =============================================================================
// Domain Tree Rendering
// =============================================================================

function renderDomainTree() {
    const container = document.getElementById('domain-tree');
    container.innerHTML = '';

    world.accounts.forEach((account, id) => {
        container.appendChild(createAccountNode(account));
    });
}

function createAccountNode(account) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const row = createTreeRow({
        icon: '👤',
        iconClass: 'account',
        label: account.name,
        scope: Model.createScope('account', account.id),
        hasChildren: true,
    });
    node.appendChild(row.element);

    const children = document.createElement('div');
    children.className = 'tree-children expanded';

    // Games folder
    const gamesNode = document.createElement('div');
    gamesNode.className = 'tree-node';

    const gamesRow = createTreeRow({
        icon: '📁',
        iconClass: 'games',
        label: `${account.name}'s Games`,
        indent: 1,
        hasChildren: account.games.length > 0,
        isFolder: true,
    });
    gamesNode.appendChild(gamesRow.element);

    const gamesChildren = document.createElement('div');
    gamesChildren.className = 'tree-children expanded';
    account.games.forEach(game => {
        gamesChildren.appendChild(createGameNode(game, 2));
    });
    gamesNode.appendChild(gamesChildren);
    children.appendChild(gamesNode);

    // Inventory
    const invNode = document.createElement('div');
    invNode.className = 'tree-node';

    const inv = account.inventory;
    const invRow = createTreeRow({
        icon: '📦',
        iconClass: 'inventory',
        label: `${account.name}'s Inventory`,
        scope: Model.createScope('inventory', inv.id),
        indent: 1,
        hasChildren: inv.assets.length > 0,
        badge: inv.assets.length,
    });
    invNode.appendChild(invRow.element);

    const invChildren = document.createElement('div');
    invChildren.className = 'tree-children';
    inv.assets.forEach(asset => {
        invChildren.appendChild(createAssetNode(asset, 2));
    });
    invNode.appendChild(invChildren);
    children.appendChild(invNode);

    node.appendChild(children);
    return node;
}

function createGameNode(game, indent) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const row = createTreeRow({
        icon: '🎮',
        iconClass: 'game',
        label: game.name,
        scope: Model.createScope('game', game.id),
        indent,
        hasChildren: game.assets.length > 0,
        badge: game.assets.length,
    });
    node.appendChild(row.element);

    const children = document.createElement('div');
    children.className = 'tree-children';

    // Show places first, then other assets
    game.assets.forEach(asset => {
        if (asset.type === 'place') {
            children.appendChild(createPlaceNode(asset, indent + 1));
        } else {
            children.appendChild(createAssetNode(asset, indent + 1));
        }
    });
    node.appendChild(children);

    return node;
}

function createPlaceNode(place, indent) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const instanceCount = countInstances(place.getInstances());

    const row = createTreeRow({
        icon: '🗺️',
        iconClass: 'place',
        label: place.name,
        scope: Model.createScope('place', place.id),
        indent,
        hasChildren: instanceCount > 0 || place.references.length > 0,
        badge: instanceCount,
    });
    node.appendChild(row.element);

    const children = document.createElement('div');
    children.className = 'tree-children';

    // Show instances
    place.getInstances().forEach(inst => {
        children.appendChild(createInstanceNode(inst, indent + 1));
    });

    // Show references if any
    if (place.references.length > 0) {
        const refsFolder = document.createElement('div');
        refsFolder.className = 'tree-node';

        const refsRow = createTreeRow({
            icon: '🔗',
            iconClass: 'folder',
            label: 'References',
            indent: indent + 1,
            hasChildren: true,
            isFolder: true,
        });
        refsFolder.appendChild(refsRow.element);

        const refsChildren = document.createElement('div');
        refsChildren.className = 'tree-children';
        place.references.forEach(ref => {
            refsChildren.appendChild(createAssetNode(ref, indent + 2));
        });
        refsFolder.appendChild(refsChildren);
        children.appendChild(refsFolder);
    }

    node.appendChild(children);
    return node;
}

function createInstanceNode(instance, indent) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const icons = {
        model: '📦', part: '🧱', light: '💡', spawn: '🚩', folder: '📁', camera: '📷', script: '📜',
    };

    const hasChildren = instance.children && instance.children.length > 0;

    const row = createTreeRow({
        icon: icons[instance.type] || '📄',
        iconClass: instance.type,
        label: instance.name,
        scope: Model.createScope('instance', instance.id),
        indent,
        hasChildren,
        badge: hasChildren ? instance.children.length : undefined,
    });
    node.appendChild(row.element);

    if (hasChildren) {
        const children = document.createElement('div');
        children.className = 'tree-children';
        instance.children.forEach(child => {
            children.appendChild(createInstanceNode(child, indent + 1));
        });
        node.appendChild(children);
    }

    return node;
}

function countInstances(instances) {
    let count = 0;
    instances.forEach(inst => {
        count++;
        if (inst.children) count += countInstances(inst.children);
    });
    return count;
}

function createAssetNode(asset, indent) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const icons = {
        place: '🗺️', script: '📜', package: '📦',
        mesh: '🔷', image: '🖼️', audio: '🔊',
    };

    const row = createTreeRow({
        icon: icons[asset.type] || '📄',
        iconClass: asset.type,
        label: asset.name,
        scope: Model.createScope('asset', asset.id),
        indent,
        hasChildren: false,
    });
    node.appendChild(row.element);

    return node;
}

function createTreeRow(config) {
    const { icon, iconClass, label, scope, indent = 0, hasChildren = false, isFolder = false, badge } = config;

    const row = document.createElement('div');
    row.className = 'tree-row';

    for (let i = 0; i < indent; i++) {
        const indentEl = document.createElement('span');
        indentEl.className = 'tree-indent';
        row.appendChild(indentEl);
    }

    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    if (hasChildren) {
        toggle.textContent = '▼';
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const children = row.parentElement.querySelector('.tree-children');
            if (children) {
                children.classList.toggle('expanded');
                toggle.textContent = children.classList.contains('expanded') ? '▼' : '▶';
            }
        });
    }
    row.appendChild(toggle);

    const iconEl = document.createElement('span');
    iconEl.className = `tree-icon ${iconClass}`;
    iconEl.textContent = icon;
    row.appendChild(iconEl);

    const labelEl = document.createElement('span');
    labelEl.className = 'tree-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    if (badge !== undefined) {
        const badgeEl = document.createElement('span');
        badgeEl.className = 'tree-badge';
        badgeEl.textContent = badge;
        row.appendChild(badgeEl);
    }

    if (scope && !isFolder) {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            selectScopeInTree(scope, row);
        });
    }

    return { element: row };
}

function selectScopeInTree(scope, rowElement) {
    document.querySelectorAll('.tree-row.selected').forEach(el => el.classList.remove('selected'));
    rowElement.classList.add('selected');
    selectedScope = scope;

    const addSection = document.getElementById('add-view-section');
    addSection.style.display = 'block';

    const badge = document.getElementById('selected-scope-badge');
    badge.textContent = Model.scopeLabel(scope, world);
}

// =============================================================================
// Panel Management
// =============================================================================

function createPanel(config) {
    const { scope, state, presentation, x, y, width, height } = config;
    const id = ++panelIdCounter;
    const contextKey = getContextKey(scope, state);
    const color = getContextColor(contextKey);

    const panel = {
        id, scope, state, presentation, contextKey, color,
        x: x ?? 50 + (panels.length * 30),
        y: y ?? 50 + (panels.length * 30),
        width: width ?? 250,
        height: height ?? 220,
        element: null,
        onSelectionChange: null,
    };

    panels.push(panel);
    renderPanel(panel);
    updateContextList();
    return panel;
}

function removePanel(panelId) {
    const index = panels.findIndex(p => p.id === panelId);
    if (index === -1) return;
    panels[index].element.remove();
    panels.splice(index, 1);
    updateContextList();
}

function updatePanelState(panelId, newState) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;
    panel.state = newState;
    panel.contextKey = getContextKey(panel.scope, newState);
    panel.color = getContextColor(panel.contextKey);
    const oldElement = panel.element;
    renderPanel(panel);
    oldElement.remove();
    updateContextList();
}

// =============================================================================
// Panel Rendering
// =============================================================================

function renderPanel(panel) {
    const el = document.createElement('div');
    el.className = 'panel';
    el.style.left = `${panel.x}px`;
    el.style.top = `${panel.y}px`;
    el.style.width = `${panel.width}px`;
    el.style.height = `${panel.height}px`;
    el.style.zIndex = topZIndex++;
    el.style.borderColor = panel.color;

    const header = document.createElement('div');
    header.className = 'panel-header';

    const scopeName = Model.scopeLabel(panel.scope, world);

    header.innerHTML = `
        <div class="panel-controls">
            <span class="panel-btn close" title="Close"></span>
            <span class="panel-btn"></span>
            <span class="panel-btn"></span>
        </div>
        <span class="panel-color" style="background: ${panel.color}"></span>
        <div class="panel-info">
            <div class="panel-scope">${scopeName}</div>
            <div class="panel-tuple">${panel.state} · ${panel.presentation}</div>
        </div>
        <span class="panel-menu-btn" title="Change state">⚙</span>
    `;

    header.querySelector('.close').addEventListener('click', (e) => {
        e.stopPropagation();
        removePanel(panel.id);
    });

    header.querySelector('.panel-menu-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanelMenu(panel, header);
    });

    el.appendChild(header);

    const content = document.createElement('div');
    content.className = 'panel-content';

    if (panel.presentation === 'Viewport') {
        createViewportContent(content, panel);
    } else if (panel.presentation === 'List') {
        createListContent(content, panel);
    } else if (panel.presentation === 'Grid') {
        createGridContent(content, panel);
    } else if (panel.presentation === 'Properties') {
        createPropertiesContent(content, panel);
    }

    el.appendChild(content);
    setupDragging(el, header, panel);

    el.addEventListener('mousedown', () => {
        el.style.zIndex = ++topZIndex;
    });

    document.getElementById('canvas').appendChild(el);
    panel.element = el;
}

function togglePanelMenu(panel, header) {
    const existing = header.querySelector('.panel-menu');
    if (existing) { existing.remove(); return; }

    document.querySelectorAll('.panel-menu').forEach(m => m.remove());

    const states = ['Browse', 'Edit', 'Preview'];
    const menu = document.createElement('div');
    menu.className = 'panel-menu';
    menu.innerHTML = `
        <div class="panel-menu-group">
            <div class="panel-menu-label">State</div>
            <select class="menu-state">
                ${states.map(s => `<option value="${s}" ${s === panel.state ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </div>
    `;

    menu.querySelector('.menu-state').addEventListener('change', (e) => {
        updatePanelState(panel.id, e.target.value);
    });

    menu.addEventListener('mousedown', e => e.stopPropagation());
    header.appendChild(menu);

    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 0);
}

function setupDragging(el, header, panel) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.panel-btn') || e.target.closest('.panel-menu-btn') || e.target.closest('.panel-menu')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = el.offsetLeft;
        initialY = el.offsetTop;
        el.classList.add('dragging');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;
        el.style.left = `${initialX + e.clientX - startX}px`;
        el.style.top = `${initialY + e.clientY - startY}px`;
        panel.x = initialX + e.clientX - startX;
        panel.y = initialY + e.clientY - startY;
    }

    function onMouseUp() {
        isDragging = false;
        el.classList.remove('dragging');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

// =============================================================================
// Content Renderers
// =============================================================================

function getIconForType(type) {
    const icons = {
        // Asset types
        game: '🎮', place: '🗺️', script: '📜', package: '📦', mesh: '🔷', image: '🖼️', audio: '🔊',
        // Instance types
        model: '📦', part: '🧱', light: '💡', spawn: '🚩', folder: '📁', camera: '📷',
    };
    return icons[type] || '📄';
}

function createViewportContent(contentEl, panel) {
    // Only available for place scopes
    if (panel.scope.type !== 'place') {
        contentEl.innerHTML = '<div class="no-selection">Viewport only available for Places</div>';
        return;
    }

    const place = world.getPlace(panel.scope.id);
    if (!place) {
        contentEl.innerHTML = '<div class="no-selection">Place not found</div>';
        return;
    }

    // Gather all instances recursively
    const allInstances = [];
    function collectInstances(instances) {
        instances.forEach(inst => {
            allInstances.push(inst);
            if (inst.children) collectInstances(inst.children);
        });
    }
    collectInstances(place.getInstances());

    const canvas = document.createElement('div');
    canvas.className = 'viewport-canvas viewport-3d';

    // Add grid floor
    const grid = document.createElement('div');
    grid.className = 'viewport-grid';
    canvas.appendChild(grid);

    if (allInstances.length === 0) {
        canvas.innerHTML += '<div class="viewport-empty">No instances</div>';
        contentEl.appendChild(canvas);
        return;
    }

    // Faux 3D: isometric-ish projection
    // x -> screen x, z -> screen y (depth), y -> vertical offset
    const scale = 3;
    const offsetX = 150;
    const offsetY = 180;

    allInstances.forEach(inst => {
        const el = document.createElement('div');
        el.className = 'viewport-object';
        el.dataset.itemId = inst.id;

        // Isometric projection
        const screenX = offsetX + (inst.position.x - inst.position.z * 0.5) * scale;
        const screenY = offsetY + (inst.position.z * 0.5 - inst.position.y) * scale;
        const depth = inst.position.z + inst.position.y;

        el.style.left = `${screenX}px`;
        el.style.top = `${screenY}px`;
        el.style.zIndex = Math.floor(100 - depth);

        // Size based on type
        if (inst.type === 'folder') {
            el.style.display = 'none'; // Don't show folders in viewport
            return;
        }

        el.innerHTML = `<span class="obj-icon">${getIconForType(inst.type)}</span><span class="obj-label">${inst.name}</span>`;

        el.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelection(panel.contextKey, inst.id);
        });
        canvas.appendChild(el);
    });

    canvas.addEventListener('click', () => setSelection(panel.contextKey, null));
    contentEl.appendChild(canvas);

    panel.onSelectionChange = () => {
        const selected = getSelection(panel.contextKey);
        canvas.querySelectorAll('.viewport-object').forEach(el => {
            el.classList.toggle('selected', el.dataset.itemId === selected);
        });
    };
}

function createListContent(contentEl, panel) {
    const items = world.getChildrenForScope(panel.scope);
    const list = document.createElement('div');
    list.className = 'list-content';

    if (items.length === 0) {
        list.innerHTML = '<div class="no-selection">No items</div>';
        contentEl.appendChild(list);
        return;
    }

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'list-item';
        el.dataset.itemId = item.id;
        el.innerHTML = `<span class="list-item-icon ${item.type || ''}">${getIconForType(item.type)}</span><span>${item.name}</span>`;
        el.addEventListener('click', () => setSelection(panel.contextKey, item.id));
        list.appendChild(el);
    });

    contentEl.appendChild(list);
    panel.onSelectionChange = () => {
        const selected = getSelection(panel.contextKey);
        list.querySelectorAll('.list-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.itemId === selected);
        });
    };
}

function createGridContent(contentEl, panel) {
    const items = world.getChildrenForScope(panel.scope);
    const grid = document.createElement('div');
    grid.className = 'grid-content';

    if (items.length === 0) {
        grid.innerHTML = '<div class="no-selection">No items</div>';
        contentEl.appendChild(grid);
        return;
    }

    items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'grid-item';
        el.dataset.itemId = item.id;
        el.innerHTML = `<div class="grid-item-icon">${getIconForType(item.type)}</div><div class="grid-item-label">${item.name}</div>`;
        el.addEventListener('click', () => setSelection(panel.contextKey, item.id));
        grid.appendChild(el);
    });

    contentEl.appendChild(grid);
    panel.onSelectionChange = () => {
        const selected = getSelection(panel.contextKey);
        grid.querySelectorAll('.grid-item').forEach(el => {
            el.classList.toggle('selected', el.dataset.itemId === selected);
        });
    };
}

function createPropertiesContent(contentEl, panel) {
    const props = document.createElement('div');
    props.className = 'properties-content';

    function render() {
        const selectedId = getSelection(panel.contextKey);
        if (!selectedId) {
            props.innerHTML = '<div class="no-selection">No selection</div>';
            return;
        }
        const items = world.getChildrenForScope(panel.scope);
        const item = items.find(i => i.id === selectedId);
        if (!item) {
            props.innerHTML = '<div class="no-selection">Item not found</div>';
            return;
        }
        props.innerHTML = `
            <div class="prop-section">
                <div class="prop-section-title">Identity</div>
                <div class="prop-row"><span class="prop-label">Name</span><span class="prop-value">${item.name}</span></div>
                <div class="prop-row"><span class="prop-label">Type</span><span class="prop-value">${item.type || 'N/A'}</span></div>
                <div class="prop-row"><span class="prop-label">ID</span><span class="prop-value">${item.id}</span></div>
            </div>
            <div class="prop-section">
                <div class="prop-section-title">Context</div>
                <div class="prop-row"><span class="prop-label">Scope</span><span class="prop-value">${Model.scopeLabel(panel.scope, world)}</span></div>
                <div class="prop-row"><span class="prop-label">State</span><span class="prop-value">${panel.state}</span></div>
            </div>
        `;
    }

    contentEl.appendChild(props);
    panel.onSelectionChange = render;
    render();
}

// =============================================================================
// Context List
// =============================================================================

function updateContextList() {
    const listEl = document.getElementById('context-list');
    const contexts = new Map();

    panels.forEach(p => {
        if (!contexts.has(p.contextKey)) {
            contexts.set(p.contextKey, { color: p.color, scope: p.scope, state: p.state, panels: [] });
        }
        contexts.get(p.contextKey).panels.push(p);
    });

    listEl.innerHTML = '';
    if (contexts.size === 0) {
        listEl.innerHTML = '<div class="empty-state">No views yet</div>';
        return;
    }

    contexts.forEach((ctx) => {
        const item = document.createElement('div');
        item.className = 'context-item';
        const label = `${Model.scopeLabel(ctx.scope, world)} · ${ctx.state}`;
        item.innerHTML = `
            <span class="context-color" style="background: ${ctx.color}"></span>
            <span class="context-label">${label}</span>
            <span class="context-count">${ctx.panels.length}</span>
        `;
        item.addEventListener('mouseenter', () => ctx.panels.forEach(p => p.element.style.boxShadow = `0 0 0 3px ${ctx.color}`));
        item.addEventListener('mouseleave', () => ctx.panels.forEach(p => p.element.style.boxShadow = ''));
        listEl.appendChild(item);
    });
}

// =============================================================================
// Initialization
// =============================================================================

function init() {
    // Initialize world from model
    world = Model.createSampleWorld();

    // Render domain tree
    renderDomainTree();

    // Add view button
    document.getElementById('add-view-btn').addEventListener('click', () => {
        if (!selectedScope) return;
        const state = document.getElementById('new-state').value;
        const presentation = document.getElementById('new-presentation').value;
        createPanel({ scope: selectedScope, state, presentation });
    });

    // Create initial demo panels
    const lobbyScope = Model.createScope('place', 'obby-lobby');  // Place level for viewport
    const obbyScope = Model.createScope('game', 'obby');          // Game level for asset list
    const invScope = Model.createScope('inventory', 'inv-jimjam');

    // Place-level view with viewport (instances)
    createPanel({ scope: lobbyScope, state: 'Edit', presentation: 'Viewport', x: 40, y: 40, width: 340, height: 300 });
    createPanel({ scope: lobbyScope, state: 'Edit', presentation: 'List', x: 400, y: 40, width: 200, height: 300 });
    createPanel({ scope: lobbyScope, state: 'Edit', presentation: 'Properties', x: 620, y: 40, width: 220, height: 300 });

    // Game-level view (places and scripts)
    createPanel({ scope: obbyScope, state: 'Browse', presentation: 'List', x: 40, y: 370, width: 260, height: 200 });

    // Inventory view
    createPanel({ scope: invScope, state: 'Browse', presentation: 'Grid', x: 320, y: 370, width: 300, height: 200 });
}

document.addEventListener('DOMContentLoaded', init);
