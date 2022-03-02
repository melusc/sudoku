import type {Sudoku, ReadonlyCells} from '../sudoku.js';

// From https://stackoverflow.com/q/43122082/13249743
const bitCount32 = (n: bigint): bigint => {
	n -= (n >> 1n) & 0x55_55_55_55n;
	n = (n & 0x33_33_33_33n) + ((n >> 2n) & 0x33_33_33_33n);
	n = (n + (n >> 4n)) & 0x0F_0F_0F_0Fn;
	n += n >> 8n;
	n += n >> 16n;
	return n & 0x3Fn;
};

const bitCountCache = new Map<bigint, bigint>();

export const bitCount = (n: bigint): bigint => {
	if (bitCountCache.has(n)) {
		return bitCountCache.get(n)!;
	}

	const n_ = n;

	let bits = 0n;
	while (n !== 0n) {
		bits += bitCount32(n & 0xFF_FF_FF_FFn);
		n >>= 32n;
	}

	bitCountCache.set(n_, bits);
	return bits;
};

export const bitIndex = (n: bigint): number => {
	if (bitCount(n) !== 1n) {
		throw new TypeError(`${n} doesn't have exactly one bit.`);
	}

	return n.toString(2).length - 1;
};

export type VisitorFn = (structure: ReadonlyCells, sudoku: Sudoku) => void;
export const makeVisitor
	= (cb: VisitorFn): ((sudoku: Sudoku) => void) =>
	(sudoku: Sudoku): void => {
		for (const structure of sudoku.eachStructure()) {
			cb(structure, sudoku);
		}
	};
