define(function(require) {

    var util  = require('../core/util');
    var Task = require('./Task');

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

    TaskGroup.prototype.all = function(tasks) {
        var count = tasks.length;
        var self = this;
        var data = [];
        if (tasks.length == 0) {
            setTimeout(function() {
                self.resolve(data);
            });
            return;
        }
        this._tasks = tasks;
        this._fulfilledNumber = 0;
        this._rejectedNumber = 0;

        util.each(tasks, function(task, idx) {
            task.once('success', function(res) {
                count--;

                self._fulfilledNumber++;
                // TODO
                // Some tasks like texture, loader are not inherited from task
                // We need to set the deferred status here
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
        return this;
    };

    TaskGroup.prototype.allSettled = function(tasks) {
        var count = tasks.length;
        var success = false;
        var self = this;
        var data = [];
        if (tasks.length == 0) {
            setTimeout(function() {
                self.trigger('success', data);
            });
            return;
        }
        this._tasks = tasks;

        util.each(tasks, function(task, idx) {
            task.once('success', function(res) {
                count--;
                
                self._fulfilledNumber++;

                task._fulfilled = true;
                task._rejected = false;

                data[idx] = res;
                success = true;
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
                    if (success) {
                        self.resolve(data);
                    } else {
                        self.reject(data);
                    }
                }
            });
        });
        return this;
    }

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
    }

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
    }

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
    }

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
    }

    return TaskGroup;
});