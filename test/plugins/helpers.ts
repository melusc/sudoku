import {Sudoku} from '../../src/sudoku.js';

export type ComparableCell = {
	candidates: Set<number>;
	element: number | undefined;
};

export const getComparableCells = (sudoku: Sudoku): ComparableCell[] =>
	sudoku
		.getCells()
		.map(cell => ({element: cell.element, candidates: cell.candidates}));
