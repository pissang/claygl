import { get } from './request';

let supportWebGL: boolean;

interface Vendor {
  supportWebGL: () => boolean;
  requestAnimationFrame: (cb: () => void) => void;
  createCanvas: () => HTMLCanvasElement;
  createBlankCanvas: (color: string) => HTMLCanvasElement;
  createImage: () => HTMLImageElement;
  loadImage: (
    src: string,
    crossOrigin?: string,
    onload?: () => void,
    onerror?: (e: any) => void
  ) => HTMLImageElement;
  request: {
    get: typeof get;
  };
  addEventListener: (
    dom: any,
    type: keyof DocumentEventMap | keyof WindowEventHandlersEventMap,
    func: Function,
    useCapture?: boolean
  ) => void;
  removeEventListener: (
    dom: any,
    type: keyof DocumentEventMap | keyof WindowEventHandlersEventMap,
    func: Function
  ) => void;
}
const vendor = {} as Vendor;

/**
 * If support WebGL
 * @return {boolean}
 */
vendor.supportWebGL = function () {
  if (supportWebGL == null) {
    try {
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
  // @ts-ignore
} else if (typeof global !== 'undefined') {
  /* global global */
  // @ts-ignore
  g = global;
} else if (typeof globalThis !== 'undefined') {
  g = globalThis;
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

vendor.loadImage = function (src, crossOrigin, onload, onerror) {
  const image = vendor.createImage();
  if (crossOrigin) {
    image.crossOrigin = crossOrigin;
  }
  image.onload = function () {
    onload && onload();
  };
  image.onerror = function (e) {
    onerror && onerror(e);
  };
  image.src = src;
  return image;
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

vendor.createBlankCanvas = function (color: string) {
  const canvas = vendor.createCanvas();
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  return canvas;
};

export default vendor;
