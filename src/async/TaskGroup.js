define(function(require) {

    var util  = require('../core/util');
    var Task = require('./Task');

    var TaskGroup = function() {};

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
                this.trigger('success', data);
            });
        }
        tasks.forEach(function(task, idx) {
            task.once('success', function(res) {
                count--;
                data[idx] = res;
                if (count === 0) {
                    self.trigger('success', data);
                }
            });
            task.once('error', function() {
                self.trigger('error', task);
            });
        });
        return this;
    };

    TaskGroup.prototype.any = function(tasks) {
        var count = tasks.length;
        var success = false;
        var self = this;
        var data = [];
        if (tasks.length == 0) {
            setTimeout(function() {
                this.trigger('success', data);
            });
        }
        tasks.forEach(function(task, idx) {
            task.once('success', function(res) {
                count--;
                data[idx] = res;
                success = true;
                if (count === 0) {
                    self.trigger('success', data);
                }
            });
            task.once('error', function(err) {
                count--;
                data[idx] = null;
                if (count === 0) {
                    if (success) {
                        self.trigger('success', data);
                    } else {
                        self.trigger('error');
                    }
                }
            })
        });
        return this;
    }

    return TaskGroup;
});