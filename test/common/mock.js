const { createHeadlessCanvas } = require('./util');
const { Image } = require('canvas');

/**
* reference:
* https://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
*/
const requestAnimationFrame = function (callback, element) {
    var currTime = Date.now();
    var timeToCall = Math.max(0, 16 - (currTime - lastTime));
    var id = window.setTimeout(function () { callback(currTime + timeToCall); },
        timeToCall);
    lastTime = currTime + timeToCall;
    return id;
};
/**
* 
* @param {*} id 
*/
const cancelAnimationFrame = function (id) {
    clearTimeout(id);
};

const cancelTimeout = cancelAnimationFrame;


function mock() {
    if (typeof global.window === 'undefined' || typeof global.document === 'undefined') {
        
        const window= {
            requestAnimationFrame: requestAnimationFrame,
            cancelAnimationFrame: cancelAnimationFrame,
            setTimeout: setTimeout,
            cancelTimeout: cancelTimeout
        };

        const document = {
            createElement(tagName) {
                if (tagName === 'canvas') {
                    return createHeadlessCanvas(1, 1);
                }
                return null;
            },
            addEventListener : function () {

            }
        };

        global.Image = Image;
        global.window = window;
        global.document = document;
        global.requestAnimationFrame = requestAnimationFrame;
        global.cancelAnimationFrame = cancelAnimationFrame;
    }
}

mock();
