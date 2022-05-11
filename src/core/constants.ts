/**
 * @namespace clay.core.constants
 * @see http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.14
 */

/* ClearBufferMask */
export const DEPTH_BUFFER_BIT = 0x00000100;
export const STENCIL_BUFFER_BIT = 0x00000400;
export const COLOR_BUFFER_BIT = 0x00004000;

/* BeginMode */
export const POINTS = 0x0000;
export const LINES = 0x0001;
export const LINE_LOOP = 0x0002;
export const LINE_STRIP = 0x0003;
export const TRIANGLES = 0x0004;
export const TRIANGLE_STRIP = 0x0005;
export const TRIANGLE_FAN = 0x0006;

/* AlphaFunction (not supported in ES20) */
/*      NEVER */
/*      LESS */
/*      EQUAL */
/*      LEQUAL */
/*      GREATER */
/*      NOTEQUAL */
/*      GEQUAL */
/*      ALWAYS */

/* BlendingFactorDest */
export const ZERO = 0;
export const ONE = 1;
export const SRC_COLOR = 0x0300;
export const ONE_MINUS_SRC_COLOR = 0x0301;
export const SRC_ALPHA = 0x0302;
export const ONE_MINUS_SRC_ALPHA = 0x0303;
export const DST_ALPHA = 0x0304;
export const ONE_MINUS_DST_ALPHA = 0x0305;

/* BlendingFactorSrc */
/*      ZERO */
/*      ONE */
export const DST_COLOR = 0x0306;
export const ONE_MINUS_DST_COLOR = 0x0307;
export const SRC_ALPHA_SATURATE = 0x0308;
/*      SRC_ALPHA */
/*      ONE_MINUS_SRC_ALPHA */
/*      DST_ALPHA */
/*      ONE_MINUS_DST_ALPHA */

/* BlendEquationSeparate */
export const FUNC_ADD = 0x8006;
export const BLEND_EQUATION = 0x8009;
export const BLEND_EQUATION_RGB = 0x8009; /* same as BLEND_EQUATION */
export const BLEND_EQUATION_ALPHA = 0x883d;

/* BlendSubtract */
export const FUNC_SUBTRACT = 0x800a;
export const FUNC_REVERSE_SUBTRACT = 0x800b;

/* Separate Blend Functions */
export const BLEND_DST_RGB = 0x80c8;
export const BLEND_SRC_RGB = 0x80c9;
export const BLEND_DST_ALPHA = 0x80ca;
export const BLEND_SRC_ALPHA = 0x80cb;
export const CONSTANT_COLOR = 0x8001;
export const ONE_MINUS_CONSTANT_COLOR = 0x8002;
export const CONSTANT_ALPHA = 0x8003;
export const ONE_MINUS_CONSTANT_ALPHA = 0x8004;
export const BLEND_COLOR = 0x8005;

/* Buffer Objects */
export const ARRAY_BUFFER = 0x8892;
export const ELEMENT_ARRAY_BUFFER = 0x8893;
export const ARRAY_BUFFER_BINDING = 0x8894;
export const ELEMENT_ARRAY_BUFFER_BINDING = 0x8895;

export const STREAM_DRAW = 0x88e0;
export const STATIC_DRAW = 0x88e4;
export const DYNAMIC_DRAW = 0x88e8;

export const BUFFER_SIZE = 0x8764;
export const BUFFER_USAGE = 0x8765;

export const CURRENT_VERTEX_ATTRIB = 0x8626;

/* CullFaceMode */
export const FRONT = 0x0404;
export const BACK = 0x0405;
export const FRONT_AND_BACK = 0x0408;

/* DepthFunction */
/*      NEVER */
/*      LESS */
/*      EQUAL */
/*      LEQUAL */
/*      GREATER */
/*      NOTEQUAL */
/*      GEQUAL */
/*      ALWAYS */

/* EnableCap */
/* TEXTURE_2D */
export const CULL_FACE = 0x0b44;
export const BLEND = 0x0be2;
export const DITHER = 0x0bd0;
export const STENCIL_TEST = 0x0b90;
export const DEPTH_TEST = 0x0b71;
export const SCISSOR_TEST = 0x0c11;
export const POLYGON_OFFSET_FILL = 0x8037;
export const SAMPLE_ALPHA_TO_COVERAGE = 0x809e;
export const SAMPLE_COVERAGE = 0x80a0;

/* ErrorCode */
export const NO_ERROR = 0;
export const INVALID_ENUM = 0x0500;
export const INVALID_VALUE = 0x0501;
export const INVALID_OPERATION = 0x0502;
export const OUT_OF_MEMORY = 0x0505;

/* FrontFaceDirection */
export const CW = 0x0900;
export const CCW = 0x0901;

/* GetPName */
export const LINE_WIDTH = 0x0b21;
export const ALIASED_POINT_SIZE_RANGE = 0x846d;
export const ALIASED_LINE_WIDTH_RANGE = 0x846e;
export const CULL_FACE_MODE = 0x0b45;
export const FRONT_FACE = 0x0b46;
export const DEPTH_RANGE = 0x0b70;
export const DEPTH_WRITEMASK = 0x0b72;
export const DEPTH_CLEAR_VALUE = 0x0b73;
export const DEPTH_FUNC = 0x0b74;
export const STENCIL_CLEAR_VALUE = 0x0b91;
export const STENCIL_FUNC = 0x0b92;
export const STENCIL_FAIL = 0x0b94;
export const STENCIL_PASS_DEPTH_FAIL = 0x0b95;
export const STENCIL_PASS_DEPTH_PASS = 0x0b96;
export const STENCIL_REF = 0x0b97;
export const STENCIL_VALUE_MASK = 0x0b93;
export const STENCIL_WRITEMASK = 0x0b98;
export const STENCIL_BACK_FUNC = 0x8800;
export const STENCIL_BACK_FAIL = 0x8801;
export const STENCIL_BACK_PASS_DEPTH_FAIL = 0x8802;
export const STENCIL_BACK_PASS_DEPTH_PASS = 0x8803;
export const STENCIL_BACK_REF = 0x8ca3;
export const STENCIL_BACK_VALUE_MASK = 0x8ca4;
export const STENCIL_BACK_WRITEMASK = 0x8ca5;
export const VIEWPORT = 0x0ba2;
export const SCISSOR_BOX = 0x0c10;
/*      SCISSOR_TEST */
export const COLOR_CLEAR_VALUE = 0x0c22;
export const COLOR_WRITEMASK = 0x0c23;
export const UNPACK_ALIGNMENT = 0x0cf5;
export const PACK_ALIGNMENT = 0x0d05;
export const MAX_TEXTURE_SIZE = 0x0d33;
export const MAX_VIEWPORT_DIMS = 0x0d3a;
export const SUBPIXEL_BITS = 0x0d50;
export const RED_BITS = 0x0d52;
export const GREEN_BITS = 0x0d53;
export const BLUE_BITS = 0x0d54;
export const ALPHA_BITS = 0x0d55;
export const DEPTH_BITS = 0x0d56;
export const STENCIL_BITS = 0x0d57;
export const POLYGON_OFFSET_UNITS = 0x2a00;
/*      POLYGON_OFFSET_FILL */
export const POLYGON_OFFSET_FACTOR = 0x8038;
export const TEXTURE_BINDING_2D = 0x8069;
export const SAMPLE_BUFFERS = 0x80a8;
export const SAMPLES = 0x80a9;
export const SAMPLE_COVERAGE_VALUE = 0x80aa;
export const SAMPLE_COVERAGE_INVERT = 0x80ab;

/* GetTextureParameter */
/*      TEXTURE_MAG_FILTER */
/*      TEXTURE_MIN_FILTER */
/*      TEXTURE_WRAP_S */
/*      TEXTURE_WRAP_T */

export const COMPRESSED_TEXTURE_FORMATS = 0x86a3;

/* HintMode */
export const DONT_CARE = 0x1100;
export const FASTEST = 0x1101;
export const NICEST = 0x1102;

/* HintTarget */
export const GENERATE_MIPMAP_HINT = 0x8192;

/* DataType */
export const BYTE = 0x1400;
export const UNSIGNED_BYTE = 0x1401;
export const SHORT = 0x1402;
export const UNSIGNED_SHORT = 0x1403;
export const INT = 0x1404;
export const UNSIGNED_INT = 0x1405;
export const FLOAT = 0x1406;

/* PixelFormat */
export const DEPTH_COMPONENT = 0x1902;
export const ALPHA = 0x1906;
export const RGB = 0x1907;
export const RGBA = 0x1908;
export const LUMINANCE = 0x1909;
export const LUMINANCE_ALPHA = 0x190a;

/* PixelType */
/*      UNSIGNED_BYTE */
export const UNSIGNED_SHORT_4_4_4_4 = 0x8033;
export const UNSIGNED_SHORT_5_5_5_1 = 0x8034;
export const UNSIGNED_SHORT_5_6_5 = 0x8363;

/* Shaders */
export const FRAGMENT_SHADER = 0x8b30;
export const VERTEX_SHADER = 0x8b31;
export const MAX_VERTEX_ATTRIBS = 0x8869;
export const MAX_VERTEX_UNIFORM_VECTORS = 0x8dfb;
export const MAX_VARYING_VECTORS = 0x8dfc;
export const MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8b4d;
export const MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8b4c;
export const MAX_TEXTURE_IMAGE_UNITS = 0x8872;
export const MAX_FRAGMENT_UNIFORM_VECTORS = 0x8dfd;
export const SHADER_TYPE = 0x8b4f;
export const DELETE_STATUS = 0x8b80;
export const LINK_STATUS = 0x8b82;
export const VALIDATE_STATUS = 0x8b83;
export const ATTACHED_SHADERS = 0x8b85;
export const ACTIVE_UNIFORMS = 0x8b86;
export const ACTIVE_ATTRIBUTES = 0x8b89;
export const SHADING_LANGUAGE_VERSION = 0x8b8c;
export const CURRENT_PROGRAM = 0x8b8d;

/* StencilFunction */
export const NEVER = 0x0200;
export const LESS = 0x0201;
export const EQUAL = 0x0202;
export const LEQUAL = 0x0203;
export const GREATER = 0x0204;
export const NOTEQUAL = 0x0205;
export const GEQUAL = 0x0206;
export const ALWAYS = 0x0207;

/* StencilOp */
/*      ZERO */
export const KEEP = 0x1e00;
export const REPLACE = 0x1e01;
export const INCR = 0x1e02;
export const DECR = 0x1e03;
export const INVERT = 0x150a;
export const INCR_WRAP = 0x8507;
export const DECR_WRAP = 0x8508;

/* StringName */
export const VENDOR = 0x1f00;
export const RENDERER = 0x1f01;
export const VERSION = 0x1f02;

/* TextureMagFilter */
export const NEAREST = 0x2600;
export const LINEAR = 0x2601;

/* TextureMinFilter */
/*      NEAREST */
/*      LINEAR */
export const NEAREST_MIPMAP_NEAREST = 0x2700;
export const LINEAR_MIPMAP_NEAREST = 0x2701;
export const NEAREST_MIPMAP_LINEAR = 0x2702;
export const LINEAR_MIPMAP_LINEAR = 0x2703;

/* TextureParameterName */
export const TEXTURE_MAG_FILTER = 0x2800;
export const TEXTURE_MIN_FILTER = 0x2801;
export const TEXTURE_WRAP_S = 0x2802;
export const TEXTURE_WRAP_T = 0x2803;

/* TextureTarget */
export const TEXTURE_2D = 0x0de1;
export const TEXTURE = 0x1702;

export const TEXTURE_CUBE_MAP = 0x8513;
export const TEXTURE_BINDING_CUBE_MAP = 0x8514;
export const TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
export const TEXTURE_CUBE_MAP_NEGATIVE_X = 0x8516;
export const TEXTURE_CUBE_MAP_POSITIVE_Y = 0x8517;
export const TEXTURE_CUBE_MAP_NEGATIVE_Y = 0x8518;
export const TEXTURE_CUBE_MAP_POSITIVE_Z = 0x8519;
export const TEXTURE_CUBE_MAP_NEGATIVE_Z = 0x851a;
export const MAX_CUBE_MAP_TEXTURE_SIZE = 0x851c;

/* TextureUnit */
export const TEXTURE0 = 0x84c0;
export const TEXTURE1 = 0x84c1;
export const TEXTURE2 = 0x84c2;
export const TEXTURE3 = 0x84c3;
export const TEXTURE4 = 0x84c4;
export const TEXTURE5 = 0x84c5;
export const TEXTURE6 = 0x84c6;
export const TEXTURE7 = 0x84c7;
export const TEXTURE8 = 0x84c8;
export const TEXTURE9 = 0x84c9;
export const TEXTURE10 = 0x84ca;
export const TEXTURE11 = 0x84cb;
export const TEXTURE12 = 0x84cc;
export const TEXTURE13 = 0x84cd;
export const TEXTURE14 = 0x84ce;
export const TEXTURE15 = 0x84cf;
export const TEXTURE16 = 0x84d0;
export const TEXTURE17 = 0x84d1;
export const TEXTURE18 = 0x84d2;
export const TEXTURE19 = 0x84d3;
export const TEXTURE20 = 0x84d4;
export const TEXTURE21 = 0x84d5;
export const TEXTURE22 = 0x84d6;
export const TEXTURE23 = 0x84d7;
export const TEXTURE24 = 0x84d8;
export const TEXTURE25 = 0x84d9;
export const TEXTURE26 = 0x84da;
export const TEXTURE27 = 0x84db;
export const TEXTURE28 = 0x84dc;
export const TEXTURE29 = 0x84dd;
export const TEXTURE30 = 0x84de;
export const TEXTURE31 = 0x84df;
export const ACTIVE_TEXTURE = 0x84e0;

/* TextureWrapMode */
export const REPEAT = 0x2901;
export const CLAMP_TO_EDGE = 0x812f;
export const MIRRORED_REPEAT = 0x8370;

/* Uniform Types */
export const FLOAT_VEC2 = 0x8b50;
export const FLOAT_VEC3 = 0x8b51;
export const FLOAT_VEC4 = 0x8b52;
export const INT_VEC2 = 0x8b53;
export const INT_VEC3 = 0x8b54;
export const INT_VEC4 = 0x8b55;
export const BOOL = 0x8b56;
export const BOOL_VEC2 = 0x8b57;
export const BOOL_VEC3 = 0x8b58;
export const BOOL_VEC4 = 0x8b59;
export const FLOAT_MAT2 = 0x8b5a;
export const FLOAT_MAT3 = 0x8b5b;
export const FLOAT_MAT4 = 0x8b5c;
export const SAMPLER_2D = 0x8b5e;
export const SAMPLER_CUBE = 0x8b60;

/* Vertex Arrays */
export const VERTEX_ATTRIB_ARRAY_ENABLED = 0x8622;
export const VERTEX_ATTRIB_ARRAY_SIZE = 0x8623;
export const VERTEX_ATTRIB_ARRAY_STRIDE = 0x8624;
export const VERTEX_ATTRIB_ARRAY_TYPE = 0x8625;
export const VERTEX_ATTRIB_ARRAY_NORMALIZED = 0x886a;
export const VERTEX_ATTRIB_ARRAY_POINTER = 0x8645;
export const VERTEX_ATTRIB_ARRAY_BUFFER_BINDING = 0x889f;

/* Shader Source */
export const COMPILE_STATUS = 0x8b81;

/* Shader Precision-Specified Types */
export const LOW_FLOAT = 0x8df0;
export const MEDIUM_FLOAT = 0x8df1;
export const HIGH_FLOAT = 0x8df2;
export const LOW_INT = 0x8df3;
export const MEDIUM_INT = 0x8df4;
export const HIGH_INT = 0x8df5;

/* Framebuffer Object. */
export const FRAMEBUFFER = 0x8d40;
export const RENDERBUFFER = 0x8d41;

export const RGBA4 = 0x8056;
export const RGB5_A1 = 0x8057;
export const RGB565 = 0x8d62;
export const DEPTH_COMPONENT16 = 0x81a5;
export const STENCIL_INDEX = 0x1901;
export const STENCIL_INDEX8 = 0x8d48;
export const DEPTH_STENCIL = 0x84f9;

export const RENDERBUFFER_WIDTH = 0x8d42;
export const RENDERBUFFER_HEIGHT = 0x8d43;
export const RENDERBUFFER_INTERNAL_FORMAT = 0x8d44;
export const RENDERBUFFER_RED_SIZE = 0x8d50;
export const RENDERBUFFER_GREEN_SIZE = 0x8d51;
export const RENDERBUFFER_BLUE_SIZE = 0x8d52;
export const RENDERBUFFER_ALPHA_SIZE = 0x8d53;
export const RENDERBUFFER_DEPTH_SIZE = 0x8d54;
export const RENDERBUFFER_STENCIL_SIZE = 0x8d55;

export const FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 0x8cd0;
export const FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 0x8cd1;
export const FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 0x8cd2;
export const FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 0x8cd3;

export const COLOR_ATTACHMENT0 = 0x8ce0;
export const DEPTH_ATTACHMENT = 0x8d00;
export const STENCIL_ATTACHMENT = 0x8d20;
export const DEPTH_STENCIL_ATTACHMENT = 0x821a;

export const NONE = 0;

export const FRAMEBUFFER_COMPLETE = 0x8cd5;
export const FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8cd6;
export const FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8cd7;
export const FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 0x8cd9;
export const FRAMEBUFFER_UNSUPPORTED = 0x8cdd;

export const FRAMEBUFFER_BINDING = 0x8ca6;
export const RENDERBUFFER_BINDING = 0x8ca7;
export const MAX_RENDERBUFFER_SIZE = 0x84e8;

export const INVALID_FRAMEBUFFER_OPERATION = 0x0506;

/* WebGL-specific enums */
export const UNPACK_FLIP_Y_WEBGL = 0x9240;
export const UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
export const CONTEXT_LOST_WEBGL = 0x9242;
export const UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;
export const BROWSER_DEFAULT_WEBGL = 0x9244;

/* Extensions */

/**
 * @see https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
 */
export const SRGB_EXT = 0x8c40;
/**
 * @see https://www.khronos.org/registry/webgl/extensions/EXT_sRGB/
 */
export const SRGB_ALPHA_EXT = 0x8c42;

/**
 * OES_texture_half_float extension
 */
export const HALF_FLOAT_OES = 0x8d61;

/**
 * UNSIGNED_INT_24_8_WEBGL for WEBGL_depth_texture extension
 */
export const UNSIGNED_INT_24_8_WEBGL = 34042;

/* Compressed Texture */
// https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API/Constants
// s3tc
export const COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83f0;
export const COMPRESSED_RGBA_S3TC_DXT1_EXT = 0x83f1;
export const COMPRESSED_RGBA_S3TC_DXT3_EXT = 0x83f2;
export const COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83f3;

// etc
export const COMPRESSED_RGB_ETC1_WEBGL = 0x8d64;

// pvrtc
export const COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8c00;
export const COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8c02;
export const COMPRESSED_RGB_PVRTC_2BPPV1_IMG = 0x8c01;
export const COMPRESSED_RGBA_PVRTC_2BPPV1_IMG = 0x8c03;

// atc
export const COMPRESSED_RGB_ATC_WEBGL = 0x8c92;
export const COMPRESSED_RGBA_ATC_EXPLICIT_ALPHA_WEBGL = 0x8c93;
export const COMPRESSED_RGBA_ATC_INTERPOLATED_ALPHA_WEBGL = 0x87ee;
