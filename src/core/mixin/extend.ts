// @ts-nocheck

import util from '../util';

/**
 * Extend a sub class from base class
 * @param {object|Function} makeDefaultOpt default option of this sub class, method of the sub can use this.xxx to access this option
 * @param {Function} [initialize] Initialize after the sub class is instantiated
 * @param {Object} [proto] Prototype methods/properties of the sub class
 * @memberOf clay.core.mixin.extend
 * @return {Function}
 */
function derive(makeDefaultOpt, initialize /*optional*/, proto /*optional*/) {
  if (typeof initialize == 'object') {
    proto = initialize;
    initialize = null;
  }

  const _super = this;

  let propList;
  if (!(makeDefaultOpt instanceof Function)) {
    // Optimize the property iterate if it have been fixed
    propList = [];
    for (const propName in makeDefaultOpt) {
      if (util.hasOwn(makeDefaultOpt, propName)) {
        propList.push(propName);
      }
    }
  }

  const sub = function (options) {
    // call super constructor
    _super.apply(this, arguments);

    if (makeDefaultOpt instanceof Function) {
      // Invoke makeDefaultOpt each time if it is a function, So we can make sure each
      // property in the object will not be shared by mutiple instances
      extend(this, makeDefaultOpt.call(this, options));
    } else {
      extendWithPropList(this, makeDefaultOpt, propList);
    }

    if (this.constructor === sub) {
      // Initialize function will be called in the order of inherit
      const initializers = sub.__initializers__;
      for (let i = 0; i < initializers.length; i++) {
        initializers[i].apply(this, arguments);
      }
    }
  };
  // save super constructor
  sub.__super__ = _super;
  // Initialize function will be called after all the super constructor is called
  if (!_super.__initializers__) {
    sub.__initializers__ = [];
  } else {
    sub.__initializers__ = _super.__initializers__.slice();
  }
  if (initialize) {
    sub.__initializers__.push(initialize);
  }

  const Ctor = function () {};
  Ctor.prototype = _super.prototype;
  sub.prototype = new Ctor();
  sub.prototype.constructor = sub;
  extend(sub.prototype, proto);

  // extend the derive method as a static method;
  sub.extend = _super.extend;

  // DEPCRATED
  sub.derive = _super.extend;

  return sub;
}

function extend(target, source) {
  if (!source) {
    return;
  }
  for (const name in source) {
    if (util.hasOwn(source, name)) {
      target[name] = source[name];
    }
  }
}

function extendWithPropList(target, source, propList) {
  for (let i = 0; i < propList.length; i++) {
    const propName = propList[i];
    target[propName] = source[propName];
  }
}

/**
 * @alias clay.core.mixin.extend
 * @mixin
 */
export default {
  extend: derive,

  // DEPCRATED
  derive: derive
};
