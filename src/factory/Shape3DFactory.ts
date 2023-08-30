import * as THREE from 'three';
import Shape3D from '../core/Shape3D';
import type { ExtractShapeType } from '../core/Shape3D';
import Line from '../shapes/line';
import Area from '../shapes/area';
import { Vertex } from '../types';
import Volume from '../shapes/volume';
import { SUPPORTED_SHAPES } from '../../examples/src/Example';

export default class Shape3DFactory extends THREE.EventDispatcher implements Factory {
    isShape3DFactory: boolean;

    public static Shape3D = Shape3D;

    constructor() {
        super();
        this.isShape3DFactory = true;
    }

    public create(params: Partial<CreateParams>): Shape3D {
        const shape3D = new Shape3DFactory.Shape3D();
        this.update(shape3D, params);
        return shape3D;
    }

    public update(shape3D: Shape3D | Readonly<Shape3D>, params: Partial<CreateParams> = {}): void {
        shape3D.dispose();

        const { shapeType = Line.TYPE } = params;
        shape3D.setShapeType(shapeType);

        switch (shapeType) {
            case Line.TYPE:
                this._updateLine(shape3D as Shape3D, params);
                break;
            case Area.TYPE:
                this._updateArea(shape3D as Shape3D, params);
                break;
            case Volume.TYPE:
                this._updateVolume(shape3D as Shape3D, params);
                break;
            default:
                break;
        }

        shape3D.update();
    }

    public updateGhost(
        ghostShape3D: Shape3D,
        ghostVertex: THREE.Object3D,
        shape3DVertices: Readonly<Vertex[]>,
    ): void {
        this.updateGhostVertices(ghostShape3D, ghostVertex, shape3DVertices);
    }

    private updateGhostVertices(
        ghostShape3D: Shape3D,
        ghostVertex: THREE.Object3D,
        shape3DVertices: Readonly<Vertex[]>,
    ): void {
        if (shape3DVertices.length < 1) {
            return;
        }
        const shapeType = ghostShape3D.getShapeType();

        let vertices: Vertex[] | null = null;

        switch (shapeType) {
            case Line.TYPE:
                vertices = [
                    shape3DVertices[shape3DVertices.length - 1],
                    ghostVertex.position.toArray(),
                ];
                break;
            case Area.TYPE:
            case Volume.TYPE:
                const allVertices = [...shape3DVertices];
                const { length } = allVertices;
                if (length >= 2) {
                    vertices = [
                        allVertices[length - 1],
                        ghostVertex.position.toArray(),
                        allVertices[0],
                    ];
                }
                break;
            default:
                break;
        }
        if (vertices) ghostShape3D.setVertices(vertices);
    }

    public updateLine(shape3D: Shape3D | Readonly<Shape3D>, params: Partial<CreateParams>): void {
        params.shapeType = SUPPORTED_SHAPES.LINE;
        this.update(shape3D, params);
    }

    private _updateLine(shape3D: Shape3D, params: Partial<CreateParams>) {
        const shape = new Line(shape3D);
        shape3D.addShape(shape);
        if (params?.isGhost) {
            shape.setLineColor(0xff0000);
        }
    }

    public updateArea(shape3D: Shape3D | Readonly<Shape3D>, params: Partial<CreateParams>) {
        params.shapeType = SUPPORTED_SHAPES.AREA;
        this.update(shape3D, params);
    }

    private _updateArea(shape3D: Shape3D | Readonly<Shape3D>, params: Partial<CreateParams>) {
        const shape = new Area(shape3D as Shape3D);
        shape3D.addShape(shape);

        if (params?.isGhost) {
            this._updateLine(shape3D as Shape3D, params);
            // shape.setAreaColor(0xff0000);
        }
    }

    public updateVolume(
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<CreateVolumeParams>,
    ): void {
        params.shapeType = SUPPORTED_SHAPES.VOLUME;
        this.update(shape3D, params);
    }

    private _updateVolume(
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<CreateVolumeParams>,
    ) {
        const shape = new Volume(shape3D as Shape3D);
        shape3D.addShape(shape);
        if (params?.isGhost) {
            this._updateLine(shape3D as Shape3D, params);
            shape.setVolumeColor(0xff0000);
            // shape.setAreaColor(0xff0000);
        }
        if (params?.volumeHeight) {
            shape.setVolumeHeight(params.volumeHeight);
        }
    }

    public getVolume(shape3D: Shape3D | Readonly<Shape3D>): Volume {
        const shapes = shape3D.getShapes();
        const volume = shapes.find((shape) => shape instanceof Volume);
        if (volume == null) throw new Error('Volume is null');
        return volume as Volume;
    }
}

export type Factory = {
    isShape3DFactory: boolean;
    /**
     * Create a new {@link Shape3D} instance.
     * @param params {@link CreateParams}
     */
    create(params?: Partial<CreateParams>): Shape3D;
    /**
     * Update a {@link Shape3D} instance.
     * @param shape3D {@link Shape3D} instance to update.
     * @param params {@link CreateParams}
     */
    update(shape3D: Shape3D, params?: Partial<CreateParams>): void;
};

export type CreateParams = {
    shapeType: SupportedShapes;
    isGhost: boolean;
};

export interface CreateVolumeParams extends CreateParams {
    volumeHeight: number;
}

export type SupportedShapes = ExtractShapeType<
    typeof Shape3DFactory.Shape3D.SUPPORTED_SHAPES
>[number];
