var activeEffect
var effectStack = []
function effect(fn, options ={}){
    const effectFn = () => {
        cleanUp(effectFn)
        activeEffect = effectFn
        effectStack.push(effectFn)
        const res = fn() // 读取一次需要绑定的对象属性，此时会触发track
        effectStack.pop()
        activeEffect = effectStack[effectStack.length - 1] // 还原副作用函数栈前一级
        return res
    }
    effectFn.deps = []
    effectFn.options = options
    if(!options.lazy){
        effectFn()
    }
    return effectFn
}
function cleanUp(effectFn){
    // 遍历删除key=》efFn的关系
    for(let i = 0; i < effectFn.deps.length; i++){
        const efSet = effectFn.deps[i]
        efSet.delete(effectFn)
    }
    // 删除effectFn.deps中的depsMap
    effectFn.deps.length = 0
}