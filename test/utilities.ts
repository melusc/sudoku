export function transformFlatArray(
	input: ReadonlyArray<ReadonlyArray<number | undefined>>,
): Array<number | undefined> {
	return transformChunkedArray(input).flat();
}

export function transformChunkedArray(
	input: ReadonlyArray<ReadonlyArray<number | undefined>>,
): Array<Array<number | undefined>> {
	return input.map(row =>
		row.map(cell => (cell === undefined ? cell : cell - 1)),
	);
}
