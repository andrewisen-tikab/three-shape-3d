import { ColorRepresentation } from '../types';

import * as THREE from 'three';

import Shape3D, { Shape } from '../core/Shape3D';
import CONFIG from '../config';
import RaycastUtils from '../raycast/RaycastUtils';
import { rotateShapeGeometry } from '../utils';

export default class Volume implements Shape {
    public static TYPE = 'volume' as const;
    public parent: Shape3D;
    public object: THREE.Object3D;
    private volume: THREE.Mesh | null = null;
    private volumeHeight: number;

    private volumeColor: THREE.Color;

    private volumeGeometry: THREE.ExtrudeGeometry | null = null;
    private volumeMaterial: THREE.MeshBasicMaterial | null = null;

    constructor(shape: Shape3D) {
        this.parent = shape;
        this.object = new THREE.Object3D();
        this.volumeColor = new THREE.Color(CONFIG.VOLUME_COLOR);
        this.volumeHeight = CONFIG.VOLUME_HEIGHT;
    }

    create(): void {
        const vertices = this.parent.getVertices();
        if (vertices.length < 3) return;
        // N.B: LineGeometry is an InstancedBufferGeometry.
        // The easiest way to update the geometry is to create a new one.
        this.volumeGeometry = new THREE.ExtrudeGeometry();
        if (this.volumeMaterial === null)
            this.volumeMaterial = new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                transparent: true,
                opacity: CONFIG.VOLUME_OPACITY,
            });

        this.updateVolumeGeometry();
        this.updateVolumeMaterial();

        this.volume = new THREE.Mesh(this.volumeGeometry, this.volumeMaterial);
        this.volume.position.setY(CONFIG.Z_FIGHTING_OFFSET); // render after the opaque (default) objects

        RaycastUtils.setShape3DParent(this.volume, this.parent);

        this.object.add(this.volume);
    }

    update(): void {
        this.object.clear();
        this.create();
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateVolumeGeometry(): void {
        const vertices = this.parent.getVertices();

        const shape = new THREE.Shape(
            vertices.flatMap((vertex) => new THREE.Vector2(vertex[0], vertex[2])),
        );

        const geometry = new THREE.ExtrudeGeometry(shape, {
            bevelEnabled: false,
            // Depth is always positive.
            depth: Math.abs(this.volumeHeight),
        });

        this.volumeGeometry = geometry;

        rotateShapeGeometry(geometry);

        // Only translate the volume if the height is positive.
        geometry.translate(0, Math.max(this.volumeHeight, 0), 0);

        if (this.volume) this.volume.geometry = geometry;
    }

    private updateVolumeMaterial(): void {
        this.volumeMaterial!.color.copy(this.volumeColor);
    }

    dispose(): void {
        this.volumeGeometry?.dispose();
        this.volumeGeometry = null;
        this.volumeMaterial?.dispose();
        this.volumeMaterial = null;
    }

    setColor(_color: ColorRepresentation): void {}

    /**
     * Set the volume color.
     * @param color
     * @param force
     */
    setVolumeColor(color: ColorRepresentation) {
        this.volumeColor.set(color);
        this.update();
    }

    /**
     * Set the volume height.
     * @param height
     */
    setVolumeHeight(height: number): void {
        this.volumeHeight = height;
        this.update();
    }

    getVolumeGeometry(): Readonly<THREE.ExtrudeGeometry> {
        if (this.volumeGeometry == null) throw new Error('VolumeGeometry is null');

        return this.volumeGeometry;
    }
}
