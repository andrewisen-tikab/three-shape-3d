import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

import vertexIconURL from '../../assets/icons/vertex.png?url';
import midpointIconURL from '../../assets/icons/midpoint.png?url';
import vertexHappyIconURL from '../../assets/icons/vertex-happy.png?url';
import vertexMovingIconURL from '../../assets/icons/vertex-moving.png?url';

// @ts-ignore
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
// @ts-ignore
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const handleGeometry = new THREE.BoxGeometry(1, 1, 1);
// @ts-ignore
handleGeometry.computeBoundsTree();

export type VertexType = 'vertex' | 'midpoint' | 'ghost';

export type VertexObjectParams = {
    type: VertexType;
};

export type VertexMetadata = {
    type: VertexType;
    index: number;
};

const vertexSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load(vertexIconURL),
        depthTest: false,
    }),
);
vertexSprite.renderOrder = 999;

const midpointSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load(midpointIconURL),
        depthTest: false,
    }),
);
midpointSprite.renderOrder = 999;

const vertexHappySprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load(vertexHappyIconURL),
        depthTest: false,
    }),
);
vertexHappySprite.renderOrder = 999;

const vertexMovingSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
        map: new THREE.TextureLoader().load(vertexMovingIconURL),
        depthTest: false,
    }),
);
vertexMovingSprite.renderOrder = 999;

interface Sprite extends THREE.Sprite {
    _material?: THREE.SpriteMaterial;
}

/**
 * Class that handles the display of a vertex depending of an number of factors.
 * For example, if the vertex is being hovered, it will display a different sprite.
 */
export default class VertexObject extends THREE.Object3D {
    /**
     * Reference to the dom element so we can change the cursor.
     */
    private domElement: HTMLCanvasElement;
    /**
     * For now, we only have one sprite.
     */
    private sprite!: Sprite;
    /**
     * TODO: IMport as
     */
    private vertexType: VertexType;

    constructor(domElement: HTMLCanvasElement, { type = 'vertex' }: VertexObjectParams) {
        super();
        this.domElement = domElement;
        this.vertexType = type;

        switch (type) {
            case 'vertex':
                this.addVertex();
                break;
            case 'midpoint':
                this.addMidpoint();
                break;
            case 'ghost':
                this.addGhost();
                break;
            default:
                break;
        }

        this.add(this.sprite);
        this.sprite._material = this.sprite.material;
    }

    /**
     * Adds a vertex sprite to the object.
     */
    private addVertex(): void {
        this.sprite = vertexSprite.clone();
    }

    /**
     * Adds a vertex sprite to the object.
     */
    private addMidpoint(): void {
        this.sprite = midpointSprite.clone();
    }

    /**
     * Adds a vertex sprite to the object.
     */
    private addGhost(): void {
        this.sprite = vertexSprite.clone();
    }

    /**
     * Set metadata for the children.
     * Any raycast will hit the children, not this parent object.
     * @param metadata {@link VertexMetadata}
     */
    public setMetadata(metadata: VertexMetadata) {
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i] as THREE.Object3D;
            child.userData = metadata;
        }
    }

    /**
     * Begin hover state.
     */
    public beginHover(): void {
        this.sprite.material = vertexHappySprite.material;

        switch (this.vertexType) {
            case 'vertex':
                // this.domElement.style.cursor = 'crosshair';
                break;
            case 'midpoint':
                this.domElement.style.cursor = 'copy';
                break;

            default:
                break;
        }
    }

    /**
     * End hover state.
     * Return everything to normal.
     */
    public endHover() {
        this.end();
    }

    /**
     * Begin move state.
     */
    public beginMove() {
        this.sprite.material = vertexMovingSprite.material;
        this.domElement.style.cursor = 'none';
    }

    /**
     * End move state.
     * Return everything to normal.
     */
    public endMove() {
        this.end();
    }

    /**
     * Return everything to normal.
     */
    private end() {
        this.domElement.style.cursor = 'default';
        this.sprite.material = this.sprite._material!;
    }

    public dispose() {
        this.clear();
    }
}
