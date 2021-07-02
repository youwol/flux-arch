import { Backend } from '@youwol/flux-lib-core';
import { forkJoin, Observable, ReplaySubject, Subject, timer } from 'rxjs';
import { delay, map, mergeMap, skipUntil, skipWhile, tap } from 'rxjs/operators';
import { ID, NAME, NAMESPACE, VERSION } from '../auto-generated';

export var arche 

export let pack = {
    id:"flux-pack-arche",
    name:"arche",
    description:"",
    requirements: [],
    namespaces:[],
    modules:{ }
}

export function install(){
    let loadWasm = Backend
    .loadAssetPackage(ID, "/api/cdn-backend/libraries/" + NAMESPACE + "/" + NAME + "/" + VERSION + "/assets/arche.js", true, window)
    .pipe(
        mergeMap( () => {
            return new Observable(subscriber => {
                window["ArcheModule"]().then( archeMdle => { 
                    arche = archeMdle; subscriber.next(true); subscriber.complete(); })
            });
        }),
        //tap( () => arche = window["ArcheModule"] )
        )

    return forkJoin( [
        Backend.fetchRenderViewCss( {href:`/api/cdn-backend/libraries/youwol/${NAME}/${VERSION}/assets/style.css`}),
        loadWasm
    ])
}