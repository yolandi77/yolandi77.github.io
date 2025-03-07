// utils
export function argmax(xs) {
    return xs.reduce((acc, x, i, xs) => x > xs[acc] ? i : acc, 0);
}
export function random_choice(xs) {
    return xs[Math.floor(Math.random() * xs.length)];
}
export function range(a, b) {
    if (b === undefined) {
        b = a;
        a = 0;
    }
    return Array.from(Array(b - a), (_, i) => a + i);
}
export function transpose(xs) {
    return xs[0].map((_, i) => xs.map(row => row[i]));
}
