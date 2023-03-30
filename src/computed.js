function computed(getter){
    let dirty = true
    let memo
    let effectFn = effect(getter, {
        lazy: true,
        scheduler(){
            if(!dirty){
                dirty = true
                trigger(obj, 'value')
            }
        }
    })
    const obj = {
        get value(){
            if(dirty){
                memo = effectFn()
                dirty = false
            }
            track(obj, 'value')
            return memo
        }
    }
    return obj
}