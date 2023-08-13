import * as THREE from 'three';
import Shape3D from '../core/Shape3D';
import type { ExtractShapeType } from '../core/Shape3D';
import Line from '../shapes/line';

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

    public update(shape3D: Shape3D, params: Partial<CreateParams>): void {
        const { shapeType = Line.TYPE } = params;
        shape3D.setShapeType(shapeType);

        switch (shapeType) {
            case Line.TYPE:
                this.updateLine(shape3D);
                break;
            default:
                break;
        }
    }

    private updateLine(shape3D: Shape3D) {
        const shape = new Line(shape3D);
        shape3D.addShape(shape);
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
};

export type SupportedShapes = ExtractShapeType<
    typeof Shape3DFactory.Shape3D.SUPPORTED_SHAPES
>[number];
