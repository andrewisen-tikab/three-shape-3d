import { ColorRepresentation } from '../types';

import * as THREE from 'three';

import Shape3D, { Shape } from '../core/Shape3D';
import CONFIG from '../config';
import RaycastUtils from '../raycast/RaycastUtils';
import { rotateShapeGeometry } from '../utils';

export default class Area implements Shape {
    public static TYPE = 'area' as const;
    public parent: Shape3D;
    public object: THREE.Object3D;
    private area: THREE.Mesh | null = null;

    private areaColor: THREE.Color;

    private areaGeometry: THREE.ShapeGeometry | null = null;
    private areaMaterial: THREE.MeshBasicMaterial | null = null;

    constructor(shape: Shape3D) {
        this.parent = shape;
        this.object = new THREE.Object3D();
        this.areaColor = new THREE.Color(CONFIG.AREA_COLOR);
    }

    create(): void {
        const vertices = this.parent.getVertices();
        if (vertices.length < 3) return;
        // N.B: LineGeometry is an InstancedBufferGeometry.
        // The easiest way to update the geometry is to create a new one.
        this.areaGeometry = new THREE.ShapeGeometry();
        if (this.areaMaterial === null)
            this.areaMaterial = new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                transparent: true,
                opacity: CONFIG.AREA_OPACITY,
            });

        this.updateAreaGeometry();
        this.updateAreaMaterial();

        this.area = new THREE.Mesh(this.areaGeometry, this.areaMaterial);
        this.area.position.setY(CONFIG.Z_FIGHTING_OFFSET); // render after the opaque (default) objects

        RaycastUtils.setShape3DParent(this.area, this.parent);

        this.object.add(this.area);
    }

    update(): void {
        this.object.clear();
        this.create();
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateAreaGeometry(): void {
        const vertices = this.parent.getVertices();

        const shape = new THREE.Shape().setFromPoints(
            vertices.map((v) => new THREE.Vector2(v[0], v[2])),
        );

        const geometry = new THREE.ShapeGeometry(shape);

        this.areaGeometry = geometry;
        rotateShapeGeometry(geometry);

        if (this.area) {
            this.area.geometry = geometry;
        }
    }

    private updateAreaMaterial(): void {
        this.areaMaterial!.color.copy(this.areaColor);
    }

    dispose(): void {
        this.areaGeometry?.dispose();
        this.areaGeometry = null;
        this.areaMaterial?.dispose();
        this.areaMaterial = null;
    }

    setColor(_color: ColorRepresentation): void {}

    /**
     * Set the area color.
     * @param color
     * @param force
     */
    setAreaColor(color: ColorRepresentation) {
        this.areaColor.set(color);
        this.update();
    }
}
