import { newState, fmt_state, game, BUILDING_NAMES, _upgrade_building, getTrueBuildingLvls, BUILDING_LV, BUILDING_COUNT, _new_building, canBuildNewBuilding } from "./factions.js";
import { range } from "./utils.js";
const cfg = {
    hq_exponents: [1.5, 1.5, 1.5],
    building_exponents: [1.5, 1.5, 1.5],
    production_mults: [1, 1, 1, 1],
    storage_mults: [1, 1, 1, 1],
    ticks: 2000,
    iters: 10000,
    s0: newState(),
};
const worker = new Worker('../dist/factions.js', { type: 'module' });
function Text(s) {
    return document.createTextNode(s);
}
function Pre(s) {
    const el = document.createElement('pre');
    el.innerText = s;
    return el;
}
function Button(text, onclick = () => { }) {
    const el = document.createElement('button');
    el.innerText = text;
    el.onclick = onclick;
    return el;
}
function Span(...children) {
    const el = document.createElement('span');
    el.append(...children);
    return el;
}
function Div(...children) {
    const el = document.createElement('div');
    el.append(...children);
    return el;
}
function h1(s) {
    const el = document.createElement('h1');
    el.innerText = s;
    return el;
}
function h2(s) {
    const el = document.createElement('h2');
    el.innerText = s;
    return el;
}
function h3(s) {
    const el = document.createElement('h3');
    el.innerText = s;
    return el;
}
function p(s) {
    const el = document.createElement('p');
    el.innerText = s;
    return el;
}
function Input(cfg) {
    const el = document.createElement('input');
    Object.assign(el, cfg);
    return el;
}
// input
let _flag = false;
function create_inputs(container, key) {
    const div = document.createElement('div');
    div.appendChild(p(key));
    if (Array.isArray(cfg[key])) {
        const inputs = cfg[key].map((x, i, xs) => Input({
            //@ts-ignore
            oninput: ev => { xs[i] = parseFloat(ev.target.value); },
            //@ts-ignore
            defaultValue: x,
        }));
        inputs.filter((_, i) => i < 3).forEach(c => div.appendChild(c));
    }
    else {
        if (!_flag) {
            container.appendChild(h2('Simulation parameters'));
            _flag = true;
        }
        div.appendChild(Input({
            //@ts-ignore
            oninput: ev => cfg[key] = parseFloat(ev.target.value),
            defaultValue: cfg[key],
        }));
    }
    container.appendChild(div);
}
// state builder
const [HQ, WOODCUTTER, MINE, STORAGE, TRAINING_CENTER, BARRACKS, TAVERN, HOUSE, COMMAND_CENTER, GUARD_TOWER, TOWN_HALL, MERCENARY_OFFICE, ARENA, FURNACE, SAWMILL] = range(15);
function state_builder() {
    function BuildingDisplay(i) {
        const el = Pre('bello');
        return el;
    }
    function _render(b) {
        _get_display(b).innerText = getTrueBuildingLvls(cfg.s0[BUILDING_COUNT.start + b], cfg.s0[BUILDING_LV.start + b]).join(' ');
        range(N_BUILDINGS).forEach(b => _get_new_button(b).disabled = !canBuildNewBuilding(cfg.s0));
        _get_upgrade_button(b).disabled = cfg.s0[BUILDING_COUNT.start + b] === 0;
    }
    function _up(b) {
        _upgrade_building(cfg.s0, b);
        _render(b);
    }
    function _new(b) {
        _new_building(cfg.s0, b);
        _render(b);
    }
    function _get_display(b) {
        return grid_container.children[3 + b * 4];
    }
    function _get_upgrade_button(b) {
        return grid_container.children[2 + b * 4];
    }
    function _get_new_button(b) {
        return grid_container.children[1 + b * 4];
    }
    const grid_container = Div();
    const N_BUILDINGS = 8;
    grid_container.style.display = 'grid';
    grid_container.style.gridTemplateColumns = 'repeat(4, min-content)';
    grid_container.append(...BUILDING_NAMES.filter((_, i) => i < N_BUILDINGS).flatMap((name, i) => [Pre(name.padEnd(15)), Button('new', () => _new(i)), Button('upgrade', () => _up(i)), BuildingDisplay(i)]));
    range(N_BUILDINGS).forEach(_render);
    //@ts-ignore
    grid_container.children[1].style.visibility = 'hidden';
    return Div(h2('Starting Buildings'), grid_container);
}
const input_container = document.createElement('div');
input_container.appendChild(h1('Input'));
input_container.appendChild(state_builder());
input_container.appendChild(h2('Game parameters'));
Object.keys(cfg).filter(k => k !== 's0').map(k => create_inputs(input_container, k));
const run_button = document.createElement('button');
run_button.innerText = 'Run';
run_button.id = 'run_button';
run_button.onclick = () => {
    const msg = {
        type: 1 /* MessageType.CONFIGURE */,
        cfg
    };
    worker.postMessage(msg);
    run_button.disabled = true;
};
input_container.appendChild(run_button);
document.body.appendChild(input_container);
// output
const output_toggle = document.createElement('input');
output_toggle.type = 'checkbox';
//@ts-ignore
output_toggle.onchange = ev => toggle_more(ev.target.checked);
const output_container = document.createElement('div');
const output_div_less = document.createElement('div');
const output_div_more = document.createElement('div');
output_container.appendChild(h1('Output'));
output_container.appendChild(Span(output_toggle, Text('more')));
output_container.appendChild(output_div_less);
output_container.appendChild(output_div_more);
document.body.appendChild(output_container);
function toggle_more(more) {
    output_div_less.style.display = more ? 'none' : 'block';
    output_div_more.style.display = more ? 'block' : 'none';
}
toggle_more(false);
function fmt_path(path) {
    return `score ${game.score(path.at(-1).state)}\n` + path.map(node => fmt_state(node.state, 0)).join('\n');
}
worker.onmessage = ev => {
    if (ev.data.finished) {
        run_button.disabled = false;
        return;
    }
    const { iter, path, short_path } = ev.data;
    output_div_less.innerText = `iter ${iter} ` + fmt_path(short_path);
    output_div_more.innerText = `iter ${iter} ` + fmt_path(path);
};
// about
const about_text = `Monte Carlo Tree Search optimising for cumulative (wood + iron) produced.
Will drain your battery.
Author makes no claim that this tool is optimal, functional, or ethical.`;
const about_p = p('[show]');
about_p.onclick = ev => {
    about_p.innerText = about_p.innerText === '[show]' ? about_text + ' [hide]' : '[show]';
};
document.body.appendChild(Div(h1('About'), about_p));
