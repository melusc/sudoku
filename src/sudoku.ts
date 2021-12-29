import {ReadonlyDeep} from 'type-fest';

import {Cell, generateEmptyCellPossibles, type Cells} from './cell.js';
import * as plugins from './plugins/plugins.js';

type NumberOnlySudoku = Array<Array<number | undefined>>;

type DispatchTypes = 'change' | 'error' | 'finish';
export type SubscriptionCallback = (
	sudoku: Sudoku,
	type: DispatchTypes,
) => void;

export const inRangeIncl = (low: number, high: number, n: number): void => {
	if (!Number.isInteger(n)) {
		throw new TypeError(`${n} was not an integer.`);
	}

	if (n < low || n > high) {
		throw new RangeError(`${n} ∉ [${low}, ${high}].`);
	}
};

export class Sudoku {
	#subscriptions: Set<SubscriptionCallback> = new Set();

	#plugins = Object.values(plugins);

	private readonly cells: Cells;

	constructor(array?: ReadonlyDeep<NumberOnlySudoku>) {
		this.cells = Array.from({length: 81}, () => new Cell());

		if (array) {
			for (const [rowIndex, row] of array.entries()) {
				for (const [colIndex, cell] of row.entries()) {
					if (typeof cell === 'number') {
						const rowIndex_ = rowIndex * 9; // Because of prettier and eslint's no-mixed-operators

						this.setContent(rowIndex_ + colIndex, `${cell}`);
					}
				}
			}
		}
	}

	setContent = (index: number, content: string): this => {
		inRangeIncl(0, 80, index);

		const cell = this.cells[index]!; // It's [0,80]

		cell.setContent(content);

		this.cellsIndividuallyValidByStructure();

		return this.#dispatch('change');
	};

	getContent = (index: number): string | undefined => {
		inRangeIncl(0, 80, index);

		// It's [0,80]
		return this.cells[index]!.content;
	};

	clearCell = (index: number): this => {
		this.getCell(index).clear(); // Validate index there

		this.cellsIndividuallyValidByStructure();

		return this.#dispatch('change');
	};

	clearAllCells = (): this => {
		for (const cell of this.cells) {
			cell.clear();
		}

		return this.#dispatch('change');
	};

	getCol = (col: number): Cells => {
		inRangeIncl(0, 8, col);

		const result: Cells = [];

		for (let index = col; index < 81; index += 9) {
			result.push(this.cells[index]!);
		}

		return result;
	};

	getRow = (row: number): Cells => {
		inRangeIncl(0, 8, row);

		row *= 9;

		return this.cells.slice(row, row + 9);
	};

	getBlock = (index: number): Cells => {
		inRangeIncl(0, 8, index);

		const colOffset = (index % 3) * 3;
		const rowOffset = Math.floor(index / 3) * 3;

		const result = [];

		for (let index_ = 0; index_ < 9; ++index_) {
			let row = rowOffset + Math.floor(index_ / 3);
			const col = colOffset + (index_ % 3);

			row *= 9;

			result.push(this.getCell(row + col));
		}

		return result;
	};

	getCell = (index: number): Cell => {
		inRangeIncl(0, 80, index);

		return this.cells[index]!; // It's [0,80]
	};

	getCells = (): Cells => [...this.cells];

	solve = (): this => {
		if (!this.isValid()) {
			this.#dispatch('error');
			return this;
		}

		for (const cell of this.cells) {
			if (cell.content === undefined) {
				cell.clear(); // Reset possibles
			}
		}

		let anyChanged: boolean;
		let sudokuIsValid = true;

		do {
			anyChanged = false;

			for (const plugin of this.#plugins) {
				try {
					anyChanged = plugin(this) || anyChanged;
				} catch (error: unknown) {
					if (process.env['NODE_ENV'] !== 'test') {
						console.error(error, this.cells);
					}

					sudokuIsValid = false;
					break;
				}
			}

			for (const [index, cell] of this.cells.entries()) {
				if (cell.content !== undefined) {
					continue;
				}

				if (cell.possible.size === 1) {
					// We know that the set has one item
					cell.setContent(cell.possible.values().next().value as string);
				} else if (cell.possible.size === 0) {
					if (process.env['NODE_ENV'] !== 'test') {
						console.error('cell.possible.size === 0', [index, cell]);
					}

					sudokuIsValid = false;

					break;
				}
			}

			sudokuIsValid &&= this.isValid();
		} while (anyChanged && sudokuIsValid);

		this.#dispatch(sudokuIsValid ? 'finish' : 'error');

		return this;
	};

	subscribe = (callback: SubscriptionCallback): this => {
		this.#subscriptions.add(callback);

		return this;
	};

	unsubscribe = (callback: SubscriptionCallback): this => {
		this.#subscriptions.delete(callback);

		return this;
	};

	#dispatch = (type: DispatchTypes): this => {
		for (const callback of this.#subscriptions) {
			callback(this, type);
		}

		return this;
	};

	* eachStructure(): Iterable<Cells> {
		for (let i = 0; i < 9; ++i) {
			for (const structureGetter of [this.getCol, this.getRow, this.getBlock]) {
				yield structureGetter(i);
			}
		}
	}

	cellsIndividuallyValidByStructure = (): boolean => {
		for (const cell of this.cells) {
			cell.valid = undefined;
		}

		for (const structure of this.eachStructure()) {
			this._validateByStructure(structure);
		}

		for (const [index, cell] of this.cells.entries()) {
			if (!cell.valid) {
				if (process.env['NODE_ENV'] !== 'test') {
					console.error('cell was not valid', [index, cell]);
				}

				return false;
			}
		}

		return true;
	};

	isValid = (): boolean => {
		for (const structure of this.eachStructure()) {
			const requiredNumbers = generateEmptyCellPossibles();

			for (const cell of structure) {
				if (cell.content === undefined) {
					for (const possible of cell.possible) {
						requiredNumbers.delete(possible);
					}
				} else {
					requiredNumbers.delete(cell.content);
				}
			}

			if (requiredNumbers.size > 0) {
				if (process.env['NODE_ENV'] !== 'test') {
					console.error('dict.size > 0: %o', requiredNumbers);
				}

				return false;
			}
		}

		return this.cellsIndividuallyValidByStructure();
	};

	_validateByStructure = (structure: Cells): this => {
		const found = new Map<string, number>();
		for (const {content} of structure) {
			if (typeof content === 'string') {
				found.set(content, (found.get(content) ?? 0) + 1);
			}
		}

		for (const [key, amount] of found) {
			if (amount === 1) {
				continue;
			}

			for (const [index, cell] of structure.entries()) {
				if (cell.content === key) {
					if (process.env['NODE_ENV'] !== 'test') {
						console.error('cell.content === key', [index, cell]);
					}

					cell.valid = false;
				}
			}
		}

		return this;
	};

	isSolved = (): boolean => {
		if (!this.cellsIndividuallyValidByStructure()) {
			return false;
		}

		for (const cell of this.cells) {
			if (cell.content === undefined) {
				return false;
			}
		}

		return true;
	};
}
