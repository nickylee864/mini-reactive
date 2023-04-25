const jobQueue = new Set()
const p = Promise.resolve()
const isFlushing = false
function queueJob(job){
    jobQueue.add(job)
    if(isFlushing) return
    isFlushing = true
    p.then(() => {
        try{
            jobQueue.forEach(job => job())
        }finally{
            isFlushing = false
            jobQueue.length = 0
        }
    })
}
function resolveProps(type, props){
    const props = {}, attrs = {}
    for(const k in props){
        if(k in type){
            props[k] = props[k]
        }else{
            attrs[k] = props[k]
        }
    }
    return [props, attrs]
}
export {
    queueJob, resolveProps
}