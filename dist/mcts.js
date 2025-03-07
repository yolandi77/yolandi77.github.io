export { MctsNode, Mcts };
import { argmax, random_choice } from "./utils.js";
const EPS = Number.MIN_VALUE;
class MctsNode {
    state;
    reward = 0;
    visits = 0;
    parent;
    prev_action;
    children = [];
    constructor(parent, a, s) {
        this.parent = parent;
        this.prev_action = a;
        this.state = s;
    }
    /** c: exploration coeff */
    uct(c = 2) {
        return this.reward / (this.visits + EPS) + c * Math.sqrt(Math.log(this.parent.visits) / (this.visits + EPS));
    }
    leaf() {
        return this.children.length === 0
            ? this
            : this.children[argmax(this.children.map(child => child.uct()))].leaf();
    }
    hydrate_state(step) {
        let s_ = [...this.parent.state];
        step(s_, this.prev_action);
        this.state = s_;
    }
    /** invariant: leaf nodes have a prev_action but no state */
    expand(get_valid_actions) {
        this.children = get_valid_actions(this.state).map(a => new MctsNode(this, a, undefined));
    }
    backprop(score) {
        this.visits += 1;
        this.reward += score;
        if (this.parent) {
            this.parent.backprop(score);
        }
    }
    /** from root */
    best_path() {
        return this.children.length === 0
            ? [this]
            : [this, ...this.children[argmax(this.children.map(x => x.visits))].best_path()];
    }
    /** from leaf */
    path_to_root() {
        const result = [];
        let node = this;
        while (node = node.parent) {
            result.push(node);
        }
        return result;
    }
}
class Mcts {
    get_valid_actions;
    step;
    score;
    fmt_state;
    fmt_action;
    constructor(cfg) {
        Object.assign(this, cfg);
    }
    /** pure. simulates random actions from s until terminal */
    rollout(s) {
        const s_ = [...s];
        let actions;
        while ((actions = this.get_valid_actions(s_)).length > 0) {
            const a = random_choice(actions);
            this.step(s_, a);
        }
        return this.score(s_);
    }
    run({ s0, iters, callback }) {
        let i = 0;
        let best_score = 0;
        let root = new MctsNode(undefined, undefined, s0);
        root.expand(this.get_valid_actions);
        while (i < iters) {
            let leaf = root.leaf();
            leaf.hydrate_state(this.step);
            leaf.expand(this.get_valid_actions);
            if (leaf.children.length > 0) {
                leaf = leaf.children[0];
                leaf.hydrate_state(this.step);
            }
            const score = this.rollout(leaf.state);
            leaf.backprop(score);
            if (score > best_score) {
                best_score = score;
                console.log(`iter ${i} score ${score} ${this.fmt_state(leaf.state)}`);
            }
            if (i % 1000 === 0) {
                callback(i, root);
            }
            i += 1;
        }
        callback(i, root);
        return root;
    }
}
