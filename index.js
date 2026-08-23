'use strict';
const config = require('./config.js');

module.exports = function AutoLoot(mod) {
    const cmd = mod.command || mod.require.command;

    let enable       = config.enable;
    let enableAuto   = config.enableAuto;
    let interval     = config.interval;
    let throttleMax  = config.throttleMax;
    let scanInterval = config.scanInterval;
    let radius       = config.radius;

    let location    = null;
    let items       = new Map();
    let lootTimeout = null;

    function clearLootTimer() {
        if (lootTimeout) {
            mod.clearTimeout(lootTimeout);
            lootTimeout = null;
        }
    }

    cmd.add('loot', {
        $default() {
            enable = !enable;
            mod.command.message(`Auto-loot: ${enable ? 'ON' : 'OFF'}`);
        },
        auto() {
            enableAuto = !enableAuto;
            mod.command.message(`Auto-loot scan: ${enableAuto ? 'ON' : 'OFF'}`);
        }
    });

    mod.game.me.on('change_zone', () => { items.clear(); clearLootTimer(); });

    mod.hook('S_RETURN_TO_LOBBY', '*', () => { items.clear(); clearLootTimer(); });
    mod.hook('S_SPAWN_ME', 3, (e) => { location = e.loc; });
    mod.hook('C_PLAYER_LOCATION', 5, (e) => { location = e.loc; });
    mod.hook('S_SYSTEM_MESSAGE', 1, (e) => { if (e.message === '@41') return false; });
    mod.hook('C_TRY_LOOT_DROPITEM', 4, () => { if (enable && !lootTimeout) lootTimeout = mod.setTimeout(tryLoot, interval); });
    mod.hook('S_DESPAWN_DROPITEM', 4, (e) => { items.delete(e.gameId); });

    mod.hook('S_SPAWN_DROPITEM', 8, (e) => {
        if (config.blacklist.includes(e.item)) return;
        if (e.item >= 8000 && e.item <= 8024) return;
        if (!e.owners.some(owner => owner === mod.game.me.playerId)) return;

        items.set(e.gameId, Object.assign(e, { priority: 0 }));
        if (enableAuto) tryLoot(); // instant loot on spawn
    });

    function tryLoot() {
        clearLootTimer();
        if (!items.size || !mod.game.me || mod.game.me.mounted || !location) return;

        for (const item of [...items.values()].sort((a, b) => a.priority - b.priority)) {
            if (location.dist3D(item.loc) <= radius) {
                mod.send('C_TRY_LOOT_DROPITEM', 4, { gameId: item.gameId });
                lootTimeout = mod.setTimeout(tryLoot, Math.min(interval * ++item.priority, throttleMax));
                return;
            }
        }

        if (enableAuto) lootTimeout = mod.setTimeout(tryLoot, scanInterval);
    }

    this.destructor = () => {
        clearLootTimer();
        items.clear();
    };
};
