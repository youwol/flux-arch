
import {instantiateModules, instantiatePlugins, parseGraph, Runner, StaticStorage} from "@youwol/flux-core"
import { MockEnvironment } from './mock-environment'
import { ProjectMgr } from '../lib/project-mgr.module'
import { WorkflowManager } from '../lib/workflow-manager.module'
import { WorkflowStep } from '../lib/workflow-step.plugin'
import { take } from 'rxjs/internal/operators/take'
import { map, skip } from 'rxjs/operators'
import { ProjectMgrOutput } from '../lib/implementation/arche.state'


console.log = () => {}


test('one step WF', (done) => {

    StaticStorage.defaultStorage = new StaticStorage('default', undefined);

    let branches = [
        '|~mockEnv~|----|~projectMgr1~|--',
        '|~WfStep1~|',
        '|~WfMgr~|--'
    ]
    
    let modules = instantiateModules({
        mockEnv:            MockEnvironment,
        projectMgr1:        [ProjectMgr, {projectName:'step1'}],
        WfMgr:              WorkflowManager
    })

    let plugins = instantiatePlugins({
        WfStep1:             [WorkflowStep, modules.projectMgr1],
    })

    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, plugins, adaptors, observers } )
    new Runner( graph ) 
    
    modules.WfMgr.output$.pipe(take(1), map( ({data}) => data ))
    .subscribe( ( project : ProjectMgrOutput ) => {  

        expect(project.state.id).toEqual("projectMgr1")            
        done()
    })

    modules.WfMgr.switchTo(plugins.WfStep1)

    modules.mockEnv.send()
})


test('two steps WF', (done) => {

    StaticStorage.defaultStorage = new StaticStorage('default', undefined);

    let branches = [
        '|~mockEnv~|----|~projectMgr1~|---|~projectMgr2~|-',
        '|~WfStep1~|',
        '|~WfStep2~|',
        '|~WfMgr~|--'
    ]
    
    let modules = instantiateModules({
        mockEnv:            MockEnvironment,
        projectMgr1:        [ProjectMgr, {projectName:'step1'}],
        projectMgr2:        [ProjectMgr, {projectName:'step2'}],
        WfMgr:              WorkflowManager
    })

    let plugins = instantiatePlugins({
        WfStep1:             [WorkflowStep, modules.projectMgr1],
        WfStep2:             [WorkflowStep, modules.projectMgr2],
    })

    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, plugins, adaptors, observers } )
    new Runner( graph ) 
    
    modules.WfMgr.output$.pipe(take(1), map( ({data}) => data )).subscribe( (d: ProjectMgrOutput) => {
        expect(d.state.id).toEqual("projectMgr1")     
        setTimeout( () => modules.WfMgr.switchTo(plugins.WfStep2) , 0  )
    })
    modules.WfMgr.output$.pipe(skip(1), take(1), map( ({data}) => data )).subscribe( (d: ProjectMgrOutput) => {
        expect(d.state.id).toEqual("projectMgr2")     
        modules.WfMgr.removeStep(plugins.WfStep1)
        done()
    })
    modules.WfMgr.switchTo(plugins.WfStep1)

    modules.mockEnv.send()
})


test('two steps WF, check tree', (done) => {

    StaticStorage.defaultStorage = new StaticStorage('default', undefined);

    let branches = [
        '|~mockEnv~|----|~projectMgr1~|---|~projectMgr2~|-',
        '|~WfStep1~|',
        '|~WfStep2~|',
        '|~WfMgr~|--'
    ]
    
    let modules = instantiateModules({
        mockEnv:            MockEnvironment,
        projectMgr1:        [ProjectMgr, {projectName:'step1'}],
        projectMgr2:        [ProjectMgr, {projectName:'step2'}],
        WfMgr:              WorkflowManager
    })

    let plugins = instantiatePlugins({
        WfStep1:             [WorkflowStep, modules.projectMgr1],
        WfStep2:             [WorkflowStep, modules.projectMgr2],
    })

    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, plugins, adaptors, observers } )
    new Runner( graph ) 
    
    modules.WfMgr.tree$.pipe(take(1)).subscribe( tree => {
        // should be either step1 or step2 here; but not both
        expect(tree.root.children.length).toEqual(1)
        let step = tree.root.children[0]
        expect(step.children.length).toEqual(0)
    })
    
    modules.WfMgr.tree$.pipe(skip(1), take(1)).subscribe( tree => {
        // should be step1 + step2
        expect(tree.root.children.length).toEqual(1)
        let step1 = tree.root.children[0]
        expect(step1.name).toEqual("step1")
        expect(step1.children.length).toEqual(1)
        let step2 = step1.children[0]
        expect(step2.name).toEqual("step2")
        done()
    })
    

    modules.WfMgr.switchTo(plugins.WfStep1)

    modules.mockEnv.send()
})
