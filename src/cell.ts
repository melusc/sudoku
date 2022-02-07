let counter = 0;
const uniqueId = (prefix = ''): string => `${prefix}${counter++}`;

export type Cells = Cell[];
export type ReadonlyCells = readonly Cell[];

export const generateEmptyCellCandidates = (size: number): Set<number> =>
	new Set(Array.from({length: size}, (_v, index) => index));

export class Cell {
	#content: number | undefined;

	candidates: Set<number>;

	key = uniqueId('cell-');

	customValid = true;

	constructor(private readonly sudokuSize: number) {
		this.candidates = generateEmptyCellCandidates(sudokuSize);
	}

	get content(): number | undefined {
		return this.#content;
	}

	get valid(): boolean {
		const content = this.#content;

		return (
			this.customValid
			&& (content === undefined
				? this.candidates.size > 0
				: Number.isInteger(content)
				  && content >= 0
				  && content < this.sudokuSize)
		);
	}

	setContent = (content?: number): this => {
		if (content === undefined || content < 0 || content >= this.sudokuSize) {
			this.clear();
		} else {
			this.#content = content;
			this.candidates.clear();
		}

		return this;
	};

	clear = (): this => {
		this.#content = undefined;

		this.candidates = generateEmptyCellCandidates(this.sudokuSize);

		return this;
	};
}
