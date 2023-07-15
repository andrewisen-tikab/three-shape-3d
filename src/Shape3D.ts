import Shape3DCore from './core/Shape3DCore';
import { SUPPORTED_SHAPES } from './types';
import type { ColorRepresentation, Shape3DParams, SupportedShapes, Vertex } from './types';

import * as THREE from 'three';

export default class Shape3D extends Shape3DCore {
    private primaryColor: THREE.Color;
    private secondaryColor: THREE.Color | null = null;
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
            primaryColor = 0xffffff,
            secondaryColor = 0xffffff,
            closeLine = false,
            volumeHeight = 5,
        } = params || {};
        this.primaryColor = new THREE.Color(primaryColor);
        if (secondaryColor !== null) this.secondaryColor = new THREE.Color(secondaryColor);
        this.closeLine = closeLine;
        this.volumeHeight = volumeHeight;
    }

    public setShape(shape: SupportedShapes): void {
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
        this.update();
        return this;
    }

    setPrimaryColor(color: ColorRepresentation) {
        this.primaryColor = new THREE.Color(color);
        this.update();
    }

    setSecondaryColor(color: ColorRepresentation) {
        if (this.secondaryColor === null) {
            this.secondaryColor = new THREE.Color(color);
        } else {
            this.secondaryColor.set(color);
        }

        this.update();
    }

    setCloseLine(closeLine: boolean) {
        this.closeLine = closeLine;
        this.updateLineGeometry();
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
     * Must be called by `updateLine`.
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
     * Must be called by `updateLine`.
     */
    private updateLineMaterial(): void {
        this.checkLine();

        this.lineMaterial!.color.copy(this.primaryColor);
    }

    private updateArea(): void {
        this.checkArea();

        this.area === null ? this.createArea() : this.updateExistingArea();
    }

    private createArea(): void {
        this.checkArea();

        if (this.areaGeometry === null) this.areaGeometry = new THREE.ShapeGeometry();
        if (this.areaMaterial === null) this.areaMaterial = new THREE.MeshBasicMaterial();

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
     * Must be called by `updateArea`.
     */
    private updateAreaGeometry(): void {
        this.checkArea();

        const flatVertices: THREE.Vector2[] = [];
        for (let i = 0; i < this.vertices.length; i++) {
            const element = this.vertices[i];
            flatVertices.push(new THREE.Vector2(element[0], element[2]));
        }

        flatVertices.push(new THREE.Vector2(this.vertices[0][0], this.vertices[0][2]));

        this.areaGeometry!.setFromPoints(flatVertices);
        this.areaGeometry!.rotateX(Math.PI / 2);
    }

    /**
     * Must be called by `updateArea`.
     */
    private updateAreaMaterial(): void {
        this.checkArea();

        this.areaMaterial!.color.copy(this.primaryColor);
    }

    private updateVolume(): void {
        this.checkVolume();

        this.volume === null ? this.createVolume() : this.updateExistingVolume();
    }

    private createVolume(): void {
        this.checkVolume();

        if (this.volumeMaterial === null) this.volumeMaterial = new THREE.MeshBasicMaterial();

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
     * Must be called by `updateVolume`.
     */
    private updateVolumeGeometry(): void {
        this.checkVolume();

        const shape = new THREE.Shape(
            this.vertices.flatMap((vertex) => new THREE.Vector2(vertex[0], vertex[2])),
        );

        this.volumeGeometry = new THREE.ExtrudeGeometry(shape, {
            bevelEnabled: false,
            depth: this.volumeHeight,
        });

        this.volumeGeometry!.rotateX(-Math.PI / 2);
        this.volumeGeometry!.rotateY(-Math.PI);
        this.volumeGeometry!.rotateZ(-Math.PI);
        this.volumeGeometry!.translate(0, this.volumeHeight, 0);
    }

    /**
     * Must be called by `updateArea`.
     */
    private updateVolumeMaterial(): void {
        this.checkVolume();

        this.volumeMaterial!.color.copy(this.primaryColor);
    }

    public setVolumeHeight(volumeHeight: number) {
        this.volumeHeight = volumeHeight;

        this.updateVolume();
    }
}
