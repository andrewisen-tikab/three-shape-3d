import * as THREE from 'three';
import { Brush, Evaluator } from 'three-bvh-csg';

const ADDITION = 0;
const SUBTRACTION = 1;
const DIFFERENCE = 3;
const INTERSECTION = 4;

/**
 * The supported CSG operations from `three-bvh-csg`
 */
const CSGOperations = {
    ADDITION,
    SUBTRACTION,
    DIFFERENCE,
    INTERSECTION,
} as const;

import { Shape3D, Shape3DFactory } from '../../src';

const _volumeCSGMaterial = new THREE.MeshBasicMaterial({
    color: 0x0000ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
});
const _volumeCutMaterial = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    side: THREE.BackSide,
    shadowSide: THREE.BackSide,
});
const _lineMaterial = new THREE.LineBasicMaterial({
    color: 0xffff00,
});

const _centroid = new THREE.Vector3();
const _scaleFactor = 1.01;
const _vertex = new THREE.Vector3();

/**
 * A custom factory that utilizes `three-bvh-csg` to create a CSG mesh.
 */
export default class CSGFactory extends THREE.EventDispatcher {
    private _shape3D: Shape3D;
    private _csgObjects: THREE.Object3D<THREE.Event>[];
    private _result: THREE.Object3D<THREE.Event>;
    private _csgEvaluator: Evaluator;
    private _factory: Shape3DFactory;

    constructor(
        shape3D: Shape3D,
        factory: Shape3DFactory,
        csgObjects: THREE.Object3D[],
        result: THREE.Object3D,
    ) {
        super();

        this._shape3D = shape3D as Shape3D;
        this._factory = factory;
        this._csgObjects = csgObjects;
        this._csgEvaluator = new Evaluator();

        this._result = result;
        this.hideVolume();
    }

    /**
     * Hide the existing volume. This should be replaced by or CSG result.
     */
    public hideVolume(): void {
        const volume = this._factory.getVolume(this._shape3D);
        if (volume == null) throw new Error('Volume is null');
        volume.object.visible = false;
    }

    /**
     * Set the {@link Shape3D} to use for the CSG operation.
     * @param shape3D
     */
    public setShape3D(shape3D: Shape3D): void {
        this._shape3D = shape3D;
        this.update();
    }

    /**
     * Get the {@link Shape3D} to use for the CSG operation.
     * @returns The {@link Shape3D} to use for the CSG operation.
     */
    public getShape3D(): Readonly<Shape3D> {
        return this._shape3D;
    }

    /**
     * Set the {@link THREE.Object3D}s to use for the CSG operation.
     * @param csgObjects The {@link THREE.Object3D}s to use for the CSG operation.
     */
    public setCSGObjects(csgObjects: THREE.Object3D[]): void {
        this._csgObjects = csgObjects;
        this.update();
    }

    /**
     * Get the {@link THREE.Object3D}s to use for the CSG operation.
     * @returns The {@link THREE.Object3D}s to use for the CSG operation.
     */
    public getCSGObjects(): Readonly<THREE.Object3D[]> {
        return this._csgObjects;
    }

    /**
     * Update the CSG result.
     */
    public update(): void {
        const result = this._generateResult();
        this._dispose();
        this._addResult(result);
    }

    private _generateResult(_result?: THREE.Object3D): THREE.Object3D {
        const result = _result ?? new THREE.Object3D();

        const volume = this._factory.getVolume(this._shape3D);
        if (volume == null) throw new Error('Volume is null');

        // Setup mesh brush
        // TODO:  This is a hack to get the mesh
        const mesh = (this._csgObjects as any)[0].children[1];
        const meshBrush = new Brush(mesh.geometry, mesh.material);

        // Setup volume brush
        const volumeGeometry = volume.getVolumeGeometry();
        const volumeBrush = new Brush(volumeGeometry, _volumeCSGMaterial);

        // Generate CSG result: mesh - volume
        const volumeResultBrush = this._csgEvaluator.evaluate(
            meshBrush,
            volumeBrush,
            CSGOperations.SUBTRACTION,
        );
        result.add(volumeResultBrush);

        // Setup volume cut brush
        const volumeCutGeometry = volumeGeometry.clone();
        this._shape3D.getCentroid(_centroid);
        _centroid.y = 0;

        // Iterate through vertices
        // Adjust this value to control the scale
        const positions = volumeCutGeometry.getAttribute('position').array;
        for (let i = 0; i < positions.length; i += 3) {
            _vertex.set(positions[i], positions[i + 1], positions[i + 2]);
            _vertex.sub(_centroid).multiplyScalar(_scaleFactor).add(_centroid);
            positions[i] = _vertex.x;
            positions[i + 1] = _vertex.y;
            positions[i + 2] = _vertex.z;
        }

        // Update buffer data
        volumeCutGeometry.getAttribute('position').needsUpdate = true;
        // Nudge the volume cut geometry down a bit
        volumeCutGeometry.translate(0, -0.1, 0);

        // Generate CSG result: volume cut - volume
        const volumeCutBrush = new Brush(volumeCutGeometry, _volumeCutMaterial);
        const volumeCutResultBrush = this._csgEvaluator.evaluate(
            volumeCutBrush,
            volumeBrush,
            CSGOperations.SUBTRACTION,
        );
        volumeCutResultBrush.receiveShadow = true;
        volumeCutResultBrush.castShadow = true;
        result.add(volumeCutResultBrush);

        // Add edges to make the volume cut more visible
        const edges = new THREE.EdgesGeometry(volumeGeometry);
        const line = new THREE.LineSegments(edges, _lineMaterial);
        result.add(line);

        return result;
    }

    /**
     * Add the new result.
     * N.B: Dispose the previous result before calling this method!
     * @param result The new result.
     */
    private _addResult(result: THREE.Object3D) {
        this._result.add(result);
    }

    /**
     * Dispose the result.
     */
    private _dispose(): void {
        this._disposeResult();
    }

    /**
     * Dispose the previous result.
     */
    private _disposeResult() {
        for (let i = 0; i < this._result.children.length; i++) {
            const element = this._result.children[i] as THREE.Mesh<
                THREE.BufferGeometry,
                THREE.Material
            >;
            this._result.remove(element);

            if (element.isMesh == null) continue;
            element.geometry?.dispose();
            if (element.material.dispose) element.material.dispose();
        }
    }
}
