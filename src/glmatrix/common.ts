export const GLMAT_EPSILON = 0.000001;

// Use Array instead of Float32Array. It seems to be much faster and higher precision.
export const GLMAT_ARRAY_TYPE = Array;
// if(!GLMAT_ARRAY_TYPE) {
//     GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
// }

export const GLMAT_RANDOM = Math.random;
