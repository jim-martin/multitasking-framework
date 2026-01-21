/**
 * Domain Model
 *
 * Hierarchical structure:
 *   Account
 *   ├── Games (collection)
 *   │   └── Game
 *   │       └── Assets (places, scripts, etc.)
 *   └── Inventory
 *       └── Assets (packages, meshes, images, etc.)
 *
 * This is the data layer - completely separate from views/presentation.
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

// =============================================================================
// Domain Classes
// =============================================================================

class Asset {
    constructor(id, name, type, parentId = null) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.parentId = parentId; // game or inventory that contains this
        this.metadata = {};
    }
}

class Game {
    constructor(id, name, accountId) {
        this.id = id;
        this.name = name;
        this.accountId = accountId;
        this.assets = []; // Assets within this game (places, scripts, etc.)
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

class Inventory {
    constructor(id, accountId) {
        this.id = id;
        this.accountId = accountId;
        this.assets = []; // Standalone assets (packages, meshes, images)
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
// World - The root container for all data
// =============================================================================

class World {
    constructor() {
        this.accounts = new Map();
        this.gamesById = new Map();
        this.assetsById = new Map();
        this.inventoriesById = new Map();
    }

    addAccount(account) {
        this.accounts.set(account.id, account);
        this.inventoriesById.set(account.inventory.id, account.inventory);
        return account;
    }

    getAccount(id) {
        return this.accounts.get(id);
    }

    registerGame(game) {
        this.gamesById.set(game.id, game);
    }

    getGame(id) {
        return this.gamesById.get(id);
    }

    registerAsset(asset) {
        this.assetsById.set(asset.id, asset);
    }

    getAsset(id) {
        return this.assetsById.get(id);
    }

    getInventory(id) {
        return this.inventoriesById.get(id);
    }

    // Get node by scope reference
    getNodeByScope(scope) {
        switch (scope.type) {
            case 'account':
                return this.getAccount(scope.id);
            case 'game':
                return this.getGame(scope.id);
            case 'inventory':
                return this.getInventory(scope.id);
            case 'asset':
                return this.getAsset(scope.id);
            default:
                return null;
        }
    }

    // Get children for a scope (what items can be selected in this scope)
    getChildrenForScope(scope) {
        const node = this.getNodeByScope(scope);
        if (!node) return [];

        switch (scope.type) {
            case 'account':
                return node.getGames();
            case 'game':
                return node.getAssets();
            case 'inventory':
                return node.getAssets();
            case 'asset':
                return []; // Assets don't have children (for now)
            default:
                return [];
        }
    }
}

// =============================================================================
// Scope Reference
// =============================================================================

// A scope identifies what domain object a view is "looking at"
// Views with the same scope + state share selection

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
        case 'account':
            return node.name;
        case 'game':
            return node.name;
        case 'inventory':
            const account = world.getAccount(node.accountId);
            return `${account?.name || 'Unknown'}'s Inventory`;
        case 'asset':
            return node.name;
        default:
            return scope.id;
    }
}

// =============================================================================
// Sample Data Factory
// =============================================================================

function createSampleWorld() {
    const world = new World();

    // Create account: jimjam
    const jimjam = new Account('jimjam', 'jimjam');
    world.addAccount(jimjam);

    // jimjam's games
    const obby = new Game('obby', 'Obby Adventure', 'jimjam');
    jimjam.addGame(obby);
    world.registerGame(obby);

    // Obby's assets
    const obbyPlace1 = new Asset('obby-place-1', 'Main Lobby', AssetType.PLACE);
    const obbyPlace2 = new Asset('obby-place-2', 'Level 1', AssetType.PLACE);
    const obbyPlace3 = new Asset('obby-place-3', 'Level 2', AssetType.PLACE);
    const obbyScript1 = new Asset('obby-script-1', 'GameManager', AssetType.SCRIPT);
    const obbyScript2 = new Asset('obby-script-2', 'PlayerController', AssetType.SCRIPT);
    [obbyPlace1, obbyPlace2, obbyPlace3, obbyScript1, obbyScript2].forEach(a => {
        obby.addAsset(a);
        world.registerAsset(a);
    });

    const fpsgame = new Game('fpsgame', 'FPS Battle', 'jimjam');
    jimjam.addGame(fpsgame);
    world.registerGame(fpsgame);

    // FPS's assets
    const fpsPlace1 = new Asset('fps-place-1', 'Arena', AssetType.PLACE);
    const fpsPlace2 = new Asset('fps-place-2', 'Training', AssetType.PLACE);
    const fpsScript1 = new Asset('fps-script-1', 'WeaponSystem', AssetType.SCRIPT);
    [fpsPlace1, fpsPlace2, fpsScript1].forEach(a => {
        fpsgame.addAsset(a);
        world.registerAsset(a);
    });

    // jimjam's inventory
    const inv = jimjam.getInventory();
    const pkg1 = new Asset('pkg-1', 'UI Kit', AssetType.PACKAGE);
    const pkg2 = new Asset('pkg-2', 'Physics Utils', AssetType.PACKAGE);
    const mesh1 = new Asset('mesh-1', 'Character Rig', AssetType.MESH);
    const mesh2 = new Asset('mesh-2', 'Tree Model', AssetType.MESH);
    const img1 = new Asset('img-1', 'Logo', AssetType.IMAGE);
    const img2 = new Asset('img-2', 'Skybox', AssetType.IMAGE);
    const audio1 = new Asset('audio-1', 'Background Music', AssetType.AUDIO);
    [pkg1, pkg2, mesh1, mesh2, img1, img2, audio1].forEach(a => {
        inv.addAsset(a);
        world.registerAsset(a);
    });

    // Create account: studiodev
    const studiodev = new Account('studiodev', 'studiodev');
    world.addAccount(studiodev);

    const testgame = new Game('testgame', 'Test Experience', 'studiodev');
    studiodev.addGame(testgame);
    world.registerGame(testgame);

    const testPlace = new Asset('test-place-1', 'Test Place', AssetType.PLACE);
    testgame.addAsset(testPlace);
    world.registerAsset(testPlace);

    // studiodev's inventory
    const inv2 = studiodev.getInventory();
    const devPkg = new Asset('dev-pkg-1', 'Debug Tools', AssetType.PACKAGE);
    inv2.addAsset(devPkg);
    world.registerAsset(devPkg);

    return world;
}

// =============================================================================
// Exports (for use in app.js)
// =============================================================================

window.Model = {
    AssetType,
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
