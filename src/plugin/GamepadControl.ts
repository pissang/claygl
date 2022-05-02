import Vector3 from '../math/Vector3';
import vendor from '../core/vendor';
import Notifier from '../core/Notifier';
import type ClayNode from '../Node';
import type Timeline from '../Timeline';

const addEvent = vendor.addEventListener;
const removeEvent = vendor.removeEventListener;

interface GamepadControlOpts {
  /*
   * Scene node to control, mostly it is a camera.
   *
   */
  target?: ClayNode;

  /**
   * Move speed.
   */
  moveSpeed: number;

  /**
   * Look around speed.
   */
  lookAroundSpeed: number;

  /**
   * Up axis.
   */
  up: Vector3;

  /**
   * Timeline.
   */
  timeline?: Timeline;

  /**
   * Function to be called when a standard gamepad is ready to use.
   */
  onStandardGamepadReady?: (gamepad) => void;

  /**
   * Function to be called when a gamepad is disconnected.
   */
  onGamepadDisconnected?: (gamepad) => void;
}

interface GamepadControl extends GamepadControlOpts {}
/**
 * Gamepad Control plugin.
 *
 * @example
 *   init(app) {
 *     this._gamepadControl = new clay.plugin.GamepadControl({
 *         target: camera,
 *         onStandardGamepadReady: customCallback
 *     });
 *   },
 *
 *   loop(app) {
 *     this._gamepadControl.update(app.frameTime);
 *   }
 */

class GamepadControl extends Notifier {
  private _moveForward = false;
  private _moveBackward = false;
  private _moveLeft = false;
  private _moveRight = false;

  private _offsetPitch = 0;
  private _offsetRoll = 0;

  private _standardGamepadIndex = 0;
  private _standardGamepadAvailable = false;
  private _gamepadAxisThreshold = 0.3;

  constructor(opts?: Partial<GamepadControlOpts>) {
    super();
    Object.assign(
      this,
      {
        moveSpeed: 0.1,
        lookAroundSpeed: 0.1,
        up: Vector3.UP
      },
      opts
    );

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
  }

  /**
   * Init. control.
   */
  init() {
    /**
     * When user begins to interact with connected gamepad:
     *
     * @see https://w3c.github.io/gamepad/#dom-gamepadevent
     */
    addEvent(window, 'gamepadconnected', this._checkGamepadCompatibility);

    if (this.timeline) {
      this.timeline.on('frame', this.update);
    }

    addEvent(window, 'gamepaddisconnected', this._disconnectGamepad);
  }

  /**
   * Dispose control.
   */
  dispose() {
    removeEvent(window, 'gamepadconnected', this._checkGamepadCompatibility);

    if (this.timeline) {
      this.timeline.off('frame', this.update);
    }

    removeEvent(window, 'gamepaddisconnected', this._disconnectGamepad);
  }

  /**
   * Control's update. Should be invoked every frame.
   *
   * @param {number} frameTime Frame time.
   */
  update(frameTime: number) {
    if (!this._standardGamepadAvailable) {
      return;
    }

    this._scanPressedGamepadButtons();
    this._scanInclinedGamepadAxes();

    // Update target depending on user input.

    const target = this.target;
    if (!target) {
      return;
    }

    const position = target.position;
    let xAxis = target.localTransform.x.normalize();
    const zAxis = target.localTransform.z.normalize();

    const moveSpeed = (this.moveSpeed * frameTime) / 20;

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

    target.rotateAround(target.position, this.up, (-this._offsetPitch * frameTime * Math.PI) / 360);
    xAxis = target.localTransform.x;
    target.rotateAround(target.position, xAxis, (-this._offsetRoll * frameTime * Math.PI) / 360);

    /*
     * If necessary: trigger `update` event.
     * XXX This can economize rendering OPs.
     */
    if (
      this._moveForward === true ||
      this._moveBackward === true ||
      this._moveLeft === true ||
      this._moveRight === true ||
      this._offsetPitch !== 0 ||
      this._offsetRoll !== 0
    ) {
      this.trigger('update');
    }

    // Reset values to avoid lost of control.

    this._moveForward = this._moveBackward = this._moveLeft = this._moveRight = false;
    this._offsetPitch = this._offsetRoll = 0;
  }

  // Private methods:

  _checkGamepadCompatibility(event: GamepadEvent) {
    /**
     * If connected gamepad has a **standard** layout:
     *
     * @see https://w3c.github.io/gamepad/#remapping about standard.
     */
    if (event.gamepad.mapping === 'standard') {
      this._standardGamepadIndex = event.gamepad.index;
      this._standardGamepadAvailable = true;

      this.onStandardGamepadReady && this.onStandardGamepadReady(event.gamepad);
    }
  }

  _disconnectGamepad(event: GamepadEvent) {
    this._standardGamepadAvailable = false;

    this.onGamepadDisconnected && this.onGamepadDisconnected(event.gamepad);
  }

  _getStandardGamepad() {
    return navigator.getGamepads()[this._standardGamepadIndex];
  }

  _scanPressedGamepadButtons() {
    const gamepad = this._getStandardGamepad();
    const gamepadButtons = gamepad && gamepad.buttons;
    if (!gamepadButtons) {
      return;
    }

    // For each gamepad button:
    for (let gamepadButtonId = 0; gamepadButtonId < gamepadButtons.length; gamepadButtonId++) {
      // Get user input.
      const gamepadButton = gamepadButtons[gamepadButtonId];

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
  }

  _scanInclinedGamepadAxes() {
    const gamepad = this._getStandardGamepad();
    const gamepadAxes = gamepad && gamepad.axes;
    if (!gamepadAxes) {
      return;
    }

    // For each gamepad axis:
    for (let gamepadAxisId = 0; gamepadAxisId < gamepadAxes.length; gamepadAxisId++) {
      // Get user input.
      const gamepadAxis = gamepadAxes[gamepadAxisId];

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
}
export default GamepadControl;
