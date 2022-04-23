import { get } from './request';

let supportWebGL: boolean;

interface Vendor {
  supportWebGL: () => boolean;
  requestAnimationFrame: (cb: () => void) => void;
  /* global HTMLCanvasElement HTMLImageElement */
  createCanvas: () => HTMLCanvasElement;
  createImage: () => HTMLImageElement;
  request: {
    get: typeof get;
  };
  addEventListener: (dom: any, type: string, func: Function, useCapture?: boolean) => void;
  removeEventListener: (dom: any, type: string, func: Function) => void;
}
const vendor = {} as Vendor;

/**
 * If support WebGL
 * @return {boolean}
 */
vendor.supportWebGL = function () {
  if (supportWebGL == null) {
    try {
      /* global document */
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        throw new Error();
      }
    } catch (e) {
      supportWebGL = false;
    }
  }
  return supportWebGL;
};

let g: any;
if (typeof window !== 'undefined') {
  g = window;
} else if (typeof global !== 'undefined') {
  /* global global */
  g = global;
}

vendor.requestAnimationFrame =
  g.requestAnimationFrame ||
  function (func: () => void) {
    setTimeout(func, 16);
  };

vendor.createCanvas = function () {
  return document.createElement('canvas');
};

vendor.createImage = function () {
  return new g.Image();
};

vendor.request = {
  get
};

vendor.addEventListener = function (dom, type, func, useCapture) {
  dom.addEventListener(type, func, useCapture);
};

vendor.removeEventListener = function (dom, type, func) {
  dom.removeEventListener(type, func);
};

export default vendor;
