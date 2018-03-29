
export var GLMAT_EPSILON = 0.000001;

// Use Array instead of Float32Array. It seems to be much faster and higher precision.
export var GLMAT_ARRAY_TYPE = Array;
// if(!GLMAT_ARRAY_TYPE) {
//     GLMAT_ARRAY_TYPE = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
// }

export var GLMAT_RANDOM = Math.random;
