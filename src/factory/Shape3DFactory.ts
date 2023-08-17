import * as THREE from 'three';
import Shape3D from '../core/Shape3D';
import type { ExtractShapeType } from '../core/Shape3D';
import Line from '../shapes/line';
import Area from '../shapes/area';
import { AddObjectsOnShapeParams, Vertex } from '../types';
import Volume from '../shapes/volume';

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
                this.updateLine(shape3D as Shape3D, params);
                break;
            case Area.TYPE:
                this.updateArea(shape3D as Shape3D, params);
                break;
            case Volume.TYPE:
                this.updateVolume(shape3D as Shape3D, params);
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

    private updateLine(shape3D: Shape3D, params: Partial<CreateParams>) {
        const shape = new Line(shape3D);
        shape3D.addShape(shape);
        if (params?.isGhost) {
            shape.setLineColor(0xff0000);
        }
    }

    private updateArea(shape3D: Shape3D, params: Partial<CreateParams>) {
        const shape = new Area(shape3D);
        shape3D.addShape(shape);

        if (params?.isGhost) {
            this.updateLine(shape3D, params);
            // shape.setAreaColor(0xff0000);
        }
    }

    private updateVolume(shape3D: Shape3D, params: Partial<CreateParams>) {
        const shape = new Volume(shape3D);
        shape3D.addShape(shape);
        if (params?.isGhost) {
            this.updateLine(shape3D, params);
            shape.setVolumeColor(0xff0000);
            // shape.setAreaColor(0xff0000);
        }
    }

    public addObjectsOnShape(
        parent: THREE.Object3D,
        object: THREE.Object3D,
        shape3D: Shape3D | Readonly<Shape3D>,
        params: Partial<AddObjectsOnShapeParams> = {},
    ): void {
        parent.clear();
        const vertices = shape3D.getVertices();

        const previousVertex = new THREE.Vector3();
        const currentVertex = new THREE.Vector3();
        const line = new THREE.Vector3();

        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 0, 1);
        for (let i = 1; i < vertices.length; i++) {
            const _previousVertex = vertices[i - 1];
            const _currentVertex = vertices[i];

            previousVertex.fromArray(_previousVertex);
            currentVertex.fromArray(_currentVertex);

            line.subVectors(currentVertex, previousVertex);
            const distance = line.length();
            const width = params?.width ?? 1;
            const numberOfObjects = Math.floor(distance / width);

            for (let j = 0; j < numberOfObjects; j++) {
                const objectClone = object.clone();
                const position = previousVertex.clone().addScaledVector(line, j / numberOfObjects);
                objectClone.position.copy(position);

                // Rotate object to match the line
                quaternion.setFromUnitVectors(up, line.clone().normalize());
                objectClone.quaternion.copy(quaternion);
                objectClone.rotateY(Math.PI / 2);

                parent.add(objectClone);
            }
        }
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

export type SupportedShapes = ExtractShapeType<
    typeof Shape3DFactory.Shape3D.SUPPORTED_SHAPES
>[number];
