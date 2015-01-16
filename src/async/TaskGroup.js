define(function(require) {

    'use strict';

    var util  = require('../core/util');
    var Task = require('./Task');

    /**
     * @constructor
     * @alias qtek.async.TaskGroup
     * @extends qtek.async.Task
     */
    var TaskGroup = function() {

        Task.apply(this, arguments);

        this._tasks = [];

        this._fulfilledNumber = 0;

        this._rejectedNumber = 0;
    };

    var Ctor = function(){};
    Ctor.prototype = Task.prototype;
    TaskGroup.prototype = new Ctor();

    TaskGroup.prototype.constructor = TaskGroup;

    /**
     * Wait for all given tasks successed, task can also be any notifier object which will trigger success and error events. Like {@link qtek.Texture2D}, {@link qtek.TextureCube}, {@link qtek.loader.GLTF}.
     * @param  {Array.<qtek.async.Task>} tasks
     * @chainable
     * @example
     *     // Load texture list
     *     var list = ['a.jpg', 'b.jpg', 'c.jpg']
     *     var textures = list.map(function(src) {
     *         var texture = new qtek.Texture2D();
     *         texture.load(src);
     *         return texture;
     *     });
     *     var taskGroup = new qtek.async.TaskGroup();
     *     taskGroup.all(textures).success(function() {
     *         // Do some thing after all textures loaded
     *     });
     */
    TaskGroup.prototype.all = function(tasks) {
        var count = 0;
        var self = this;
        var data = [];
        this._tasks = tasks;
        this._fulfilledNumber = 0;
        this._rejectedNumber = 0;

        util.each(tasks, function(task, idx) {
            if (!task || !task.once) {
                return;
            }
            count++;
            task.once('success', function(res) {
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
            task.once('error', function() {
                
                self._rejectedNumber ++;

                task._fulfilled = false;
                task._rejected = true;

                self.reject(task);
            });
        });
        if (count === 0) {
            setTimeout(function() {
                self.resolve(data);
            });
            return this;
        }
        return this;
    };
    /**
     * Wait for all given tasks finished, either successed or failed
     * @param  {Array.<qtek.async.Task>} tasks
     * @return {qtek.async.TaskGroup}
     */
    TaskGroup.prototype.allSettled = function(tasks) {
        var count = 0;
        var self = this;
        var data = [];
        if (tasks.length === 0) {
            setTimeout(function() {
                self.trigger('success', data);
            });
            return this;
        }
        this._tasks = tasks;

        util.each(tasks, function(task, idx) {
            if (!task || !task.once) {
                return;
            }
            count++;
            task.once('success', function(res) {
                count--;
                
                self._fulfilledNumber++;

                task._fulfilled = true;
                task._rejected = false;

                data[idx] = res;
                if (count === 0) {
                    self.resolve(data);
                }
            });
            task.once('error', function(err) {
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
    TaskGroup.prototype.getFulfilledNumber = function(recursive) {
        if (recursive) {
            var nFulfilled = 0;
            for (var i = 0; i < this._tasks.length; i++) {
                var task = this._tasks[i];
                if (task instanceof TaskGroup) {
                    nFulfilled += task.getFulfilledNumber(recursive);
                } else if(task._fulfilled) {
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
    TaskGroup.prototype.getRejectedNumber = function(recursive) {
        if (recursive) {
            var nRejected = 0;
            for (var i = 0; i < this._tasks.length; i++) {
                var task = this._tasks[i];
                if (task instanceof TaskGroup) {
                    nRejected += task.getRejectedNumber(recursive);
                } else if(task._rejected) {
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
    TaskGroup.prototype.getSettledNumber = function(recursive) {

        if (recursive) {
            var nSettled = 0;
            for (var i = 0; i < this._tasks.length; i++) {
                var task = this._tasks[i];
                if (task instanceof TaskGroup) {
                    nSettled += task.getSettledNumber(recursive);
                } else if(task._rejected || task._fulfilled) {
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
    TaskGroup.prototype.getTaskNumber = function(recursive) {
        if (recursive) {
            var nTask = 0;
            for (var i = 0; i < this._tasks.length; i++) {
                var task = this._tasks[i];
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

    return TaskGroup;
});