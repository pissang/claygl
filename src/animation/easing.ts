import { cubicAt, cubicRootAt } from '../math/cubic';

const builtinEasing = {
  /**
   * @alias clay.animation.easing.linear
   * @param {number} k
   * @return {number}
   */
  linear: function (k: number) {
    return k;
  },
  /**
   * @alias clay.animation.easing.quadraticIn
   * @param {number} k
   * @return {number}
   */
  quadraticIn: function (k: number) {
    return k * k;
  },
  /**
   * @alias clay.animation.easing.quadraticOut
   * @param {number} k
   * @return {number}
   */
  quadraticOut: function (k: number) {
    return k * (2 - k);
  },
  /**
   * @alias clay.animation.easing.quadraticInOut
   * @param {number} k
   * @return {number}
   */
  quadraticInOut: function (k: number) {
    if ((k *= 2) < 1) {
      return 0.5 * k * k;
    }
    return -0.5 * (--k * (k - 2) - 1);
  },
  /**
   * @alias clay.animation.easing.cubicIn
   * @param {number} k
   * @return {number}
   */
  cubicIn: function (k: number) {
    return k * k * k;
  },
  /**
   * @alias clay.animation.easing.cubicOut
   * @param {number} k
   * @return {number}
   */
  cubicOut: function (k: number) {
    return --k * k * k + 1;
  },
  /**
   * @alias clay.animation.easing.cubicInOut
   * @param {number} k
   * @return {number}
   */
  cubicInOut: function (k: number) {
    if ((k *= 2) < 1) {
      return 0.5 * k * k * k;
    }
    return 0.5 * ((k -= 2) * k * k + 2);
  },
  /**
   * @alias clay.animation.easing.quarticIn
   * @param {number} k
   * @return {number}
   */
  quarticIn: function (k: number) {
    return k * k * k * k;
  },
  /**
   * @alias clay.animation.easing.quarticOut
   * @param {number} k
   * @return {number}
   */
  quarticOut: function (k: number) {
    return 1 - --k * k * k * k;
  },
  /**
   * @alias clay.animation.easing.quarticInOut
   * @param {number} k
   * @return {number}
   */
  quarticInOut: function (k: number) {
    if ((k *= 2) < 1) {
      return 0.5 * k * k * k * k;
    }
    return -0.5 * ((k -= 2) * k * k * k - 2);
  },
  /**
   * @alias clay.animation.easing.quinticIn
   * @param {number} k
   * @return {number}
   */
  quinticIn: function (k: number) {
    return k * k * k * k * k;
  },
  /**
   * @alias clay.animation.easing.quinticOut
   * @param {number} k
   * @return {number}
   */
  quinticOut: function (k: number) {
    return --k * k * k * k * k + 1;
  },
  /**
   * @alias clay.animation.easing.quinticInOut
   * @param {number} k
   * @return {number}
   */
  quinticInOut: function (k: number) {
    if ((k *= 2) < 1) {
      return 0.5 * k * k * k * k * k;
    }
    return 0.5 * ((k -= 2) * k * k * k * k + 2);
  },
  /**
   * @alias clay.animation.easing.sinusoidalIn
   * @param {number} k
   * @return {number}
   */
  sinusoidalIn: function (k: number) {
    return 1 - Math.cos((k * Math.PI) / 2);
  },
  /**
   * @alias clay.animation.easing.sinusoidalOut
   * @param {number} k
   * @return {number}
   */
  sinusoidalOut: function (k: number) {
    return Math.sin((k * Math.PI) / 2);
  },
  /**
   * @alias clay.animation.easing.sinusoidalInOut
   * @param {number} k
   * @return {number}
   */
  sinusoidalInOut: function (k: number) {
    return 0.5 * (1 - Math.cos(Math.PI * k));
  },
  /**
   * @alias clay.animation.easing.exponentialIn
   * @param {number} k
   * @return {number}
   */
  exponentialIn: function (k: number) {
    return k === 0 ? 0 : Math.pow(1024, k - 1);
  },
  /**
   * @alias clay.animation.easing.exponentialOut
   * @param {number} k
   * @return {number}
   */
  exponentialOut: function (k: number) {
    return k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
  },
  /**
   * @alias clay.animation.easing.exponentialInOut
   * @param {number} k
   * @return {number}
   */
  exponentialInOut: function (k: number) {
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    if ((k *= 2) < 1) {
      return 0.5 * Math.pow(1024, k - 1);
    }
    return 0.5 * (-Math.pow(2, -10 * (k - 1)) + 2);
  },
  /**
   * @alias clay.animation.easing.circularIn
   * @param {number} k
   * @return {number}
   */
  circularIn: function (k: number) {
    return 1 - Math.sqrt(1 - k * k);
  },
  /**
   * @alias clay.animation.easing.circularOut
   * @param {number} k
   * @return {number}
   */
  circularOut: function (k: number) {
    return Math.sqrt(1 - --k * k);
  },
  /**
   * @alias clay.animation.easing.circularInOut
   * @param {number} k
   * @return {number}
   */
  circularInOut: function (k: number) {
    if ((k *= 2) < 1) {
      return -0.5 * (Math.sqrt(1 - k * k) - 1);
    }
    return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
  },
  /**
   * @alias clay.animation.easing.elasticIn
   * @param {number} k
   * @return {number}
   */
  elasticIn: function (k: number) {
    let s,
      a = 0.1,
      p = 0.4;
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    if (!a || a < 1) {
      a = 1;
      s = p / 4;
    } else {
      s = (p * Math.asin(1 / a)) / (2 * Math.PI);
    }
    return -(a * Math.pow(2, 10 * (k -= 1)) * Math.sin(((k - s) * (2 * Math.PI)) / p));
  },
  /**
   * @alias clay.animation.easing.elasticOut
   * @param {number} k
   * @return {number}
   */
  elasticOut: function (k: number) {
    let s,
      a = 0.1,
      p = 0.4;
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    if (!a || a < 1) {
      a = 1;
      s = p / 4;
    } else {
      s = (p * Math.asin(1 / a)) / (2 * Math.PI);
    }
    return a * Math.pow(2, -10 * k) * Math.sin(((k - s) * (2 * Math.PI)) / p) + 1;
  },
  /**
   * @alias clay.animation.easing.elasticInOut
   * @param {number} k
   * @return {number}
   */
  elasticInOut: function (k: number) {
    let s,
      a = 0.1,
      p = 0.4;
    if (k === 0) {
      return 0;
    }
    if (k === 1) {
      return 1;
    }
    if (!a || a < 1) {
      a = 1;
      s = p / 4;
    } else {
      s = (p * Math.asin(1 / a)) / (2 * Math.PI);
    }
    if ((k *= 2) < 1) {
      return -0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin(((k - s) * (2 * Math.PI)) / p));
    }
    return a * Math.pow(2, -10 * (k -= 1)) * Math.sin(((k - s) * (2 * Math.PI)) / p) * 0.5 + 1;
  },
  /**
   * @alias clay.animation.easing.backIn
   * @param {number} k
   * @return {number}
   */
  backIn: function (k: number) {
    const s = 1.70158;
    return k * k * ((s + 1) * k - s);
  },
  /**
   * @alias clay.animation.easing.backOut
   * @param {number} k
   * @return {number}
   */
  backOut: function (k: number) {
    const s = 1.70158;
    return --k * k * ((s + 1) * k + s) + 1;
  },
  /**
   * @alias clay.animation.easing.backInOut
   * @param {number} k
   * @return {number}
   */
  backInOut: function (k: number) {
    const s = 1.70158 * 1.525;
    if ((k *= 2) < 1) {
      return 0.5 * (k * k * ((s + 1) * k - s));
    }
    return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
  },
  /**
   * @alias clay.animation.easing.bounceIn
   * @param {number} k
   * @return {number}
   */
  bounceIn: function (k: number) {
    return 1 - builtinEasing.bounceOut(1 - k);
  },
  /**
   * @alias clay.animation.easing.bounceOut
   * @param {number} k
   * @return {number}
   */
  bounceOut: function (k: number) {
    if (k < 1 / 2.75) {
      return 7.5625 * k * k;
    } else if (k < 2 / 2.75) {
      return 7.5625 * (k -= 1.5 / 2.75) * k + 0.75;
    } else if (k < 2.5 / 2.75) {
      return 7.5625 * (k -= 2.25 / 2.75) * k + 0.9375;
    } else {
      return 7.5625 * (k -= 2.625 / 2.75) * k + 0.984375;
    }
  },
  /**
   * @alias clay.animation.easing.bounceInOut
   * @param {number} k
   * @return {number}
   */
  bounceInOut: function (k: number) {
    if (k < 0.5) {
      return builtinEasing.bounceIn(k * 2) * 0.5;
    }
    return builtinEasing.bounceOut(k * 2 - 1) * 0.5 + 0.5;
  }
} as const;

export type EasingFunc = (t: number) => number;

const regexp = /cubic-bezier\(([0-9,.e ]+)\)/;

export function createCubicEasingFunc(cubicEasingStr: string) {
  const cubic = cubicEasingStr && regexp.exec(cubicEasingStr);
  if (cubic) {
    const points = cubic[1].split(',');
    const a = +points[0].trim();
    const b = +points[1].trim();
    const c = +points[2].trim();
    const d = +points[3].trim();

    if (isNaN(a + b + c + d)) {
      return;
    }

    const roots: number[] = [];
    return (p: number) => {
      return p <= 0
        ? 0
        : p >= 1
        ? 1
        : cubicRootAt(0, a, c, 1, p, roots) && cubicAt(0, b, d, 1, roots[0]);
    };
  }
}

export type AnimationEasing = keyof typeof builtinEasing | EasingFunc;

export { builtinEasing };
