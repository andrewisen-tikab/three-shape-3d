import * as THREE from 'three';

const _dummyMatrix = new THREE.Matrix4();

class InstancedGLTFMesh extends THREE.InstancedMesh {
    _matrix: THREE.Matrix4;

    constructor(
        geometry: THREE.BufferGeometry,
        material: THREE.Material | THREE.Material[],
        count: number,
    ) {
        super(geometry, material, count);
        this._matrix = new THREE.Matrix4();
    }
}

/**
 * Treat a `glb` file as an {@link THREE.InstancedMesh} by creating a {@link THREE.InstancedMesh} for each `mesh` in the `glb` file.
 */
export default class InstancedGLTF extends THREE.Object3D {
    /**
     * Helper flag to identify this object as an `InstancedGLTF`.
     */
    public isInstancedGLTF: boolean;

    /**
     * Array of {@link InstancedGLTFMesh} meshes.
     */
    public instancedMeshes: InstancedGLTFMesh[];

    /**
     * Each `object` may consist of multiple `meshes`.
     * For each `mesh`, a unique matrix must be allocated.
     */
    public matrices: THREE.Matrix4[] = [];

    private gltf: THREE.Object3D<THREE.Event>;

    private count: number = 0;

    private poolPosition: THREE.Vector3;

    /**
     * Create `Model3D` object.
     */
    constructor(gltf: THREE.Object3D, poolPosition: THREE.Vector3) {
        super();
        this.gltf = gltf;
        this.isInstancedGLTF = true;
        this.instancedMeshes = [];
        this.matrices = [];
        this.matrixAutoUpdate = false;
        this.poolPosition = new THREE.Vector3();
        this.setPoolPosition(poolPosition.toArray());
    }

    public setPoolPosition(position: THREE.Vector3Tuple): void {
        this.poolPosition.set(...position);
        _dummyMatrix.setPosition(this.poolPosition);
    }

    public getPoolPosition(): Readonly<THREE.Vector3> {
        return this.poolPosition;
    }

    public setGLTF(gltf: THREE.Object3D): void {
        this.gltf = gltf;
    }

    public getGLTF(): Readonly<THREE.Object3D> {
        return this.gltf;
    }

    public setCount(count: number): void {
        this.count = count;
    }

    public getCount(): Readonly<number> {
        return this.count;
    }

    public generate() {
        this.gltf.traverse((_child) => {
            const child = _child as THREE.Mesh;
            if (!child.isMesh) return;
            this.generateInstancedMesh(child);
        });
        this.updateRest();
    }

    private generateInstancedMesh(child: THREE.Mesh): void {
        const clone = child.clone();
        clone.geometry = clone.geometry.clone();
        clone.updateMatrix();
        clone.updateMatrixWorld();

        const matrix = clone.matrixWorld.clone();

        clone.geometry.applyMatrix4(matrix);

        const instancedMesh = new InstancedGLTFMesh(clone.geometry, clone.material, this.count);
        instancedMesh._matrix = matrix;

        this.instancedMeshes.push(instancedMesh);

        this.add(instancedMesh);
    }

    /**
     * The index of an instance.
     * Values have to be in the range [0, count]
     * Expects a Integer
     * @param index
     * @param matrix
     */
    public updateAt(index: number, matrix: THREE.Matrix4) {
        for (let i = 0; i < this.instancedMeshes.length; i++) {
            const instancedMesh = this.instancedMeshes[i];

            instancedMesh.setMatrixAt(index, matrix);
            instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }

    public updateRest(index: number = 0, count: number = this.count) {
        for (let i = 0; i < this.instancedMeshes.length; i++) {
            const instancedMesh = this.instancedMeshes[i];
            for (let j = index; j < count; j++) {
                instancedMesh.setMatrixAt(j, _dummyMatrix);
            }
            instancedMesh.instanceMatrix.needsUpdate = true;
        }
    }

    public dispose(): void {
        this.clear();
        for (let i = 0; i < this.instancedMeshes.length; i++) {
            this.instancedMeshes[i].dispose();
        }
        this.instancedMeshes = [];
        this.matrices = [];
    }
}
