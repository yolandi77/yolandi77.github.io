export { newState, unpack_action, fmt_action, fmt_state, game, BUILDING_NAMES, BUILDING_LV, BUILDING_COUNT, _upgrade_building, _new_building, getTrueBuildingLvls, canBuildNewBuilding };
import { Mcts, MctsNode } from './mcts.js';
import { random_choice, range } from './utils.js';
const buildings = [{ "name": "HQ", "woodCost": 50, "ironCost": 50, "workerCost": 2, "woodStart": 1, "ironStart": 1, "workerStart": 10 }, { "name": "WoodCutter", "woodCost": 40, "ironCost": 0, "workerCost": 0.5, "woodStart": 1, "ironStart": 0, "workerStart": 8 }, { "name": "Mine", "woodCost": 40, "ironCost": 10, "workerCost": 0.5, "woodStart": 1, "ironStart": 2, "workerStart": 8 }, { "name": "Storage", "woodCost": 80, "ironCost": 20, "workerCost": 1, "woodStart": 1, "ironStart": 1, "workerStart": 4 }, { "name": "Training Center", "woodCost": 100, "ironCost": 150, "workerCost": 8, "woodStart": 1, "ironStart": 1, "workerStart": 4 }, { "name": "Barracks", "woodCost": 500, "ironCost": 500, "workerCost": 8, "woodStart": 1, "ironStart": 1, "workerStart": 4 }, { "name": "Tavern", "woodCost": 150, "ironCost": 100, "workerCost": 10, "woodStart": 1, "ironStart": 1, "workerStart": 4 }, { "name": "House", "woodCost": 500, "ironCost": 400, "workerCost": 10, "woodStart": 1, "ironStart": 1, "workerStart": 4 }, { "name": "Command Center", "woodCost": 500, "ironCost": 1000, "workerCost": 15, "woodStart": 1, "ironStart": 1, "workerStart": 1 }, { "name": "Guard Tower", "woodCost": 400, "ironCost": 900, "workerCost": 10, "woodStart": 1, "ironStart": 1, "workerStart": 1 }, { "name": "Town Hall", "woodCost": 1000, "ironCost": 600, "workerCost": 15, "woodStart": 1, "ironStart": 1, "workerStart": 1 }, { "name": "Mercenary Office", "woodCost": 400, "ironCost": 400, "workerCost": 10, "woodStart": 1, "ironStart": 1, "workerStart": 1 }, { "name": "Arena", "woodCost": 600, "ironCost": 1000, "workerCost": 15, "woodStart": 1, "ironStart": 1, "workerStart": 1 }, { "name": "Furnace", "woodCost": 150, "ironCost": 37, "workerCost": 2, "woodStart": 1, "ironStart": 1, "workerStart": 1 }, { "name": "Sawmill", "woodCost": 150, "ironCost": 37, "workerCost": 2, "woodStart": 1, "ironStart": 1, "workerStart": 1 }];
let gameHQCostScaling = [1.5, 1.5, 1.5];
let gameBuildingCostScaling = [1.5, 1.5, 1.5];
function _costs(building, level) {
    let scaling = gameBuildingCostScaling;
    if (building.name === 'HQ') {
        scaling = gameHQCostScaling;
        level -= 1;
    }
    const woodCost = level >= building.woodStart ? building.woodCost * Math.pow(scaling[0], level - 1) : 0;
    const ironCost = level >= building.ironStart ? building.ironCost * Math.pow(scaling[1], level - 1) : 0;
    const workerCost = level >= building.workerStart ? building.workerCost * Math.pow(scaling[2], level - 1) : 0;
    return [woodCost, ironCost, workerCost, 0].map(Math.round);
}
// buildings x levels x costs
function create_table(n_levels = 25) {
    return buildings.map(building => range(1, n_levels + 1).map(level => _costs(building, level)));
}
const [HQ, WOODCUTTER, MINE, STORAGE, TRAINING_CENTER, BARRACKS, TAVERN, HOUSE, COMMAND_CENTER, GUARD_TOWER, TOWN_HALL, MERCENARY_OFFICE, ARENA, FURNACE, SAWMILL] = buildings.map((_, i) => i);
const [WOOD, IRON, WORKER, SOLDIER] = [0, 1, 2, 3];
const BUILDING_NAMES = buildings.map(b => b.name);
let table;
let first_tavern_lvl;
let first_house_lvl;
function update_cached_values() {
    table = create_table().map(col => [col[0], ...col]);
    first_tavern_lvl = table[HQ].findIndex(cost => cost[WORKER] > 0) - 1;
    first_house_lvl = table[HQ].findIndex(cost => cost[WORKER] > STORAGE_BASE[WORKER] * STORAGE_MULT[WORKER]) - 1;
    if (first_house_lvl === first_tavern_lvl) {
        first_tavern_lvl -= 1;
    }
    if (first_tavern_lvl < 0)
        first_tavern_lvl = Infinity;
    if (first_house_lvl < 0)
        first_house_lvl = Infinity;
}
let game_length = 10000; // in ticks
const TICK = 0;
const SCORE = 1;
const RESOURCES = { start: 2, end: 6 };
const GAIN = { start: 6, end: 10 };
const STORAGE_CAPS = { start: 10, end: 14 };
const CUMULATIVE_RESOURCES = { start: 14, end: 18 };
const BUILDING_COUNT = { start: 18, end: 18 + buildings.length };
const BUILDING_LV = { start: 18 + buildings.length, end: 18 + 2 * buildings.length };
const LEN_STATE = BUILDING_LV.end;
function newState(json) {
    if (!json) {
        const s = new Array(LEN_STATE).fill(0);
        buyNewBuilding(s, HQ, 4);
        buyNewBuilding(s, WOODCUTTER, 1);
        buyNewBuilding(s, MINE, 1);
        buyNewBuilding(s, STORAGE, 1);
        return s;
    }
    else {
        const s_ = JSON.parse(json);
        s_.slice(GAIN.start, GAIN.end).forEach((_, i) => s_[GAIN.start + i] = getGain(s_)[i]);
        s_.slice(STORAGE_CAPS.start, STORAGE_CAPS.end).forEach((_, i) => s_[STORAGE_CAPS.start + i] = getStorage(s_)[i]);
        return s_;
    }
}
function serializeState(s) {
    return JSON.stringify(s.map(x => Math.floor(x)));
}
const GAIN_BUILDINGS = [WOODCUTTER, MINE, TAVERN, TRAINING_CENTER];
const GAIN_BASE = [1, 0, 0, 0];
const GAIN_PER_LV = [0.5, 0.5, 0.1, 0.05];
let GAIN_MULT = [1, 1, 1, 1];
const STORAGE_BUILDINGS = [STORAGE, STORAGE, HOUSE, BARRACKS];
const STORAGE_BASE = [500, 500, 50, 50];
const STORAGE_PER_LV = [500, 500, 500, 250];
let STORAGE_MULT = [1, 1, 1, 1];
function getGain(s) {
    return GAIN_MULT.map((mult, i) => mult * (GAIN_BASE[i] + GAIN_PER_LV[i] * s[BUILDING_LV.start + GAIN_BUILDINGS[i]]));
}
function getStorage(s) {
    return STORAGE_MULT.map((mult, i) => mult * (STORAGE_BASE[i] + STORAGE_PER_LV[i] * s[BUILDING_LV.start + STORAGE_BUILDINGS[i]]));
}
function getLowestLv(s, b) {
    return Math.floor(s[BUILDING_LV.start + b] / s[BUILDING_COUNT.start + b]);
}
function appraiseUpgrade(s, b) {
    const lv = Math.floor(s[BUILDING_LV.start + b] / s[BUILDING_COUNT.start + b]) + 1;
    return table[b][lv];
}
function _upgrade_building(s, b) {
    s[BUILDING_LV.start + b] += 1;
}
function upgradeBuilding(s, b, cost) {
    s.slice(RESOURCES.start, RESOURCES.end).forEach((_, i) => s[RESOURCES.start + i] -= cost[i]);
    s[BUILDING_LV.start + b] += 1;
    s.slice(GAIN.start, GAIN.end).forEach((_, i) => s[GAIN.start + i] = getGain(s)[i]);
    s.slice(STORAGE_CAPS.start, STORAGE_CAPS.end).forEach((_, i) => s[STORAGE_CAPS.start + i] = getStorage(s)[i]);
}
function canBuildNewBuilding(s) {
    return s.slice(BUILDING_COUNT.start, BUILDING_COUNT.end).reduce((a, b) => a + b, 0) - 1 < s[BUILDING_LV.start + HQ];
}
function appraiseNewBuilding(s, b) {
    let lv;
    if (s[BUILDING_COUNT.start + b] === 0) {
        lv = 1;
    }
    else {
        lv = s[BUILDING_LV.start + b] / s[BUILDING_COUNT.start + b];
        if (Number.isInteger(lv)) {
            lv -= 1;
        }
        lv = Math.max(1, Math.floor(lv));
    }
    const cost = table[b].slice(0, lv + 1).reduce((a, b) => a.map((x, i) => x + b[i]), [0, 0, 0, 0]);
    return [lv, cost];
}
function _new_building(s, b) {
    let lv;
    if (s[BUILDING_COUNT.start + b] === 0) {
        lv = 1;
    }
    else {
        lv = s[BUILDING_LV.start + b] / s[BUILDING_COUNT.start + b];
        if (Number.isInteger(lv)) {
            lv -= 1;
        }
        lv = Math.max(1, Math.floor(lv));
    }
    s[BUILDING_COUNT.start + b] += 1;
    s[BUILDING_LV.start + b] += lv;
}
function buyNewBuilding(s, b, lv, cost = [0, 0, 0, 0]) {
    s.slice(RESOURCES.start, RESOURCES.end).forEach((_, i) => s[RESOURCES.start + i] -= cost[i]);
    s[BUILDING_COUNT.start + b] += 1;
    s[BUILDING_LV.start + b] += lv;
    s.slice(GAIN.start, GAIN.end).forEach((_, i) => s[GAIN.start + i] = getGain(s)[i]);
    s.slice(STORAGE_CAPS.start, STORAGE_CAPS.end).forEach((_, i) => s[STORAGE_CAPS.start + i] = getStorage(s)[i]);
}
function hasSufficientStorage(s, cost) {
    return cost.every((c, i) => s[STORAGE_CAPS.start + i] >= c);
}
function sellBuilding(s, b) {
    s[BUILDING_LV.start + b] -= Math.floor(s[BUILDING_LV.start + b] / s[BUILDING_COUNT.start + b]);
    s[BUILDING_COUNT.start + b] -= 1;
}
const EPS = Number.EPSILON;
function getTicksUntil(s, cost) {
    return Math.ceil(Math.max(0, ...cost.map((c, i) => (c - s[RESOURCES.start + i]) / (s[GAIN.start + i] + EPS))));
}
function advanceTicks(s, n) {
    s[TICK] += n;
    const gain = s.slice(GAIN.start, GAIN.end).map(x => x * n);
    s.slice(RESOURCES.start, RESOURCES.end).forEach((_, i) => s[RESOURCES.start + i] = Math.min(s[STORAGE_CAPS.start + i], s[RESOURCES.start + i] + gain[i]));
    s.slice(CUMULATIVE_RESOURCES.start, CUMULATIVE_RESOURCES.end).forEach((_, i) => s[CUMULATIVE_RESOURCES.start + i] += gain[i]);
}
function getTrueBuildingLvls(count, totalLvl) {
    let result = [];
    while (count) {
        const lvl = Math.floor(totalLvl / count);
        result.push(lvl);
        count -= 1;
        totalLvl -= lvl;
    }
    return result;
}
function fmt_state(s, verbosity = 1) {
    const buildingStats = buildings.map((_, i) => [s[BUILDING_LV.start + i], s[BUILDING_COUNT.start + i]]);
    const buildingsStr = buildingStats.map(([lvl, count], i) => lvl > 0 ? `${BUILDING_NAMES[i]} ${getTrueBuildingLvls(count, lvl).join(' ')}` : '').filter(x => x).join(' ');
    const resourcesStr = s.slice(RESOURCES.start, RESOURCES.end).map((a, i) => `${a.toFixed(0)}/${s[STORAGE_CAPS.start + i].toFixed(0)}`).join(' ');
    return [
        `${buildingsStr}`,
        `Tick:${s[TICK].toFixed(0)} Resources: ${resourcesStr} Buildings: ${buildingsStr}`,
    ][verbosity];
}
function action(atype, building) {
    return atype * buildings.length + building;
}
function unpack_action(a) {
    return [Math.floor(a / buildings.length), a % buildings.length];
}
function fmt_action(a) {
    const [atype, b] = unpack_action(a);
    return `${['New', 'Up', 'Sell'][atype]} ${BUILDING_NAMES[b]}`;
}
function do_action(s, a) {
    const [atype, b] = unpack_action(a);
    let lv, cost, ticks;
    switch (atype) {
        case 0 /* EActionType.BUILD */:
            [lv, cost] = appraiseNewBuilding(s, b);
            ticks = getTicksUntil(s, cost);
            advanceTicks(s, ticks);
            buyNewBuilding(s, b, lv, cost);
            break;
        case 1 /* EActionType.UPGRADE */:
            cost = appraiseUpgrade(s, b);
            ticks = getTicksUntil(s, cost);
            advanceTicks(s, ticks);
            upgradeBuilding(s, b, cost);
            break;
        case 2 /* EActionType.SELL */:
            break;
    }
}
const cl = console.log;
function getActions(s) {
    const action_max_tick_cost = 2000;
    const actions = [];
    if (s[TICK] > game_length) {
        return [];
    }
    let _buildings = [WOODCUTTER, MINE];
    const hqUpgradeCost = appraiseUpgrade(s, HQ);
    if (hqUpgradeCost.some((x, i) => x > s[STORAGE_CAPS.start + i])) {
        _buildings.push(STORAGE);
    }
    if (canBuildNewBuilding(s)) {
        if (s[BUILDING_LV.start + HQ] === first_tavern_lvl) {
            return [action(0 /* EActionType.BUILD */, TAVERN)];
        }
        if (s[BUILDING_LV.start + HQ] === first_house_lvl) {
            return [action(0 /* EActionType.BUILD */, HOUSE)];
        }
        for (const b of _buildings) {
            const [lv, cost] = appraiseNewBuilding(s, b);
            if (hasSufficientStorage(s, cost)) {
                const ticks = getTicksUntil(s, cost);
                if (ticks < action_max_tick_cost) {
                    actions.push(action(0 /* EActionType.BUILD */, b));
                }
            }
        }
    }
    else {
        _buildings.push(HQ);
        if (hqUpgradeCost[WORKER] > 0) {
            _buildings.push(TAVERN);
        }
        if (hqUpgradeCost[WORKER] > s[STORAGE_CAPS.start + WORKER]) {
            _buildings.push(HOUSE);
        }
        for (const b of _buildings) {
            if (s[BUILDING_COUNT.start + b] === 0)
                continue;
            const cost = appraiseUpgrade(s, b);
            if (hasSufficientStorage(s, cost)) {
                const ticks = getTicksUntil(s, cost);
                if (ticks < action_max_tick_cost) {
                    actions.push(action(1 /* EActionType.UPGRADE */, b));
                }
            }
        }
    }
    return actions;
}
function test() {
    let s = newState();
    while (s[TICK] < 2000) {
        let actions = getActions(s);
        cl(fmt_state(s));
        if (actions.length === 0)
            break;
        let a = random_choice(actions);
        cl(fmt_action(a));
        do_action(s, a);
    }
}
// monkey patching
MctsNode.prototype.backprop = function (score) {
    this.visits += 1;
    this.reward = Math.max(this.reward, score);
    if (this.parent) {
        this.parent.backprop(score);
    }
};
let annealing = 1; // annealing factor
MctsNode.prototype.uct = function () {
    return this.reward + annealing * Math.max(2, this.reward) * Math.sqrt(Math.log(this.parent.visits) / (this.visits + EPS));
};
const game = {
    get_valid_actions: getActions,
    step: do_action,
    score(s) {
        return s[CUMULATIVE_RESOURCES.start + WOOD] + s[CUMULATIVE_RESOURCES.start + IRON];
    },
    fmt_state,
    fmt_action,
};
const mcts = new Mcts(game);
console.log('worker loaded');
let s0 = newState();
let iters = 10000;
function run_worker() {
    const root = mcts.run({
        s0,
        iters,
        callback: (i, root) => {
            annealing = 1 - (i / iters);
            const path = root.best_path();
            self.postMessage({
                iter: i,
                path,
                short_path: path.filter((x, i, xs) => i === 0 || x.state[BUILDING_LV.start + HQ] !== xs[i - 1].state[BUILDING_LV.start + HQ])
            });
        },
    });
    const path = root.best_path();
    const end_state = path.at(-1).state;
    const end_score = game.score(end_state);
    console.log('end score', end_score);
    self.postMessage({
        finished: true,
    });
    return root;
}
self.addEventListener('message', (event) => {
    console.log('Received message in Worker:', event.data);
    let msg = event.data;
    if (msg.type === 0 /* MessageType.RUN */) {
        run_worker();
    }
    else if (msg.type === 1 /* MessageType.CONFIGURE */) {
        const cfg = msg.cfg;
        gameHQCostScaling = cfg.hq_exponents;
        gameBuildingCostScaling = cfg.building_exponents;
        GAIN_MULT = cfg.production_mults;
        STORAGE_MULT = cfg.storage_mults;
        s0 = cfg.s0;
        iters = cfg.iters;
        game_length = cfg.ticks;
        update_cached_values();
        run_worker();
    }
});
