import type {Sudoku} from '../../src/sudoku.js';

export type ComparableCell = {
	candidates: Set<number>;
	element: number | undefined;
};

export function getComparableCells(sudoku: Sudoku): ComparableCell[] {
	return sudoku
		.getCells()
		.map(cell => ({element: cell.element, candidates: cell.candidates}));
}
