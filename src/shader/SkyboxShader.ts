import Shader from '../Shader.js';
import { skyboxFragment, skyboxVertex } from './source/skybox.glsl';

class SkyboxShader extends Shader<typeof skyboxVertex, typeof skyboxFragment> {
  constructor() {
    super(skyboxVertex, skyboxFragment);
  }
}

export default SkyboxShader;
