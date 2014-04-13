///<reference path="Geometry.d.ts" />
///<reference path="math/Matrix4.d.ts" />
declare module qtek {

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
    }
}