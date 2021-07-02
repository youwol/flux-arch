
import { pack } from './factory';
import { Flux, BuilderView, Schema, Property } from '@youwol/flux-lib-core'
import { ConstraintBase } from './constraint-base.module'
import { ArcheFacade } from './arche.facades';

export namespace ConstraintCoulombOrtho {
    
    @Schema({
        pack: pack,
        description: "Persistent Data of ConstraintCoulombOrtho"
    })
    export class PersistentData {

        @Property({description:""})
        theta: number

        @Property({description:""})
        frictionDip: number

        @Property({description:""})
        frictionStrike: number
        
        @Property({description:""})
        emitInitialValue: boolean

        constructor({theta, frictionDip, frictionStrike, emitInitialValue} : 
                    {theta?: number, frictionDip?:number,  frictionStrike?:number, emitInitialValue?:boolean } = {}) {

            this.theta = theta !=undefined? theta : 0
            this.frictionDip = frictionDip !=undefined ? frictionDip : 0
            this.frictionStrike = frictionStrike !=undefined ? frictionStrike : 0
            this.emitInitialValue = emitInitialValue!=undefined ? emitInitialValue : true            
        }
    }

    @Flux({
        pack: pack,
        namespace: ConstraintCoulombOrtho,
        id: "ConstraintCoulombOrtho",
        displayName: "ConstraintCoulombOrtho",
        description: "Coulomb type of surface's constraint"
    })
    @BuilderView({
        namespace: ConstraintCoulombOrtho,
        icon: ConstraintBase.svgIcon
    })
    export class Module extends ConstraintBase.Module<PersistentData> {

        constructor(params) {
            super(params)
        }

        createConstraint(config: PersistentData): ArcheFacade.CoulombOrthoConstraint {
            return new ArcheFacade.CoulombOrthoConstraint(config)
        }
    }
}
