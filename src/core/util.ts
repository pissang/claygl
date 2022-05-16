import vendor from './vendor';

let guid = 0;

const ArrayProto = Array.prototype;
const nativeForEach = ArrayProto.forEach;

/**
 * Generate GUID
 * @return {number}
 * @memberOf clay.core.util
 */
export function genGUID(): number {
  return ++guid;
}
/**
 * Relative path to absolute path
 * @param  {string} path
 * @param  {string} basePath
 * @return {string}
 * @memberOf clay.core.util
 */
export function relative2absolute(path: string, basePath: string) {
  if (!basePath || path.match(/^\//)) {
    return path;
  }
  const pathParts = path.split('/');
  const basePathParts = basePath.split('/');

  let item = pathParts[0];
  while (item === '.' || item === '..') {
    if (item === '..') {
      basePathParts.pop();
    }
    pathParts.shift();
    item = pathParts[0];
  }
  return basePathParts.join('/') + '/' + pathParts.join('/');
}

/**
 * Extend properties to target if not exist.
 * @param  {Object} target
 * @param  {Object} source
 * @return {Object}
 * @memberOf clay.core.util
 */
export function defaults(target: any, source: any) {
  if (source) {
    for (const propName in source) {
      if (target[propName] === undefined) {
        target[propName] = source[propName];
      }
    }
  }
  return target;
}
/**
 * @param  {Object|Array} obj
 * @param  {Function} iterator
 * @param  {Object} [context]
 * @deprecated
 */
export function each(obj: any, iterator: Function, context: any) {
  if (!(obj && iterator)) {
    return;
  }
  if (obj.forEach && obj.forEach === nativeForEach) {
    obj.forEach(iterator, context);
  } else if (obj.length === +obj.length) {
    for (let i = 0, len = obj.length; i < len; i++) {
      iterator.call(context, obj[i], i, obj);
    }
  } else {
    for (const key in obj) {
      if (hasOwn(obj, key)) {
        iterator.call(context, obj[key], key, obj);
      }
    }
  }
}

/**
 * Is object
 * @param obj
 * @memberOf clay.core.util
 */
export function isObject(obj: any) {
  return obj === Object(obj);
}

/**
 * Is array like, which have a length property
 * @param obj
 * @memberOf clay.core.util
 */
export function isArrayLike(obj: any): obj is ArrayLike<any> {
  if (!obj) {
    return false;
  } else {
    return obj.length === +obj.length;
  }
}

export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

export function isString(value: any): value is string {
  // Faster than `objToString.call` several times in chromium and webkit.
  // And `new String()` is rarely used.
  return typeof value === 'string';
}

export function isNumber(value: any): value is number {
  // Faster than `objToString.call` several times in chromium and webkit.
  // And `new Number()` is rarely used.
  return typeof value === 'number';
}
/**
 * @param obj
 * @return {}
 * @memberOf clay.core.util
 */
export function clone<T>(obj: T): T {
  if (!isObject(obj)) {
    return obj;
  } else if (Array.isArray(obj)) {
    return obj.slice() as unknown as T;
  } else if (isArrayLike(obj)) {
    // is typed array
    const ret = new (obj as any).constructor(obj.length);
    for (let i = 0; i < obj.length; i++) {
      ret[i] = obj[i];
    }
    return ret;
  } else {
    return assign({}, obj);
  }
}

export function hasOwn(obj: any, key: string) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

export function optional<T>(val: T, defaultVal: Exclude<T, undefined | null>) {
  return val == null ? defaultVal : (val as Exclude<T, undefined | null>);
}

export function keys(obj?: any): string[] {
  return Object.keys(obj || {});
}

export const assign = Object.assign;

export function setCanvasSize(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  pixelRatio?: number
) {
  const style = canvas.style;
  // http://www.khronos.org/webgl/wiki/HandlingHighDPI
  // set the display size of the canvas.
  if (style) {
    style.width = width + 'px';
    style.height = height + 'px';
  }
  // set the size of the drawingBuffer
  canvas.width = width * (pixelRatio || 1);
  canvas.height = height * (pixelRatio || 1);
}
