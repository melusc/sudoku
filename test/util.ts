export const transformFlatArray = (
	input: ReadonlyArray<ReadonlyArray<number | undefined>>,
): Array<number | undefined> => transformChunkedArray(input).flat();

export const transformChunkedArray = (
	input: ReadonlyArray<ReadonlyArray<number | undefined>>,
): Array<Array<number | undefined>> =>
	input.map(row => row.map(cell => (cell === undefined ? cell : cell - 1)));
