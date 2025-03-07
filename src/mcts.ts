export { State, Action, MctsNode, Mcts, MctsConfig }

import { argmax, random_choice } from "./utils.js"

const EPS = Number.MIN_VALUE
type State = any[]
type Action = number

class MctsNode {
	state?: State
	reward = 0
	visits = 0
	parent?: MctsNode
	prev_action?: Action
	children: MctsNode[] = []
	constructor(parent?: MctsNode, a?: Action, s?: State) {
		this.parent = parent
		this.prev_action = a
		this.state = s
	}
	/** c: exploration coeff */
	uct(c: number=2): number {
		return this.reward / (this.visits+EPS) + c * Math.sqrt(Math.log(this.parent!.visits) / (this.visits+EPS))
	}
	leaf(): MctsNode {
		return this.children.length === 0
			? this
			: this.children[argmax(this.children.map(child => child.uct()))].leaf()
	}
	hydrate_state(step: (s: State, a: Action) => State) {
		let s_ = [...this.parent!.state!]
		step(s_, this.prev_action!)
		this.state = s_
	}
	/** invariant: leaf nodes have a prev_action but no state */
	expand(get_valid_actions: (s: State) => Action[]) {
		this.children = get_valid_actions(this.state!).map(a => new MctsNode(this, a, undefined))
	}
	backprop(score: number) {
        this.visits += 1
        this.reward += score
        if (this.parent) {
            this.parent.backprop(score)
		}
	}
	/** from root */
	best_path(): MctsNode[] {
		return this.children.length === 0
			? [this]
			: [this, ...this.children[argmax(this.children.map(x => x.visits))].best_path()]
	}
	/** from leaf */
	path_to_root(): MctsNode[] {
		const result = []
		let node: MctsNode | undefined = this
		while (node = node.parent) {
			result.push(node)
		}
		return result
	}
}

type MctsConfig = {
	/** A terminal state is defined as a state which returns no valid actions */
	get_valid_actions: (s: State) => Action[]
	/** mut s */
	step: (s: State, a: Action) => void
	score: (s: State) => number
	fmt_state: (s: State) => string
	fmt_action: (a: Action) => string
}
class Mcts {
	get_valid_actions!: (s: State) => Action[]
	step!: (s: State, a: Action) => State
	score!: (s: State) => number
	fmt_state!: (s: State) => string
	fmt_action!: (a: Action) => string
	constructor(cfg: MctsConfig) {
		Object.assign(this, cfg)
	}
	/** pure. simulates random actions from s until terminal */
	rollout(s: State): number {
		const s_ = [...s]
		let actions: Action[]
		while ((actions = this.get_valid_actions(s_)).length > 0) {
			const a = random_choice(actions)
			this.step(s_, a)
		}
		return this.score(s_)
	}

	run({s0, iters, callback}: {s0: State, iters: number, callback: (iter: number, root: MctsNode) => void}) {
		let i = 0
		let best_score = 0
		let root = new MctsNode(undefined, undefined, s0)
		root.expand(this.get_valid_actions)
		while (i < iters) {
			let leaf = root.leaf()
			leaf.hydrate_state(this.step)
			leaf.expand(this.get_valid_actions)
			if (leaf.children.length > 0) {
				leaf = leaf.children[0]
				leaf.hydrate_state(this.step)					
			}

			const score = this.rollout(leaf.state!)
			leaf.backprop(score)
			if (score > best_score) {
				best_score = score
				console.log(`iter ${i} score ${score} ${this.fmt_state(leaf.state!)}`)
			}
			if (i % 1000 === 0) {
				callback(i, root)
			}
			i += 1
		}
		callback(i, root)
		return root
	}
}