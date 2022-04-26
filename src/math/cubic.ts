const mathPow = Math.pow;
const mathSqrt = Math.sqrt;

const EPSILON = 1e-8;

const THREE_SQRT = mathSqrt(3);
const ONE_THIRD = 1 / 3;
function isAroundZero(val: number) {
  return val > -EPSILON && val < EPSILON;
}

export function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const onet = 1 - t;
  return onet * onet * (onet * p0 + 3 * t * p1) + t * t * (t * p3 + 3 * onet * p2);
}

export function cubicDerivativeAt(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  t: number
): number {
  const onet = 1 - t;
  return 3 * (((p1 - p0) * onet + 2 * (p2 - p1) * t) * onet + (p3 - p2) * t * t);
}

export function cubicRootAt(
  p0: number,
  p1: number,
  p2: number,
  p3: number,
  val: number,
  roots: number[]
): number {
  // Evaluate roots of cubic functions
  const a = p3 + 3 * (p1 - p2) - p0;
  const b = 3 * (p2 - p1 * 2 + p0);
  const c = 3 * (p1 - p0);
  const d = p0 - val;

  const A = b * b - 3 * a * c;
  const B = b * c - 9 * a * d;
  const C = c * c - 3 * b * d;

  let n = 0;

  if (isAroundZero(A) && isAroundZero(B)) {
    if (isAroundZero(b)) {
      roots[0] = 0;
    } else {
      const t1 = -c / b; //t1, t2, t3, b is not zero
      if (t1 >= 0 && t1 <= 1) {
        roots[n++] = t1;
      }
    }
  } else {
    const disc = B * B - 4 * A * C;

    if (isAroundZero(disc)) {
      const K = B / A;
      const t1 = -b / a + K; // t1, a is not zero
      const t2 = -K / 2; // t2, t3
      if (t1 >= 0 && t1 <= 1) {
        roots[n++] = t1;
      }
      if (t2 >= 0 && t2 <= 1) {
        roots[n++] = t2;
      }
    } else if (disc > 0) {
      const discSqrt = mathSqrt(disc);
      let Y1 = A * b + 1.5 * a * (-B + discSqrt);
      let Y2 = A * b + 1.5 * a * (-B - discSqrt);
      if (Y1 < 0) {
        Y1 = -mathPow(-Y1, ONE_THIRD);
      } else {
        Y1 = mathPow(Y1, ONE_THIRD);
      }
      if (Y2 < 0) {
        Y2 = -mathPow(-Y2, ONE_THIRD);
      } else {
        Y2 = mathPow(Y2, ONE_THIRD);
      }
      const t1 = (-b - (Y1 + Y2)) / (3 * a);
      if (t1 >= 0 && t1 <= 1) {
        roots[n++] = t1;
      }
    } else {
      const T = (2 * A * b - 3 * a * B) / (2 * mathSqrt(A * A * A));
      const theta = Math.acos(T) / 3;
      const ASqrt = mathSqrt(A);
      const tmp = Math.cos(theta);

      const t1 = (-b - 2 * ASqrt * tmp) / (3 * a);
      const t2 = (-b + ASqrt * (tmp + THREE_SQRT * Math.sin(theta))) / (3 * a);
      const t3 = (-b + ASqrt * (tmp - THREE_SQRT * Math.sin(theta))) / (3 * a);
      if (t1 >= 0 && t1 <= 1) {
        roots[n++] = t1;
      }
      if (t2 >= 0 && t2 <= 1) {
        roots[n++] = t2;
      }
      if (t3 >= 0 && t3 <= 1) {
        roots[n++] = t3;
      }
    }
  }
  return n;
}
