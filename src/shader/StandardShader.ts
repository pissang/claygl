import Shader from '../Shader.js';
import { standardFragment, standardVertex } from './source/standard.glsl';

class StandardShader extends Shader<typeof standardVertex, typeof standardFragment> {
  constructor() {
    super(standardVertex, standardFragment);
  }
}

export default StandardShader;
