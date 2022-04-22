// @ts-nocheck
import util from './util';

const DIRTY_PREFIX = '__dt__';

const Cache = function () {
  this._contextId = 0;

  this._caches = [];

  this._context = {};
};

Cache.prototype = {
  use: function (contextId, documentSchema) {
    const caches = this._caches;
    if (!caches[contextId]) {
      caches[contextId] = {};

      if (documentSchema) {
        caches[contextId] = documentSchema();
      }
    }
    this._contextId = contextId;

    this._context = caches[contextId];
  },

  put: function (key, value) {
    this._context[key] = value;
  },

  get: function (key) {
    return this._context[key];
  },

  dirty: function (field) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    this.put(key, true);
  },

  dirtyAll: function (field) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    const caches = this._caches;
    for (let i = 0; i < caches.length; i++) {
      if (caches[i]) {
        caches[i][key] = true;
      }
    }
  },

  fresh: function (field) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    this.put(key, false);
  },

  freshAll: function (field) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    const caches = this._caches;
    for (let i = 0; i < caches.length; i++) {
      if (caches[i]) {
        caches[i][key] = false;
      }
    }
  },

  isDirty: function (field) {
    field = field || '';
    const key = DIRTY_PREFIX + field;
    const context = this._context;
    return !util.hasOwn(context, key) || context[key] === true;
  },

  deleteContext: function (contextId) {
    delete this._caches[contextId];
    this._context = {};
  },

  delete: function (key) {
    delete this._context[key];
  },

  clearAll: function () {
    this._caches = {};
  },

  getContext: function () {
    return this._context;
  },

  eachContext: function (cb, context) {
    const keys = Object.keys(this._caches);
    keys.forEach(function (key) {
      cb && cb.call(context, key);
    });
  },

  miss: function (key) {
    return !util.hasOwn(this._context, key);
  }
};

Cache.prototype.constructor = Cache;

export default Cache;
