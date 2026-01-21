/**
 * Domain Model
 *
 * Hierarchy:
 *   Account
 *   ├── Games
 *   │   └── Game
 *   │       └── Assets (places, scripts, packages)
 *   │           └── Place
 *   │               ├── Instances (scene objects)
 *   │               └── References (to scripts/packages)
 *   └── Inventory
 *       └── Assets (standalone packages, meshes, images)
 */

// =============================================================================
// Asset Types
// =============================================================================

const AssetType = {
    GAME: 'game',
    PLACE: 'place',
    SCRIPT: 'script',
    PACKAGE: 'package',
    MESH: 'mesh',
    IMAGE: 'image',
    AUDIO: 'audio',
};

const InstanceType = {
    MODEL: 'model',
    PART: 'part',
    LIGHT: 'light',
    SPAWN: 'spawn',
    SCRIPT: 'script',
    CAMERA: 'camera',
    FOLDER: 'folder',
};

// =============================================================================
// Domain Classes
// =============================================================================

class Instance {
    constructor(id, name, type, position = { x: 0, y: 0, z: 0 }) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.position = position;
        this.children = [];
        this.parentId = null;
    }

    addChild(instance) {
        instance.parentId = this.id;
        this.children.push(instance);
        return instance;
    }
}

class Place {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.type = AssetType.PLACE;
        this.instances = [];      // Scene graph root instances
        this.references = [];     // Referenced scripts/packages
        this.parentId = null;
    }

    addInstance(instance) {
        instance.parentId = this.id;
        this.instances.push(instance);
        return instance;
    }

    addReference(asset) {
        this.references.push(asset);
        return asset;
    }

    getInstances() {
        return this.instances;
    }

    getReferences() {
        return this.references;
    }
}

class Asset {
    constructor(id, name, type, parentId = null) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.parentId = parentId;
    }
}

class Game {
    constructor(id, name, accountId) {
        this.id = id;
        this.name = name;
        this.accountId = accountId;
        this.assets = [];
    }

    addAsset(asset) {
        asset.parentId = this.id;
        this.assets.push(asset);
        return asset;
    }

    addPlace(place) {
        place.parentId = this.id;
        this.assets.push(place);
        return place;
    }

    getAssets() {
        return this.assets;
    }

    getPlaces() {
        return this.assets.filter(a => a.type === AssetType.PLACE);
    }
}

class Inventory {
    constructor(id, accountId) {
        this.id = id;
        this.accountId = accountId;
        this.assets = [];
    }

    addAsset(asset) {
        asset.parentId = this.id;
        this.assets.push(asset);
        return asset;
    }

    getAssets() {
        return this.assets;
    }
}

class Account {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.games = [];
        this.inventory = new Inventory(`inv-${id}`, id);
    }

    addGame(game) {
        game.accountId = this.id;
        this.games.push(game);
        return game;
    }

    getGames() {
        return this.games;
    }

    getInventory() {
        return this.inventory;
    }
}

// =============================================================================
// World
// =============================================================================

class World {
    constructor() {
        this.accounts = new Map();
        this.gamesById = new Map();
        this.assetsById = new Map();
        this.placesById = new Map();
        this.instancesById = new Map();
        this.inventoriesById = new Map();
    }

    addAccount(account) {
        this.accounts.set(account.id, account);
        this.inventoriesById.set(account.inventory.id, account.inventory);
        return account;
    }

    getAccount(id) { return this.accounts.get(id); }

    registerGame(game) { this.gamesById.set(game.id, game); }
    getGame(id) { return this.gamesById.get(id); }

    registerAsset(asset) { this.assetsById.set(asset.id, asset); }
    getAsset(id) { return this.assetsById.get(id); }

    registerPlace(place) {
        this.placesById.set(place.id, place);
        this.assetsById.set(place.id, place);
    }
    getPlace(id) { return this.placesById.get(id); }

    registerInstance(instance) { this.instancesById.set(instance.id, instance); }
    getInstance(id) { return this.instancesById.get(id); }

    getInventory(id) { return this.inventoriesById.get(id); }

    getNodeByScope(scope) {
        switch (scope.type) {
            case 'account': return this.getAccount(scope.id);
            case 'game': return this.getGame(scope.id);
            case 'inventory': return this.getInventory(scope.id);
            case 'place': return this.getPlace(scope.id);
            case 'asset': return this.getAsset(scope.id);
            case 'instance': return this.getInstance(scope.id);
            default: return null;
        }
    }

    getChildrenForScope(scope) {
        const node = this.getNodeByScope(scope);
        if (!node) return [];

        switch (scope.type) {
            case 'account': return node.getGames();
            case 'game': return node.getAssets();
            case 'inventory': return node.getAssets();
            case 'place': return node.getInstances();
            case 'asset': return [];
            case 'instance': return node.children || [];
            default: return [];
        }
    }

    // Check if scope supports viewport (only places)
    scopeSupportsViewport(scope) {
        return scope.type === 'place';
    }
}

// =============================================================================
// Scope Helpers
// =============================================================================

function createScope(type, id) {
    return { type, id };
}

function scopeKey(scope) {
    return `${scope.type}:${scope.id}`;
}

function scopeLabel(scope, world) {
    const node = world.getNodeByScope(scope);
    if (!node) return `${scope.type}:${scope.id}`;

    switch (scope.type) {
        case 'account': return node.name;
        case 'game': return node.name;
        case 'inventory':
            const account = world.getAccount(node.accountId);
            return `${account?.name || 'Unknown'}'s Inventory`;
        case 'place': return node.name;
        case 'asset': return node.name;
        case 'instance': return node.name;
        default: return scope.id;
    }
}

// =============================================================================
// Sample Data
// =============================================================================

function createSampleWorld() {
    const world = new World();

    // === jimjam account ===
    const jimjam = new Account('jimjam', 'jimjam');
    world.addAccount(jimjam);

    // -- Obby Adventure game --
    const obby = new Game('obby', 'Obby Adventure', 'jimjam');
    jimjam.addGame(obby);
    world.registerGame(obby);

    // Obby - Main Lobby place
    const lobby = new Place('obby-lobby', 'Main Lobby');
    obby.addPlace(lobby);
    world.registerPlace(lobby);

    // Lobby instances
    const workspace = new Instance('lobby-workspace', 'Workspace', InstanceType.FOLDER);
    lobby.addInstance(workspace);
    world.registerInstance(workspace);

    const spawn = new Instance('lobby-spawn', 'SpawnLocation', InstanceType.SPAWN, { x: 0, y: 5, z: 0 });
    workspace.addChild(spawn);
    world.registerInstance(spawn);

    const baseplate = new Instance('lobby-baseplate', 'Baseplate', InstanceType.PART, { x: 0, y: 0, z: 0 });
    workspace.addChild(baseplate);
    world.registerInstance(baseplate);

    const startPortal = new Instance('lobby-portal', 'StartPortal', InstanceType.MODEL, { x: 20, y: 5, z: 0 });
    workspace.addChild(startPortal);
    world.registerInstance(startPortal);

    const lighting = new Instance('lobby-light', 'SunLight', InstanceType.LIGHT, { x: 50, y: 100, z: 50 });
    lobby.addInstance(lighting);
    world.registerInstance(lighting);

    const lobbyScript = new Asset('obby-lobby-script', 'LobbyManager', AssetType.SCRIPT);
    lobby.addReference(lobbyScript);
    world.registerAsset(lobbyScript);

    // Obby - Level 1 place
    const level1 = new Place('obby-level1', 'Level 1');
    obby.addPlace(level1);
    world.registerPlace(level1);

    const l1Workspace = new Instance('l1-workspace', 'Workspace', InstanceType.FOLDER);
    level1.addInstance(l1Workspace);
    world.registerInstance(l1Workspace);

    const platform1 = new Instance('l1-plat1', 'Platform1', InstanceType.PART, { x: 0, y: 10, z: 0 });
    l1Workspace.addChild(platform1);
    world.registerInstance(platform1);

    const platform2 = new Instance('l1-plat2', 'Platform2', InstanceType.PART, { x: 15, y: 15, z: 0 });
    l1Workspace.addChild(platform2);
    world.registerInstance(platform2);

    const platform3 = new Instance('l1-plat3', 'Platform3', InstanceType.PART, { x: 30, y: 20, z: 5 });
    l1Workspace.addChild(platform3);
    world.registerInstance(platform3);

    const checkpoint = new Instance('l1-checkpoint', 'Checkpoint', InstanceType.SPAWN, { x: 30, y: 22, z: 5 });
    l1Workspace.addChild(checkpoint);
    world.registerInstance(checkpoint);

    const finishLine = new Instance('l1-finish', 'FinishLine', InstanceType.MODEL, { x: 50, y: 25, z: 10 });
    l1Workspace.addChild(finishLine);
    world.registerInstance(finishLine);

    // Obby - Level 2 place
    const level2 = new Place('obby-level2', 'Level 2');
    obby.addPlace(level2);
    world.registerPlace(level2);

    const l2Workspace = new Instance('l2-workspace', 'Workspace', InstanceType.FOLDER);
    level2.addInstance(l2Workspace);
    world.registerInstance(l2Workspace);

    for (let i = 1; i <= 6; i++) {
        const plat = new Instance(`l2-plat${i}`, `JumpPad${i}`, InstanceType.PART, {
            x: i * 12, y: 10 + i * 3, z: (i % 2) * 10
        });
        l2Workspace.addChild(plat);
        world.registerInstance(plat);
    }

    // Obby scripts (game-level)
    const gameManager = new Asset('obby-gm', 'GameManager', AssetType.SCRIPT);
    obby.addAsset(gameManager);
    world.registerAsset(gameManager);

    const playerController = new Asset('obby-pc', 'PlayerController', AssetType.SCRIPT);
    obby.addAsset(playerController);
    world.registerAsset(playerController);

    // -- FPS Battle game --
    const fps = new Game('fpsgame', 'FPS Battle', 'jimjam');
    jimjam.addGame(fps);
    world.registerGame(fps);

    const arena = new Place('fps-arena', 'Arena');
    fps.addPlace(arena);
    world.registerPlace(arena);

    const arenaWS = new Instance('arena-ws', 'Workspace', InstanceType.FOLDER);
    arena.addInstance(arenaWS);
    world.registerInstance(arenaWS);

    const ground = new Instance('arena-ground', 'Ground', InstanceType.PART, { x: 0, y: 0, z: 0 });
    arenaWS.addChild(ground);
    world.registerInstance(ground);

    const wall1 = new Instance('arena-wall1', 'NorthWall', InstanceType.PART, { x: 0, y: 10, z: 50 });
    arenaWS.addChild(wall1);
    world.registerInstance(wall1);

    const wall2 = new Instance('arena-wall2', 'SouthWall', InstanceType.PART, { x: 0, y: 10, z: -50 });
    arenaWS.addChild(wall2);
    world.registerInstance(wall2);

    const spawnA = new Instance('arena-spawna', 'TeamASpawn', InstanceType.SPAWN, { x: -40, y: 5, z: 0 });
    arenaWS.addChild(spawnA);
    world.registerInstance(spawnA);

    const spawnB = new Instance('arena-spawnb', 'TeamBSpawn', InstanceType.SPAWN, { x: 40, y: 5, z: 0 });
    arenaWS.addChild(spawnB);
    world.registerInstance(spawnB);

    const weaponScript = new Asset('fps-weapons', 'WeaponSystem', AssetType.SCRIPT);
    fps.addAsset(weaponScript);
    world.registerAsset(weaponScript);

    // -- jimjam's inventory --
    const inv = jimjam.getInventory();

    const uiKit = new Asset('pkg-ui', 'UI Kit', AssetType.PACKAGE);
    inv.addAsset(uiKit);
    world.registerAsset(uiKit);

    const physicsUtils = new Asset('pkg-physics', 'Physics Utils', AssetType.PACKAGE);
    inv.addAsset(physicsUtils);
    world.registerAsset(physicsUtils);

    const charRig = new Asset('mesh-char', 'Character Rig', AssetType.MESH);
    inv.addAsset(charRig);
    world.registerAsset(charRig);

    const treeModel = new Asset('mesh-tree', 'Tree Model', AssetType.MESH);
    inv.addAsset(treeModel);
    world.registerAsset(treeModel);

    const logo = new Asset('img-logo', 'Logo', AssetType.IMAGE);
    inv.addAsset(logo);
    world.registerAsset(logo);

    const skybox = new Asset('img-skybox', 'Skybox', AssetType.IMAGE);
    inv.addAsset(skybox);
    world.registerAsset(skybox);

    const bgMusic = new Asset('audio-bg', 'Background Music', AssetType.AUDIO);
    inv.addAsset(bgMusic);
    world.registerAsset(bgMusic);

    // === studiodev account ===
    const studiodev = new Account('studiodev', 'studiodev');
    world.addAccount(studiodev);

    const testGame = new Game('testgame', 'Test Experience', 'studiodev');
    studiodev.addGame(testGame);
    world.registerGame(testGame);

    const testPlace = new Place('test-place', 'Test Place');
    testGame.addPlace(testPlace);
    world.registerPlace(testPlace);

    const testWS = new Instance('test-ws', 'Workspace', InstanceType.FOLDER);
    testPlace.addInstance(testWS);
    world.registerInstance(testWS);

    const testPart = new Instance('test-part', 'TestPart', InstanceType.PART, { x: 0, y: 5, z: 0 });
    testWS.addChild(testPart);
    world.registerInstance(testPart);

    const devInv = studiodev.getInventory();
    const debugTools = new Asset('pkg-debug', 'Debug Tools', AssetType.PACKAGE);
    devInv.addAsset(debugTools);
    world.registerAsset(debugTools);

    return world;
}

// =============================================================================
// Exports
// =============================================================================

window.Model = {
    AssetType,
    InstanceType,
    Instance,
    Place,
    Asset,
    Game,
    Inventory,
    Account,
    World,
    createScope,
    scopeKey,
    scopeLabel,
    createSampleWorld,
};
