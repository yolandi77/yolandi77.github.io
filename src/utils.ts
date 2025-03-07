
// utils
export function argmax<T>(xs: T[]): number {
	return xs.reduce((acc, x, i, xs) => x > xs[acc] ? i : acc, 0)
}
export function random_choice<T>(xs: T[]): T {
	return xs[Math.floor(Math.random() * xs.length)]
}
export function range(a: number, b?: number): number[] {
    if (b === undefined) {
        b = a
        a = 0
    }
    return Array.from(Array(b-a), (_, i) => a+i)
}
export function transpose<T>(xs: T[][]): T[][] {
    return xs[0].map((_, i) => xs.map(row => row[i]))
}