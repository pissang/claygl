import Timeline from '../Timeline';
import Clip from './Clip';

export interface Animator {
  timeline?: Timeline;

  getClip(): Clip | undefined;

  // start(): void;
}
