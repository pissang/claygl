// @ts-nocheck
import util from '../core/util';

const GestureMgr = function () {
  this._track = [];
};

GestureMgr.prototype = {
  constructor: GestureMgr,

  recognize: function (event, target, root) {
    this._doTrack(event, target, root);
    return this._recognize(event);
  },

  clear: function () {
    this._track.length = 0;
    return this;
  },

  _doTrack: function (event, target, root) {
    const touches = event.targetTouches;

    if (!touches) {
      return;
    }

    const trackItem = {
      points: [],
      touches: [],
      target: target,
      event: event
    };

    for (let i = 0, len = touches.length; i < len; i++) {
      const touch = touches[i];
      trackItem.points.push([touch.clientX, touch.clientY]);
      trackItem.touches.push(touch);
    }

    this._track.push(trackItem);
  },

  _recognize: function (event) {
    for (const eventName in recognizers) {
      if (util.hasOwn(recognizers, eventName)) {
        const gestureInfo = recognizers[eventName](this._track, event);
        if (gestureInfo) {
          return gestureInfo;
        }
      }
    }
  }
};

function dist(pointPair) {
  const dx = pointPair[1][0] - pointPair[0][0];
  const dy = pointPair[1][1] - pointPair[0][1];

  return Math.sqrt(dx * dx + dy * dy);
}

function center(pointPair) {
  return [(pointPair[0][0] + pointPair[1][0]) / 2, (pointPair[0][1] + pointPair[1][1]) / 2];
}

const recognizers = {
  pinch: function (track, event) {
    const trackLen = track.length;

    if (!trackLen) {
      return;
    }

    const pinchEnd = (track[trackLen - 1] || {}).points;
    const pinchPre = (track[trackLen - 2] || {}).points || pinchEnd;

    if (pinchPre && pinchPre.length > 1 && pinchEnd && pinchEnd.length > 1) {
      let pinchScale = dist(pinchEnd) / dist(pinchPre);
      !isFinite(pinchScale) && (pinchScale = 1);

      event.pinchScale = pinchScale;

      const pinchCenter = center(pinchEnd);
      event.pinchX = pinchCenter[0];
      event.pinchY = pinchCenter[1];

      return {
        type: 'pinch',
        target: track[0].target,
        event: event
      };
    }
  }
};

export default GestureMgr;
