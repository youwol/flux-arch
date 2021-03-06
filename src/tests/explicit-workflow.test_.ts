import { instantiateModules, parseGraph, Runner } from "@youwol/flux-core"
import { ModulePlane } from '@youwol/flux-three'
import { ModuleCombineLatest } from '@youwol/flux-rxjs'
import { ArchFacade } from '../lib/arch.facades'
import { ModuleBoundaryCondition } from '../lib/boundary-condition.module'
import { ModuleConstraintCoulombOrtho } from '../lib/constraint-coulomb-ortho.module'
import { ModuleConstraintCoulomb } from '../lib/constraint-coulomb.module'
import { ModuleSurface } from '../lib/surface.module'


console.log = () => {}

test('new project with Andersonian remote', (done) => {
    
    let branches = [
        '|~bc~|--------------|#0~>a~|-----|~surface~|--',
        '|~coulomb~|---------|#1~>a~|',
        '|~coulombOrtho~|----|#2~>a~|',
        '|~plane~|-----------|#3~>a~|'
    ]
    
    let modules = instantiateModules({
        '>a' :              [ModuleCombineLatest, {nInputs:4}],  
        bc:                 ModuleBoundaryCondition ,
        coulomb:            [ModuleConstraintCoulomb, {friction:1, cohesion:2}],
        coulombOrtho:       [ModuleConstraintCoulombOrtho, {theta:180, frictionDip:1, frictionStrike:2}],
        surface:            ModuleSurface,
        plane:              [ModulePlane,{widthCount:5, heightCount:5}]
    })
    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, adaptors, observers } )

    new Runner( graph ) 
    modules.surface.surface$.subscribe( ({data}) => {
        expect(data).toBeInstanceOf(ArchFacade.Surface)
        expect(data.constraints.length).toEqual(2)
        expect(data.constraints.find( c => c instanceof ArchFacade.CoulombConstraint).parameters)
        .toEqual({friction:1, cohesion:2})
        expect(data.constraints.find( c => c instanceof ArchFacade.CoulombOrthoConstraint).parameters)
        .toEqual({theta:180, frictionDip:1, frictionStrike:2})
        done()
    })
})