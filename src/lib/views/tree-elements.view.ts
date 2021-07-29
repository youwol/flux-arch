
import { ImmutableTree } from '@youwol/fv-tree'
import { Interfaces } from '@youwol/flux-files'
import { ArchAndersonianRemoteNode, ArchBoundaryConditionNode, ArchConstraintNode, ArchCoulombConstraintNode, ArchCoulombOrthoConstraintNode, ArchDiscontinuityNode,
    /*ArchDisplacementConstraintNode, ArchDisplacementNormConstraintNode,*/ ArchFolderDiscontinuityNode, ArchFolderObservationNode, ArchFolderRemoteNode, ArchMeshNode, ArchNode, 
    ArchObservationMeshNode, ArchRealizationNode, ArchRemoteNode, RootArchNode } from '../implementation/tree-nodes'
import { BehaviorSubject } from 'rxjs'
import { map } from 'rxjs/operators'
import { TreeViewState } from "../implementation/data"
import { createSimpleShape } from '../implementation/utils'
import { uuidv4 } from '@youwol/flux-core'

export function getActions(tree: TreeViewState, node: ArchNode) {

    let renameAction = {
        icon: 'fas fa-pen', name: 'rename', enable: true,
        exe: () => node.signals$.next({ type: 'start-renaming', node }),
    }
    if (node instanceof RootArchNode)
        return [renameAction]

    if (node instanceof ArchMeshNode)
        return [renameAction]

    if (node instanceof ArchFolderDiscontinuityNode)
        return [{
            icon: 'fas fa-folder-plus', name: 'new folder', enable: true,
            exe: () => tree.addChild( node.id, new ArchFolderDiscontinuityNode({ id: uuidv4(), ownerId:tree.id, name: 'new folder', type: ['folder'], children: [] }))
        }, {
            icon: 'fas fa-solar-panel', name: 'add discontinuity', enable: true,
            exe: () => tree.addChild(node.id, new ArchDiscontinuityNode(
                {
                    id: uuidv4(), ownerId:tree.id, name: 'fault', type: ['folder'],
                    children: [new ArchBoundaryConditionNode({ id: uuidv4(), ownerId:tree.id, name: 'boundary conditions' })]
                }))
        }, renameAction]

    if (node instanceof ArchDiscontinuityNode)
        return [{
            icon: 'fas fa-percentage', name: 'add Coulomb constraint', enable: true,
            exe: () => tree.addChild(node.id, new ArchCoulombConstraintNode({ id: uuidv4(), ownerId:tree.id, name: 'coulomb' }))
        }, {
            icon: 'fas fa-percentage', name: 'add Coulomb-ortho constraint', enable: true,
            exe: () => tree.addChild(node.id, new ArchCoulombOrthoConstraintNode({ id: uuidv4(), ownerId:tree.id, name: 'coulomb-ortho' }))
        },/* {
            icon: 'fas fa-percentage', name: 'add Displacement constraint', enable: true,
            exe: () => tree.addChild(node.id, new ArchDisplacementConstraintNode({ id: uuidv4(), ownerId:tree.id, name: 'Displacement' }))
        }, {
            icon: 'fas fa-percentage', name: "add Displacement's norm constraint", enable: true,
            exe: () => tree.addChild(node.id, new ArchDisplacementNormConstraintNode({ id: uuidv4(), ownerId:tree.id, name: 'Displacement-norm' }))
        },*/
            renameAction]

    if (node instanceof ArchFolderRemoteNode)
        return [{
            icon: 'fas fa-compress-arrows-alt', name: 'add Andersonian stress', enable: true,
            exe: () => tree.addChild(node.id, new ArchAndersonianRemoteNode({ id: uuidv4(), ownerId:tree.id, name: 'Andersonian' }))
        },
            renameAction]
    if (node instanceof ArchFolderObservationNode)
        return [{
            icon: 'fas fa-folder-plus', name: 'new folder', enable: true,
            exe: () => tree.addChild(node.id, new ArchFolderObservationNode({ id: uuidv4(), ownerId:tree.id, name: 'new folder', type: ['folder'], children: [] }))
        },
        ...["xy","xz","yz"].map( axes => ({ icon: 'fas fa-square-full', name: `plane ${axes}`, enable: true, exe: () => createSimpleShape('plane', axes, tree, node) }) ),
        ...["xy","xz","yz"].map( axes => ({ icon: 'fas fa-circle', name: `disk ${axes}`, enable: true, exe: () => createSimpleShape('disk', axes, tree, node) })),
            renameAction]

    if (node instanceof ArchRealizationNode)
        return [renameAction]
}

export function progressUI(event: Interfaces.EventIO) {

    let p = Math.floor(100 * event.transferedCount / event.totalCount)
    return {
        class: "w-100 progress-bar progress-bar-striped  bg-success " + (event.step == Interfaces.Step.FINISHED ? "arche-progress finished" : ""),
        role: 'progressbar', 'aria-valuenow': p, 'aria-valuemin': "0", 'aria-valuemax': "100",
        style: { height: '5px' }
    }
}

let textView = (node, tree) => ({ 

    tag: tree.id==node.ownerId ? 'strong' : 'em', 
    class: 'mx-2 w-100', 
    innerText: node.name,
    style:{ color: node.type.includes('fromComponent') ? 'lightsalmon' : '' }
})

let headerWidgetFolder = (tree: TreeViewState, faIcon: string, node: ArchNode) => {
    let dataUploading$ = new BehaviorSubject(false)
    return {
        class: 'd-flex w-100 align-items-baseline yw-drop-zone',
        children: {
            icon: { 
                tag: 'i', class: faIcon 
            },
            text: textView(node, tree),
            uploading: dataUploading$.pipe(map(isUploading => isUploading ? { tag: 'i', class: 'fas fa-cloud-upload-alt fa-spin' } : {}))
        },
        ondragenter: (ev) => ev.target.style['border'] = 'solid',
        ondragleave: (ev) => ev.target.style['border'] = 'none',
        ondrop: (ev) => {
            ev.preventDefault();
            dataUploading$.next(true)
            var data = JSON.parse(ev.dataTransfer.getData("file"));
            let file = window['youwol'].cache[data.cacheId]
            file.read().subscribe(blob => {
                dataUploading$.next(false);
                tree.dropFile(node, file.name, blob)
            })
        },
        ondragover: (ev) => {
            console.log("on drag over")
            ev.preventDefault();
        }
    }
}


export function headerView(tree: TreeViewState, node: ArchNode) {

    let faIcon = ""
    let rxjs = window['rxjs']

    if (node instanceof RootArchNode)
        faIcon = 'fas fa-folder'

    if (node instanceof ArchFolderDiscontinuityNode)
        faIcon = 'fas fa-folder'

    if (node instanceof ArchFolderObservationNode)
        faIcon = 'fas fa-folder'

    if (node instanceof ArchFolderRemoteNode)
        faIcon = 'fas fa-folder'

    if (node instanceof ArchFolderRemoteNode)
        faIcon = 'fas fa-folder'

    if (node instanceof ArchConstraintNode)
        faIcon = 'fas fa-percentage'

    if (node instanceof ArchRemoteNode)
        faIcon = 'fas fa-compress-arrows-alt'

    if (node instanceof ArchMeshNode)
        faIcon = 'fas fa-solar-panel'

    if (node instanceof ArchRealizationNode)
        faIcon = 'fas fa-table'

    let headerWidget = undefined
    let base = {
        class: 'd-flex w-100 align-items-baseline ',
        children: {
            icon: { tag: 'i', class: faIcon },
            text: textView(node, tree)
        }
    }
    if (node instanceof ArchDiscontinuityNode)
        headerWidget = headerWidgetFolder(tree, faIcon, node)
    else if ( node instanceof RootArchNode ){
        headerWidget = Object.assign({}, base)
        headerWidget.children['process'] = node.processes$.pipe(
            map( ({count}) => count > 0 ? { tag: 'i', class: "fas fa-cog fa-spin"} : {})
        )
    }
    else if ( node instanceof ArchObservationMeshNode ){
        headerWidget = Object.assign({}, base)
        headerWidget.children['process'] = node.processes$.pipe(
            map( ({count}) => count > 0 ? { tag: 'i', class: "fas fa-sync-alt fa-spin"} : {})
        )
    }
    else {
        headerWidget = base
    }
    node.signals$.next({ type: 'ready' })
    return node.signals$.pipe(
        map((s) => {
            return headerWidget
            /*return (s.type != 'start-renaming')
                ? headerWidget
                : ImmutableTree.View.headerRenamed(node, tree, node.signals$)*/
        }))
}
