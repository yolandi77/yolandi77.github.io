import { items } from './items.js';
import { mobs } from './mobs.js';
export default {
    version: 255,
    region: 'GMS',
    root() {
        return `https://maplestory.io/api/${this.region}/${this.version}`;
    },
    mob_anim(mob_id) {
        const { die1, hit1, move, stand } = Object.fromEntries(["die1", "hit1", "move", "stand"].map(anim => [anim, `${this.root()}/mob/${mob_id}/render/${anim}`]));
        return { die1, hit1, move, stand };
    },
    item_icon(id) {
        return `${this.root()}/item/${id}/icon`;
    },
    items,
    mobs,
};
