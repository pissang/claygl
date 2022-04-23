import * as util from './util';

const DIRTY_PREFIX = '__dt__';

class Cache<D extends Record<string, any> = Record<string, any>> {
  private _contextId = 0;
  private _caches: D[] = [];
  private _context = {} as D;

  constructor() {}

  use(contextId: number, documentSchema?: () => D) {
    const caches = this._caches;
    if (!caches[contextId]) {
      caches[contextId] = {} as D;

      if (documentSchema) {
        caches[contextId] = documentSchema();
      }
    }
    this._contextId = contextId;
    this._context = caches[contextId];
  }

  put<T extends keyof D>(key: T, value: D[T]) {
    this._context[key] = value;
  }

  get<T extends keyof D>(key: T): D[T] {
    return this._context[key];
  }

  dirty(field: string) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    this.put(key, true as any);
  }

  dirtyAll(field: string) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    const caches = this._caches;
    for (let i = 0; i < caches.length; i++) {
      if (caches[i]) {
        (caches[i] as any)[key] = true;
      }
    }
  }

  fresh(field: string) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    this.put(key, false as any);
  }

  freshAll(field: string) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    const caches = this._caches;
    for (let i = 0; i < caches.length; i++) {
      if (caches[i]) {
        (caches[i] as any)[key] = false;
      }
    }
  }

  isDirty(field: string) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    const context = this._context;
    return !util.hasOwn(context, key) || context[key] === true;
  }

  deleteContext(contextId: number) {
    delete this._caches[contextId];
    this._context = {} as D;
  }

  delete(key: string) {
    delete this._context[key];
  }

  clearAll() {
    this._caches = [];
  }

  getContext() {
    return this._context;
  }

  eachContext(cb: (key: string) => void) {
    const keys = Object.keys(this._caches);
    keys.forEach(function (key) {
      cb(key);
    });
  }

  miss(key: string) {
    return !util.hasOwn(this._context, key);
  }
}

export default Cache;
