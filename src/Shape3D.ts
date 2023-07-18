import Shape3DCore from './core/Shape3DCore';
import { SUPPORTED_SHAPES } from './types';
import type { ColorRepresentation, Shape3DParams, SupportedShapes, Vertex } from './types';

import * as THREE from 'three';

const rotateShapeGeometry = (geometry: THREE.BufferGeometry): void => {
    geometry.rotateX(-Math.PI / 2);
    geometry.rotateY(-Math.PI);
    geometry.rotateZ(-Math.PI);
};

export default class Shape3D extends Shape3DCore {
    private lineColor: THREE.Color;
    private areaColor: THREE.Color | null = null;
    private volumeColor: THREE.Color | null = null;

    private closeLine: boolean;

    private lineGeometry: THREE.BufferGeometry<THREE.NormalBufferAttributes> | null = null;
    private lineMaterial: THREE.LineBasicMaterial | null = null;
    private line: THREE.Line | null = null;

    private areaGeometry: THREE.ShapeGeometry | null = null;
    private areaMaterial: THREE.MeshBasicMaterial | null = null;
    private area: THREE.Mesh | null = null;

    private volumeGeometry: THREE.ExtrudeGeometry | null = null;
    private volumeMaterial: THREE.MeshBasicMaterial | null = null;
    private volume: THREE.Mesh | null = null;
    private volumeHeight: number;

    constructor(params?: Partial<Shape3DParams>) {
        super(params);

        const {
            lineColor = 0xffffff,
            areaColor,
            volumeColor,
            closeLine = false,
            volumeHeight = 5,
        } = params || {};
        this.lineColor = new THREE.Color(lineColor);
        if (areaColor) this.areaColor = new THREE.Color(areaColor);
        if (volumeColor) this.volumeColor = new THREE.Color(volumeColor);

        this.closeLine = closeLine;
        this.volumeHeight = volumeHeight;
    }

    public setShape(shape: SupportedShapes): SupportedShapes {
        super.setShape(shape);

        this.clear();
        switch (this.shape) {
            case SUPPORTED_SHAPES.LINE:
                this.disposeLine();
                break;
            case SUPPORTED_SHAPES.AREA:
                this.disposeArea();
                break;
            case SUPPORTED_SHAPES.VOLUME:
                this.disposeVolume();
                break;
            default:
                break;
        }

        this.update();
        return this.shape;
    }

    public dispose(): void {
        this.clear();
    }

    private disposeLine(): void {
        this.lineGeometry?.dispose();
        this.lineGeometry = null;
        this.lineMaterial?.dispose();
        this.lineMaterial = null;

        this.line = null;
    }

    private disposeArea(): void {
        this.areaGeometry?.dispose();
        this.areaGeometry = null;
        this.areaMaterial?.dispose();
        this.areaMaterial = null;

        this.area = null;
    }

    private disposeVolume(): void {
        this.volumeGeometry?.dispose();
        this.volumeGeometry = null;
        this.volumeMaterial?.dispose();
        this.volumeMaterial = null;

        this.volume = null;
    }

    setFromPoints(points: THREE.Vector3[]): Shape3D {
        const vertices: Vertex[] = points.map((point) => point.toArray());
        this.vertices = vertices;
        this.updateGeometry();
        return this;
    }

    setLineColor(color: ColorRepresentation) {
        if (this.lineColor === null) {
            this.lineColor = new THREE.Color(color);
        } else {
            this.lineColor.set(color);
        }

        this.updateMaterial();
    }

    setAreaColor(color: ColorRepresentation) {
        if (this.areaColor === null) {
            this.areaColor = new THREE.Color(color);
        } else {
            this.areaColor.set(color);
        }

        this.updateMaterial();
    }

    setVolumeColor(color: ColorRepresentation) {
        if (this.volumeColor === null) {
            this.volumeColor = new THREE.Color(color);
        } else {
            this.volumeColor.set(color);
        }

        this.updateMaterial();
    }

    setCloseLine(closeLine: boolean) {
        this.closeLine = closeLine;
        this.updateLineGeometry();
        this.dispatchEvent({ type: 'close-line-changed', data: { closeLine } });
    }

    getCloseLine(): boolean {
        return this.closeLine;
    }

    /**
     * Build the shape from the vertices.
     */
    public update(): void {
        if (this.vertices.length === 0) return;
        switch (this.shape) {
            case SUPPORTED_SHAPES.LINE:
                this.updateLine();
                break;
            case SUPPORTED_SHAPES.AREA:
                this.updateArea();
                break;
            case SUPPORTED_SHAPES.VOLUME:
                this.updateVolume();
                break;
            default:
                break;
        }
    }

    /**
     * Update geometry for existing (!) shape.
     */
    public updateGeometry(): void {
        if (this.vertices.length === 0) return;

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

    /**
     * Update material for existing (!) shape.
     */
    public updateMaterial(): void {
        if (this.vertices.length === 0) return;
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

    private checkLine() {
        if (this.shape !== SUPPORTED_SHAPES.LINE) throw new Error('Shape is not "line"');
    }

    private checkArea() {
        if (this.shape !== SUPPORTED_SHAPES.AREA) throw new Error('Shape is not "area"');
    }

    private checkVolume() {
        if (this.shape !== SUPPORTED_SHAPES.VOLUME) throw new Error('Shape is not "volume"');
    }

    private updateLine(): void {
        this.checkLine();

        this.line === null ? this.createLine() : this.updateExistingLine();
    }

    private createLine(): void {
        this.checkLine();

        if (this.lineGeometry === null) this.lineGeometry = new THREE.BufferGeometry();
        if (this.lineMaterial === null) this.lineMaterial = new THREE.LineBasicMaterial();

        this.updateLineGeometry();
        this.updateLineMaterial();

        this.line = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.add(this.line);
    }

    private updateExistingLine(): void {
        this.checkLine();

        this.updateLineGeometry();
        this.updateLineMaterial();
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateLineGeometry(): void {
        this.checkLine();

        const flatVertices = [];
        for (let i = 0; i < this.vertices.length; i++) {
            const element = this.vertices[i];
            flatVertices.push(element[0], element[1], element[2]);
        }

        if (this.closeLine) flatVertices.push(...this.vertices[0]);

        this.lineGeometry!.setAttribute(
            'position',
            new THREE.Float32BufferAttribute(flatVertices, 3),
        );
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateLineMaterial(): void {
        this.checkLine();

        this.lineMaterial!.color.copy(this.lineColor);
    }

    private updateArea(): void {
        this.checkArea();

        this.area === null ? this.createArea() : this.updateExistingArea();
    }

    private createArea(): void {
        this.checkArea();

        if (this.areaGeometry === null) this.areaGeometry = new THREE.ShapeGeometry();
        if (this.areaMaterial === null)
            this.areaMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide });

        this.updateAreaGeometry();
        this.updateAreaMaterial();

        this.area = new THREE.Mesh(this.areaGeometry, this.areaMaterial);
        this.add(this.area);
    }

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

    private updateVolume(): void {
        this.checkVolume();

        this.volume === null ? this.createVolume() : this.updateExistingVolume();
    }

    private createVolume(): void {
        this.checkVolume();

        if (this.volumeMaterial === null)
            this.volumeMaterial = new THREE.MeshBasicMaterial({ side: THREE.BackSide });

        this.updateVolumeGeometry();
        this.updateVolumeMaterial();

        this.volume = new THREE.Mesh(this.volumeGeometry!, this.volumeMaterial);
        this.add(this.volume);
    }

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

        if (this.volume) {
            this.volume.geometry = geometry;
        }
    }

    /**
     * N.B: Must be called by an `update` method!
     */
    private updateVolumeMaterial(): void {
        this.checkVolume();

        this.volumeMaterial!.color.copy(this.volumeColor ?? this.areaColor ?? this.lineColor);
    }

    public setVolumeHeight(volumeHeight: number) {
        this.volumeHeight = volumeHeight;

        this.updateVolume();
    }
}
