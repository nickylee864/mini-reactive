import {activeEffect} from './effect'
const ITERATE_KEY = Symbol()
function reactive(obj, isShallow = false, readonly = false){
    return new Proxy(obj, {
        get(target, key, receiver){
            if(key === 'raw'){
                return target
            }
            const res = Reflect.get(target, key, receiver)
            if(!readonly){
                track(target, key)
            }
            if(isShallow){
                return res
            }
            if(typeof res === 'object' && res !== null){
                return readonly ? readonlyReactive(res) : reactive(res)
            }
            return res
        },
        set(target, key, newVal, receiver){
            const oldVal = target[key]
            const type = Object.hasOwn(target, key) ? 'SET' : 'ADD'
            if(target === receiver.raw){ // receiver是target的代理对象
                if(oldVal !== newVal && (newVal === newVal || oldVal === oldVal)){
                    trigger(target, key, type)
                }
            }
            return Reflect.set(target, key, newVal, receiver)
        },
        has(target, key){ // 拦截 o in obj
            track(target, key)
            return Reflect.has(target, fn)
        },
        ownKeys(target) { // 拦截 for in 循环
            console.log('拦截 for in 循环')
            track(target, ITERATE_KEY)
            return Reflect.ownKeys(target)
        },
        deleteProperty(target, key) {
            const hadKey = Object.hasOwn(target, key)
            const res = Reflect.deleteProperty(target, key)
            if(hadKey && res){
                trigger(target, key, 'DELETE')
            }
            return res
        }
    })
}
function readonlyReactive(obj){
    return reactive(obj, false, true)
}
function shallowReadonlyReactive(obj){ // 浅只读
    return reactive(obj, true, true)
}
const bucket = new WeakMap()
function trigger(target, key, type){
    console.log(target, key, '+++trigger+++' + key)
    const depsMap = bucket.get(target)
    if(!depsMap){ return }
    const iterateEffects = depsMap.get(ITERATE_KEY)
    const effectSet = depsMap.get(key)
    const runEffectSet = new Set()
    effectSet && effectSet.forEach(ef => {
        if(ef !== activeEffect){
            runEffectSet.add(ef)
        }
    })
    if(type === 'ADD' || type === 'DELETE'){ // 新增或删除属性才执行forin的ef
        iterateEffects && iterateEffects.forEach(fn => {
            if(fn !== activeEffect){
                runEffectSet.add(fn)
            }
        })
    }
    runEffectSet.forEach(fn => {
        const efScheduler = fn.options.scheduler
        if(efScheduler){
            fn.options.scheduler(fn)
        }else{
            fn()
        }
    } )
}

function track(target, key){
    console.log(target, key,'+++track+++')
    if(!activeEffect) return
    let depsMap = bucket.get(target)
    if(!depsMap){
        bucket.set(target, ( depsMap = new Map() ) )
    }
    let effectsSet = depsMap.get(key)
    if(!effectsSet){
        depsMap.set(key,( effectsSet = new Set() ) )
    }
    activeEffect.deps.push(effectsSet)
    effectsSet.add(activeEffect)
}

// 在foreach遍历set的时候，如果一个值被访问过了，但该值被删除并重新添加回集合，如果此时遍历还没有结束，那么该值会被重新访问。
// let set = new Set([1])
// set.forEach(it => {
//     it.delete(1)
//     it.add(1)
// })
// 解决上述问题
// let set = new Set([1])
// let r unset = new Set(set)
// runset.forEach(it => {
//     set.delete(1)
//     set.add(1)
//     console.log('遍历set')
// })
