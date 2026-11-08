import type * as THREE from 'three'

export class SceneIndex<T extends THREE.Object3D> {
  private readonly _root: THREE.Object3D
  private readonly _matches: (object: THREE.Object3D) => object is T
  private readonly _watched = new Set<THREE.Object3D>()
  private _objects: T[] = []
  private _dirty = true
  private _disposed = false
  private readonly _added = (event: THREE.Object3DEventMap['childadded']) => {
    this._watch(event.child)
    this._dirty = true
  }
  private readonly _removed = (event: THREE.Object3DEventMap['childremoved']) => {
    event.child.traverse(object => {
      object.removeEventListener('childadded', this._added)
      object.removeEventListener('childremoved', this._removed)
      this._watched.delete(object)
    })
    this._dirty = true
  }

  public constructor(root: THREE.Object3D, matches: (object: THREE.Object3D) => object is T) {
    this._root = root
    this._matches = matches
    this._watch(root)
  }

  private _watch(root: THREE.Object3D): void {
    root.traverse(object => {
      if (!this._watched.has(object)) {
        this._watched.add(object)
        object.addEventListener('childadded', this._added)
        object.addEventListener('childremoved', this._removed)
      }
    })
  }

  public get objects(): readonly T[] {
    if (this._dirty && !this._disposed) {
      this._objects = []
      this._root.traverse(object => {
        if (this._matches(object)) {
          this._objects.push(object)
        }
      })
      this._dirty = false
    }
    return this._objects
  }

  public dispose(): void {
    for (const object of this._watched) {
      object.removeEventListener('childadded', this._added)
      object.removeEventListener('childremoved', this._removed)
    }
    this._watched.clear()
    this._objects = []
    this._disposed = true
  }
}
