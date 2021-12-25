import {Sudoku} from '../../src/sudoku.js';

export type ComparableCell = {
	possible: Set<string>;
	content: string | undefined;
};

export const getComparableCells = (sudoku: Sudoku): ComparableCell[] =>
	sudoku
		.getCells()
		.map(cell => ({content: cell.content, possible: cell.possible}));

export const _ = undefined;
