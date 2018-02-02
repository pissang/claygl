///<reference path="math/BoundingBox.d.ts" />
///<reference path="core/Base.d.ts" />
///<reference path="core/Cache.d.ts" />
///<reference path="math/Matrix4.d.ts" />

interface IGeometryAttributeBuffer {
    name: string;
    type: string;
    size: number;
    semantic?: string;
    symbol: string;
    buffer: WebGLBuffer;
}

interface IGeometryBufferChunk {
    attributeBuffers : IGeometryAttributeBuffer[];
    indicesBuffer: WebGLBuffer;
}

interface IStaticGeometryAttribute {
    name: string;
    type: string;
    size: number;
    value: ArrayBufferView;

    init(nVertex: number): void;
}

interface IDefaultStaticGeometryAttributes {
    position: IStaticGeometryAttribute;
    texcoord0: IStaticGeometryAttribute;
    texcoord1: IStaticGeometryAttribute;
    normal: IStaticGeometryAttribute;
    tangent: IStaticGeometryAttribute;
    color: IStaticGeometryAttribute;
    weight: IStaticGeometryAttribute;
    joint: IStaticGeometryAttribute;
    barycentric: IStaticGeometryAttribute;
}

export class StaticGeometry extends Geometry {

    attributes: IDefaultStaticGeometryAttributes;

    faces: ArrayBufferView;

    hint: number;

    boundingBox: math.BoundingBox;

    dirty(): void;

    getVertexNumber(): number;

    getFaceNumber(): number;

    isUseFace(): boolean;

    isStatic(): boolean;

    isUniqueVertex(): boolean;

    createAttribute(name: string, type: string, size: number, semantic?: string): IStaticGeometryAttribute;

    removeAttribute(name: string): boolean;

    getEnabledAttributes(): string[];

    getBufferChunks(gl: WebGLRenderingContext) : IGeometryBufferChunk[];

    generateTangents(): void;

    generateUniqueVertex(): void;

    generateBarycentric(): void;

    applyTransform(matrix: math.Matrix4): void;

    dispose(gl: WebGLRenderingContext): void;

    static STATIC_DRAW: number;
    static DYNAMIC_DRAW: number;
    static STREAM_DRAW: number;

    static AttributeBuffer: number;
    static IndicesBuffer: number;
    static Attribute: number;
}