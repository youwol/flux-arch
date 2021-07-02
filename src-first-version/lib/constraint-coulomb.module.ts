
import { pack } from './factory';
import { Flux, BuilderView, Schema, Property } from '@youwol/flux-lib-core'
import { ConstraintBase } from './constraint-base.module'
import { ArcheFacade } from './arche.facades';

export namespace ConstraintCoulomb {
    
    
    @Schema({
        pack: pack,
        description: "Persistent Data of ConstraintCoulomb"
    })
    export class PersistentData {

        @Property({description:""})
        friction: number

        @Property({description:""})
        cohesion: number


        @Property({description:""})
        emitInitialValue: boolean

        constructor({friction, cohesion, emitInitialValue} : 
                    {friction?:number, cohesion?:number,  emitInitialValue?:boolean } = {}) {

            this.friction = friction !=undefined? friction : 0
            this.cohesion = cohesion !=undefined? cohesion : 0
            this.emitInitialValue = emitInitialValue!=undefined ? emitInitialValue : true            
        }
    }

    @Flux({
        pack: pack,
        namespace: ConstraintCoulomb,
        id: "ConstraintCoulomb",
        displayName: "ConstraintCoulomb",
        description: "Coulomb type of surface's constraint"
    })
    @BuilderView({
        namespace: ConstraintCoulomb,
        icon: ConstraintBase.svgIcon
    })
    export class Module extends ConstraintBase.Module<PersistentData> {

        constructor(params) {
            super(params)
        }

        createConstraint(config: PersistentData): ArcheFacade.CoulombConstraint {
            return new ArcheFacade.CoulombConstraint(config)
        }
    }
}
