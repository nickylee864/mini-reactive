import { effect } from './effect'
export function watch(source, cb, options = {}){
    let getter, newVal, oldVal
    if(typeof source === 'function'){
        getter = source
    }else{
        getter = traverse
    }
    const job = () => {
        let newVal = effectFn()
        cb(newVal, oldVal)
        oldVal = newVal
    }
    const effectFn = effect(
        () => getter(),
        {
            lazy: true,
            scheduler: () => {
                if(options.flush === 'post'){
                    const p = Promise.resolve()
                    p.then(job)
                }else{
                    job()
                }
            }
        }
    )
    if(options.immediate){
        job()
    }else{
        oldVal = effectFn()
    }
}

function traverse(obj, seen = new Set()){
    if(typeof obj !== 'object' || obj === null || seen.has(obj)){ return }
    for(let k in obj){
        traverse(obj[k], seen)
    }
}