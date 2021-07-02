
import { instantiateModules, parseGraph, Runner} from "@youwol/flux-lib-core"
import { ProjectMgrOutput } from '../lib/implementation/arche.state'
import { ArcheDiscontinuityMeshNode, ArcheDiscontinuityNode } from '../lib/implementation/tree-nodes'
import { findChildren } from '../lib/implementation/utils'
import { MockEnvironment } from './mock-environment'
import { ProjectMgr } from '../lib/project-mgr.module'
import { Material } from '../lib/material.module'
import { CombineLatest } from '@youwol/flux-pack-flows-std'
import { ArcheFacade } from '../lib/arche.facades'
import { addSimpleShape, loadDiscontinuityS1 } from './test-utils'
import { KeplerObject3D } from '@youwol/flux-pack-kepler'
import { BufferGeometry, Mesh } from 'three'
import { Tree } from '@youwol/flux-lib-views'
import { RemoteAndersonian } from '../lib/remote-andersonian.module'

console.log = () =>{}


test('new project wit material', (done) => {
    
    let branches = [
        '|~mockEnv~|------|#0~>a~|-----|~projectMgr~|--',
        '|~material~|-----|#1~>a~|'
    ]
    
    let modules = instantiateModules({
        mockEnv:            MockEnvironment,
        projectMgr:         ProjectMgr,
        '>a' :              [CombineLatest, {nInputs:2}],  
        material:           [Material, {poisson:0.25, young: 1.2, density:900}]
    })
    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, adaptors, observers } )

    new Runner( graph ) 

    let onInitialLoad = (data:ProjectMgrOutput) => {
        expect(data).toBeInstanceOf(ProjectMgrOutput)
        expect(data.state.withComponents.length).toEqual(1)
        let material = data.state.withComponents[0] as ArcheFacade.Material
        expect(material).toBeInstanceOf(ArcheFacade.Material)
        expect(material.parameters).toEqual({poisson:0.25, young: 1.2, density:900})
    }
    
    let onDiscontinuityAdded = (data:ProjectMgrOutput) => {
        let rootNode = data.state.node
        let discontinuityNode = findChildren<ArcheDiscontinuityNode>(rootNode,ArcheDiscontinuityNode)
        expect(discontinuityNode.length).toEqual(1)
    }

    let onDiscontinuityMeshAdded = (data:ProjectMgrOutput) => {

        let rootNode = data.state.node
        expect(data.state.solution).toBeUndefined()
        let meshNodes = findChildren<ArcheDiscontinuityMeshNode>(rootNode,ArcheDiscontinuityMeshNode)
        expect(meshNodes.length).toEqual(1)
        let commands = data.state.withCommands
        expect(commands.length).toEqual(3)
        let addMeshCmd = commands[2]
        expect(addMeshCmd).toBeInstanceOf( Tree.AddChildCommand)
        expect(addMeshCmd['parentNode']).toBeInstanceOf(ArcheDiscontinuityNode)
        expect(addMeshCmd['childNode']).toBeInstanceOf(ArcheDiscontinuityMeshNode)
        data.manager.buildObject3D(addMeshCmd['childNode'].id).subscribe(
            (object3d: Mesh) => {
                let geometry = object3d.geometry as BufferGeometry
                expect(geometry.getAttribute('position').count).toEqual(288)
            }
        )
    }
    let solutionId = undefined
    let onSolutionComputed = (data:ProjectMgrOutput) => {
        expect(data.state.solution).toBeDefined()
        expect(data.state.solutionChanged).toBeTruthy()
        let commands = data.state.withCommands
        expect(commands.length).toEqual(3)
        solutionId = data.state.solution.solutionId
    }
    
    let onObject3DBuilt = (data: ProjectMgrOutput,  object3d:KeplerObject3D) => {
        let stress = object3d.dataframe.serie('stress')
        stress.values().forEach( value => expect(value).toEqual([0.25,1.2,900])) // see line 'modules.mockEnv.send(...)
        done()
    }

    let lastUpdateIndex = loadDiscontinuityS1(0, modules, {onInitialLoad, onDiscontinuityAdded, onDiscontinuityMeshAdded, onSolutionComputed})
    
    addSimpleShape(lastUpdateIndex, modules, 'plane xy',{ onObject3DBuilt}, solutionId)

    
    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {
        return [model.material.parameters.poisson, model.material.parameters.young, model.material.parameters.density]
    })
})


test('new project with Andersonian remote', (done) => {
    
    let branches = [
        '|~mockEnv~|------|#0~>a~|-----|~projectMgr~|--',
        '|~remote~|-----|#1~>a~|'
    ]
    
    let modules = instantiateModules({
        mockEnv:            MockEnvironment,
        projectMgr:         ProjectMgr,
        '>a' :              [CombineLatest, {nInputs:2}],  
        remote:             [RemoteAndersonian, {HSigma:1, hSigma:0, vSigma:0, theta: 180}]
    })
    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, adaptors, observers } )

    new Runner( graph ) 

    let onInitialLoad = (data:ProjectMgrOutput) => {
        expect(data).toBeInstanceOf(ProjectMgrOutput)
        expect(data.state.withComponents.length).toEqual(1)
        let remote = data.state.withComponents[0] as ArcheFacade.AndersonianRemote
        expect(remote).toBeInstanceOf(ArcheFacade.AndersonianRemote)
        expect(remote.parameters).toEqual({HSigma:1, hSigma:0, vSigma:0, theta: 180})
    }
    
    let onObject3DBuilt = (data: ProjectMgrOutput,  object3d:KeplerObject3D) => {
        let stress = object3d.dataframe.serie('stress')
        stress.values().forEach( value => expect(value).toEqual([1,180])) // see line 'modules.mockEnv.send(...)
        done()
    }

    let lastUpdateIndex = loadDiscontinuityS1(0, modules, {onInitialLoad})
    
    addSimpleShape(lastUpdateIndex, modules, 'plane xy',{ onObject3DBuilt})

    
    modules.mockEnv.send( (model:ArcheFacade.Model, position:[number,number,number]) => {
        let remote = model.remotes[0]
        return [remote.parameters.HSigma, remote.parameters.theta]
    })
})