import {Sudoku} from '../../src/sudoku.js';

export type ComparableCell = {
	candidates: Set<number>;
	content: number | undefined;
};

export const getComparableCells = (sudoku: Sudoku): ComparableCell[] =>
	sudoku
		.getCells()
		.map(cell => ({content: cell.content, candidates: cell.candidates}));
