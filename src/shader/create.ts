import Shader from '../Shader';
import { basicFragment, basicVertex } from './source/basic.glsl';
import { lambertFragment, lambertVertex } from './source/lambert.glsl';
import { standardFragment, standardVertex } from './source/standard.glsl';
import { wireframeFragment, wireframeVertex } from './source/wireframe.glsl';

export function createBasicShader() {
  return new Shader(basicVertex, basicFragment);
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
