import * as plugins from './plugins/index.js';

export type Cell = {
	content: number | undefined;
	candidates: Set<number>;
	readonly index: number;
};
export type ReadonlyCells = readonly Cell[];

export type Structure = ReadonlyCells & {contents: Record<number, number>};

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

const generateEmptyCellCandidates = (size: number): Set<number> =>
	new Set(Array.from({length: size}, (_v, index) => index));

// Using a proxy means there's no need to check for undefined every single time, only check it once here
// It also allows to simply do `contents[number]++` without checking for undefined
const makeContentsRecord = (): Record<number, number> =>
	new Proxy<Record<number, number>>(
		{},
		{
			get(target, key): number {
				return (Reflect.get(target, key) as number | undefined) ?? 0;
			},
			set(target, key: string, value): boolean {
				if (value < 0) {
					throw new Error(`${key} , value < 0`);
				}

				if (value === 0) {
					Reflect.deleteProperty(target, key);
					return true;
				}

				return Reflect.set(target, key, value);
			},
		},
	);

const makeStructureCacher = (
	fn: (index: number) => ReadonlyCells,
): ((index: number) => Structure) => {
	const cache = new Map<number, Structure>();
	return (index: number): Structure => {
		if (cache.has(index)) {
			return cache.get(index)!;
		}

		const result = fn(index);

		const contents = makeContentsRecord();

		for (const {content} of result) {
			if (content !== undefined) {
				++contents[content];
			}
		}

		const merged = Object.assign(result, {contents});
		cache.set(index, merged);

		return merged;
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
		this.#cells = Array.from({length: amountCells}, (_v, index) => ({
			content: undefined,
			candidates: generateEmptyCellCandidates(size),
			index,
		}));
	}

	setContent = (cellOrIndex: number | Cell, content: string | number): this => {
		const cell = this.getCell(cellOrIndex);

		if (typeof content === 'string') {
			const index = Sudoku.alphabet.indexOf(content.toUpperCase());
			if (index === -1) {
				throw new Error(`content was not in alphabet: "${content}"`);
			}

			return this.setContent(cell, index);
		}

		if (Number.isInteger(content)) {
			inRangeIncl(0, this.size - 1, content);

			const previousContent = cell.content;

			cell.candidates.clear();

			for (const {contents} of this.getStructuresOfCell(cell)) {
				++contents[content];

				if (previousContent !== undefined) {
					--contents[previousContent];
				}
			}

			// If the structure is uninitialised contents will be updated there
			// if it is initialised it won't be updated there
			// Therefore always update it after getStructuresOfCell
			cell.content = content;

			return this.#dispatch('change');
		}

		throw new TypeError(`content was not an integer: ${content}`);
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
		const {content} = cell;

		if (content !== undefined) {
			for (const structure of this.getStructuresOfCell(cell)) {
				--structure.contents[content];
			}
		}

		cell.content = undefined;
		cell.candidates = generateEmptyCellCandidates(this.size);

		return this.#dispatch('change');
	};

	clearAllCells = (): this => {
		for (const cell of this.#cells) {
			this.clearCell(cell);
		}

		return this.#dispatch('change');
	};

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getCol = makeStructureCacher((col: number): ReadonlyCells => {
		inRangeIncl(0, this.size - 1, col);

		const result: Cell[] = [];

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

		const result: Cell[] = [];

		for (let index_ = 0; index_ < size; ++index_) {
			const row = rowOffset + Math.floor(index_ / blockWidth);
			const col = colOffset + (index_ % blockWidth);

			// prettier-ignore
			result.push(this.getCell((row * size) + col));
		}

		return result;
	});

	getCell = (index: number | Cell): Cell => {
		if (typeof index === 'number') {
			inRangeIncl(0, this.amountCells - 1, index);

			return this.#cells[index]!;
		}

		return index;
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
			this.setContent(cell, [...cell.candidates][0]!);
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
				this.clearCell(cell); // Reset candidates
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

	* eachStructure(): Iterable<Structure> {
		for (const structureGetter of [this.getCol, this.getRow, this.getBlock]) {
			for (let i = 0; i < this.size; ++i) {
				yield structureGetter(i);
			}
		}
	}

	/** @internal */
	cellsIndividuallyValid = (): boolean => {
		for (const cell of this.#cells) {
			if (!this.isCellValid(cell)) {
				this.logError('cell was not valid', [cell]);

				return false;
			}
		}

		return true;
	};

	/** @internal */
	* getStructuresOfCell(cellOrIndex: number | Cell): Iterable<Structure> {
		const cell = this.getCell(cellOrIndex);

		const {index} = cell;

		const colIndex = index % this.size;
		const rowIndex = Math.floor(index / this.size);
		// prettier-ignore
		const blockIndex
			= Math.floor(colIndex / this.blockWidth)
			+ (Math.floor(rowIndex / this.blockWidth) * this.blockWidth);

		yield this.getCol(colIndex);
		yield this.getRow(rowIndex);
		yield this.getBlock(blockIndex);
	}

	isCellValid = (cellOrIndex: number | Cell): boolean => {
		const cell = this.getCell(cellOrIndex);

		// Invalid cases:
		//   cell.content === undefined && cell.candidates.size === 0
		//   cell.content !== undefined && cell.candidates.size > 0
		if ((cell.content === undefined) === (cell.candidates.size === 0)) {
			return false;
		}

		const {content} = cell;

		if (content === undefined) {
			return true;
		}

		for (const {contents} of this.getStructuresOfCell(cell)) {
			if (contents[content]! > 1) {
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

		return this.cellsIndividuallyValid();
	};

	isSolved = (): boolean => {
		if (!this.isValid()) {
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
