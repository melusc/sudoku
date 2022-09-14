import type {Sudoku, Structure, Cell} from '../sudoku.js';

export type VisitorFn = (structure: Structure, sudoku: Sudoku) => void;
export const makeVisitor
	= (cb: VisitorFn): ((sudoku: Sudoku) => void) =>
	(sudoku: Sudoku): void => {
		for (const structure of sudoku.eachStructure()) {
			cb(structure, sudoku);
		}
	};

export function * eachCandidate(
	structure: Structure,
	cell: Cell,
): Iterable<number> {
	for (const candidate of cell.candidates) {
		if (structure.elements[candidate] === 0) {
			yield candidate;
		}
	}
}

export class BetterMap<K, V> extends Map<K, V> {
	getWithDefault(key: K, defaultFactory: () => V): V {
		if (!this.has(key)) {
			this.set(key, defaultFactory());
		}

		return this.get(key)!;
	}
}
