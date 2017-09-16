import lightEssl from './source/header/light';
import utilEssl from './source/util.essl';

import basicEssl from './source/basic.essl';
import lambertEssl from './source/lambert.essl';
import standardEssl from './source/standard.essl';
import wireframeEssl from './source/wireframe.essl';
import skyboxEssl from './source/skybox.essl';
import prezEssl from './source/prez.essl';

import library from './library';
import Shader from '../Shader';


Shader['import'](lightEssl);
Shader['import'](utilEssl);

// Some build in shaders
Shader['import'](basicEssl);
Shader['import'](lambertEssl);
Shader['import'](standardEssl);
Shader['import'](wireframeEssl);
Shader['import'](skyboxEssl);
Shader['import'](prezEssl);

library.template('qtek.basic', Shader.source('qtek.basic.vertex'), Shader.source('qtek.basic.fragment'));
library.template('qtek.lambert', Shader.source('qtek.lambert.vertex'), Shader.source('qtek.lambert.fragment'));
library.template('qtek.wireframe', Shader.source('qtek.wireframe.vertex'), Shader.source('qtek.wireframe.fragment'));
library.template('qtek.skybox', Shader.source('qtek.skybox.vertex'), Shader.source('qtek.skybox.fragment'));
library.template('qtek.prez', Shader.source('qtek.prez.vertex'), Shader.source('qtek.prez.fragment'));
library.template('qtek.standard', Shader.source('qtek.standard.vertex'), Shader.source('qtek.standard.fragment'));


import coloradjustEssl from './source/compositor/coloradjust.essl';
import blurEssl from './source/compositor/blur.essl';
import lumEssl from './source/compositor/lum.essl';
import lutEssl from './source/compositor/lut.essl';
import vigentteEssl from './source/compositor/vignette.essl';
import outputEssl from './source/compositor/output.essl';
import brightEssl from './source/compositor/bright.essl';
import downsampleEssl from './source/compositor/downsample.essl';
import upsampleEssl from './source/compositor/upsample.essl';
import hdrEssl from './source/compositor/hdr.essl';
import dofEssl from './source/compositor/dof.essl';
import lensflareEssl from './source/compositor/lensflare.essl';
import blendEssl from './source/compositor/blend.essl';

import fxaaEssl from './source/compositor/fxaa.essl';
import fxaa3Essl from './source/compositor/fxaa3.essl';

// Some build in shaders
Shader['import'](coloradjustEssl);
Shader['import'](blurEssl);
Shader['import'](lumEssl);
Shader['import'](lutEssl);
Shader['import'](vigentteEssl);
Shader['import'](outputEssl);
Shader['import'](brightEssl);
Shader['import'](downsampleEssl);
Shader['import'](upsampleEssl);
Shader['import'](hdrEssl);
Shader['import'](dofEssl);
Shader['import'](lensflareEssl);
Shader['import'](blendEssl);

Shader['import'](fxaaEssl);
Shader['import'](fxaa3Essl);
