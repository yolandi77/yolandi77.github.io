class Emitter {
    _callbacks = new Map();
    _next_id = 0;
    subscribe(cb) {
        const id = this._next_id++;
        this._callbacks.set(id, cb);
        return () => this._callbacks.delete(id);
    }
    emit(value) {
        // handle unsubscribe during emit 
        this._callbacks.forEach(f => f(value));
    }
}
class ReactiveVariable extends Emitter {
    _value;
    constructor(value) {
        super();
        this._value = value;
    }
    get value() {
        return this._value;
    }
    set value(new_value) {
        this._value = new_value;
        this.emit(new_value);
    }
}
class IntegerStat extends ReactiveVariable {
    name;
    color;
    _delta = new ReactiveVariable(0);
    get delta() {
        return this._delta.value;
    }
    set delta(x) {
        this._delta.value = x;
    }
    constructor(name, color) {
        super(0);
        this.name = name;
        this.color = color;
    }
    render() {
        const root_el = document.createElement('div');
        root_el.classList.add('statcontainer');
        const bar_el = document.createElement('span');
        bar_el.classList.add('statbar');
        bar_el.style.backgroundColor = this.color;
        const text_el = document.createElement('span');
        text_el.classList.add('statnumber');
        const value_textnode = document.createTextNode('');
        const delta_textnode = document.createTextNode('');
        text_el.append(`${this.name.padEnd(4)}: `, value_textnode, ' + ', delta_textnode, '/tick');
        const formatted_name = this.subscribe(x => {
            bar_el.style.width = `${x * 2}px`;
            value_textnode.textContent = x.toString();
        });
        this._delta.subscribe(x => delta_textnode.textContent = x.toString());
        this.value = this.value;
        this.delta = this.delta;
        root_el.append(bar_el, text_el);
        return root_el;
    }
    tick() {
        this.value += this.delta;
    }
}
class Hp extends IntegerStat {
    constructor() {
        super('hp', '#f00');
    }
}
class Str extends IntegerStat {
    constructor() {
        super('str', '#a00');
    }
}
class Dex extends IntegerStat {
    constructor() {
        super('dex', '#0a0');
    }
}
class Block extends IntegerStat {
    constructor() {
        super('bloc', '#777');
    }
}
class Poison extends IntegerStat {
    constructor() {
        super('pois', '#0f0');
    }
}
class Mana extends IntegerStat {
    constructor() {
        super('mana', '#00f');
    }
}
class Draw extends IntegerStat {
    constructor() {
        super('draw', '#00f');
    }
}
class AttackProgress extends IntegerStat {
    constructor() {
        super('prog', '#fc0');
    }
}
const IntegerStats = [
    Hp,
    Str,
    Dex,
    Block,
    // Poison,
    // Mana,
    Draw,
    AttackProgress,
];
function stat_name(stat) {
    return IntegerStats[stat].name;
}
class AttackEffect {
    base_value;
    html;
    constructor(base_value) {
        this.base_value = base_value;
    }
    clone() {
        return new AttackEffect(this.base_value);
    }
    exec(ctx) {
        const max_dmg = this._dmg_with_str(ctx);
        const min_dmg = Math.floor(0.6 * max_dmg);
        const dmg = randint(min_dmg, max_dmg);
        ctx.targets.find(hero => hero !== ctx.self).take_damage(dmg);
    }
    render() {
        this.html = document.createElement('div');
        this.html.innerText = `Deal ${this.base_value} damage`;
        return this.html;
    }
    _dmg_with_str(ctx) {
        return this.base_value + ctx.self.stats[1 /* EStat.Str */].value;
    }
}
class BlockEffect {
    base_value;
    html;
    constructor(base_value) {
        this.base_value = base_value;
    }
    clone() {
        return new BlockEffect(this.base_value);
    }
    exec(ctx) {
        ctx.self.stats[3 /* EStat.Block */].value += this._block_w_dex(ctx);
    }
    render() {
        this.html = document.createElement('div');
        this.html.innerText = `Gain ${this.base_value} block`;
        return this.html;
    }
    _block_w_dex(ctx) {
        return this.base_value + ctx.self.stats[2 /* EStat.Dex */].value;
    }
}
class GenericEffect {
    stat;
    self;
    is_delta;
    base_value;
    html;
    constructor(stat, self, is_delta, base_value) {
        this.stat = stat;
        this.self = self;
        this.is_delta = is_delta;
        this.base_value = base_value;
    }
    clone() {
        return new GenericEffect(this.stat, this.self, this.is_delta, this.base_value);
    }
    exec(ctx) {
        const target = this.self ? ctx.self : ctx.targets.find(h => h !== ctx.self);
        target.stats[this.stat][this.is_delta ? 'delta' : 'value'] += this.base_value;
    }
    render() {
        this.html = document.createElement('div');
        this.html.innerText = `${this.self ? 'Gain' : 'Deal'} ${this.base_value} ${this.is_delta ? 'delta' : ''}${stat_name(this.stat)}`;
        return this.html;
    }
}
class Card {
    name;
    effects;
    img;
    html;
    _add_effect = new Emitter();
    _delete_effect = new Emitter();
    constructor(name, effects, img) {
        this.name = name;
        this.effects = effects;
        this.img = img;
    }
    exec(ctx) {
        for (const f of this.effects) {
            f.exec(ctx);
        }
    }
    clone() {
        return new Card(this.name, this.effects.map(e => e.clone()), this.img);
    }
    add_effect(effect) {
        this.effects.push(effect);
        this._add_effect.emit(effect);
    }
    delete_effect(idx) {
        this.effects.splice(idx, 1);
        this._delete_effect.emit(idx);
    }
    render() {
        this.html = document.createElement('div');
        this.html.classList.add('card');
        const name_el = document.createElement('div');
        name_el.innerText = this.name;
        const img_el = document.createElement('img');
        img_el.src = this.img;
        const effects_container_el = document.createElement('div');
        effects_container_el.classList.add('effectscontainer');
        effects_container_el.append(...this.effects.map(e => e.render()));
        this._add_effect.subscribe(effect => effects_container_el.append(effect.render()));
        this._delete_effect.subscribe(i => effects_container_el.children[i].remove());
        this.html.append(name_el, img_el, effects_container_el);
        return this.html;
    }
    anim(f, keyframes = () => [], options = {}) {
        let prev_pos = this.html?.getBoundingClientRect();
        f();
        if (prev_pos) {
            const new_pos = this.html.getBoundingClientRect();
            this.html.animate(keyframes(prev_pos, new_pos), options);
        }
    }
}
class Combat {
    html;
    heroes = [];
    _add_hero = new Emitter();
    add_hero(hero) {
        this.heroes.push(hero);
        this._add_hero.emit(hero);
    }
    tick() {
        this.heroes.forEach(e => e.tick({
            self: e,
            targets: this.heroes,
        }));
    }
    render() {
        this.html = document.createElement('div');
        this._add_hero.subscribe(hero => this.html?.append(hero.render()));
        return this.html;
    }
}
class Pile {
    cards;
    _add = new Emitter();
    _remove = new Emitter();
    constructor(cards) {
        this.cards = cards;
    }
    clone() {
        return new Pile(this.cards.map(card => card.clone()));
    }
    peek() {
        if (this.cards.length > 0) {
            return this.cards.at(-1);
        }
        else {
            return null;
        }
    }
    pop() {
        const card = this.cards.pop();
        if (card) {
            this._remove.emit(card);
            return card;
        }
        else {
            return null;
        }
    }
    _add_at(card, idx) {
        this.cards.splice(idx, 0, card);
        this._add.emit([card, idx]);
    }
    shuffle_in(card) {
        const idx = Math.floor((this.cards.length + 1) * Math.random());
        this._add_at(card, idx);
    }
    // other: interface CardHolder
    _shuffle_in(card, other) {
    }
    add_to_top(card) {
        const len = this.cards.push(card);
        this._add.emit([card, len - 1]);
    }
    add_to_bottom(card) {
        this._add_at(card, 0);
    }
    html;
    render() {
        this.html = document.createElement('div');
        this.html.classList.add('pile');
        this._add.subscribe(([card, idx]) => {
            this.html.insertBefore(card.html, this.html.children[idx]);
        });
        this._remove.subscribe(card => card.html.remove());
        this.html.append(...this.cards.map(card => card.render()));
        return this.html;
    }
}
class Hero {
    stats = IntegerStats.map(cls => new cls());
    name;
    img;
    draw_pile = new Pile([]);
    discard_pile = new Pile([]);
    html;
    auto_attack = new AttackEffect(5);
    is_dead = false;
    _die = new Emitter();
    _take_dmg = new Emitter();
    constructor(name, img) {
        this.name = name;
        this.img = img;
    }
    tick(ctx) {
        if (this.is_dead) {
            return;
        }
        this.stats.forEach(s => s.tick());
        if (this.stats[4 /* EStat.Draw */].value >= 100) {
            const card = this.draw_card();
            if (card) {
                card.exec(ctx);
                this.stats[4 /* EStat.Draw */].value = 0;
            }
        }
        if (this.stats[5 /* EStat.AttackProgress */].value >= 100) {
            this.auto_attack.exec(ctx);
            this.stats[5 /* EStat.AttackProgress */].value = 0;
        }
    }
    /** dmg affected by block. this should probably react to hp instead */
    take_damage(dmg) {
        this._take_dmg.emit(dmg);
        const blocked = Math.min(dmg, this.stats[3 /* EStat.Block */].value);
        const dmg_to_hp = dmg - blocked;
        if (blocked > 0) {
            this.stats[3 /* EStat.Block */].value -= blocked;
        }
        if (dmg_to_hp > 0) {
            const dmg_taken = Math.min(dmg_to_hp, this.stats[0 /* EStat.Hp */].value);
            this.stats[0 /* EStat.Hp */].value -= dmg_taken;
            // this._take_dmg.emit(dmg_taken)
        }
        if (this.stats[0 /* EStat.Hp */].value == 0) {
            this.die();
        }
    }
    die() {
        // this.is_dead = true
        // this._die.emit(null)
    }
    draw_card(delay = 0) {
        const card = this.draw_pile.peek();
        if (card) {
            card.anim(() => {
                this.draw_pile.pop();
                this.discard_pile.add_to_top(card);
            }, (prev_pos, new_pos) => [
                { transform: `translate(${prev_pos.x - new_pos.x}px, ${prev_pos.y - new_pos.y}px)`, boxShadow: '0 0 1rem cyan, 0 0 2rem magenta' },
                { transform: `translate(${prev_pos.x - new_pos.x}px, ${prev_pos.y - new_pos.y}px)` },
                { transform: 'translate(0, 0)' },
            ], {
                delay,
                duration: 400,
            });
            return card;
        }
        else if (this.discard_pile.cards.length > 0) {
            const _delay = this.reshuffle();
            return this.draw_card(_delay);
        }
        else {
            return null;
        }
    }
    reshuffle() {
        const base_duration = 200;
        let card;
        let delay = 0;
        let duration = 200;
        let final_duration = 0;
        while (card = this.discard_pile.peek()) {
            duration = base_duration + delay;
            card.anim(() => {
                this.discard_pile.pop();
                this.draw_pile.shuffle_in(card);
            }, (prev_pos, new_pos) => [
                { transform: `translate(${prev_pos.x - new_pos.x}px, ${prev_pos.y - new_pos.y}px)` },
                { offset: delay / duration, transform: `translate(${prev_pos.x - new_pos.x}px, ${prev_pos.y - new_pos.y}px)` },
                { transform: 'translate(0, 0)' },
            ], {
                duration,
            });
            final_duration = duration;
            delay += 50;
        }
        return final_duration;
    }
    render() {
        const root_el = document.createElement('div');
        root_el.classList.add('hero');
        const name_el = document.createElement('div');
        name_el.classList.add('heroname');
        name_el.innerText = this.name;
        const img_el = document.createElement('img');
        img_el.src = this.img;
        const piles_container = document.createElement('div');
        piles_container.classList.add('pilescontainer');
        const spacer_el = document.createElement('div');
        spacer_el.className = 'flexspacer';
        piles_container.append(this.draw_pile.render(), spacer_el, this.discard_pile.render());
        this.draw_pile.html?.classList.add('drawpile');
        this.discard_pile.html?.classList.add('discardpile');
        this._die.subscribe(() => img_el.classList.add('dead'));
        const dmg_display = new DamageDisplay();
        this._take_dmg.subscribe(x => dmg_display.show_dmg(x));
        root_el.append(...this.stats.map(stat => stat.render()), dmg_display.render(), name_el, img_el, piles_container);
        return root_el;
    }
}
class DamageDisplay {
    html;
    slots = [];
    last_dmg_timestamp = 0;
    next_slot = 0;
    next_zindex = 0;
    show_dmg(dmg) {
        if (Date.now() - this.last_dmg_timestamp > 1500 || this.next_slot >= this.slots.length) {
            this.next_slot = 0;
        }
        if (this.next_slot === 0) {
            this.last_dmg_timestamp = Date.now();
        }
        const el = this.slots[this.next_slot];
        el.style.zIndex = `${this.next_zindex++}`;
        el.innerText = dmg.toString();
        el.animate([
            { opacity: 1, scale: 1.3 },
            { opacity: 1, scale: 1 },
            { opacity: 1 },
            { opacity: 0 },
        ], {
            duration: 1000,
            fill: 'forwards',
        });
        this.next_slot++;
    }
    render() {
        this.html = document.createElement('div');
        this.html.classList.add('dmgtextpositioner');
        const container = document.createElement('div');
        container.className = 'dmgtextcontainer';
        this.slots = range(8).map(_ => {
            const el = document.createElement('div');
            el.className = 'dmgtext';
            return el;
        });
        container.append(...this.slots.toReversed());
        this.html.append(container);
        return this.html;
    }
}
function Color(cls, text) {
    const span = document.createElement('span');
    span.className = cls;
    span.innerText = text;
    return span;
}
function range(start, stop, step) {
    if (stop === undefined) {
        stop = start;
        start = 0;
    }
    if (step === undefined) {
        step = 1;
    }
    return Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);
}
/** in place */
function shuf(xs) {
    let b = xs.length;
    while (b > 1) {
        const a = Math.floor(Math.random() * b);
        b--;
        [xs[b], xs[a]] = [xs[a], xs[b]];
    }
}
function array_random(xs) {
    return xs[Math.floor(xs.length * Math.random())];
}
/** [a, b] */
function randint(a, b) {
    return a + Math.floor((b - a + 1) * Math.random());
}
function debounce(func, wait = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), wait);
    };
}
import MS from './maplestory/index.js';
function Button(text, onclick) {
    const el = document.createElement('button');
    el.innerText = text;
    el.onclick = onclick;
    return el;
}
function combat_test() {
    function make_hero() {
        const [name, id] = array_random(Object.entries(MS.mobs));
        const hero = new Hero(name, MS.mob_anim(id).stand);
        hero.stats[0 /* EStat.Hp */].value = randint(500, 2000);
        hero.stats[4 /* EStat.Draw */].delta = randint(2, 10);
        hero.stats[5 /* EStat.AttackProgress */].delta = randint(5, 20);
        for (let i = 0; i < 4; i++) {
            hero.draw_pile.add_to_top(make_card());
        }
        return hero;
    }
    function make_card() {
        const [name, id] = array_random(Object.entries(MS.items));
        const card = new Card(name, [], MS.item_icon(id));
        add_effect(card);
        for (let i = 0; i < 3; i++) {
            if (Math.random() < 0.3) {
                add_effect(card);
            }
        }
        return card;
    }
    function add_effect(card) {
        const is_delta = Math.random() < 0.5;
        const base_value = is_delta ? 1 : randint(5, 20);
        card.add_effect(new GenericEffect(array_random(range(IntegerStats.length)), array_random([false, true]), is_delta, base_value));
    }
    const combat = new Combat();
    let last_tick = Date.now();
    let running_tick_interval = 0;
    let setinterval_handle;
    const autotick_input = document.createElement('input');
    autotick_input.placeholder = 'autotick interval';
    autotick_input.oninput = debounce(() => {
        clearInterval(setinterval_handle);
        setinterval_handle = setInterval(() => {
            combat.tick();
            running_tick_interval = 0.5 * running_tick_interval + 0.5 * (Date.now() - last_tick);
            last_tick = Date.now();
            fps_display.innerText = `fps: ${1000 / running_tick_interval}`;
        }, parseInt(autotick_input.value));
    }, 300);
    const fps_display = document.createElement('div');
    document.body.append(Button('tick', () => combat.tick()), Button('add hero', () => combat.add_hero(make_hero())), autotick_input, fps_display, combat.render());
}
combat_test();
