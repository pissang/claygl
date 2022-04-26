import * as util from './util';

class Handler {
  action: Function;
  context: any;
  constructor(action: Function, context: any) {
    this.action = action;
    this.context = context;
  }
}
/**
 * @mixin
 * @alias clay.core.mixin.notifier
 */
class Notifier {
  private _handlers?: Record<string, Handler[]>;
  /**
   * Trigger event
   * @param  {string} name
   */
  trigger(name: string, ..._args: any[]) {
    if (!util.hasOwn(this._handlers, name)) {
      return;
    }

    const hdls = this._handlers![name];
    const l = hdls.length;
    const args = arguments;
    let i = -1;
    // Optimize advise from backbone
    switch (args.length) {
      case 1:
        while (++i < l) {
          hdls[i].action.call(hdls[i].context);
        }
        return;
      case 2:
        while (++i < l) {
          hdls[i].action.call(hdls[i].context, args[1]);
        }
        return;
      case 3:
        while (++i < l) {
          hdls[i].action.call(hdls[i].context, args[1], args[2]);
        }
        return;
      case 4:
        while (++i < l) {
          hdls[i].action.call(hdls[i].context, args[1], args[2], args[3]);
        }
        return;
      case 5:
        while (++i < l) {
          hdls[i].action.call(hdls[i].context, args[1], args[2], args[3], args[4]);
        }
        return;
      default:
        while (++i < l) {
          hdls[i].action.apply(hdls[i].context, Array.prototype.slice.call(args, 1));
        }
        return;
    }
  }
  /**
   * Register event handler
   * @param  {string} name
   * @param  {Function} action
   * @param  {Object} [context]
   * @chainable
   */
  on(name: string, action: Function, context: any) {
    if (!name || !action) {
      return;
    }
    const handlers = this._handlers || (this._handlers = {});
    if (!handlers[name]) {
      handlers[name] = [];
    } else {
      if (this.has(name, action)) {
        return;
      }
    }
    const handler = new Handler(action, context || this);
    handlers[name].push(handler);

    return this;
  }

  /**
   * Register event, event will only be triggered once and then removed
   * @param  {string} name
   * @param  {Function} action
   * @param  {Object} [context]
   * @chainable
   */
  once(name: string, action: Function, context: any) {
    if (!name || !action) {
      return;
    }
    const self = this;
    function wrapper() {
      self.off(name, wrapper);
      action.apply(self, arguments);
    }
    return this.on(name, wrapper, context);
  }

  /**
   * Alias of once('before' + name)
   * @param  {string} name
   * @param  {Function} action
   * @param  {Object} [context]
   * @chainable
   */
  before(name: string, action: Function, context: any) {
    if (!name || !action) {
      return;
    }
    name = 'before' + name;
    return this.on(name, action, context);
  }

  /**
   * Alias of once('after' + name)
   * @param  {string} name
   * @param  {Function} action
   * @param  {Object} [context]
   * @chainable
   */
  after(name: string, action: Function, context: any) {
    if (!name || !action) {
      return;
    }
    name = 'after' + name;
    return this.on(name, action, context);
  }

  /**
   * Alias of on('success')
   * @param  {Function} action
   * @param  {Object} [context]
   * @chainable
   */
  success(action: Function, context: any) {
    return this.once('success', action, context);
  }

  /**
   * Alias of on('error')
   * @param  {Function} action
   * @param  {Object} [context]
   * @chainable
   */
  error(action: Function, context: any) {
    return this.once('error', action, context);
  }

  /**
   * Remove event listener
   * @param  {Function} action
   * @param  {Object} [context]
   * @chainable
   */
  off(name: string, action: Function) {
    const handlers = this._handlers || (this._handlers = {});

    if (!action) {
      handlers[name] = [];
      return;
    }
    if (handlers[name]) {
      const hdls = handlers[name];
      const retains = [];
      for (let i = 0; i < hdls.length; i++) {
        if (action && hdls[i].action !== action) {
          retains.push(hdls[i]);
        }
      }
      handlers[name] = retains;
    }

    return this;
  }

  /**
   * If registered the event handler
   * @param  {string}  name
   * @param  {Function}  action
   * @return {boolean}
   */
  has(name: string, action: Function) {
    const handlers = this._handlers;

    if (!handlers || !handlers[name]) {
      return false;
    }
    const hdls = handlers[name];
    for (let i = 0; i < hdls.length; i++) {
      if (hdls[i].action === action) {
        return true;
      }
    }
  }
}

export default Notifier;
