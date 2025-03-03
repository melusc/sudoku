import {makeVisitor} from './shared.ts';

export const removeByElements = makeVisitor((structure, sudoku) => {
	const elements = Object.keys(structure.elements);

	for (const cell of structure) {
		if (cell.element === undefined) {
			for (const element of elements) {
				sudoku.removeCandidate(cell, Number(element));
			}

			sudoku.emit('change');
		}
	}
});
