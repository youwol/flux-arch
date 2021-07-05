import { ImmutableTree } from '@youwol/fv-tree';
import { Interfaces } from '@youwol/flux-files';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';
import { BufferAttribute, BufferGeometry, Color, DoubleSide, FrontSide, Mesh, MeshStandardMaterial } from 'three';
import { TreeViewState } from "./data";
import { ArcheDiscontinuityMeshNode, ArcheMeshNode, ArcheNode, ArcheObservationMeshNode, ArcheRealizationNode, RootArcheNode } from './tree-nodes';
import { decodeGocadTS} from'@youwol/io'
import { DataFrame } from '@youwol/dataframe';
import { findChildren } from './utils';


export class Visu3dState{

    private rootNode : RootArcheNode
    
    cache: {[key:string]: Mesh} = {}

    constructor(public readonly projectName: string, public readonly tree: TreeViewState, public readonly drive: Interfaces.Drive, subscriptions : Array<Subscription> ){

        subscriptions.push(
            tree.root$
            .subscribe( root => this.rootNode = root as RootArcheNode ) 
        )
    }
    revokeFrom( node: ArcheNode) {

        let allMeshes = [
            ...findChildren<ArcheMeshNode>(node, ArcheMeshNode), 
            ...findChildren<ArcheRealizationNode>(node, ArcheRealizationNode)
        ]
        allMeshes
        .filter( mesh => this.cache[mesh.id])
        .forEach( mesh => delete this.cache[mesh.id])
        this.cache[node.id] && delete this.cache[node.id]
    }

    buildObject( nodeId ) : Observable<Mesh>{

        if(this.cache[nodeId])
            return of(this.cache[nodeId])

        let node = this.tree.getNode(nodeId) // Tree.find( this.rootNode, n => n.id == nodeId)//

        if( node instanceof ArcheDiscontinuityMeshNode )
            return this.buildSimpleMesh(node)

        if( node instanceof ArcheObservationMeshNode && node.resolvedChildren().length == 0)
            return this.buildSimpleMesh(node)

        /*if( node instanceof ArcheObservationMeshNode && node.resolvedChildren().length == 1)
            return this.buildRealizationMesh(node.resolvedChildren()[0] as ArcheRealizationNode)

        if( node instanceof ArcheRealizationNode )
            return this.buildRealizationMesh(node)
            */
    }

    buildSimpleMesh( node: ArcheMeshNode ) :  Observable<Mesh>{

        return this.drive.readAsText(node.fileId).pipe(
            map( meshText =>  {
                let decoded = decodeGocadTS(meshText, { merge: true })
                return decoded[0];
            }),
            map( ( dataframe: DataFrame) => {
                
                /*let geom = new BufferGeometry()
                geom.setAttribute('position', new BufferAttribute(Float32Array.from(dataframe.series.positions.array),3) )
                geom.setAttribute( 'color', new BufferAttribute(new Float32Array( dataframe.series.positions.array.length) , 3 ) );
                geom.setIndex(dataframe.series.indexes.array)

                const color = new Color();
                const colors = geom.attributes.color;
                for ( let i = 0; i < positions.length /3; i ++ ) {
					color.set(0x3399ff);
					colors.setXYZ( i, color.r, color.g, color.b );
                }
                
                let mesh = new Mesh(geom,new MeshStandardMaterial({
                    color:new Color(0x3399ff),
                    flatShading: true,
                    vertexColors: false,
                    metalness:0.5,
                    roughness: 0.5,
                    wireframe: node instanceof ArcheObservationMeshNode
                }))
                let path =  this.tree.reducePath(node.id, (node: ArcheNode)=> node.name) as Array<string>
                path[0] = this.projectName
                mesh.name = path.join('/')
                mesh.userData.classes=['Object3D','Realization']
                return */
                return undefined
            })
            //tap( (data) => this.cache[node.id] = data)
        )
    }

    /*buildRealizationMesh( node: ArcheRealizationNode ) :  Observable<Mesh>{
        
        let mesh$ = this.drive.readAsText(node.meshFileId).pipe(
            map( meshText =>  {
                let decoded = decodeGocadTS(meshText, { shared: true }) 
                return decoded[0];
            }),
            map( (dataframe: DataFrame) => {
                let geom = new BufferGeometry()
                geom.setAttribute('position', new BufferAttribute(Float32Array.from(positions),3) )
                geom.setIndex(indices)
                let mesh = new Mesh(geom,new MeshStandardMaterial({side:DoubleSide, color:new Color('#3399ff'), vertexColors:false}))
                mesh.name = node.fileId
                mesh.userData.classes=['Object3D','Realization']
                return mesh
            })
        )
        let df$ = this.drive.readAsText(node.fileId).pipe(
            map( text =>  {
                let df = decodeDataFrame(text)
                return df;
            })
        )
        return combineLatest([mesh$,df$]).pipe(
            mergeMap( ([mesh,df]:[Mesh,DataFrame]) => {
                let mdle = new ApplyAttributes.Module({moduleId:"ArcheRealizationNode",Factory:ApplyAttributes, configuration:{}})
                let path =  this.tree.reducePath(node.id, (node: ArcheNode)=> node.name)
                path[0] = this.projectName
                mdle.createDataframe([mesh,df] as any, new ApplyAttributes.PersistentData({
                    objectId:node.id, objectName: path.join('/')
                }), {}, mdle.cache)
                return mdle.object$
            }),
            map( ({data}) => data)
            //tap( (data) => this.cache[node.id] = data)
        ) 
    }*/
}