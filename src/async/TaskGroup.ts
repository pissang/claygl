// @ts-nocheck
import * as util from '../core/util';
import Task from './Task';

/**
 * @constructor
 * @alias clay.async.TaskGroup
 * @extends clay.async.Task
 */
const TaskGroup = function () {
  Task.apply(this, arguments);

  this._tasks = [];

  this._fulfilledNumber = 0;

  this._rejectedNumber = 0;
};

const Ctor = function () {};
Ctor.prototype = Task.prototype;
TaskGroup.prototype = new Ctor();

TaskGroup.prototype.constructor = TaskGroup;

/**
 * Wait for all given tasks successed, task can also be any notifier object which will trigger success and error events. Like {@link clay.Texture2D}, {@link clay.TextureCube}, {@link clay.loader.GLTF}.
 * @param  {Array.<clay.async.Task>} tasks
 * @chainable
 * @example
 *     // Load texture list
 *     const list = ['a.jpg', 'b.jpg', 'c.jpg']
 *     const textures = list.map(function (src) {
 *         const texture = new clay.Texture2D();
 *         texture.load(src);
 *         return texture;
 *     });
 *     const taskGroup = new clay.async.TaskGroup();
 *     taskGroup.all(textures).success(function () {
 *         // Do some thing after all textures loaded
 *     });
 */
TaskGroup.prototype.all = function (tasks) {
  let count = 0;
  const self = this;
  const data = [];
  this._tasks = tasks;
  this._fulfilledNumber = 0;
  this._rejectedNumber = 0;

  util.each(tasks, function (task, idx) {
    if (!task || !task.once) {
      return;
    }
    count++;
    task.once('success', function (res) {
      count--;

      self._fulfilledNumber++;
      // TODO
      // Some tasks like texture, loader are not inherited from task
      // We need to set the states here
      task._fulfilled = true;
      task._rejected = false;

      data[idx] = res;
      if (count === 0) {
        self.resolve(data);
      }
    });
    task.once('error', function () {
      self._rejectedNumber++;

      task._fulfilled = false;
      task._rejected = true;

      self.reject(task);
    });
  });
  if (count === 0) {
    setTimeout(function () {
      self.resolve(data);
    });
    return this;
  }
  return this;
};
/**
 * Wait for all given tasks finished, either successed or failed
 * @param  {Array.<clay.async.Task>} tasks
 * @return {clay.async.TaskGroup}
 */
TaskGroup.prototype.allSettled = function (tasks) {
  let count = 0;
  const self = this;
  const data = [];
  if (tasks.length === 0) {
    setTimeout(function () {
      self.trigger('success', data);
    });
    return this;
  }
  this._tasks = tasks;

  util.each(tasks, function (task, idx) {
    if (!task || !task.once) {
      return;
    }
    count++;
    task.once('success', function (res) {
      count--;

      self._fulfilledNumber++;

      task._fulfilled = true;
      task._rejected = false;

      data[idx] = res;
      if (count === 0) {
        self.resolve(data);
      }
    });
    task.once('error', function () {
      count--;

      self._rejectedNumber++;

      task._fulfilled = false;
      task._rejected = true;

      // TODO
      data[idx] = null;
      if (count === 0) {
        self.resolve(data);
      }
    });
  });
  return this;
};
/**
 * Get successed sub tasks number, recursive can be true if sub task is also a TaskGroup.
 * @param  {boolean} [recursive]
 * @return {number}
 */
TaskGroup.prototype.getFulfilledNumber = function (recursive) {
  if (recursive) {
    let nFulfilled = 0;
    for (let i = 0; i < this._tasks.length; i++) {
      const task = this._tasks[i];
      if (task instanceof TaskGroup) {
        nFulfilled += task.getFulfilledNumber(recursive);
      } else if (task._fulfilled) {
        nFulfilled += 1;
      }
    }
    return nFulfilled;
  } else {
    return this._fulfilledNumber;
  }
};

/**
 * Get failed sub tasks number, recursive can be true if sub task is also a TaskGroup.
 * @param  {boolean} [recursive]
 * @return {number}
 */
TaskGroup.prototype.getRejectedNumber = function (recursive) {
  if (recursive) {
    let nRejected = 0;
    for (let i = 0; i < this._tasks.length; i++) {
      const task = this._tasks[i];
      if (task instanceof TaskGroup) {
        nRejected += task.getRejectedNumber(recursive);
      } else if (task._rejected) {
        nRejected += 1;
      }
    }
    return nRejected;
  } else {
    return this._rejectedNumber;
  }
};

/**
 * Get finished sub tasks number, recursive can be true if sub task is also a TaskGroup.
 * @param  {boolean} [recursive]
 * @return {number}
 */
TaskGroup.prototype.getSettledNumber = function (recursive) {
  if (recursive) {
    let nSettled = 0;
    for (let i = 0; i < this._tasks.length; i++) {
      const task = this._tasks[i];
      if (task instanceof TaskGroup) {
        nSettled += task.getSettledNumber(recursive);
      } else if (task._rejected || task._fulfilled) {
        nSettled += 1;
      }
    }
    return nSettled;
  } else {
    return this._fulfilledNumber + this._rejectedNumber;
  }
};

/**
 * Get all sub tasks number, recursive can be true if sub task is also a TaskGroup.
 * @param  {boolean} [recursive]
 * @return {number}
 */
TaskGroup.prototype.getTaskNumber = function (recursive) {
  if (recursive) {
    let nTask = 0;
    for (let i = 0; i < this._tasks.length; i++) {
      const task = this._tasks[i];
      if (task instanceof TaskGroup) {
        nTask += task.getTaskNumber(recursive);
      } else {
        nTask += 1;
      }
    }
    return nTask;
  } else {
    return this._tasks.length;
  }
};

export default TaskGroup;
