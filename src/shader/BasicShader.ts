import Shader from '../Shader.js';
import { basicVertex, basicFragment } from './source/basic.glsl';

class BasicShader extends Shader<typeof basicVertex, typeof basicFragment> {
  constructor() {
    super(basicVertex, basicFragment);
  }
}

export default BasicShader;
