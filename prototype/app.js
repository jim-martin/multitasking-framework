/**
 * Multitasking Framework - View Coordination Prototype
 *
 * Demonstrates the tuple-based view coordination system:
 * - Views identified by (Scope, State, Presentation)
 * - Views with same (Scope, State) share selection (Faceted Views)
 * - Different Contexts maintain independent selection
 */

// =============================================================================
// State Management
// =============================================================================

// Selection state per Context (Scope + State combination)
// Key: "Scope-State", Value: Set of selected item IDs
const selectionByContext = new Map();

// All window instances
const windows = [];

// Z-index counter for stacking
let topZIndex = 100;

// =============================================================================
// Selection System
// =============================================================================

function getContextKey(scope, state) {
    return `${scope}-${state}`;
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

function toggleSelection(contextKey, itemId) {
    const selection = getSelection(contextKey);
    if (selection.has(itemId)) {
        selection.delete(itemId);
    } else {
        selection.clear(); // Single selection mode
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
    windows.forEach(win => {
        if (win.contextKey === contextKey && win.onSelectionChange) {
            win.onSelectionChange();
        }
    });
}

// =============================================================================
// Window Management
// =============================================================================

function createWindow(config) {
    const { scope, state, presentation, x, y, width, height, contentFactory } = config;
    const contextKey = getContextKey(scope, state);

    const template = document.getElementById('window-template');
    const windowEl = template.content.cloneNode(true).querySelector('.window');

    // Set tuple as title
    const tupleString = `(${scope}, ${state}, ${presentation})`;
    windowEl.querySelector('.window-title').textContent = tupleString;

    // Set context for styling
    windowEl.dataset.context = contextKey;

    // Position and size
    windowEl.style.left = `${x}px`;
    windowEl.style.top = `${y}px`;
    windowEl.style.width = `${width}px`;
    windowEl.style.height = `${height}px`;
    windowEl.style.zIndex = topZIndex++;

    // Create window object
    const windowObj = {
        element: windowEl,
        scope,
        state,
        presentation,
        contextKey,
        onSelectionChange: null
    };

    // Generate content
    const contentEl = windowEl.querySelector('.window-content');
    contentFactory(contentEl, windowObj);

    // Add to DOM and tracking
    document.getElementById('desktop').appendChild(windowEl);
    windows.push(windowObj);

    // Setup interactions
    setupDragging(windowEl);
    setupFocusing(windowEl);

    return windowObj;
}

function setupDragging(windowEl) {
    const titlebar = windowEl.querySelector('.window-titlebar');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    titlebar.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialLeft = windowEl.offsetLeft;
        initialTop = windowEl.offsetTop;

        // Bring to front
        windowEl.style.zIndex = ++topZIndex;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    function onMouseMove(e) {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        windowEl.style.left = `${initialLeft + dx}px`;
        windowEl.style.top = `${initialTop + dy}px`;
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

function setupFocusing(windowEl) {
    windowEl.addEventListener('mousedown', () => {
        // Remove active from all windows
        document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
        // Add active to this window
        windowEl.classList.add('active');
        // Bring to front
        windowEl.style.zIndex = ++topZIndex;
    });
}

// =============================================================================
// Content Factories
// =============================================================================

// Demo data - shared across views
const demoObjects = [
    { id: 'obj1', name: 'Player', type: 'Model' },
    { id: 'obj2', name: 'Terrain', type: 'Part' },
    { id: 'obj3', name: 'SpawnPoint', type: 'SpawnLocation' },
    { id: 'obj4', name: 'Lighting', type: 'Lighting' },
    { id: 'obj5', name: 'Camera', type: 'Camera' }
];

const assetObjects = [
    { id: 'asset1', name: 'PlayerScript.lua', type: 'Script' },
    { id: 'asset2', name: 'GameConfig.json', type: 'JSON' },
    { id: 'asset3', name: 'README.md', type: 'Markdown' }
];

function createTreeContent(contentEl, windowObj) {
    const tree = document.createElement('div');
    tree.className = 'tree-view';

    // Root node
    const root = document.createElement('div');
    root.className = 'tree-item';
    root.innerHTML = '<span class="icon">▼</span> Workspace';
    tree.appendChild(root);

    // Child nodes
    demoObjects.forEach(obj => {
        const item = document.createElement('div');
        item.className = 'tree-item';
        item.dataset.itemId = obj.id;
        item.innerHTML = `<span class="indent"></span><span class="icon">□</span> ${obj.name}`;

        item.addEventListener('click', () => {
            toggleSelection(windowObj.contextKey, obj.id);
        });

        tree.appendChild(item);
    });

    contentEl.appendChild(tree);

    // Selection change handler
    windowObj.onSelectionChange = () => {
        tree.querySelectorAll('.tree-item[data-item-id]').forEach(item => {
            const itemId = item.dataset.itemId;
            item.classList.toggle('selected', isSelected(windowObj.contextKey, itemId));
        });
    };
}

function createViewportContent(contentEl, windowObj) {
    const viewport = document.createElement('div');
    viewport.className = 'viewport-3d';

    const canvas = document.createElement('div');
    canvas.className = 'viewport-canvas';

    // Place objects in viewport
    const positions = [
        { x: 30, y: 30 },
        { x: 120, y: 80 },
        { x: 200, y: 40 },
        { x: 80, y: 140 },
        { x: 180, y: 160 }
    ];

    demoObjects.forEach((obj, i) => {
        const objEl = document.createElement('div');
        objEl.className = 'viewport-object';
        objEl.dataset.itemId = obj.id;
        objEl.textContent = obj.name.substring(0, 6);
        objEl.style.left = `${positions[i].x}px`;
        objEl.style.top = `${positions[i].y}px`;

        objEl.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSelection(windowObj.contextKey, obj.id);
        });

        canvas.appendChild(objEl);
    });

    viewport.appendChild(canvas);
    contentEl.appendChild(viewport);

    // Selection change handler
    windowObj.onSelectionChange = () => {
        canvas.querySelectorAll('.viewport-object').forEach(objEl => {
            const itemId = objEl.dataset.itemId;
            objEl.classList.toggle('selected', isSelected(windowObj.contextKey, itemId));
        });
    };
}

function createPropertiesContent(contentEl, windowObj) {
    const panel = document.createElement('div');
    panel.className = 'properties-panel';

    function render() {
        const selectedId = getSelectedItem(windowObj.contextKey);

        if (!selectedId) {
            panel.innerHTML = '<div class="no-selection">No object selected</div>';
            return;
        }

        const obj = demoObjects.find(o => o.id === selectedId);
        if (!obj) {
            panel.innerHTML = '<div class="no-selection">No object selected</div>';
            return;
        }

        panel.innerHTML = `
            <div class="property-group">
                <div class="property-group-title">Identity</div>
                <div class="property-row">
                    <span class="property-label">Name</span>
                    <span class="property-value">${obj.name}</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Type</span>
                    <span class="property-value">${obj.type}</span>
                </div>
                <div class="property-row">
                    <span class="property-label">ID</span>
                    <span class="property-value">${obj.id}</span>
                </div>
            </div>
            <div class="property-group">
                <div class="property-group-title">Transform</div>
                <div class="property-row">
                    <span class="property-label">Position</span>
                    <span class="property-value">(0, 0, 0)</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Rotation</span>
                    <span class="property-value">(0, 0, 0)</span>
                </div>
                <div class="property-row">
                    <span class="property-label">Scale</span>
                    <span class="property-value">(1, 1, 1)</span>
                </div>
            </div>
        `;
    }

    contentEl.appendChild(panel);

    // Selection change handler
    windowObj.onSelectionChange = render;

    // Initial render
    render();
}

function createTextEditorContent(contentEl, windowObj) {
    const editor = document.createElement('div');
    editor.className = 'text-editor';

    // File list (acts as selection target)
    const fileList = document.createElement('ul');
    fileList.className = 'item-list';

    assetObjects.forEach(asset => {
        const item = document.createElement('li');
        item.dataset.itemId = asset.id;
        item.textContent = asset.name;

        item.addEventListener('click', () => {
            toggleSelection(windowObj.contextKey, asset.id);
        });

        fileList.appendChild(item);
    });

    editor.appendChild(fileList);

    // Editor preview area
    const preview = document.createElement('div');
    preview.className = 'editor-content';
    preview.innerHTML = '<em>Select a file to preview...</em>';

    function updatePreview() {
        const selectedId = getSelectedItem(windowObj.contextKey);
        const asset = assetObjects.find(a => a.id === selectedId);

        if (asset) {
            if (asset.type === 'Script') {
                preview.innerHTML = `<pre>-- ${asset.name}\nlocal player = game.Players.LocalPlayer\nprint("Hello, " .. player.Name)</pre>`;
            } else if (asset.type === 'JSON') {
                preview.innerHTML = `<pre>{\n  "gameName": "Demo Game",\n  "version": "1.0.0"\n}</pre>`;
            } else {
                preview.innerHTML = `<pre># ${asset.name}\n\nThis is a markdown file.</pre>`;
            }
        } else {
            preview.innerHTML = '<em>Select a file to preview...</em>';
        }
    }

    editor.appendChild(preview);
    contentEl.appendChild(editor);

    // Selection change handler
    windowObj.onSelectionChange = () => {
        fileList.querySelectorAll('li').forEach(item => {
            const itemId = item.dataset.itemId;
            item.classList.toggle('selected', isSelected(windowObj.contextKey, itemId));
        });
        updatePreview();
    };
}

// =============================================================================
// Demo Setup
// =============================================================================

function initDemo() {
    // Faceted Views: (Game, Edit, *) - all share selection
    // These demonstrate linked selection across different presentations

    createWindow({
        scope: 'Game',
        state: 'Edit',
        presentation: 'Tree',
        x: 40,
        y: 40,
        width: 250,
        height: 320,
        contentFactory: createTreeContent
    });

    createWindow({
        scope: 'Game',
        state: 'Edit',
        presentation: '3D',
        x: 320,
        y: 40,
        width: 350,
        height: 280,
        contentFactory: createViewportContent
    });

    createWindow({
        scope: 'Game',
        state: 'Edit',
        presentation: 'Properties',
        x: 700,
        y: 40,
        width: 280,
        height: 320,
        contentFactory: createPropertiesContent
    });

    // Independent Context: (Asset, Edit, Text) - separate selection
    // This demonstrates that different Contexts maintain independent state

    createWindow({
        scope: 'Asset',
        state: 'Edit',
        presentation: 'Text',
        x: 320,
        y: 360,
        width: 350,
        height: 250,
        contentFactory: createTextEditorContent
    });

    // Set initial focus
    const firstWindow = document.querySelector('.window');
    if (firstWindow) {
        firstWindow.classList.add('active');
    }
}

// Start the demo
document.addEventListener('DOMContentLoaded', initDemo);
