/**
 * Inventory Explorer - Data Model
 *
 * Loads from owners.json and builds a navigable object graph
 * with cross-reference tracking (which instances use which assets).
 */

const AssetType = {
    GAME: 'game',
    PLACE: 'place',
    PACKAGE: 'package',
    MESH: 'mesh',
    IMAGE: 'image',
    AUDIO: 'audio',
};

const ICONS = {
    account: '👤',
    group: '👥',
    game: '🎮',
    place: '🗺️',
    inventory: '📦',
    package: '📦',
    mesh: '🔷',
    image: '🖼️',
    audio: '🔊',
    Part: '🧱',
    MeshPart: '🔷',
    Model: '📦',
    Script: '📜',
    LocalScript: '📜',
    Decal: '🖼️',
    PackageLink: '📦',
    ImageLabel: '🖼️',
    folder: '📁',
    unknown: '📄',
};

function iconFor(thing) {
    if (!thing) return ICONS.unknown;
    // Instance class
    if (thing.class) return ICONS[thing.class] || ICONS.unknown;
    // Asset type
    if (thing.type) return ICONS[thing.type] || ICONS.unknown;
    return ICONS.unknown;
}

// =============================================================================
// World: central registry loaded from owners.json
// =============================================================================

class World {
    constructor(data) {
        this.owners = [];
        this.byId = new Map();        // id -> any node
        this.usages = new Map();      // inventoryAssetId -> [{ownerId, gameId, placeId, instanceId}]

        for (const ownerData of data.owners) {
            const owner = this._loadOwner(ownerData);
            this.owners.push(owner);
        }
    }

    _loadOwner(d) {
        const owner = {
            kind: 'owner',
            id: d.id,
            type: d.type,           // 'account' or 'group'
            games: [],
            inventory: [],
        };
        this.byId.set(owner.id, owner);

        for (const g of d.games) {
            const game = this._loadGame(g, owner);
            owner.games.push(game);
        }
        for (const a of (d.inventory || [])) {
            const asset = { kind: 'asset', ...a, ownerId: owner.id };
            owner.inventory.push(asset);
            this.byId.set(asset.id, asset);
        }
        return owner;
    }

    _loadGame(d, owner) {
        const game = {
            kind: 'game',
            id: d.id,
            name: d.name,
            ownerId: owner.id,
            places: [],
        };
        this.byId.set(game.id, game);

        for (const p of d.places) {
            const place = this._loadPlace(p, game, owner);
            game.places.push(place);
        }
        return game;
    }

    _loadPlace(d, game, owner) {
        const place = {
            kind: 'place',
            id: d.id,
            name: d.name,
            gameId: game.id,
            ownerId: owner.id,
            instances: [],
        };
        this.byId.set(place.id, place);

        for (const inst of (d.instances || [])) {
            const instance = this._loadInstance(inst, place, owner);
            place.instances.push(instance);
        }
        return place;
    }

    _loadInstance(d, place, owner) {
        const instance = {
            kind: 'instance',
            id: d.id,
            class: d.class,
            name: d.name,
            placeId: place.id,
            gameId: place.gameId,
            ownerId: owner.id,
            // Keep reference IDs for cross-linking
            meshId: d.meshId || null,
            textureId: d.textureId || null,
            imageId: d.imageId || null,
            packageId: d.packageId || null,
            size: d.size || null,
            position: d.position || null,
            color: d.color || null,
        };
        this.byId.set(instance.id, instance);

        // Track usages of inventory assets
        const refs = [d.meshId, d.textureId, d.imageId, d.packageId].filter(Boolean);
        for (const refId of refs) {
            if (!this.usages.has(refId)) this.usages.set(refId, []);
            this.usages.get(refId).push({
                ownerId: owner.id,
                gameId: place.gameId,
                placeId: place.id,
                instanceId: instance.id,
                instanceName: instance.name,
                placeName: place.name,
            });
        }
        return instance;
    }

    get(id) {
        return this.byId.get(id) || null;
    }

    getUsages(assetId) {
        return this.usages.get(assetId) || [];
    }
}

// =============================================================================
// Load
// =============================================================================

async function loadWorld() {
    const resp = await fetch('../data/owners.json');
    const data = await resp.json();
    return new World(data);
}

window.Model = { AssetType, ICONS, iconFor, World, loadWorld };
