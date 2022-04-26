/**
 * @license
 * Copyright (c) 2013, Brandon Jones, Colin MacKenzie IV. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *   * Redistributions of source code must retain the above copyright notice,
 * this list of conditions and the following disclaimer.
 *   * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

import {
  GLMAT_RANDOM,
  Mat2Array,
  Mat2dArray,
  Mat3Array,
  Mat4Array,
  Vec2Array,
  Vec3Array
} from './common';
export type { Vec2Array };
/**
 * @class 2 Dimensional Vector
 * @name vec2
 */

/**
 * Creates a new, empty vec2
 *
 * @returns a new 2D vector
 */
export function create(): Vec2Array {
  return [0, 0];
}

/**
 * Creates a new vec2 initialized with values from an existing vector
 *
 * @param a vector to clone
 * @returns a new 2D vector
 */
export function clone(a: Vec2Array): Vec2Array {
  return [a[0], a[1]];
}

/**
 * Creates a new vec2 initialized with the given values
 *
 * @param x X component
 * @param y Y component
 * @returns a new 2D vector
 */
export function fromValues(x: number, y: number) {
  return [x, y] as Vec2Array;
}

/**
 * Copy the values from one vec2 to another
 *
 * @param out the receiving vector
 * @param a the source vector
 * @returns out
 */
export function copy(out: Vec2Array, a: Vec2Array) {
  out[0] = a[0];
  out[1] = a[1];
  return out;
}

/**
 * Set the components of a vec2 to the given values
 *
 * @param out the receiving vector
 * @param x X component
 * @param y Y component
 * @returns out
 */
export function set(out: Vec2Array, x: number, y: number) {
  out[0] = x;
  out[1] = y;
  return out;
}

/**
 * Adds two vec2's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function add(out: Vec2Array, a: Vec2Array, b: Vec2Array) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  return out;
}

/**
 * Subtracts vector b from vector a
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function subtract(out: Vec2Array, a: Vec2Array, b: Vec2Array) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  return out;
}

/**
 * Alias for {@link vec2.subtract} */
export const sub = subtract;

/**
 * Multiplies two vec2's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function multiply(out: Vec2Array, a: Vec2Array, b: Vec2Array) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  return out;
}

/**
 * Alias for {@link vec2.multiply} */
export const mul = multiply;

/**
 * Divides two vec2's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function divide(out: Vec2Array, a: Vec2Array, b: Vec2Array) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  return out;
}

/**
 * Alias for {@link vec2.divide} */
export const div = divide;

/**
 * Returns the minimum of two vec2's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function min(out: Vec2Array, a: Vec2Array, b: Vec2Array) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  return out;
}

/**
 * Returns the maximum of two vec2's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function max(out: Vec2Array, a: Vec2Array, b: Vec2Array) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  return out;
}

/**
 * Scales a vec2 by a scalar number
 *
 * @param out the receiving vector
 * @param a the vector to scale
 * @param b amount to scale the vector by
 * @returns out
 */
export function scale(out: Vec2Array, a: Vec2Array, b: number) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  return out;
}

/**
 * Adds two vec2's after scaling the second operand by a scalar value
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @param scale the amount to scale b by before adding
 * @returns out
 */
export function scaleAndAdd(out: Vec2Array, a: Vec2Array, b: Vec2Array, scale: number) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  return out;
}

/**
 * Calculates the euclidian distance between two vec2's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns distance between a and b
 */
export function distance(a: Vec2Array, b: Vec2Array) {
  const x = b[0] - a[0],
    y = b[1] - a[1];
  return Math.sqrt(x * x + y * y);
}

/**
 * Alias for {@link vec2.distance} */
export const dist = distance;

/**
 * Calculates the squared euclidian distance between two vec2's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns squared distance between a and b
 */
export function squaredDistance(a: Vec2Array, b: Vec2Array) {
  const x = b[0] - a[0],
    y = b[1] - a[1];
  return x * x + y * y;
}

/**
 * Alias for {@link vec2.squaredDistance} */
export const sqrDist = squaredDistance;

/**
 * Calculates the length of a vec2
 *
 * @param a vector to calculate length of
 * @returns length of a
 */
// eslint-disable-next-line
export function length(a: Vec2Array) {
  const x = a[0],
    y = a[1];
  return Math.sqrt(x * x + y * y);
}

/**
 * Alias for {@link vec2.length} */
export const len = length;

/**
 * Calculates the squared length of a vec2
 *
 * @param a vector to calculate squared length of
 * @returns squared length of a
 */
export function squaredLength(a: Vec2Array) {
  const x = a[0],
    y = a[1];
  return x * x + y * y;
}

/**
 * Alias for {@link vec2.squaredLength} */
export const sqrLen = squaredLength;

/**
 * Negates the components of a vec2
 *
 * @param out the receiving vector
 * @param a vector to negate
 * @returns out
 */
export function negate(out: Vec2Array, a: Vec2Array) {
  out[0] = -a[0];
  out[1] = -a[1];
  return out;
}

/**
 * Returns the inverse of the components of a vec2
 *
 * @param out the receiving vector
 * @param a vector to invert
 * @returns out
 */
export function inverse(out: Vec2Array, a: Vec2Array) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  return out;
}

/**
 * Normalize a vec2
 *
 * @param out the receiving vector
 * @param a vector to normalize
 * @returns out
 */
export function normalize(out: Vec2Array, a: Vec2Array) {
  const x = a[0],
    y = a[1];
  let len = x * x + y * y;
  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
    out[0] = a[0] * len;
    out[1] = a[1] * len;
  }
  return out;
}

/**
 * Calculates the dot product of two vec2's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns dot product of a and b
 */
export function dot(a: Vec2Array, b: Vec2Array) {
  return a[0] * b[0] + a[1] * b[1];
}

/**
 * Computes the cross product of two vec2's
 * Note that the cross product must by definition produce a 3D vector
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function cross(out: Vec3Array, a: Vec2Array, b: Vec2Array) {
  const z = a[0] * b[1] - a[1] * b[0];
  out[0] = out[1] = 0;
  out[2] = z;
  return out;
}

/**
 * Performs a linear interpolation between two vec2's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @param t interpolation amount between the two inputs
 * @returns out
 */
export function lerp(out: Vec2Array, a: Vec2Array, b: Vec2Array, t: number) {
  const ax = a[0],
    ay = a[1];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  return out;
}

/**
 * Generates a random vector with the given scale
 *
 * @param out the receiving vector
 * @param [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns out
 */
export function random(out: Vec2Array, scale: number) {
  scale = scale || 1.0;
  const r = GLMAT_RANDOM() * 2.0 * Math.PI;
  out[0] = Math.cos(r) * scale;
  out[1] = Math.sin(r) * scale;
  return out;
}

/**
 * Transforms the vec2 with a mat2
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param {mat2} m matrix to transform with
 * @returns out
 */
export function transformMat2(out: Vec2Array, a: Vec2Array, m: Mat2Array) {
  const x = a[0],
    y = a[1];
  out[0] = m[0] * x + m[2] * y;
  out[1] = m[1] * x + m[3] * y;
  return out;
}

/**
 * Transforms the vec2 with a mat2d
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param m matrix to transform with
 * @returns out
 */
export function transformMat2d(out: Vec2Array, a: Vec2Array, m: Mat2dArray) {
  const x = a[0],
    y = a[1];
  out[0] = m[0] * x + m[2] * y + m[4];
  out[1] = m[1] * x + m[3] * y + m[5];
  return out;
}

/**
 * Transforms the vec2 with a mat3
 * 3rd vector component is implicitly '1'
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param m matrix to transform with
 * @returns out
 */
export function transformMat3(out: Vec2Array, a: Vec2Array, m: Mat3Array) {
  const x = a[0],
    y = a[1];
  out[0] = m[0] * x + m[3] * y + m[6];
  out[1] = m[1] * x + m[4] * y + m[7];
  return out;
}

/**
 * Transforms the vec2 with a mat4
 * 3rd vector component is implicitly '0'
 * 4th vector component is implicitly '1'
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param {mat4} m matrix to transform with
 * @returns out
 */
export function transformMat4(out: Vec2Array, a: Vec2Array, m: Mat4Array) {
  const x = a[0],
    y = a[1];
  out[0] = m[0] * x + m[4] * y + m[12];
  out[1] = m[1] * x + m[5] * y + m[13];
  return out;
}

/**
 * Perform some operation over an array of vec2s.
 *
 * @param a the array of vectors to iterate over
 * @param stride Number of elements between the start of each vec2. If 0 assumes tightly packed
 * @param offset Number of elements to skip at the beginning of the array
 * @param count Number of vec2s to iterate over. If 0 iterates over entire array
 export function para}  to call for each vector in the array
 * @param arg additional argument to pass to fn
 * @returns
 */
export const forEach = (function () {
  const vec = create();

  return function <T>(
    a: { readonly length: number; [n: number]: number },
    stride: number,
    offset: number,
    count: number,
    fn: undefined extends T
      ? (a: Vec2Array, b: Vec2Array) => void
      : (a: Vec2Array, b: Vec2Array, arg: T) => void,
    arg?: T
  ) {
    let i, l;
    if (!stride) {
      stride = 2;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
    }

    return a;
  };
})();
