/**
 * View Coordination Prototype
 *
 * Interactive demo for (Scope, State, Presentation) tuples.
 * Panels with the same (Scope, State) share selection.
 */

// =============================================================================
// Configuration
// =============================================================================

const SCOPES = ['Game', 'Asset', 'Script'];
const STATES = ['Edit', 'Browse', 'Preview'];
const PRESENTATIONS = ['Viewport', 'List', 'Properties'];

// Colors for different contexts
const CONTEXT_COLORS = [
    '#5b8def', // blue
    '#ef5b5b', // red
    '#5bef8f', // green
    '#efb85b', // orange
    '#b85bef', // purple
    '#5befc4', // teal
    '#ef5bb8', // pink
    '#c4ef5b', // lime
];

// =============================================================================
// State
// =============================================================================

let panels = [];
let panelIdCounter = 0;
let topZIndex = 100;

// Selection per context: Map<contextKey, Set<itemId>>
const selectionByContext = new Map();

// Color assignment per context
const contextColors = new Map();
let colorIndex = 0;

// Demo objects (shared data)
const objects = [
    { id: 'obj1', name: 'Player' },
    { id: 'obj2', name: 'Enemy' },
    { id: 'obj3', name: 'Terrain' },
    { id: 'obj4', name: 'Light' },
    { id: 'obj5', name: 'Camera' },
];

// =============================================================================
// Context & Selection
// =============================================================================

function getContextKey(scope, state) {
    return `${scope}-${state}`;
}

function getContextColor(contextKey) {
    if (!contextColors.has(contextKey)) {
        contextColors.set(contextKey, CONTEXT_COLORS[colorIndex % CONTEXT_COLORS.length]);
        colorIndex++;
    }
    return contextColors.get(contextKey);
}

function getSelection(contextKey) {
    if (!selectionByContext.has(contextKey)) {
        selectionByContext.set(contextKey, new Set());
    }
    return selectionByContext.get(contextKey);
}

function setSelection(contextKey, itemId) {
    const selection = getSelection(contextKey);
    selection.clear();
    if (itemId !== null) {
        selection.add(itemId);
    }
    broadcastSelectionChange(contextKey);
}

function isSelected(contextKey, itemId) {
    return getSelection(contextKey).has(itemId);
}

function getSelectedItem(contextKey) {
    const selection = getSelection(contextKey);
    return selection.size > 0 ? Array.from(selection)[0] : null;
}

function broadcastSelectionChange(contextKey) {
    panels.forEach(panel => {
        if (panel.contextKey === contextKey && panel.onSelectionChange) {
            panel.onSelectionChange();
        }
    });
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
        x: x || 50 + (panels.length * 30),
        y: y || 50 + (panels.length * 30),
        width: width || (presentation === 'Viewport' ? 400 : 250),
        height: height || (presentation === 'Viewport' ? 300 : 250),
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

    const panel = panels[index];
    panel.element.remove();
    panels.splice(index, 1);

    updateContextList();
}

function updatePanelContext(panelId, newScope, newState) {
    const panel = panels.find(p => p.id === panelId);
    if (!panel) return;

    panel.scope = newScope;
    panel.state = newState;
    panel.contextKey = getContextKey(newScope, newState);
    panel.color = getContextColor(panel.contextKey);

    // Re-render panel
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
    header.innerHTML = `
        <div class="panel-controls">
            <span class="panel-btn close" title="Close"></span>
            <span class="panel-btn"></span>
            <span class="panel-btn"></span>
        </div>
        <span class="panel-color" style="background: ${panel.color}"></span>
        <span class="panel-tuple">(${panel.scope}, ${panel.state}, ${panel.presentation})</span>
        <span class="panel-menu-btn" title="Change context">⚙</span>
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

    if (panel.presentation === 'Viewport') {
        createViewportContent(content, panel);
    } else if (panel.presentation === 'List') {
        createListContent(content, panel);
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
    // Remove existing menu
    const existing = header.querySelector('.panel-menu');
    if (existing) {
        existing.remove();
        return;
    }

    // Close other menus
    document.querySelectorAll('.panel-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'panel-menu';
    menu.innerHTML = `
        <div class="panel-menu-group">
            <div class="panel-menu-label">Scope</div>
            <select class="menu-scope">
                ${SCOPES.map(s => `<option value="${s}" ${s === panel.scope ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </div>
        <div class="panel-menu-group">
            <div class="panel-menu-label">State</div>
            <select class="menu-state">
                ${STATES.map(s => `<option value="${s}" ${s === panel.state ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </div>
    `;

    // Handle changes
    const scopeSelect = menu.querySelector('.menu-scope');
    const stateSelect = menu.querySelector('.menu-state');

    const applyChange = () => {
        updatePanelContext(panel.id, scopeSelect.value, stateSelect.value);
    };

    scopeSelect.addEventListener('change', applyChange);
    stateSelect.addEventListener('change', applyChange);

    // Prevent drag when interacting with menu
    menu.addEventListener('mousedown', e => e.stopPropagation());

    header.appendChild(menu);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target) && e.target !== header.querySelector('.panel-menu-btn')) {
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

function createViewportContent(contentEl, panel) {
    const canvas = document.createElement('div');
    canvas.className = 'viewport-canvas';

    const positions = [
        { x: 40, y: 40 },
        { x: 120, y: 80 },
        { x: 200, y: 50 },
        { x: 80, y: 150 },
        { x: 180, y: 130 },
    ];

    objects.forEach((obj, i) => {
        const objEl = document.createElement('div');
        objEl.className = 'viewport-object';
        objEl.dataset.itemId = obj.id;
        objEl.textContent = (i + 1);
        objEl.style.left = `${positions[i].x}px`;
        objEl.style.top = `${positions[i].y}px`;

        objEl.addEventListener('click', (e) => {
            e.stopPropagation();
            setSelection(panel.contextKey, obj.id);
        });

        canvas.appendChild(objEl);
    });

    canvas.addEventListener('click', () => {
        setSelection(panel.contextKey, null);
    });

    contentEl.appendChild(canvas);

    panel.onSelectionChange = () => {
        canvas.querySelectorAll('.viewport-object').forEach(objEl => {
            objEl.classList.toggle('selected', isSelected(panel.contextKey, objEl.dataset.itemId));
        });
    };
}

function createListContent(contentEl, panel) {
    const list = document.createElement('div');
    list.className = 'list-content';

    objects.forEach(obj => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.itemId = obj.id;
        item.innerHTML = `
            <div class="list-item-icon"></div>
            <span>${obj.name}</span>
        `;

        item.addEventListener('click', () => {
            setSelection(panel.contextKey, obj.id);
        });

        list.appendChild(item);
    });

    contentEl.appendChild(list);

    panel.onSelectionChange = () => {
        list.querySelectorAll('.list-item').forEach(item => {
            item.classList.toggle('selected', isSelected(panel.contextKey, item.dataset.itemId));
        });
    };
}

function createPropertiesContent(contentEl, panel) {
    const props = document.createElement('div');
    props.className = 'properties-content';

    function render() {
        const selectedId = getSelectedItem(panel.contextKey);
        const obj = objects.find(o => o.id === selectedId);

        if (!obj) {
            props.innerHTML = '<div class="no-selection">No selection</div>';
            return;
        }

        props.innerHTML = `
            <div class="prop-row">
                <span class="prop-label">Name</span>
                <span class="prop-value">${obj.name}</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">ID</span>
                <span class="prop-value">${obj.id}</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Context</span>
                <span class="prop-value">${panel.contextKey}</span>
            </div>
        `;
    }

    contentEl.appendChild(props);
    panel.onSelectionChange = render;
    render();
}

// =============================================================================
// Context List (Sidebar)
// =============================================================================

function updateContextList() {
    const listEl = document.getElementById('context-list');

    // Group panels by context
    const contexts = new Map();
    panels.forEach(p => {
        if (!contexts.has(p.contextKey)) {
            contexts.set(p.contextKey, { color: p.color, panels: [] });
        }
        contexts.get(p.contextKey).panels.push(p);
    });

    listEl.innerHTML = '';

    if (contexts.size === 0) {
        listEl.innerHTML = '<div style="color: #555; font-size: 11px; padding: 8px;">No panels yet</div>';
        return;
    }

    contexts.forEach((ctx, key) => {
        const item = document.createElement('div');
        item.className = 'context-item';
        item.innerHTML = `
            <span class="context-color" style="background: ${ctx.color}"></span>
            <span class="context-label">${key}</span>
            <span class="context-count">${ctx.panels.length}</span>
        `;

        // Highlight panels on hover
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

// =============================================================================
// Initialization
// =============================================================================

function init() {
    // Add panel button
    document.getElementById('add-panel-btn').addEventListener('click', () => {
        const scope = document.getElementById('new-scope').value;
        const state = document.getElementById('new-state').value;
        const presentation = document.getElementById('new-presentation').value;
        createPanel({ scope, state, presentation });
    });

    // Create initial demo panels
    createPanel({ scope: 'Game', state: 'Edit', presentation: 'Viewport', x: 40, y: 40, width: 350, height: 280 });
    createPanel({ scope: 'Game', state: 'Edit', presentation: 'List', x: 420, y: 40, width: 220, height: 280 });
    createPanel({ scope: 'Asset', state: 'Browse', presentation: 'List', x: 40, y: 350, width: 220, height: 220 });
    createPanel({ scope: 'Asset', state: 'Browse', presentation: 'Properties', x: 290, y: 350, width: 220, height: 220 });
}

document.addEventListener('DOMContentLoaded', init);
