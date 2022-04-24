export function isPowerOfTwo(value: number) {
  return (value & (value - 1)) === 0;
}

export function nextPowerOfTwo(value: number) {
  value--;
  value |= value >> 1;
  value |= value >> 2;
  value |= value >> 4;
  value |= value >> 8;
  value |= value >> 16;
  value++;

  return value;
}

export function nearestPowerOfTwo(value: number) {
  return Math.pow(2, Math.round(Math.log(value) / Math.LN2));
}

export function formatMatrixString(array: number[], cols: number) {
  let str = '';
  for (let i = 0; i < Math.ceil(array.length / cols); i++) {
    str += array.slice(i * cols, (i + 1) * cols).join('\t') + '\n';
  }
  return str;
}

export function matrixOrVectorClassToString(obj: { array: number[] }, cols: number) {
  let str = '';
  const array = obj.array;
  const Clz = obj.constructor;
  const className = (Clz && Clz.name) || '';
  for (let i = 0; i < Math.ceil(array.length / cols); i++) {
    str += array.slice(i * cols, (i + 1) * cols).join('\t') + '\n';
  }
  return className + '[\n' + str + '\n]';
}
