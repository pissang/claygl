define(function() {

    var requrestAnimationFrame = window.requrestAnimationFrame
                                || window.msRequestAnimationFrame
                                || window.mozRequestAnimationFrame
                                || window.webkitRequestAnimationFrame
                                || function(func){setTimeout(func, 16)};

    var Engine = function() {

    }

    Engine.prototype.run = function(renderFunc) {

        requrestAnimationFrame(function() {

        });
    }

    return Engine;
});