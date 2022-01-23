import {makeVisitor} from './shared.js';

export const removeByContent = makeVisitor((structure, sudoku) => {
	for (const {content} of structure) {
		if (content !== undefined) {
			for (const cell of structure) {
				sudoku.removeCandidate(cell, content);
			}
		}
	}
});
