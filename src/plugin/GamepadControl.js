import Base from '../core/Base';
import Vector3 from '../math/Vector3';
import vendor from '../core/vendor';

/**
 * Gamepad Control plugin.
 *
 * @constructor clay.plugin.GamepadControl
 *
 * @example
 *   init: function(app) {
 *     this._gamepadControl = new clay.plugin.GamepadControl({
 *         target: camera,
 *         onStandardGamepadReady: customCallback
 *     });
 *   },
 *
 *   loop: function(app) {
 *     this._gamepadControl.update(app.frameTime);
 *   }
 */
var GamepadControl = Base.extend(function() {

    return /** @lends clay.plugin.GamepadControl# */ {

        /**
         * Scene node to control, mostly it is a camera.
         *
         * @type {clay.Node}
         */
        target: null,

        /**
         * Move speed.
         *
         * @type {number}
         */
        moveSpeed: 0.1,

        /**
         * Look around speed.
         *
         * @type {number}
         */
        lookAroundSpeed: 0.1,

        /**
         * Up axis.
         *
         * @type {clay.Vector3}
         */
        up: new Vector3(0, 1, 0),

        /**
         * Timeline.
         *
         * @type {clay.Timeline}
         */
        timeline: null,

        /**
         * Function to be called when a standard gamepad is ready to use.
         *
         * @type {function}
         */
        onStandardGamepadReady: function(gamepad){},

        /**
         * Function to be called when a gamepad is disconnected.
         *
         * @type {function}
         */
        onGamepadDisconnected: function(gamepad){},

        // Private properties:

        _moveForward: false,
        _moveBackward: false,
        _moveLeft: false,
        _moveRight: false,

        _offsetPitch: 0,
        _offsetRoll: 0,

        _connectedGamepadIndex: 0,
        _standardGamepadAvailable: false,
        _gamepadAxisThreshold: 0.3

    };

}, function() {

    this._checkGamepadCompatibility = this._checkGamepadCompatibility.bind(this);
    this._disconnectGamepad = this._disconnectGamepad.bind(this);
    this._getStandardGamepad = this._getStandardGamepad.bind(this);
    this._scanPressedGamepadButtons = this._scanPressedGamepadButtons.bind(this);
    this._scanInclinedGamepadAxes = this._scanInclinedGamepadAxes.bind(this);

    this.update = this.update.bind(this);

    // If browser supports Gamepad API:
    if (typeof navigator.getGamepads === 'function') {
        this.init();
    }

},
/** @lends clay.plugin.GamepadControl.prototype */
{
    /**
     * Init. control.
     */
    init: function() {

        /**
         * When user begins to interact with connected gamepad:
         *
         * @see https://w3c.github.io/gamepad/#dom-gamepadevent
         */
        vendor.addEventListener(window, 'gamepadconnected', this._checkGamepadCompatibility);

        if (this.timeline) {
            this.timeline.on('frame', this.update);
        }

        vendor.addEventListener(window, 'gamepaddisconnected', this._disconnectGamepad);

    },

    /**
     * Dispose control.
     */
    dispose: function() {

        vendor.removeEventListener(window, 'gamepadconnected', this._checkGamepadCompatibility);

        if (this.timeline) {
            this.timeline.off('frame', this.update);
        }

        vendor.removeEventListener(window, 'gamepaddisconnected', this._disconnectGamepad);

    },

    /**
     * Control's update. Should be invoked every frame.
     *
     * @param {number} frameTime Frame time.
     */
    update: function (frameTime) {

        if (!this._standardGamepadAvailable) {
            return;
        }

        this._scanPressedGamepadButtons();
        this._scanInclinedGamepadAxes();

        // Update target depending on user input.

        var target = this.target;

        var position = this.target.position;
        var xAxis = target.localTransform.x.normalize();
        var zAxis = target.localTransform.z.normalize();

        var moveSpeed = this.moveSpeed * frameTime / 20;

        if (this._moveForward) {
            // Opposite direction of z.
            position.scaleAndAdd(zAxis, -moveSpeed);
        }
        if (this._moveBackward) {
            position.scaleAndAdd(zAxis, moveSpeed);
        }
        if (this._moveLeft) {
            position.scaleAndAdd(xAxis, -moveSpeed);
        }
        if (this._moveRight) {
            position.scaleAndAdd(xAxis, moveSpeed);
        }

        target.rotateAround(target.position, this.up, -this._offsetPitch * frameTime * Math.PI / 360);
        var xAxis = target.localTransform.x;
        target.rotateAround(target.position, xAxis, -this._offsetRoll * frameTime * Math.PI / 360);

        /*
         * If necessary: trigger `update` event.
         * XXX This can economize rendering OPs.
         */
        if (this._moveForward === true || this._moveBackward === true || this._moveLeft === true
            || this._moveRight === true || this._offsetPitch !== 0 || this._offsetRoll !== 0)
        {
            this.trigger('update');
        }

        // Reset values to avoid lost of control.

        this._moveForward = this._moveBackward = this._moveLeft = this._moveRight = false;
        this._offsetPitch = this._offsetRoll = 0;

    },

    // Private methods:

    _checkGamepadCompatibility: function(event) {

        /**
         * If connected gamepad has a **standard** layout:
         *
         * @see https://w3c.github.io/gamepad/#remapping about standard.
         */
        if (event.gamepad.mapping === 'standard') {

            this._standardGamepadIndex = event.gamepad.index;
            this._standardGamepadAvailable = true;

            this.onStandardGamepadReady(event.gamepad);

        }

    },

    _disconnectGamepad: function(event) {

        this._standardGamepadAvailable = false;

        this.onGamepadDisconnected(event.gamepad);

    },

    _getStandardGamepad: function() {

        return navigator.getGamepads()[this._standardGamepadIndex];

    },

    _scanPressedGamepadButtons: function() {

        var gamepadButtons = this._getStandardGamepad().buttons;

        // For each gamepad button:
        for (var gamepadButtonId = 0; gamepadButtonId < gamepadButtons.length; gamepadButtonId++) {

            // Get user input.
            var gamepadButton = gamepadButtons[gamepadButtonId];

            if (gamepadButton.pressed) {

                switch (gamepadButtonId) {

                    // D-pad Up
                    case 12:
                        this._moveForward = true;
                        break;

                    // D-pad Down
                    case 13:
                        this._moveBackward = true;
                        break;

                    // D-pad Left
                    case 14:
                        this._moveLeft = true;
                        break;

                    // D-pad Right
                    case 15:
                        this._moveRight = true;
                        break;

                }

            }

        }

    },

    _scanInclinedGamepadAxes: function() {

        var gamepadAxes = this._getStandardGamepad().axes;

        // For each gamepad axis:
        for (var gamepadAxisId = 0; gamepadAxisId < gamepadAxes.length; gamepadAxisId++) {

            // Get user input.
            var gamepadAxis = gamepadAxes[gamepadAxisId];

            // XXX We use a threshold because axes are never neutral.
            if (Math.abs(gamepadAxis) > this._gamepadAxisThreshold) {

                switch (gamepadAxisId) {

                    // Left stick X±
                    case 0:
                        this._moveLeft = gamepadAxis < 0;
                        this._moveRight = gamepadAxis > 0;
                        break;

                    // Left stick Y±
                    case 1:
                        this._moveForward = gamepadAxis < 0;
                        this._moveBackward = gamepadAxis > 0;
                        break;

                    // Right stick X±
                    case 2:
                        this._offsetPitch += gamepadAxis * this.lookAroundSpeed;
                        break;

                    // Right stick Y±
                    case 3:
                        this._offsetRoll += gamepadAxis * this.lookAroundSpeed;
                        break;

                }

            }

        }

    }

});

export default GamepadControl;
