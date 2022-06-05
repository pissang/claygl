import Shader from '../Shader';
import { unlitFragment, unlitVertex } from './source/unlit.glsl';
import { lambertFragment, lambertVertex } from './source/lambert.glsl';
import { standardFragment, standardVertex } from './source/standard.glsl';
import { wireframeFragment, wireframeVertex } from './source/wireframe.glsl';

export function createUnlitShader() {
  return new Shader(unlitVertex, unlitFragment);
}

export function createStandardShader() {
  return new Shader(standardVertex, standardFragment);
}

export function createLambertShader() {
  return new Shader(lambertVertex, lambertFragment);
}

export function createWireframeShader() {
  return new Shader(wireframeVertex, wireframeFragment);
}
