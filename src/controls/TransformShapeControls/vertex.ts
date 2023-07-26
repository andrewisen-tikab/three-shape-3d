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

export type VertexObjectParams = {
    type: 'vertex' | 'midpoint';
};

export type VertexMetadata = {
    type: 'vertex' | 'midpoint';
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

export default class VertexObject extends THREE.Object3D {
    private domElement: HTMLCanvasElement;
    private sprite!: Sprite;
    private vertexType: 'vertex' | 'midpoint';

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
            default:
                break;
        }

        this.add(this.sprite);
        this.sprite._material = this.sprite.material;
    }

    private addVertex() {
        this.sprite = vertexSprite.clone();
    }

    private addMidpoint() {
        this.sprite = midpointSprite.clone();
    }

    public setMetadata(metadata: VertexMetadata) {
        for (let i = 0; i < this.children.length; i++) {
            const child = this.children[i] as THREE.Object3D;
            child.userData = metadata;
        }
    }

    public beginHover() {
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

    public endHover() {
        this.end();
    }

    public beginMove() {
        this.sprite.material = vertexMovingSprite.material;
        this.domElement.style.cursor = 'none';
    }

    public endMove() {
        this.end();
    }

    private end() {
        this.domElement.style.cursor = 'default';
        this.sprite.material = this.sprite._material!;
    }
}
