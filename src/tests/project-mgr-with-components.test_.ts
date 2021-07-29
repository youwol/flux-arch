
import { instantiateModules, parseGraph, Runner} from "@youwol/flux-core"
import { ProjectMgrOutput } from '../lib/implementation/arche.state'
import { ArchDiscontinuityMeshNode, ArchDiscontinuityNode } from '../lib/implementation/tree-nodes'
import { findChildren } from '../lib/implementation/utils'
import { MockEnvironment } from './mock-environment'
import { ProjectMgr } from '../lib/project-mgr.module'
import { ModuleMaterial } from '../lib/material.module'
import { ModuleCombineLatest } from '@youwol/flux-rxjs'
import { ArchFacade } from '../lib/arche.facades'
import { addSimpleShape, loadDiscontinuityS1 } from './test-utils'
import { KeplerMesh } from '@youwol/flux-kepler'
import { BufferGeometry, Mesh } from 'three'
import { ImmutableTree } from '@youwol/fv-tree'
import { ModuleRemoteAndersonian } from '../lib/remote-andersonian.module'

console.log = () =>{}


test('new project wit material', (done) => {
    
    let branches = [
        '|~mockEnv~|------|#0~>a~|-----|~projectMgr~|--',
        '|~material~|-----|#1~>a~|'
    ]
    
    let modules = instantiateModules({
        mockEnv:            MockEnvironment,
        projectMgr:         ProjectMgr,
        '>a' :              [ModuleCombineLatest, {nInputs:2}],  
        material:           [ModuleMaterial, {poisson:0.25, young: 1.2, density:900}]
    })
    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, adaptors, observers } )

    new Runner( graph ) 

    let onInitialLoad = (data:ProjectMgrOutput) => {
        expect(data).toBeInstanceOf(ProjectMgrOutput)
        expect(data.state.withComponents.length).toEqual(1)
        let material = data.state.withComponents[0] as ArchFacade.Material
        expect(material).toBeInstanceOf(ArchFacade.Material)
        expect(material.parameters).toEqual({poisson:0.25, young: 1.2, density:900})
    }
    
    let onDiscontinuityAdded = (data:ProjectMgrOutput) => {
        let rootNode = data.state.node
        let discontinuityNode = findChildren<ArchDiscontinuityNode>(rootNode,ArchDiscontinuityNode)
        expect(discontinuityNode.length).toEqual(1)
    }

    let onDiscontinuityMeshAdded = (data:ProjectMgrOutput) => {

        let rootNode = data.state.node
        expect(data.state.solution).toBeUndefined()
        let meshNodes = findChildren<ArchDiscontinuityMeshNode>(rootNode,ArchDiscontinuityMeshNode)
        expect(meshNodes.length).toEqual(1)
        let commands = data.state.withCommands
        expect(commands.length).toEqual(3)
        let addMeshCmd = commands[2]
        expect(addMeshCmd).toBeInstanceOf( ImmutableTree.AddChildCommand)
        expect(addMeshCmd['parentNode']).toBeInstanceOf(ArchDiscontinuityNode)
        expect(addMeshCmd['childNode']).toBeInstanceOf(ArchDiscontinuityMeshNode)
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
    
    let onObject3DBuilt = (data: ProjectMgrOutput,  object3d:KeplerMesh) => {
        let stress = object3d.dataframe.series.stress
        stress.array.forEach( value => expect(value).toEqual([0.25,1.2,900])) // see line 'modules.mockEnv.send(...)
        done()
    }

    let lastUpdateIndex = loadDiscontinuityS1(0, modules, {onInitialLoad, onDiscontinuityAdded, onDiscontinuityMeshAdded, onSolutionComputed})
    
    addSimpleShape(lastUpdateIndex, modules, 'plane xy',{ onObject3DBuilt}, solutionId)

    
    modules.mockEnv.send( (model:ArchFacade.Model, position:[number,number,number]) => {
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
        '>a' :              [ModuleCombineLatest, {nInputs:2}],  
        remote:             [ModuleRemoteAndersonian, {HSigma:1, hSigma:0, vSigma:0, theta: 180}]
    })
    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, adaptors, observers } )

    new Runner( graph ) 

    let onInitialLoad = (data:ProjectMgrOutput) => {
        expect(data).toBeInstanceOf(ProjectMgrOutput)
        expect(data.state.withComponents.length).toEqual(1)
        let remote = data.state.withComponents[0] as ArchFacade.AndersonianRemote
        expect(remote).toBeInstanceOf(ArchFacade.AndersonianRemote)
        expect(remote.parameters).toEqual({HSigma:1, hSigma:0, vSigma:0, theta: 180})
    }
    
    let onObject3DBuilt = (data: ProjectMgrOutput,  object3d:KeplerMesh) => {
        let stress = object3d.dataframe.series.stress
        stress.array.forEach( value => expect(value).toEqual([1,180])) // see line 'modules.mockEnv.send(...)
        done()
    }

    let lastUpdateIndex = loadDiscontinuityS1(0, modules, {onInitialLoad})
    
    addSimpleShape(lastUpdateIndex, modules, 'plane xy',{ onObject3DBuilt})

    
    modules.mockEnv.send( (model:ArchFacade.Model, position:[number,number,number]) => {
        let remote = model.remotes[0]
        return [remote.parameters.HSigma, remote.parameters.theta]
    })
})