
import { pack } from './main';
import { Flux, BuilderView, Schema, Property } from '@youwol/flux-core'
import { ConstraintBase } from './constraint-base.module'
import { ArchFacade } from './arche.facades';


export namespace ModuleConstraintCoulomb {    
    
    @Schema({
        pack
    })
    export class PersistentData {

        @Property({description:""})
        friction: number = 0

        @Property({description:""})
        cohesion: number = 0

        @Property({description:""})
        emitInitialValue: boolean = true

        constructor(params : {
            friction?:number, 
            cohesion?:number,  
            emitInitialValue?:boolean 
        } = {}) {
            Object.assign(this, params)
        }
    }

    @Flux({
        pack: pack,
        namespace: ModuleConstraintCoulomb,
        id: "ModuleConstraintCoulomb",
        displayName: "Coulomb",
        description: "Coulomb type of surface's constraint",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_constraint_coulomb_module.constraintcoulomb.html`
        }
    })
    @BuilderView({
        namespace: ModuleConstraintCoulomb,
        icon: ConstraintBase.svgIcon
    })
    export class Module extends ConstraintBase.Module<PersistentData> {

        constructor(params) {
            super(params)
        }

        createConstraint(config: PersistentData): ArchFacade.CoulombConstraint {
            return new ArchFacade.CoulombConstraint(config)
        }
    }
}
