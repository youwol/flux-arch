
import {instantiateModules, instantiatePlugins, parseGraph, renderTemplate, Runner, StaticStorage} from "@youwol/flux-core"
import { MockEnvironment } from './mock-environment'
import { ProjectMgr } from '../lib/project-mgr.module'
import { ProjectView } from '../lib/project-view.module'
import { delay, map, skip, switchMap, take } from 'rxjs/operators'
import { ArchDiscontinuityNode, ArchFolderDiscontinuityNode, ArchFolderObservationNode, ArchNode } from '../lib/implementation/tree-nodes'
import { findChild } from '../lib/implementation/utils'
import { getActions } from '../lib/views/tree-elements.view'
//import { getAbsoluteTestDataPath } from '../../../shared/test/utils'
import * as fs from 'fs'
import { WorkflowManager } from '../lib/workflow-manager.module'
import { WorkflowStep } from '../lib/workflow-step.plugin'
import { ProjectMgrOutput } from '../lib/implementation/arche.state'
import { of } from 'rxjs'


console.log = () =>{}

test('project view', (done) => {

    StaticStorage.defaultStorage = new StaticStorage('default', undefined);

    let branches = [
        '|~mockEnv~|----|~projectMgr~|--|~projectView~|',
    ]
    
    let modules = instantiateModules({
        mockEnv:           MockEnvironment,
        projectMgr:        ProjectMgr,
        projectView:       ProjectView
    })
    let graph = parseGraph( { branches, modules } )
    new Runner( graph ) 
    
    let div = document.createElement("div")
    div.innerHTML = "`<div id='projectView' class='flux-element'> <div>`"
    let renderedDiv = renderTemplate(div,graph.workflow.modules)
    
    modules.projectMgr.output$.pipe(take(1), map(({data})=>data ) ).subscribe(
        (data:ProjectMgrOutput) => {
            let folderDiscNode = findChild<ArchFolderDiscontinuityNode>(data.state.node , ArchFolderDiscontinuityNode)
            let actions = getActions(data.manager.tree, folderDiscNode)
            setTimeout( ()=> actions.find( action => action.name=='add discontinuity').exe(), 0)
            //done()
        }
    )
    modules.projectMgr.output$.pipe(skip(1), take(1), map(({data})=>data )).subscribe(
        (data:ProjectMgrOutput) => {
            let rootDiv = renderedDiv.querySelector('#node-'+data.state.node.id) as HTMLDivElement
            expect(rootDiv).toBeTruthy()
            let headerDiv = rootDiv.querySelector("#header")
            expect(headerDiv).toBeTruthy()
            headerDiv.dispatchEvent(new MouseEvent('click'))
            //done()
        }
    )
    modules.projectView.view.selectedNode$.pipe(take(1),delay(0)).subscribe(
        (node: ArchNode ) => {
            // rootNode has been selected
            let folderDiscNode = findChild<ArchFolderDiscontinuityNode>(node , ArchFolderDiscontinuityNode)
            let discFolderDiv = renderedDiv.querySelector('#node-'+folderDiscNode.id) as HTMLDivElement
            expect(discFolderDiv).toBeTruthy()
            let headerDiv = discFolderDiv.querySelector("#header")
            expect(headerDiv).toBeTruthy()
            headerDiv.dispatchEvent(new MouseEvent('click'))
        }
    )
    modules.projectView.view.selectedNode$.pipe(skip(1), take(1), delay(0)).subscribe(
        (node: ArchNode ) => {
            // discontinuity folder node has been selected
            let discNode = findChild<ArchDiscontinuityNode>(node , ArchDiscontinuityNode)
            let discDiv = renderedDiv.querySelector('#node-'+discNode.id) as HTMLDivElement
            expect(discDiv).toBeTruthy()
            let headerDiv = discDiv.querySelector("#header")
            let dropZone = headerDiv.querySelector(".yw-drop-zone")
            //headerDiv.dispatchEvent(new DragEvent('drop'))
            let dataPath = ""//getAbsoluteTestDataPath('geophysics/arche/model_test_S1/S1.ts')
            dropZone['ondragenter']({target:dropZone})
            dropZone['ondragover']({target:dropZone, preventDefault: () => {}})
            dropZone['ondragleave']({target:dropZone})

            fs.readFile(dataPath,'utf-8', (err, content) => {
                expect(err).toBeNull()
                let dropEvent = { 
                    preventDefault: () => {},
                    dataTransfer : {getData: (_) => JSON.stringify({ cacheId:"S1.ts"})}}
                window['youwol'] = { cache : { 'S1.ts' : {read: () => of(new Blob([content])), name :'S1.ts'} }      }     
                dropZone['ondrop'](dropEvent)
            });
        }
    )
    modules.projectMgr.output$.pipe(skip(2), take(1), map(({data})=>data ),delay(0)).subscribe(
        (data:ProjectMgrOutput) => {

            let obsNode = findChild<ArchFolderObservationNode>(data.state.node, ArchFolderObservationNode)
            let actions = getActions(data.manager.tree, obsNode)
            setTimeout( ()=> {
                actions.find( action => action.name=="plane xy").exe()
                modules.projectView.view.selectedNode$.next(obsNode)
                modules.projectMgr.dispose()
                done()
            }, 0)
        }
    )

    modules.mockEnv.send()
})


test('two steps WF, check tree', (done) => {

    StaticStorage.defaultStorage = new StaticStorage('default', undefined);

    let branches = [
        '|~mockEnv~|----|~projectMgr1~|---|~projectMgr2~|-',
        '|~WfStep1~|',
        '|~WfStep2~|',
        '|~WfMgr~|--|~projectView~|'
    ]
    
    let modules = instantiateModules({
        mockEnv:            MockEnvironment,
        projectMgr1:        [ProjectMgr, {projectName:'step1'}],
        projectMgr2:        [ProjectMgr, {projectName:'step2'}],
        WfMgr:              WorkflowManager,
        projectView:        ProjectView
    })

    let plugins = instantiatePlugins({
        WfStep1:             [WorkflowStep, modules.projectMgr1],
        WfStep2:             [WorkflowStep, modules.projectMgr2],
    })

    let observers   = {}
    let adaptors    = {}
    let graph = parseGraph( { branches, modules, plugins, adaptors, observers } )
    new Runner( graph ) 
    
    let div = document.createElement("div")
    div.innerHTML = `
    <div id='WfMgr' class='flux-element'> </div>
    <div id='projectView' class='flux-element'> </div>`
    let renderedDiv = renderTemplate(div,graph.workflow.modules)

    modules.WfMgr.tree$.pipe(skip(1), take(1)).subscribe( () => {
        
        let divRoot = renderedDiv.querySelector('#node-root') as HTMLDivElement
        expect(divRoot).toBeTruthy()
        let headerDiv = divRoot.querySelector("#header")
        expect(headerDiv).toBeTruthy()
        headerDiv.dispatchEvent(new MouseEvent('click'))
    })

    modules.WfMgr.treeview.selectedNode$.pipe(take(1),delay(0)).subscribe( node => {
        let divStep1 = renderedDiv.querySelector('#node-'+node.children[0].id) as HTMLDivElement
        expect(divStep1).toBeTruthy()
        let headerDiv = divStep1.querySelector("#header")
        expect(headerDiv).toBeTruthy()
        headerDiv.dispatchEvent(new MouseEvent('click'))
    })
    modules.WfMgr.output$.pipe(take(1),delay(0), map( ({data})=> data)).subscribe( data => {
        let rootDiv = renderedDiv.querySelector('#node-'+data.state.node.id) as HTMLDivElement
        expect(rootDiv).toBeTruthy()
        plugins.WfStep1.dispose()
        plugins.WfStep2.dispose()
        modules.projectMgr1.dispose()
        modules.projectMgr2.dispose()
        done()
    })
    modules.mockEnv.send()
})

