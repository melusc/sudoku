import {
	Cell,
	type Cells,
	generateEmptyCellCandidates,
	type ReadonlyCells,
} from './cell.js';
import * as plugins from './plugins/index.js';

type PrefilledSudoku = ReadonlyArray<
	undefined | ReadonlyArray<string | number | readonly number[] | undefined>
>;

type DispatchType = 'change' | 'error' | 'finish';
export type SubscriptionCallback = (sudoku: Sudoku, type: DispatchType) => void;

export const inRangeIncl = (low: number, high: number, n: number): void => {
	if (!Number.isInteger(n)) {
		throw new TypeError(`${n} was not an integer.`);
	}

	if (n < low || n > high) {
		throw new RangeError(`${n} ∉ [${low}, ${high}].`);
	}
};

enum SolveTypes {
	changed,
	unchanged,
	error,
}

const makeStructureCacher = <T = unknown, R = unknown>(
	fn: (arg0: T) => R,
): ((arg0: T) => R) => {
	const cache = new Map<T, R>();
	return (arg: T): R => {
		if (cache.has(arg)) {
			return cache.get(arg)!;
		}

		const result = fn(arg);
		cache.set(arg, result);

		return result;
	};
};

// Because Array.isArray on its own won't narrow it down otherwise
const isReadonlyArray = (arg0: any): arg0 is readonly any[] =>
	Array.isArray(arg0);

export class Sudoku {
	static readonly alphabet: readonly string[] = [
		...'1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	];

	static fromPrefilled = (cells: PrefilledSudoku, size: number): Sudoku => {
		const s = new Sudoku(size);

		for (const [rowIndex, row] of cells.entries()) {
			// Even though it would also throw in s.getCell
			// this throws a more useful error
			inRangeIncl(0, size - 1, rowIndex);

			if (!row) {
				continue;
			}

			for (const [colIndex, content] of row.entries()) {
				inRangeIncl(0, size - 1, colIndex);

				// prettier-ignore
				const cellIndex = (rowIndex * size) + colIndex;
				const cell = s.getCell(cellIndex);
				if (isReadonlyArray(content)) {
					for (const candidate of content) {
						inRangeIncl(0, size - 1, candidate);
					}

					cell.candidates = new Set(content);
				} else if (content !== undefined) {
					s.setContent(cell, content);
				}
			}
		}

		s.anyChanged = false;
		return s;
	};

	static fromString = (input: string, size: number): Sudoku => {
		const sudoku = new Sudoku(size);

		for (let i = 0; i < input.length; ++i) {
			const char = input.charAt(i);
			if (char !== ' ') {
				sudoku.setContent(i, input.charAt(i));
			}
		}

		return sudoku;
	};

	readonly #subscriptions: Set<SubscriptionCallback> = new Set();

	readonly #plugins: Array<(sudoku: Sudoku) => void> = Object.values(plugins);

	/** @internal */
	anyChanged = false;

	/** @internal */
	readonly amountCells: number;

	/** @internal */
	readonly blockWidth: number;

	readonly #cells: ReadonlyCells;

	shouldLogErrors = process.env['NODE_ENV'] !== 'test';

	mode: 'thorough' | 'fast' = 'thorough';

	constructor(readonly size: number) {
		const blockWidth = Math.sqrt(size);

		if (!Number.isInteger(blockWidth)) {
			throw new TypeError('Expected size to be a square of an integer.');
		}

		if (size <= 0) {
			throw new TypeError(`Expected size (${size}) to be greater than 0.`);
		}

		this.blockWidth = blockWidth;

		const amountCells = size ** 2;
		this.amountCells = amountCells;
		this.#cells = Array.from({length: amountCells}, () => new Cell(size));
	}

	setContent = (cellOrIndex: number | Cell, content: string | number): this => {
		const cell = this.getCell(cellOrIndex);

		if (typeof content === 'number') {
			if (Number.isInteger(content)) {
				inRangeIncl(0, this.size - 1, content);

				cell.setContent(content);
			} else {
				throw new TypeError(`content was not an integer: ${content}`);
			}
		} else {
			const index = Sudoku.alphabet.indexOf(content.toUpperCase());
			if (index === -1) {
				throw new Error(`content was not in alphabet: "${content}"`);
			} else {
				cell.setContent(index);
			}
		}

		this.cellsIndividuallyValidByStructure();

		return this.#dispatch('change');
	};

	getContent = (cellOrIndex: number | Cell): string | undefined => {
		const {content} = this.getCell(cellOrIndex);

		if (content === undefined) {
			return content;
		}

		return Sudoku.alphabet[content];
	};

	clearCell = (index: number | Cell): this => {
		const cell = this.getCell(index);
		cell.customValid = true;
		cell.clear();

		this.cellsIndividuallyValidByStructure();

		return this.#dispatch('change');
	};

	clearAllCells = (): this => {
		for (const cell of this.#cells) {
			cell.clear();
			cell.customValid = true;
		}

		return this.#dispatch('change');
	};

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getCol = makeStructureCacher((col: number): ReadonlyCells => {
		inRangeIncl(0, this.size - 1, col);

		const result: Cells = [];

		for (let index = col; index < this.amountCells; index += this.size) {
			result.push(this.getCell(index));
		}

		return result;
	});

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getRow = makeStructureCacher((row: number): ReadonlyCells => {
		inRangeIncl(0, this.size - 1, row);

		return this.#cells.slice(row * this.size, (1 + row) * this.size);
	});

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getBlock = makeStructureCacher((index: number): ReadonlyCells => {
		const {size, blockWidth} = this;

		inRangeIncl(0, size - 1, index);

		const colOffset = (index % blockWidth) * blockWidth;
		const rowOffset = Math.floor(index / blockWidth) * blockWidth;

		const result: Cells = [];

		for (let index_ = 0; index_ < size; ++index_) {
			const row = rowOffset + Math.floor(index_ / blockWidth);
			const col = colOffset + (index_ % blockWidth);

			// prettier-ignore
			result.push(this.getCell((row * size) + col));
		}

		return result;
	});

	getCell = (index: number | Cell): Cell => {
		if (index instanceof Cell) {
			return index;
		}

		inRangeIncl(0, this.amountCells - 1, index);

		return this.#cells[index]!;
	};

	getCells = (): ReadonlyCells => this.#cells;

	/** @internal */
	#checkCellCandidates = (cellOrIndex: number | Cell): this => {
		const cell = this.getCell(cellOrIndex);

		if (cell.content !== undefined) {
			return this;
		}

		if (cell.candidates.size === 0) {
			throw new Error(
				`Unexpected empty cell candidates in cell #${this.#cells.indexOf(
					cell,
				)}`,
			);
		}

		if (cell.candidates.size === 1) {
			cell.setContent(cell.candidates.values().next().value as number);
			this.anyChanged ||= true;
			this.#dispatch('change');
		}

		return this;
	};

	/** @internal */
	removeCandidate = (cellOrIndex: number | Cell, toRemove: number): this => {
		const {candidates} = this.getCell(cellOrIndex);

		if (candidates.has(toRemove)) {
			this.anyChanged ||= true;
			candidates.delete(toRemove);

			this.#checkCellCandidates(cellOrIndex);
		}

		return this;
	};

	/** @internal */
	overrideCandidates = (
		cellOrIndex: number | Cell,
		candidates: Set<number>,
	): this => {
		const cell = this.getCell(cellOrIndex);

		let anyChanged = false;
		for (const candidate of cell.candidates) {
			if (!candidates.has(candidate)) {
				cell.candidates.delete(candidate);
				anyChanged ||= true;
			}
		}

		if (anyChanged) {
			this.anyChanged ||= true;
			this.#checkCellCandidates(cell);
		}

		return this;
	};

	#singleSolve = (): SolveTypes => {
		this.anyChanged = false;

		for (const plugin of this.#plugins) {
			try {
				plugin(this);
			} catch (error: unknown) {
				this.logError(error, this.#cells);

				return SolveTypes.error;
			}
		}

		return this.anyChanged ? SolveTypes.changed : SolveTypes.unchanged;
	};

	solve = (): DispatchType => {
		if (!this.isValid()) {
			this.#dispatch('error');
			return 'error';
		}

		for (const cell of this.#cells) {
			if (cell.content === undefined) {
				cell.clear(); // Reset candidates
			}
		}

		let shouldContinue: SolveTypes;

		do {
			shouldContinue = this.#singleSolve();
		} while (shouldContinue === SolveTypes.changed);

		let dispatchType: DispatchType;
		if (shouldContinue === SolveTypes.error) {
			dispatchType = 'error';
		} else if (this.isSolved()) {
			dispatchType = 'finish';
		} else {
			dispatchType = 'change';
		}

		this.#dispatch(dispatchType);
		return dispatchType;
	};

	subscribe = (callback: SubscriptionCallback): this => {
		this.#subscriptions.add(callback);

		return this;
	};

	unsubscribe = (callback: SubscriptionCallback): this => {
		this.#subscriptions.delete(callback);

		return this;
	};

	#dispatch = (type: DispatchType): this => {
		for (const callback of this.#subscriptions) {
			callback(this, type);
		}

		return this;
	};

	* eachStructure(): Iterable<ReadonlyCells> {
		for (const structureGetter of [this.getCol, this.getRow, this.getBlock]) {
			for (let i = 0; i < this.size; ++i) {
				yield structureGetter(i);
			}
		}
	}

	/** @internal */
	cellsIndividuallyValidByStructure = (): boolean => {
		for (const cell of this.#cells) {
			cell.customValid = true;
		}

		for (const structure of this.eachStructure()) {
			this._setValiditiesByStructure(structure);
		}

		for (const [index, cell] of this.#cells.entries()) {
			if (!cell.valid) {
				this.logError('cell was not valid', [index, cell]);

				return false;
			}
		}

		return true;
	};

	isValid = (): boolean => {
		for (const structure of this.eachStructure()) {
			const requiredNumbers = generateEmptyCellCandidates(this.size);

			for (const cell of structure) {
				if (cell.content === undefined) {
					for (const candidate of cell.candidates) {
						requiredNumbers.delete(candidate);
					}
				} else {
					requiredNumbers.delete(cell.content);
				}
			}

			if (requiredNumbers.size > 0) {
				this.logError('dict.size > 0: %o', requiredNumbers);

				return false;
			}
		}

		return this.cellsIndividuallyValidByStructure();
	};

	/** @internal */
	_setValiditiesByStructure = (structure: ReadonlyCells): this => {
		const found = new Map<number, Cell>();

		// For every content add the cell to `found`
		// If a second cell is found, that means that there are duplicates
		// so both are invalid

		for (const cell of structure) {
			const {content} = cell;

			if (content !== undefined) {
				const previousCell = found.get(content);

				if (previousCell) {
					previousCell.customValid = false;
					cell.customValid = false;
				} else {
					found.set(content, cell);
				}
			}
		}

		return this;
	};

	isSolved = (): boolean => {
		if (!this.cellsIndividuallyValidByStructure()) {
			return false;
		}

		for (const cell of this.#cells) {
			if (cell.content === undefined) {
				return false;
			}
		}

		return true;
	};

	toPrefilledSudoku = (): PrefilledSudoku => {
		const rows: Array<Array<number | number[]>> = [];

		for (let i = 0; i < this.size; ++i) {
			const row = this.getRow(i);
			const resultingRow: Array<number | number[]> = [];
			rows.push(resultingRow);

			for (const cell of row) {
				if (cell.content === undefined) {
					resultingRow.push([...cell.candidates]);
				} else {
					resultingRow.push(cell.content);
				}
			}
		}

		return rows;
	};

	toString = (): string => {
		const result: string[] = [];

		for (const cell of this.getCells()) {
			result.push(this.getContent(cell) ?? ' ');
		}

		return result.join('');
	};

	clone = (): Sudoku => {
		const newSudoku = Sudoku.fromPrefilled(this.toPrefilledSudoku(), this.size);
		newSudoku.shouldLogErrors = this.shouldLogErrors;
		newSudoku.mode = this.mode;
		return newSudoku;
	};

	logError = (message: any, ...data: any[]): void => {
		if (this.shouldLogErrors) {
			console.error(message, ...data);
		}
	};
}
