import type { IsleBase } from '../../../worlds/isle-base'
import type { Boundary, Edge } from '../../assets/boundary'
import type { Roi3D } from '../../assets/model'
import { PathActor } from './path-actor'

export class RaceCar extends PathActor {
  private _jumpEdges = new Map<
    Edge,
    {
      boundary: Boundary
      edge: Edge
    }
  >()

  private addJumpEdge(startBoundaryName: string, startEdgeIndex: number, endBoundaryName: string, endEdgeIndex: number): void {
    const startBoundary = this._isle.boundaryManager.getBoundary(startBoundaryName)
    if (startBoundary == null) {
      throw new Error(`Boundary ${startBoundaryName} not found`)
    }
    const endBoundary = this._isle.boundaryManager.getBoundary(endBoundaryName)
    if (endBoundary == null) {
      throw new Error(`Boundary ${endBoundaryName} not found`)
    }
    this._jumpEdges.set(startBoundary.edges[startEdgeIndex], {
      boundary: endBoundary,
      edge: endBoundary.edges[endEdgeIndex],
    })
  }

  constructor(_roi: Roi3D, _isle: IsleBase) {
    super(_roi, _isle)

    this.addJumpEdge('edg03_21', 2, 'edg03_23', 2)
    this.addJumpEdge('edg03_30', 2, 'edg03_31', 1)
    this.addJumpEdge('edg03_39', 2, 'edg03_40', 2)
    this.addJumpEdge('edg03_91', 2, 'edg03_92', 2)
    this.addJumpEdge('edg03_99', 2, 'edg03_100', 2)
    this.addJumpEdge('edg03_112', 2, 'edg03_113', 2)
  }

  protected override _switchBoundary(): void {
    const jumpEdge = this._jumpEdges.get(this.destination.edge)
    if (jumpEdge != null) {
      this._destination = {
        boundary: jumpEdge.boundary,
        edge: jumpEdge.edge,
        scale: this.destination.scale,
      }

      this._spline = this._calculateSpline({ forceDistance: 5 })
      this._distanceTraveled = 0
      return
    }

    super._switchBoundary()
  }
}
