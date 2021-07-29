
/*
import { pack } from './factory';
import { Flux, BuilderView, Schema, Property } from '@youwol/flux-lib-core'
import { ConstraintBase } from './constraint-base.module'
import { ArchFacade } from './arch.facades';

export namespace ConstraintDisplacement {
    
    
    @Schema({
        pack: pack,
        description: "Persistent Data of ConstraintDisplacement"
    })
    export class PersistentData {

        @Property({description:"",enum:["dip","strike","normal"]})
        axis: string

        @Property({description:""})
        value: number

        @Property({description:"", enum:["compression","traction"]})
        direction: string

        @Property({description:"", enum:["min","max"]})
        type: string

        @Property({description:""})
        emitInitialValue: boolean

        constructor({axis, value, direction, type, emitInitialValue} : 
                    {axis?:string, value?:number, direction?:string, type?:string,emitInitialValue?:boolean } = {}) {

            this.axis = axis !=undefined? axis : "0"
            this.value = value !=undefined? value : 0
            this.direction = direction !=undefined? direction : "compression"
            this.type = type !=undefined? type : "min"
            this.emitInitialValue = emitInitialValue !=undefined? emitInitialValue : true            
        }
    }

    @Flux({
        pack: pack,
        namespace: ConstraintDisplacement,
        id: "ConstraintDisplacement",
        displayName: "ConstraintDisplacement",
        description: "Coulomb type of surface's constraint"
    })
    @BuilderView({
        namespace: ConstraintDisplacement,
        icon: ConstraintBase.svgIcon
    })
    export class Module extends ConstraintBase.Module<PersistentData> {

        constructor(params) {
            super(params)
        }

        createConstraint(config: PersistentData): ArchFacade.DisplacementConstraint {
            return new ArchFacade.DisplacementConstraint(config)
        }
    }
}
*/