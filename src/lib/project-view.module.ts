
import { pack } from './main';
import { Flux, BuilderView, ModuleFlux, Pipe, Schema, RenderView, createHTMLElement, SideEffects, freeContract } from '@youwol/flux-core'
import { ImmutableTree } from '@youwol/fv-tree'

import { of, ReplaySubject, Subject, Subscription } from 'rxjs';
import { delay, distinct, filter, map, mergeMap, scan, switchMap } from 'rxjs/operators';
import { ArchNode} from './implementation/tree-nodes';
import { StateMgr } from './implementation/arch.state';
import { Interfaces } from '@youwol/flux-files';
import { getActions, headerView, progressUI } from './views/tree-elements.view';
import { child$ } from '@youwol/flux-view';
import { TreeViewState } from './implementation/data';

export namespace ProjectView {
    //Icons made by <a href="https://www.flaticon.com/authors/kiranshastry" title="Kiranshastry">Kiranshastry</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a>
    let svgIcon = `
    <path xmlns="http://www.w3.org/2000/svg" d="m7 309h88c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-45v-18h128v18h-37c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h88c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-37v-18h128v18h-45c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h39v13h-62.867188c-3.953124.144531-7.097656 3.375-7.132812 7.332031v31.667969h-37c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h88c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-37v-25h126v25h-37c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h88c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-37v-31.667969c-.066406-3.96875-3.230469-7.191406-7.199219-7.332031h-62.800781v-13h35c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-29v-25c-.160156-3.929688-3.410156-7.027344-7.34375-7h-134.65625v-19h37c3.867188 0 7-3.132812 7-7v-115c0-3.867188-3.132812-7-7-7h-88c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7h37v19h-134.675781c-3.929688-.023438-7.171875 3.074219-7.324219 7v25h-29c-3.867188 0-7 3.132812-7 7v115c0 3.867188 3.132812 7 7 7zm264.917969 158h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-23h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-23h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-37c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7zm140 83h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-23h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-23h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7h41.566407c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7zm0-37c3.863281 0 7 3.132812 7 7s-3.136719 7-7 7h-41.566407c-3.867187 0-7-3.132812-7-7s3.132813-7 7-7zm-72.019531-98h-41.5625c-3.867188 0-7-3.132812-7-7s3.132812-7 7-7h41.5625c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-23h-41.5625c-3.867188 0-7-3.132812-7-7s3.132812-7 7-7h41.5625c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-23h-41.5625c-3.867188 0-7-3.132812-7-7s3.132812-7 7-7h41.5625c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-37c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.5625c-3.867188 0-7-3.132812-7-7s3.132812-7 7-7zm-134.125 83h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-23h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm0-23h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm-41.566407-217h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 37c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7zm41.566407 97c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm-175.691407 0h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 23h41.566407c3.867187 0 7 3.132812 7 7s-3.132813 7-7 7h-41.566407c-3.863281 0-7-3.132812-7-7s3.136719-7 7-7zm0 0"/>
    `

    @Schema({
        pack: pack,
        description: "Persistent Data of ProjectView"
    })
    export class PersistentData {


        constructor({ }: {} = {}) {
        }
    }

    @Flux({
        pack: pack,
        namespace: ProjectView,
        id: "ProjectView",
        displayName: "ProjectView",
        description: "An ProjectView"
    })
    @BuilderView({
        namespace: ProjectView,
        icon: svgIcon
    })
    @RenderView({
        namespace: ProjectView,
        render: ((mdle: Module) => renderHtmlElement(mdle)) as any,
        wrapperDivAttributes: (mdle) => ({ style: { width: '100%', height: '100%' } })
    })
    export class Module extends ModuleFlux implements SideEffects{

        output$ : Pipe<{ selection: any , manager:StateMgr}>
        stateMgr$ = new ReplaySubject<StateMgr>(1)
        stateMgr : StateMgr
        selection$ = new Subject<any>()
        

        subscriptions = new Array<Subscription>()
        subscriptionsView = new Array<Subscription>()

        view: ImmutableTree.View<ArchNode>

        tests = new Map<any,any>()
        constructor(params) {
            super(params)

            this.output$  = this.addOutput()     

            this.addInput({
                id:"input", 
                description:"",
                contract: freeContract(),
                onTriggered: ({data, configuration, context}) => this.initialize(data, configuration, context) 
            })  
        }

        apply(){ }

        dispose(){
            this.clearSubscription()
        }

        private clearSubscription(){

            this.subscriptions.forEach( s => s.unsubscribe() )
            this.subscriptions=[]
        }

        initialize(data: {manager:StateMgr}, configuration, context){

            this.stateMgr$.next(data.manager)
            this.stateMgr = data.manager

            if( this.tests.has(data.manager))
                return 
                
            this.clearSubscription()

            let sub = data.manager.output$.pipe(
                filter( ({selection}) => selection.nodes.length > 0)
            ).subscribe( ({selection}) => {
                this.emitSelection(selection.nodes, data.manager)
            })
            this.tests.set(data.manager, sub)
            this.subscriptions.push(sub)
        }

        emitSelection(nodes: Array<ArchNode>, manager){
            this.output$.next({data: {selection:{nodes}, manager:manager}, context:{}})
        }

        selectNode(node:ArchNode){
            node && this.emitSelection([node], this.stateMgr)
        }
        
    }


    function renderHtmlElement(mdle: Module) {

        /*if(mdle.view)
            mdle.view.subscriptions.forEach( s => s.unsubscribe())
            */
        let treeData$ = mdle.stateMgr$.pipe(  map( stateMgr => stateMgr.tree ) )
        let vDOM = {
            class: 'w-100 h-100 flux-pack-arch project-mgr bg-dark',
            children:[
                {
                    class:'w-100',
                    children:[
                        child$(
                            mdle.stateMgr$.pipe( 
                                switchMap( state => state.tree.environment.folder.drive.events$ ),
                                filter(event=> event instanceof Interfaces.EventIO),
                                switchMap( (event:Interfaces.EventIO) => 
                                    event.step==Interfaces.Step.FINISHED 
                                        ? of(event).pipe( delay(400))
                                        : of(event) 
                                )),
                            (event) => {
                                return progressUI(event as Interfaces.EventIO)
                            }
                        ),
                        child$(
                            mdle.stateMgr$.pipe(  map( stateMgr => stateMgr.tree ) ),
                            (treeViewState: TreeViewState) => {
                                let view = new ImmutableTree.View<ArchNode>( {state:treeViewState, headerView: (state: TreeViewState, node) => headerView(state, node) })
                            }
                        )
                    ]
                }
            ]
        }
        /*
        mdle.view = new ImmutableTree.View<ArchNode>( {treeData$, { actions: getActions, headerView: headerView }, mdle.subscriptionsView)

        mdle.view.selectedNode$.subscribe( node => mdle.selectNode(node) )

        let div = createHTMLElement({
            data: {
                class: 'w-100 h-100 flux-pack-arch project-mgr bg-dark',
                children: {
                    header: {
                        class: 'w-100',
                        children:{
                            progress: mdle.stateMgr$.pipe( 
                                switchMap( state => state.tree.environment.folder.drive.events$ ),
                                filter(event=> event instanceof FileSystem.EventIO),
                                switchMap( (event:FileSystem.EventIO) => 
                                    event.step==FileSystem.Step.FINISHED 
                                        ? of(event).pipe( delay(400))
                                        : of(event) 
                                ),
                                map( event => progressUI(event as FileSystem.EventIO))
                            )
                        }
                    },
                    treeView: mdle.view.renderData()
                }
            },
            subscriptions: mdle.subscriptionsView
        })
        return div
        */

    }
}
