import Shape3DCore from './core/Shape3DCore';
import { SUPPORTED_SHAPES } from './types';
import type {
    Appearance,
    ColorRepresentation,
    Shape3DParams,
    SupportedShapes,
    Vertex,
} from './types';

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import CONFIG from './config';
import { rotateShapeGeometry } from './utils';

export default class Shape3D extends Shape3DCore {
    private lineColor: THREE.Color;
    private areaColor: THREE.Color | null = null;
    private volumeColor: THREE.Color | null = null;

    private closeLine: boolean;

    private lineGeometry: LineGeometry | null = null;
    private lineMaterial: LineMaterial | null = null;
    private line: Line2 | null = null;

    private areaGeometry: THREE.ShapeGeometry | null = null;
    private areaMaterial: THREE.MeshBasicMaterial | null = null;
    private area: THREE.Mesh | null = null;

    private volumeGeometry: THREE.ExtrudeGeometry | null = null;
    private volumeMaterial: THREE.MeshBasicMaterial | null = null;
    private volume: THREE.Mesh | null = null;
    private volumeHeight: number;

    private appearance: Appearance;

    constructor(params?: Partial<Shape3DParams>) {
        super(params);

        const {
            lineColor = CONFIG.LINE_COLOR,
            areaColor = CONFIG.AREA_COLOR,
            volumeColor = CONFIG.VOLUME_COLOR,
            closeLine = false,
            volumeHeight = 5,
            appearance = {
                alwaysShowLine: true,
                alwaysShowArea: true,
            },
        } = params || {};

        this.lineColor = new THREE.Color(lineColor);
        if (areaColor) this.areaColor = new THREE.Color(areaColor);
        if (volumeColor) this.volumeColor = new THREE.Color(volumeColor);

        this.closeLine = closeLine;
        this.volumeHeight = volumeHeight;

        this.appearance = appearance;
    }

    /**
     * @returns The previous shape, or null if this is the first time setting the shape.
     */
    private getPreviousShape(): SupportedShapes | null {
        return this.shape == null ? null : JSON.parse(JSON.stringify(this.shape));
    }

    public setShape(shape: SupportedShapes): SupportedShapes {
        if (this.shape === shape) return this.shape;

        // Figure out the previous shape
        // May be null if this is the first time setting the shape
        const previousShape: SupportedShapes | null = this.getPreviousShape();

        // Attempt to set the shape
        super.setShape(shape);

        // Do nothing if the shape didn't change
        if (this.shape === previousShape) return this.shape;

        // If the shape changed, try to dispose of the previous shape(s)
        // if (previousShape) this.onShapeChanged(previousShape);
        this.update();
        return this.shape;
    }

    /**
     * Dispose entire object.
     */
    public dispose(): void {
        this.clear();
        this.disposeLine();
        this.disposeArea();
        this.disposeVolume();
    }

    /**
     * Dispose of the line and its geometry and material.
     */
    private disposeLine(): void {
        if (this.line) this.remove(this.line);
        this.lineGeometry?.dispose();
        this.lineGeometry = null;
        this.lineMaterial?.dispose();
        this.lineMaterial = null;

        this.line = null;
    }

    /**
     * Dispose of the area and its geometry and material.
     */
    private disposeArea(): void {
        if (this.area) this.remove(this.area);

        this.areaGeometry?.dispose();
        this.areaGeometry = null;
        this.areaMaterial?.dispose();
        this.areaMaterial = null;

        this.area = null;
    }

    /**
     * Dispose of the volume and its geometry and material.
     */
    private disposeVolume(): void {
        if (this.volume) this.remove(this.volume);

        this.volumeGeometry?.dispose();
        this.volumeGeometry = null;
        this.volumeMaterial?.dispose();
        this.volumeMaterial = null;

        this.volume = null;
    }

    /**
     * Set the vertices of the shape.
     * @param points The vertices of the shape as {@link THREE.Vector3} array.
     */
    setFromPoints(points: THREE.Vector3[]): Shape3D {
        const vertices: Vertex[] = points.map((point) => point.toArray());
        this.vertices = vertices;
        this.update();
        return this;
    }

    /**
     * Set the line color.
     * @param color
     * @param force
     */
    setLineColor(color: ColorRepresentation, force: boolean = false) {
        if (this.lineColor === null) {
            this.lineColor = new THREE.Color(color);
        } else {
            this.lineColor.set(color);
        }

        this.updateMaterial(force);
    }

    setAreaColor(color: ColorRepresentation, force: boolean = false) {
        if (this.areaColor === null) {
            this.areaColor = new THREE.Color(color);
        } else {
            this.areaColor.set(color);
        }

        this.updateMaterial(force);
    }

    setVolumeColor(color: ColorRepresentation, force: boolean = false) {
        if (this.volumeColor === null) {
            this.volumeColor = new THREE.Color(color);
        } else {
            this.volumeColor.set(color);
        }

        this.updateMaterial(force);
    }

    setCloseLine(closeLine: boolean) {
        this.closeLine = closeLine;
        this.update();

        this.dispatchEvent({ type: 'close-line-changed' });
    }

    getCloseLine(): boolean {
        return this.closeLine;
    }

    setAppearance(appearance: Partial<Appearance>) {
        console.log('setAppearance', appearance);

        this.appearance = { ...this.appearance, ...appearance };

        this.update();
    }

    getAppearance(): Appearance {
        return { ...this.appearance };
    }

    /**
     * Build the shape from the vertices.
     */
    public update(): void {
        if (this.vertices.length === 0) return;

        // N.B: All shapes (line, area, volume) share the same vertices
        // Also, they are always (!) built so that one can change the shape quickly.
        this.clear();

        // Update each individual shape
        this.updateLine();
        this.updateArea();
        this.updateVolume();

        // Then call this helper function to add the shapes to the scene
        this.handleAddObjects();
    }

    /**
     * Add an objet if, and only if, it has not been added yet.
     * @param object
     * @param hasAdded
     */
    private addIf(object: THREE.Object3D, hasAdded: boolean) {
        if (hasAdded === false) {
            this.add(object);
        }
        return true;
    }

    /**
     * Add the line, area and volume to the scene.
     * This is a helper function to avoid code duplication.
     *
     * N.B: The order of the if statements is important.
     */
    private handleAddObjects(): void {
        let hasAddedLine = false;
        let hasAddedArea = false;
        let hasAddedVolume = false;

        // If line, always add line.
        if (this.shape === SUPPORTED_SHAPES.LINE) {
            hasAddedLine = this.addIf(this.line!, hasAddedLine);
        }

        // If area, check the appearance.
        if (this.shape === SUPPORTED_SHAPES.AREA) {
            if (this.appearance.alwaysShowLine) {
                hasAddedLine = this.addIf(this.line!, hasAddedLine);
            }

            hasAddedArea = this.addIf(this.area!, hasAddedArea);
        }

        // If volume, check the appearance.
        if (this.shape === SUPPORTED_SHAPES.VOLUME) {
            if (this.appearance.alwaysShowLine) {
                hasAddedLine = this.addIf(this.line!, hasAddedLine);
            }

            if (this.appearance.alwaysShowArea) {
                hasAddedArea = this.addIf(this.area!, hasAddedArea);
            }

            hasAddedVolume = this.addIf(this.volume!, hasAddedVolume);
        }
    }

    /**
     * Update material for existing (!) shape.
     *
     * @param force Force an update on all shapes.
     */
    public updateGeometry(force = true): void {
        if (this.vertices.length === 0) return;
        if (force) {
            // If force is true, update all shapes.
            switch (this.shape) {
                case SUPPORTED_SHAPES.LINE:
                    this.line === null ? this.createLine() : this.updateLineGeometry();
                    break;
                case SUPPORTED_SHAPES.AREA:
                    this.line === null ? this.createLine() : this.updateLineGeometry();
                    this.area === null ? this.createArea() : this.updateAreaGeometry();
                    break;
                case SUPPORTED_SHAPES.VOLUME:
                    this.line === null ? this.createLine() : this.updateLineGeometry();
                    this.area === null ? this.createArea() : this.updateAreaGeometry();
                    this.volume === null ? this.createVolume() : this.updateVolumeGeometry();
                    break;
                default:
                    break;
            }
        } else {
            // Otherwise, update only the current shape.
            switch (this.shape) {
                case SUPPORTED_SHAPES.LINE:
                    this.line === null ? this.createLine() : this.updateLineGeometry();
                    break;
                case SUPPORTED_SHAPES.AREA:
                    this.area === null ? this.createArea() : this.updateAreaGeometry();
                    break;
                case SUPPORTED_SHAPES.VOLUME:
                    this.volume === null ? this.createVolume() : this.updateVolumeGeometry();
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * Update material for existing (!) shape.
     *
     * @param force Force an update on all shapes.
     */
    public updateMaterial(force: boolean = true): void {
        if (this.vertices.length === 0) return;
        if (force) {
            // If force is true, update all shapes.
            switch (this.shape) {
                case SUPPORTED_SHAPES.LINE:
                    this.line === null ? this.createLine() : this.updateLineMaterial();
                    break;
                case SUPPORTED_SHAPES.AREA:
                    this.line === null ? this.createLine() : this.updateLineMaterial();
                    this.area === null ? this.createArea() : this.updateAreaMaterial();
                    break;
                case SUPPORTED_SHAPES.VOLUME:
                    this.line === null ? this.createLine() : this.updateLineMaterial();
                    this.area === null ? this.createArea() : this.updateAreaMaterial();
                    this.volume === null ? this.createVolume() : this.updateVolumeMaterial();
                    break;
                default:
                    break;
            }
        } else {
            // Otherwise, update only the current shape.
            switch (this.shape) {
                case SUPPORTED_SHAPES.LINE:
                    this.line === null ? this.createLine() : this.updateLineMaterial();
                    break;
                case SUPPORTED_SHAPES.AREA:
                    this.area === null ? this.createArea() : this.updateAreaMaterial();
                    break;
                case SUPPORTED_SHAPES.VOLUME:
                    this.volume === null ? this.createVolume() : this.updateVolumeMaterial();
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * Internal method to check if the shape is a line and if method can proceed
     */
    private checkLine() {
        // if (this.shape !== SUPPORTED_SHAPES.LINE) console.warn('Shape is not "line"');
    }

    /**
     * Internal method to check if the shape is an area and if method can proceed
     */
    private checkArea() {
        // if (this.shape !== SUPPORTED_SHAPES.AREA) console.warn('Shape is not "area"');
    }

    /**
     * Internal method to check if the shape is a volume and if method can proceed
     */
    private checkVolume() {
        // if (this.shape !== SUPPORTED_SHAPES.VOLUME) console.warn('Shape is not "volume"');
    }

    /**
     * Update the line by either creating a new one or updating the existing one.
     */
    private updateLine(): void {
        this.checkLine();

        // N.B: LineGeometry is an InstancedBufferGeometry.
        // The easiest way to update the geometry is to create a new one.
        this.createLine();
    }

    /**
     * Create a new line.
     */
    private createLine(): void {
        this.checkLine();

        // N.B: LineGeometry is an InstancedBufferGeometry.
        // The easiest way to update the geometry is to create a new one.
        this.lineGeometry = new LineGeometry();
        if (this.lineMaterial === null) this.lineMaterial = new LineMaterial({ linewidth: 5 });

        this.updateLineGeometry();
        this.updateLineMaterial();

        this.line = new Line2(this.lineGeometry, this.lineMaterial);

        this.lineMaterial.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
        this.line.computeLineDistances();
    }

    // /**
    //  * Update an existing line's geometry and material.
    //  */
    // private updateExistingLine(): void {
    //     this.checkLine();

    //     this.updateLineGeometry();
    //     this.updateLineMaterial();
    // }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateLineGeometry(): void {
        this.checkLine();

        const flatVertices: number[] = [];
        for (let i = 0; i < this.vertices.length; i++) {
            const element = this.vertices[i];
            flatVertices.push(element[0], element[1], element[2]);
        }

        if (
            // Check the property.
            this.closeLine ||
            // An area or volume should always have a closed line.
            this.shape !== SUPPORTED_SHAPES.LINE
        ) {
            flatVertices.push(...this.vertices[0]);
        }

        this.lineGeometry!.setPositions(flatVertices);
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateLineMaterial(): void {
        this.checkLine();

        this.lineMaterial!.color.copy(this.lineColor);
    }

    /**
     * Update the area by either creating a new one or updating the existing one.
     */
    private updateArea(): void {
        this.checkArea();

        this.area === null ? this.createArea() : this.updateExistingArea();
    }

    /**
     * Create a new area.
     */
    private createArea(): void {
        this.checkArea();

        if (this.areaGeometry === null) this.areaGeometry = new THREE.ShapeGeometry();
        if (this.areaMaterial === null)
            this.areaMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide });

        this.updateAreaGeometry();
        this.updateAreaMaterial();

        this.area = new THREE.Mesh(this.areaGeometry, this.areaMaterial);
        this.area.position.setY(CONFIG.Z_FIGHTING_OFFSET); // render after the opaque (default) objects
    }

    /**
     * Update an existing area's geometry and material.
     */
    private updateExistingArea(): void {
        this.checkArea();

        this.updateAreaGeometry();
        this.updateAreaMaterial();
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateAreaGeometry(): void {
        this.checkArea();

        const shape = new THREE.Shape().setFromPoints(
            this.vertices.map((v) => new THREE.Vector2(v[0], v[2])),
        );

        const geometry = new THREE.ShapeGeometry(shape);

        this.areaGeometry = geometry;
        rotateShapeGeometry(geometry);

        if (this.area) {
            this.area.geometry = geometry;
        }
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateAreaMaterial(): void {
        this.checkArea();

        this.areaMaterial!.color.copy(this.areaColor ?? this.lineColor);
    }

    /**
     * Update the volume by either creating a new one or updating the existing one.
     */
    private updateVolume(): void {
        this.checkVolume();

        this.volume === null ? this.createVolume() : this.updateExistingVolume();
    }

    /**
     * Create a new volume.
     */
    private createVolume(): void {
        this.checkVolume();

        if (this.volumeMaterial === null)
            this.volumeMaterial = new THREE.MeshBasicMaterial({
                side: THREE.BackSide,
                transparent: true,
                opacity: 0.5,
            });

        this.updateVolumeGeometry();
        this.updateVolumeMaterial();

        this.volume = new THREE.Mesh(this.volumeGeometry!, this.volumeMaterial);
    }

    /**
     * Update an existing volume's geometry and material.
     */
    private updateExistingVolume(): void {
        this.checkVolume();

        this.updateVolumeGeometry();
        this.updateVolumeMaterial();

        this.volume!.geometry = this.volumeGeometry!;
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateVolumeGeometry(): void {
        this.checkVolume();

        const shape = new THREE.Shape(
            this.vertices.flatMap((vertex) => new THREE.Vector2(vertex[0], vertex[2])),
        );

        const geometry = new THREE.ExtrudeGeometry(shape, {
            bevelEnabled: false,
            depth: this.volumeHeight,
        });

        this.volumeGeometry = geometry;

        rotateShapeGeometry(geometry);
        geometry.translate(0, this.volumeHeight, 0);

        if (this.volume) this.volume.geometry = geometry;
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateVolumeMaterial(): void {
        this.checkVolume();

        this.volumeMaterial!.color.copy(this.volumeColor ?? this.areaColor ?? this.lineColor);
    }

    /**
     * Set the height of the volume.
     * @param volumeHeight
     */
    public setVolumeHeight(volumeHeight: number) {
        this.volumeHeight = volumeHeight;

        this.updateVolume();
    }
}
