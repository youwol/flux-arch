import { FluxPack, IEnvironment } from '@youwol/flux-core'
import { Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { AUTO_GENERATED } from '../auto_generated'

export var arche 


export function install(environment: IEnvironment){
    
    let loadWasm = environment.fetchJavascriptAddOn(`${AUTO_GENERATED.name}#${AUTO_GENERATED.version}~assets/arche.js`)
    .pipe(
        mergeMap( () => {
            return new Observable(subscriber => {
                window["ArcheModule"]().then( archeMdle => { 
                    arche = archeMdle; 
                    subscriber.next(true); subscriber.complete(); })
            });
        })
        )

    /*return forkJoin( [
        Backend.fetchRenderViewCss( {href:`/api/cdn-backend/libraries/youwol/${NAME}/${VERSION}/assets/style.css`}),
        loadWasm
    ])*/
    return loadWasm
}

export let pack = new FluxPack({
    ...AUTO_GENERATED,
    ...{
        install
    }
})

