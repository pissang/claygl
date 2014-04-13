///<reference path="math/BoundingBox.d.ts" />
///<reference path="core/Base.d.ts" />
///<reference path="core/Cache.d.ts" />
declare module qtek {

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

    interface IGeometryOption {}

    export class Geometry extends core.Base {
        
        constructor();

        cache: core.Cache;

        boundingBox: math.BoundingBox;

        useFace: boolean;

        chunkSize: number;

        static STATIC_DRAW: number;
        static DYNAMIC_DRAW: number;
        static STREAM_DRAW: number;

        static AttributeBuffer: number;
        static IndicesBuffer: number;
        static Attribute: number;
    }
}