import {makeVisitor} from './shared.js';

export const removeByContent = makeVisitor((structure, sudoku) => {
	const contents = Object.keys(structure.contents);

	for (const cell of structure) {
		if (cell.content === undefined) {
			for (const content of contents) {
				sudoku.removeCandidate(cell, Number(content));
			}

			sudoku.emit('change');
		}
	}
});
