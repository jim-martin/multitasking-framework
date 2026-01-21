/**
 * View Coordination Prototype - View Layer
 *
 * This is the presentation layer. It references the domain model (model.js)
 * but keeps view concerns separate.
 *
 * Key concepts:
 * - Scope: A reference to a domain node (game, inventory, etc.)
 * - State: What the user is doing (Browse, Edit, Preview)
 * - Presentation: How data is displayed (List, Grid, Properties)
 * - Context: (Scope + State) - views sharing a context share selection
 */

// =============================================================================
// State
// =============================================================================

const { createScope, scopeKey, scopeLabel, createSampleWorld } = Model;

// The domain data
const world = createSampleWorld();

// View state
let panels = [];
let panelIdCounter = 0;
let topZIndex = 100;

// Currently selected scope in sidebar (for creating new views)
let selectedScope = null;

// Selection per context: Map<contextKey, selectedItemId>
const selectionByContext = new Map();

// Color assignment per context
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
    return `${scopeKey(scope)}|${state}`;
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

    world.accounts.forEach(account => {
        container.appendChild(createAccountNode(account));
    });
}

function createAccountNode(account) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    // Account row
    const row = createTreeRow({
        icon: '👤',
        iconClass: 'account',
        label: account.name,
        scope: createScope('account', account.id),
        hasChildren: true,
    });
    node.appendChild(row.element);

    // Children container
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

    // Inventory folder
    const invNode = document.createElement('div');
    invNode.className = 'tree-node';

    const inv = account.inventory;
    const invRow = createTreeRow({
        icon: '📦',
        iconClass: 'inventory',
        label: `${account.name}'s Inventory`,
        scope: createScope('inventory', inv.id),
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
        scope: createScope('game', game.id),
        indent,
        hasChildren: game.assets.length > 0,
        badge: game.assets.length,
    });
    node.appendChild(row.element);

    const children = document.createElement('div');
    children.className = 'tree-children';
    game.assets.forEach(asset => {
        children.appendChild(createAssetNode(asset, indent + 1));
    });
    node.appendChild(children);

    return node;
}

function createAssetNode(asset, indent) {
    const node = document.createElement('div');
    node.className = 'tree-node';

    const icons = {
        place: '🗺️',
        script: '📜',
        package: '📦',
        mesh: '🔷',
        image: '🖼️',
        audio: '🔊',
    };

    const row = createTreeRow({
        icon: icons[asset.type] || '📄',
        iconClass: asset.type,
        label: asset.name,
        scope: createScope('asset', asset.id),
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

    // Indentation
    for (let i = 0; i < indent; i++) {
        const indentEl = document.createElement('span');
        indentEl.className = 'tree-indent';
        row.appendChild(indentEl);
    }

    // Toggle
    const toggle = document.createElement('span');
    toggle.className = 'tree-toggle';
    if (hasChildren) {
        toggle.textContent = '▶';
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

    // Icon
    const iconEl = document.createElement('span');
    iconEl.className = `tree-icon ${iconClass}`;
    iconEl.textContent = icon;
    row.appendChild(iconEl);

    // Label
    const labelEl = document.createElement('span');
    labelEl.className = 'tree-label';
    labelEl.textContent = label;
    row.appendChild(labelEl);

    // Badge
    if (badge !== undefined) {
        const badgeEl = document.createElement('span');
        badgeEl.className = 'tree-badge';
        badgeEl.textContent = badge;
        row.appendChild(badgeEl);
    }

    // Click handler (if scope is defined)
    if (scope && !isFolder) {
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            selectScopeInTree(scope, row);
        });
    }

    return { element: row };
}

function selectScopeInTree(scope, rowElement) {
    // Clear previous selection
    document.querySelectorAll('.tree-row.selected').forEach(el => el.classList.remove('selected'));

    // Select new
    rowElement.classList.add('selected');
    selectedScope = scope;

    // Show add view section
    const addSection = document.getElementById('add-view-section');
    addSection.style.display = 'block';

    // Update scope badge
    const badge = document.getElementById('selected-scope-badge');
    badge.textContent = scopeLabel(scope, world);
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
        id,
        scope,
        state,
        presentation,
        contextKey,
        color,
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
    updateTreeBadges();
    return panel;
}

function removePanel(panelId) {
    const index = panels.findIndex(p => p.id === panelId);
    if (index === -1) return;

    const panel = panels[index];
    panel.element.remove();
    panels.splice(index, 1);

    updateContextList();
    updateTreeBadges();
}

function updatePanelState(panelId, newState) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    panel.state = newState;
    panel.contextKey = getContextKey(panel.scope, newState);
    panel.color = getContextColor(panel.contextKey);

    // Re-render
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

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';

    const scopeName = scopeLabel(panel.scope, world);

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

    // Close button
    header.querySelector('.close').addEventListener('click', (e) => {
        e.stopPropagation();
        removePanel(panel.id);
    });

    // Menu button
    const menuBtn = header.querySelector('.panel-menu-btn');
    menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePanelMenu(panel, header);
    });

    el.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.className = 'panel-content';

    if (panel.presentation === 'List') {
        createListContent(content, panel);
    } else if (panel.presentation === 'Grid') {
        createGridContent(content, panel);
    } else if (panel.presentation === 'Properties') {
        createPropertiesContent(content, panel);
    }

    el.appendChild(content);

    // Dragging
    setupDragging(el, header, panel);

    // Focus on click
    el.addEventListener('mousedown', () => {
        el.style.zIndex = ++topZIndex;
    });

    document.getElementById('canvas').appendChild(el);
    panel.element = el;
}

function togglePanelMenu(panel, header) {
    const existing = header.querySelector('.panel-menu');
    if (existing) {
        existing.remove();
        return;
    }

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

    const stateSelect = menu.querySelector('.menu-state');
    stateSelect.addEventListener('change', () => {
        updatePanelState(panel.id, stateSelect.value);
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
        if (e.target.closest('.panel-btn') || e.target.closest('.panel-menu-btn') || e.target.closest('.panel-menu')) {
            return;
        }
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
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        el.style.left = `${initialX + dx}px`;
        el.style.top = `${initialY + dy}px`;
        panel.x = initialX + dx;
        panel.y = initialY + dy;
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
        game: '🎮', place: '🗺️', script: '📜', package: '📦',
        mesh: '🔷', image: '🖼️', audio: '🔊',
    };
    return icons[type] || '📄';
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
        el.innerHTML = `
            <span class="list-item-icon ${item.type || ''}">${getIconForType(item.type)}</span>
            <span>${item.name}</span>
        `;

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
        el.innerHTML = `
            <div class="grid-item-icon">${getIconForType(item.type)}</div>
            <div class="grid-item-label">${item.name}</div>
        `;

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

        // Try to find the item
        const items = world.getChildrenForScope(panel.scope);
        const item = items.find(i => i.id === selectedId);

        if (!item) {
            props.innerHTML = '<div class="no-selection">Item not found</div>';
            return;
        }

        props.innerHTML = `
            <div class="prop-section">
                <div class="prop-section-title">Identity</div>
                <div class="prop-row">
                    <span class="prop-label">Name</span>
                    <span class="prop-value">${item.name}</span>
                </div>
                <div class="prop-row">
                    <span class="prop-label">Type</span>
                    <span class="prop-value">${item.type || 'N/A'}</span>
                </div>
                <div class="prop-row">
                    <span class="prop-label">ID</span>
                    <span class="prop-value">${item.id}</span>
                </div>
            </div>
            <div class="prop-section">
                <div class="prop-section-title">Context</div>
                <div class="prop-row">
                    <span class="prop-label">Scope</span>
                    <span class="prop-value">${scopeLabel(panel.scope, world)}</span>
                </div>
                <div class="prop-row">
                    <span class="prop-label">State</span>
                    <span class="prop-value">${panel.state}</span>
                </div>
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

    contexts.forEach((ctx, key) => {
        const item = document.createElement('div');
        item.className = 'context-item';

        const label = `${scopeLabel(ctx.scope, world)} · ${ctx.state}`;
        item.innerHTML = `
            <span class="context-color" style="background: ${ctx.color}"></span>
            <span class="context-label">${label}</span>
            <span class="context-count">${ctx.panels.length}</span>
        `;

        item.addEventListener('mouseenter', () => {
            ctx.panels.forEach(p => {
                p.element.style.boxShadow = `0 0 0 3px ${ctx.color}`;
            });
        });
        item.addEventListener('mouseleave', () => {
            ctx.panels.forEach(p => {
                p.element.style.boxShadow = '';
            });
        });

        listEl.appendChild(item);
    });
}

function updateTreeBadges() {
    // Could update tree to show which scopes have views
    // For now, just a placeholder
}

// =============================================================================
// Initialization
// =============================================================================

function init() {
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
    const obbyScope = createScope('game', 'obby');
    const invScope = createScope('inventory', 'inv-jimjam');

    createPanel({ scope: obbyScope, state: 'Edit', presentation: 'List', x: 40, y: 40, width: 240, height: 260 });
    createPanel({ scope: obbyScope, state: 'Edit', presentation: 'Properties', x: 300, y: 40, width: 240, height: 260 });
    createPanel({ scope: invScope, state: 'Browse', presentation: 'Grid', x: 40, y: 330, width: 300, height: 220 });
}

document.addEventListener('DOMContentLoaded', init);
