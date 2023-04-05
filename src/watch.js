import { effect } from './effect'
function watch(source, cb){
    let getter, newVal, oldVal
    if(typeof source === 'function'){
        getter = source
    }else{
        getter = traverse
    }
    const effectFn = effect(
        () => getter(),
        {
            lazy: true,
            scheduler(){
                let newVal = effectFn()
                cb(newVal, oldVal)
                oldVal = newVal
            }
        }
    )
    oldVal = effectFn()
}

function traverse(obj, seen = new Set()){
    if(typeof obj !== 'object' || obj === null || seen.has(obj)){ return }
    for(let k in obj){
        traverse(obj[k], seen)
    }
}