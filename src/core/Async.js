define(function(require) {

    var util  = require('./util');
    var notifier = require('./mixin/notifier');
    var request = require('./request');
    
    var Task = function() {}
    Task.prototype.resolve = function(data) {
        this.trigger('success', data);
    }
    Task.prototype.reject = function(err) {
        this.trigger('error', err);
    }
    util.extend(Task.prototype, notifier);


    var Async = function() {};
    Async.prototype = {

        constructor : Async,

        all : function(tasks) {
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
        },

        any : function(tasks) {
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
    }

    function makeRequestTask(url, responseType) {
        var task = new Task();
        request.get({
            url : url,
            responseType : responseType,
            onload : function(res) {
                task.resolve(res);
            },
            onerror : function() {
                self.reject(error);
            }
        });
        return task;
    };

    Async.makeRequestTasks = function(url, responseType) {
        var self = this;
        if (typeof url === 'string') {
            return makeRequestTask(url, responseType);
        } else if (url.url) {   //  Configure object
            var obj = url;
            return makeRequestTask(obj.url, obj.responseType);
        } else if (url instanceof Array) {  // Url list
            var count = 0;
            var urlList = url;
            var tasks = [];
            urlList.forEach(function(obj) {
                var url, responseType;
                if (typeof obj === 'string') {
                    url = obj;
                } else if (Object(obj) === obj) {
                    url = obj.url;
                    responseType = obj.responseType;
                }
                tasks.push(makeRequestTask(url, responseType));
            });
            return tasks;
        }
    }

    Async.makeTask = function(obj) {
        return new Task(obj);
    }

    util.extend(Async.prototype, notifier);

    return Async;
});