
/*
import { pack } from './factory';
import { Flux, BuilderView, Schema, Property } from '@youwol/flux-lib-core'
import { ConstraintBase } from './constraint-base.module'
import { ArchFacade } from './arch.facades';

export namespace ConstraintDisplacementNorm {
    
    
    @Schema({
        pack: pack,
        description: "Persistent Data of ConstraintDisplacementNorm"
    })
    export class PersistentData {

        @Property({description:""})
        value: number

        @Property({description:"", enum:["compression","traction"]})
        direction: string

        @Property({description:"", enum:["max"]})
        type: string

        @Property({description:""})
        emitInitialValue: boolean

        constructor({value, direction, type, emitInitialValue} : 
                    {value?:number, direction?:string, type?:string, emitInitialValue?:boolean } = {}) {

            this.value = value !=undefined? value : 0
            this.direction = direction !=undefined? direction : "compression"
            this.type = type !=undefined? type : "max"
            this.emitInitialValue = emitInitialValue !=undefined? emitInitialValue : true            
        }
    }

    @Flux({
        pack: pack,
        namespace: ConstraintDisplacementNorm,
        id: "ConstraintDisplacementNorm",
        displayName: "ConstraintDisplacementNorm",
        description: "Coulomb type of surface's constraint"
    })
    @BuilderView({
        namespace: ConstraintDisplacementNorm,
        icon: ConstraintBase.svgIcon
    })
    export class Module extends ConstraintBase.Module<PersistentData> {

        constructor(params) {
            super(params)
        }

        createConstraint(config: PersistentData): ArchFacade.DisplacementNormConstraint {
            return new ArchFacade.DisplacementNormConstraint(config)
        }
    }
}
*/