import { ColorRepresentation } from '../types';

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import Shape3D, { Shape } from '../core/Shape3D';
import CONFIG from '../config';
import RaycastUtils from '../raycast/RaycastUtils';

export default class Line implements Shape {
    public static TYPE = 'line' as const;
    public parent: Shape3D;
    public object: THREE.Object3D;
    public line: Line2 | null = null;

    private lineColor: THREE.Color;
    private closeLine: boolean;

    private lineGeometry: LineGeometry | null = null;
    private lineMaterial: LineMaterial | null = null;

    constructor(shape: Shape3D) {
        this.parent = shape;
        this.object = new THREE.Object3D();
        this.closeLine = false;
        this.lineColor = new THREE.Color(CONFIG.LINE_COLOR);
    }

    create(): void {
        const vertices = this.parent.getVertices();
        if (vertices.length < 2) return;
        // N.B: LineGeometry is an InstancedBufferGeometry.
        // The easiest way to update the geometry is to create a new one.
        this.lineGeometry = new LineGeometry();
        if (this.lineMaterial === null)
            this.lineMaterial = new LineMaterial({
                linewidth: 5,
                transparent: true,
                opacity: CONFIG.LINE_OPACITY,
            });

        this.updateLineGeometry();
        this.updateLineMaterial();

        this.line = new Line2(this.lineGeometry, this.lineMaterial);

        this.lineMaterial.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
        this.line.computeLineDistances();

        RaycastUtils.setShape3DParent(this.line, this.parent);

        this.object.add(this.line);
    }

    update(): void {
        this.object.clear();
        this.create();
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateLineGeometry(): void {
        const flatVertices: number[] = [];
        const vertices = this.parent.getVertices();

        for (let i = 0; i < vertices.length; i++) {
            const element = vertices[i];
            flatVertices.push(element[0], element[1], element[2]);
        }

        if (this.closeLine) {
            flatVertices.push(...vertices[0]);
        }

        this.lineGeometry!.setPositions(flatVertices);
    }

    private updateLineMaterial(): void {
        this.lineMaterial!.color.copy(this.lineColor);
    }

    dispose(): void {
        this.lineGeometry?.dispose();
        this.lineGeometry = null;
        this.lineMaterial?.dispose();
        this.lineMaterial = null;
    }

    setColor(_color: ColorRepresentation): void {}

    /**
     * Set the line color.
     * @param color
     * @param force
     */
    setLineColor(color: ColorRepresentation) {
        this.lineColor.set(color);
        this.update();
    }
}
