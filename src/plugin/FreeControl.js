import Base from '../core/Base';
import Vector3 from '../math/Vector3';
import vendor from '../core/vendor';

var doc = typeof document === 'undefined' ? {} : document;

/**
 * @constructor clay.plugin.FreeControl
 * @example
 *     var control = new clay.plugin.FreeControl({
 *         target: camera,
 *         domElement: renderer.canvas
 *     });
 *     ...
 *     timeline.on('frame', function(frameTime) {
 *         control.update(frameTime);
 *         renderer.render(scene, camera);
 *     });
 */
var FreeControl = Base.extend(function() {
    return /** @lends clay.plugin.FreeControl# */ {
        /**
         * Scene node to control, mostly it is a camera
         * @type {clay.Node}
         */
        target: null,

        /**
         * Target dom to bind with mouse events
         * @type {HTMLElement}
         */
        domElement: null,

        /**
         * Mouse move sensitivity
         * @type {number}
         */
        sensitivity: 1,

        /**
         * Target move speed
         * @type {number}
         */
        speed: 0.4,

        /**
         * Up axis
         * @type {clay.Vector3}
         */
        up: new Vector3(0, 1, 0),

        /**
         * If lock vertical movement
         * @type {boolean}
         */
        verticalMoveLock: false,

        /**
         * @type {clay.Timeline}
         */
        timeline: null,

        _moveForward: false,
        _moveBackward: false,
        _moveLeft: false,
        _moveRight: false,

        _offsetPitch: 0,
        _offsetRoll: 0
    };
}, function() {
    this._lockChange = this._lockChange.bind(this);
    this._keyDown = this._keyDown.bind(this);
    this._keyUp = this._keyUp.bind(this);
    this._mouseMove = this._mouseMove.bind(this);

    if (this.domElement) {
        this.init();
    }
},
/** @lends clay.plugin.FreeControl.prototype */
{
    /**
     * init control
     */
    init: function() {
        // Use pointer lock
        // http://www.html5rocks.com/en/tutorials/pointerlock/intro/
        var el = this.domElement;

        //Must request pointer lock after click event, can't not do it directly
        //Why ? ?
        vendor.addEventListener(el, 'click', this._requestPointerLock);

        vendor.addEventListener(doc, 'pointerlockchange', this._lockChange);
        vendor.addEventListener(doc, 'mozpointerlockchange', this._lockChange);
        vendor.addEventListener(doc, 'webkitpointerlockchange', this._lockChange);

        vendor.addEventListener(doc, 'keydown', this._keyDown);
        vendor.addEventListener(doc, 'keyup', this._keyUp);

        if (this.timeline) {
            this.timeline.on('frame', this._detectMovementChange, this);
        }
    },

    /**
     * Dispose control
     */
    dispose: function() {

        var el = this.domElement;

        el.exitPointerLock = el.exitPointerLock
            || el.mozExitPointerLock
            || el.webkitExitPointerLock;

        if (el.exitPointerLock) {
            el.exitPointerLock();
        }

        vendor.removeEventListener(el, 'click', this._requestPointerLock);

        vendor.removeEventListener(doc, 'pointerlockchange', this._lockChange);
        vendor.removeEventListener(doc, 'mozpointerlockchange', this._lockChange);
        vendor.removeEventListener(doc, 'webkitpointerlockchange', this._lockChange);

        vendor.removeEventListener(doc, 'keydown', this._keyDown);
        vendor.removeEventListener(doc, 'keyup', this._keyUp);

        if (this.timeline) {
            this.timeline.off('frame', this._detectMovementChange);
        }
    },

    _requestPointerLock: function() {
        var el = this;
        el.requestPointerLock = el.requestPointerLock
            || el.mozRequestPointerLock
            || el.webkitRequestPointerLock;

        el.requestPointerLock();
    },

    /**
     * Control update. Should be invoked every frame
     * @param {number} frameTime Frame time
     */
    update: function (frameTime) {
        var target = this.target;

        var position = this.target.position;
        var xAxis = target.localTransform.x.normalize();
        var zAxis = target.localTransform.z.normalize();

        if (this.verticalMoveLock) {
            zAxis.y = 0;
            zAxis.normalize();
        }

        var speed = this.speed * frameTime / 20;

        if (this._moveForward) {
            // Opposite direction of z
            position.scaleAndAdd(zAxis, -speed);
        }
        if (this._moveBackward) {
            position.scaleAndAdd(zAxis, speed);
        }
        if (this._moveLeft) {
            position.scaleAndAdd(xAxis, -speed / 2);
        }
        if (this._moveRight) {
            position.scaleAndAdd(xAxis, speed / 2);
        }

        target.rotateAround(target.position, this.up, -this._offsetPitch * frameTime * Math.PI / 360);
        var xAxis = target.localTransform.x;
        target.rotateAround(target.position, xAxis, -this._offsetRoll * frameTime * Math.PI / 360);

        this._offsetRoll = this._offsetPitch = 0;
    },

    _lockChange: function() {
        if (
            doc.pointerLockElement === this.domElement
            || doc.mozPointerLockElement === this.domElement
            || doc.webkitPointerLockElement === this.domElement
        ) {
            vendor.addEventListener(doc, 'mousemove', this._mouseMove, false);
        }
        else {
            vendor.removeEventListener(doc, 'mousemove', this._mouseMove);
        }
    },

    _mouseMove: function(e) {
        var dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        var dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

        this._offsetPitch += dx * this.sensitivity / 200;
        this._offsetRoll += dy * this.sensitivity / 200;

        // Trigger change event to remind renderer do render
        this.trigger('change');
    },

    _detectMovementChange: function (frameTime) {
        if (this._moveForward || this._moveBackward || this._moveLeft || this._moveRight) {
            this.trigger('change');
        }
        this.update(frameTime);
    },

    _keyDown: function(e) {
        switch(e.keyCode) {
            case 87: //w
            case 37: //up arrow
                this._moveForward = true;
                break;
            case 83: //s
            case 40: //down arrow
                this._moveBackward = true;
                break;
            case 65: //a
            case 37: //left arrow
                this._moveLeft = true;
                break;
            case 68: //d
            case 39: //right arrow
                this._moveRight = true;
                break;
        }
        // Trigger change event to remind renderer do render
        this.trigger('change');
    },

    _keyUp: function(e) {
        switch(e.keyCode) {
            case 87: //w
            case 37: //up arrow
                this._moveForward = false;
                break;
            case 83: //s
            case 40: //down arrow
                this._moveBackward = false;
                break;
            case 65: //a
            case 37: //left arrow
                this._moveLeft = false;
                break;
            case 68: //d
            case 39: //right arrow
                this._moveRight = false;
                break;
        }
    }
});

export default FreeControl;
