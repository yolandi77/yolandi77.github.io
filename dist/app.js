import { newState, fmt_state, game } from "./factions.js";
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
function Span(...children) {
    const el = document.createElement('span');
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
const input_container = document.createElement('div');
input_container.appendChild(h1('Input'));
input_container.appendChild(h2('Game parameters'));
Object.keys(cfg).filter(k => k !== 's0').map(k => create_inputs(input_container, k));
const run_button = document.createElement('button');
run_button.innerText = 'Run';
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
