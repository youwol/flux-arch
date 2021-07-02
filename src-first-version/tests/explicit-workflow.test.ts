import { instantiateModules, parseGraph, Runner } from "@youwol/flux-lib-core"
import { PlaneGeometry } from '@youwol/flux-pack-3d-basics'
import { CombineLatest } from '@youwol/flux-pack-flows-std'
import { ArcheFacade } from '../lib/arche.facades'
import { BoundaryCondition } from '../lib/boundary-condition.module'
import { ConstraintCoulombOrtho } from '../lib/constraint-coulomb-ortho.module'
import { ConstraintCoulomb } from '../lib/constraint-coulomb.module'
import { SurfaceBuilder } from '../lib/surface-builder.module'


console.log = () => {}

test('new project with Andersonian remote', (done) => {
    
    let branches = [
        '|~bc~|--------------|#0~>a~|-----|~surface~|--',
        '|~coulomb~|---------|#1~>a~|',
        '|~coulombOrtho~|----|#2~>a~|',
        '|~plane~|-----------|#3~>a~|'
    ]
    
    let modules = instantiateModules({
        '>a' :              [CombineLatest, {nInputs:4}],  
        bc:                 BoundaryCondition ,
        coulomb:            [ConstraintCoulomb, {friction:1, cohesion:2}],
        coulombOrtho:       [ConstraintCoulombOrtho, {theta:180, frictionDip:1, frictionStrike:2}],
        surface:            SurfaceBuilder,
        plane:              [PlaneGeometry,{widthCount:5, heightCount:5}]
    })
    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, adaptors, observers } )

    new Runner( graph ) 
    modules.surface.surface$.subscribe( ({data}) => {
        expect(data).toBeInstanceOf(ArcheFacade.Surface)
        expect(data.constraints.length).toEqual(2)
        expect(data.constraints.find( c => c instanceof ArcheFacade.CoulombConstraint).parameters)
        .toEqual({friction:1, cohesion:2})
        expect(data.constraints.find( c => c instanceof ArcheFacade.CoulombOrthoConstraint).parameters)
        .toEqual({theta:180, frictionDip:1, frictionStrike:2})
        done()
    })
})