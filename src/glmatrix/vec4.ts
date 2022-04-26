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

import { GLMAT_RANDOM, Vec4Array, Mat4Array, QuatArray } from './common';

export type { Vec4Array };
/**
 * Creates a new, empty vec4
 *
 * @returns a new 4D vector
 */
export function create(): Vec4Array {
  return [0, 0, 0, 0];
}

/**
 * Creates a new vec4 initialized with values from an existing vector
 *
 * @param a vector to clone
 * @returns a new 4D vector
 */
export function clone(a: Vec4Array): Vec4Array {
  return [a[0], a[1], a[2], a[3]];
}

/**
 * Creates a new vec4 initialized with the given values
 *
 * @param x X component
 * @param y Y component
 * @param z Z component
 * @param w W component
 * @returns a new 4D vector
 */
export function fromValues(x: number, y: number, z: number, w: number): Vec4Array {
  return [x, y, z, w];
}

/**
 * Copy the values from one vec4 to another
 *
 * @param out the receiving vector
 * @param a the source vector
 * @returns out
 */
export function copy(out: Vec4Array, a: Vec4Array) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[3];
  return out;
}

/**
 * Set the components of a vec4 to the given values
 *
 * @param out the receiving vector
 * @param x X component
 * @param y Y component
 * @param z Z component
 * @param w W component
 * @returns out
 */
export function set(out: Vec4Array, x: number, y: number, z: number, w: number) {
  out[0] = x;
  out[1] = y;
  out[2] = z;
  out[3] = w;
  return out;
}

/**
 * Adds two vec4's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function add(out: Vec4Array, a: Vec4Array, b: Vec4Array) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
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
export function subtract(out: Vec4Array, a: Vec4Array, b: Vec4Array) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}

/**
 * Alias for {@link vec4.subtract}
 * @function
 */
export const sub = subtract;

/**
 * Multiplies two vec4's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function multiply(out: Vec4Array, a: Vec4Array, b: Vec4Array) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}

/**
 * Alias for {@link vec4.multiply}
 * @function
 */
export const mul = multiply;

/**
 * Divides two vec4's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function divide(out: Vec4Array, a: Vec4Array, b: Vec4Array) {
  out[0] = a[0] / b[0];
  out[1] = a[1] / b[1];
  out[2] = a[2] / b[2];
  out[3] = a[3] / b[3];
  return out;
}

/**
 * Alias for {@link vec4.divide}
 * @function
 */
export const div = divide;

/**
 * Returns the minimum of two vec4's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function min(out: Vec4Array, a: Vec4Array, b: Vec4Array) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  out[3] = Math.min(a[3], b[3]);
  return out;
}

/**
 * Returns the maximum of two vec4's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @returns out
 */
export function max(out: Vec4Array, a: Vec4Array, b: Vec4Array) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  out[3] = Math.max(a[3], b[3]);
  return out;
}

/**
 * Scales a vec4 by a scalar number
 *
 * @param out the receiving vector
 * @param a the vector to scale
 * @param b amount to scale the vector by
 * @returns out
 */
export function scale(out: Vec4Array, a: Vec4Array, b: number) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}

/**
 * Adds two vec4's after scaling the second operand by a scalar value
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @param scale the amount to scale b by before adding
 * @returns out
 */
export function scaleAndAdd(out: Vec4Array, a: Vec4Array, b: Vec4Array, scale: number) {
  out[0] = a[0] + b[0] * scale;
  out[1] = a[1] + b[1] * scale;
  out[2] = a[2] + b[2] * scale;
  out[3] = a[3] + b[3] * scale;
  return out;
}

/**
 * Calculates the euclidian distance between two vec4's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns distance between a and b
 */
export function distance(a: Vec4Array, b: Vec4Array) {
  const x = b[0] - a[0],
    y = b[1] - a[1],
    z = b[2] - a[2],
    w = b[3] - a[3];
  return Math.sqrt(x * x + y * y + z * z + w * w);
}

/**
 * Alias for {@link vec4.distance}
 * @function
 */
export const dist = distance;

/**
 * Calculates the squared euclidian distance between two vec4's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns squared distance between a and b
 */
export function squaredDistance(a: Vec4Array, b: Vec4Array) {
  const x = b[0] - a[0],
    y = b[1] - a[1],
    z = b[2] - a[2],
    w = b[3] - a[3];
  return x * x + y * y + z * z + w * w;
}

/**
 * Alias for {@link vec4.squaredDistance}
 * @function
 */
export const sqrDist = squaredDistance;

/**
 * Calculates the length of a vec4
 *
 * @param a vector to calculate length of
 * @returns length of a
 */
// eslint-disable-next-line
export function length(a: Vec4Array) {
  const x = a[0],
    y = a[1],
    z = a[2],
    w = a[3];
  return Math.sqrt(x * x + y * y + z * z + w * w);
}

/**
 * Alias for {@link vec4.length}
 * @function
 */
export const len = length;

/**
 * Calculates the squared length of a vec4
 *
 * @param a vector to calculate squared length of
 * @returns squared length of a
 */
export function squaredLength(a: Vec4Array) {
  const x = a[0],
    y = a[1],
    z = a[2],
    w = a[3];
  return x * x + y * y + z * z + w * w;
}

/**
 * Alias for {@link vec4.squaredLength}
 * @function
 */
export const sqrLen = squaredLength;

/**
 * Negates the components of a vec4
 *
 * @param out the receiving vector
 * @param a vector to negate
 * @returns out
 */
export function negate(out: Vec4Array, a: Vec4Array) {
  out[0] = -a[0];
  out[1] = -a[1];
  out[2] = -a[2];
  out[3] = -a[3];
  return out;
}

/**
 * Returns the inverse of the components of a vec4
 *
 * @param out the receiving vector
 * @param a vector to invert
 * @returns out
 */
export function inverse(out: Vec4Array, a: Vec4Array) {
  out[0] = 1.0 / a[0];
  out[1] = 1.0 / a[1];
  out[2] = 1.0 / a[2];
  out[3] = 1.0 / a[3];
  return out;
}

/**
 * Normalize a vec4
 *
 * @param out the receiving vector
 * @param a vector to normalize
 * @returns out
 */
export function normalize(out: Vec4Array, a: Vec4Array) {
  const x = a[0],
    y = a[1],
    z = a[2],
    w = a[3];
  let len = x * x + y * y + z * z + w * w;
  if (len > 0) {
    len = 1 / Math.sqrt(len);
    out[0] = a[0] * len;
    out[1] = a[1] * len;
    out[2] = a[2] * len;
    out[3] = a[3] * len;
  }
  return out;
}

/**
 * Calculates the dot product of two vec4's
 *
 * @param a the first operand
 * @param b the second operand
 * @returns dot product of a and b
 */
export function dot(a: Vec4Array, b: Vec4Array) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

/**
 * Performs a linear interpolation between two vec4's
 *
 * @param out the receiving vector
 * @param a the first operand
 * @param b the second operand
 * @param t interpolation amount between the two inputs
 * @returns out
 */
export function lerp(out: Vec4Array, a: Vec4Array, b: Vec4Array, t: number) {
  const ax = a[0],
    ay = a[1],
    az = a[2],
    aw = a[3];
  out[0] = ax + t * (b[0] - ax);
  out[1] = ay + t * (b[1] - ay);
  out[2] = az + t * (b[2] - az);
  out[3] = aw + t * (b[3] - aw);
  return out;
}

/**
 * Generates a random vector with the given scale
 *
 * @param out the receiving vector
 * @param [scale] Length of the resulting vector. If ommitted, a unit vector will be returned
 * @returns out
 */
export function random(out: Vec4Array, s?: number) {
  s = s || 1.0;

  //TODO: This is a pretty awful way of doing this. Find something better.
  out[0] = GLMAT_RANDOM();
  out[1] = GLMAT_RANDOM();
  out[2] = GLMAT_RANDOM();
  out[3] = GLMAT_RANDOM();
  normalize(out, out);
  scale(out, out, s);
  return out;
}

/**
 * Transforms the vec4 with a mat4.
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param m matrix to transform with
 * @returns out
 */
export function transformMat4(out: Vec4Array, a: Vec4Array, m: Mat4Array) {
  const x = a[0],
    y = a[1],
    z = a[2],
    w = a[3];
  out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
  out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
  out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
  out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
  return out;
}

/**
 * Transforms the vec4 with a quat
 *
 * @param out the receiving vector
 * @param a the vector to transform
 * @param q quaternion to transform with
 * @returns out
 */
export function transformQuat(out: Vec4Array, a: Vec4Array, q: QuatArray) {
  const x = a[0],
    y = a[1],
    z = a[2],
    qx = q[0],
    qy = q[1],
    qz = q[2],
    qw = q[3],
    // calculate quat * vec
    ix = qw * x + qy * z - qz * y,
    iy = qw * y + qz * x - qx * z,
    iz = qw * z + qx * y - qy * x,
    iw = -qx * x - qy * y - qz * z;

  // calculate result * inverse quat
  out[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
  out[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
  out[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;
  return out;
}

/**
 * Perform some operation over an array of vec4s.
 *
 * @param a the array of vectors to iterate over
 * @param stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param offset Number of elements to skip at the beginning of the array
 * @param count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param fn Function to call for each vector in the array
 * @param arg additional argument to pass to fn
 * @returns a
 * @function
 */
export const forEach = (function () {
  const vec = create();

  return function <T>(
    a: { readonly length: number; [n: number]: number },
    stride: number,
    offset: number,
    count: number,
    fn: undefined extends T
      ? (a: Vec4Array, b: Vec4Array) => void
      : (a: Vec4Array, b: Vec4Array, arg: T) => void,
    arg?: T
  ) {
    let i, l;
    if (!stride) {
      stride = 4;
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
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();
