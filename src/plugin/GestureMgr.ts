import * as util from '../core/util';

type Target = any;
interface TrackItem {
  points: number[][];
  touches: Touch[];
  target: Target;
  event: TouchEvent;
}

export interface PinchEvent extends TouchEvent {
  pinchScale: number;
  pinchX: number;
  pinchY: number;
}

export class GestureMgr {
  private _track: TrackItem[] = [];

  constructor() {}

  recognize(event: TouchEvent, target: Target, root: HTMLElement) {
    this._doTrack(event, target, root);
    return this._recognize(event);
  }

  clear() {
    this._track.length = 0;
    return this;
  }

  _doTrack(event: TouchEvent, target: Target, root: HTMLElement) {
    const touches = event.touches;

    if (!touches) {
      return;
    }

    const trackItem: TrackItem = {
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
  }

  _recognize(event: TouchEvent) {
    for (const eventName in recognizers) {
      if (util.hasOwn(recognizers, eventName)) {
        const gestureInfo = recognizers[eventName](this._track, event);
        if (gestureInfo) {
          return gestureInfo;
        }
      }
    }
  }
}

function dist(pointPair: number[][]): number {
  const dx = pointPair[1][0] - pointPair[0][0];
  const dy = pointPair[1][1] - pointPair[0][1];

  return Math.sqrt(dx * dx + dy * dy);
}

function center(pointPair: number[][]): number[] {
  return [(pointPair[0][0] + pointPair[1][0]) / 2, (pointPair[0][1] + pointPair[1][1]) / 2];
}

type Recognizer = (
  tracks: TrackItem[],
  event: TouchEvent
) =>
  | {
      type: 'pinch';
      target: Target;
      event: PinchEvent;
    }
  | undefined;

const recognizers: Record<string, Recognizer> = {
  pinch(tracks: TrackItem[], event: TouchEvent) {
    const trackLen = tracks.length;

    if (!trackLen) {
      return;
    }

    const pinchEnd = (tracks[trackLen - 1] || {}).points;
    const pinchPre = (tracks[trackLen - 2] || {}).points || pinchEnd;

    if (pinchPre && pinchPre.length > 1 && pinchEnd && pinchEnd.length > 1) {
      let pinchScale = dist(pinchEnd) / dist(pinchPre);
      !isFinite(pinchScale) && (pinchScale = 1);

      (event as PinchEvent).pinchScale = pinchScale;

      const pinchCenter = center(pinchEnd);
      (event as PinchEvent).pinchX = pinchCenter[0];
      (event as PinchEvent).pinchY = pinchCenter[1];

      return {
        type: 'pinch',
        target: tracks[0].target,
        event: event as PinchEvent
      };
    }
  }

  // Only pinch currently.
};
export default GestureMgr;
