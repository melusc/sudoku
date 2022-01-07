import test from 'ava';
import {bitCount, bitIndex} from '../../src/plugins/shared.js';

test('bitCount', t => {
	const smallNumbers = Array.from({length: 4096}, (_v, i) => BigInt(i));
	const bigNumbers: Array<bigint> = [
		1n << 256n,
		(1n << 256n) - 1n,
		0x21_89_41_AB_C8n,
		0x12_34_56_78_90_AB_CD_EFn,
	];

	for (const n of [...smallNumbers, ...bigNumbers]) {
		t.is(bitCount(n), BigInt(n.toString(2).replace(/0+/g, '').length));
	}
});

// Implicitely testing bitCount as well
test('bitIndex', t => {
	let counter = 1n;

	for (let i = 0; i < 256; ++i) {
		t.is(bitIndex(counter), i);
		counter <<= 1n;
	}
});

test('bitIndex 3 should throw', t => {
	t.throws(() => {
		bitIndex(3n);
	});
});
