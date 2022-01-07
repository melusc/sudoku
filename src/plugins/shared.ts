import type {ReadonlyCells} from '../cell.js';
import type {Sudoku} from '../sudoku.js';

// Stolen shamelessly from
// https://web.archive.org/web/20190223113747/https://stackoverflow.com/questions/43122082/efficiently-count-the-number-of-bits-in-an-integer-in-javascript#43122214
export const bitCount = (n: number): number => {
	n -= (n >> 1) & 0x55_55_55_55;
	n = (n & 0x33_33_33_33) + ((n >> 2) & 0x33_33_33_33);
	return (((n + (n >> 4)) & 0xF_0F_0F_0F) * 0x1_01_01_01) >> 24;
};

export const bitIndex = (n: number): number => {
	const index = Math.log2(n);

	if (index !== Math.trunc(index)) {
		throw new TypeError(`${n} doesn't have exactly one bit.`);
	}

	return index;
};

export const makeVisitor
	= (cb: (structure: ReadonlyCells) => boolean) =>
	(sudoku: Sudoku): boolean => {
		let anyChanged = false;

		for (const structure of sudoku.eachStructure()) {
			anyChanged = cb(structure) || anyChanged;
		}

		return anyChanged;
	};
