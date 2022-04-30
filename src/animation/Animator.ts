import Timeline from '../Timeline';
import Clip from './Clip';

/**
 * Animator will control animation play.
 *
 * We don't name it Animation to avoid conflicts with DOM API.
 */
export interface Animator {
  timeline?: Timeline;

  getClip(): Clip | undefined;

  // start(): void;
}
