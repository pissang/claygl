export const GLMAT_EPSILON = 0.000001;

// Use Array instead of Float32Array. It seems to be much faster and higher precision.
export const GLMAT_ARRAY_TYPE = Array;
// if(!GLMAT_ARRAY_TYPE) {
//     GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
// }

export const GLMAT_RANDOM = Math.random;

export type Vec2Array = [number, number];
export type Vec3Array = [number, number, number];
export type Vec4Array = [number, number, number, number];
export type QuatArray = [number, number, number, number];
// prettier-ignore
export type Mat2Array = [
  number, number,
  number, number
];
// prettier-ignore
export type Mat2dArray = [
  number, number, number,
  number, number, number
];
// prettier-ignore
export type Mat3Array = [
  number, number, number,
  number, number, number,
  number, number, number
];
// prettier-ignore
export type Mat4Array = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number
];
