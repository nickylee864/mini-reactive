import { effect } from './effect.js'
import {reacive, shallowReactive} from './reactive.js'
import { queueJob, resolveProps } from './utils.js'
const Text = Symbol()
const Comment = Symbol()
const Fragment = Symbol()

function createRenderer(options){
    const {
        createElement,
        setElementText,
        insert
    } = options
    function createElement(tag){
        return document.createElement(tag)
    }
    function setElementText (el, text) {
        el.textContent = text
    }
    function createText(text) {
        return document.createTextNode(text)
    }
    function createComment(comment) {
        return document.createComment(comment)
    }
    function setText(el, text) {
        el.nodeValue = text
    }
    function setComment(el, comment) {
        el.nodeValue = comment
    }
    function insert(el, parent, anchor = null) {
        parent.insertBefore(el, anchor)
    }
    function shouldSetAsProps(el, key, value) {
        if(key === 'form' && el.tagName === 'INPUT') {
            return false
        }
        return key in el
    }
    function dealObjectClassName(obj){
        const resArr = []
        Object.keys(obj).forEach(name => {
            if(!obj[name]){return }
            resArr.push(name)
        })
        return resArr
    }
    function dealStringClassName(className) {
        return [...className.split(' ')]
    }
    function normalizeClass(clazz) {
        if(typeof clazz === 'string'){
            return dealStringClassName(clazz).join(' ')
        }
        if(Array.isArray(clazz)){
            let clazzArray = []
            clazz.forEach(it => {
                if(typeof it === 'object'){
                    clazzArray = clazzArray.concat(dealObjectClassName(it))
                }
                if(typeof it === 'string'){
                    clazzArray = clazzArray.concat(dealStringClassName(it))
                }
            })
            return clazzArray.join(' ')
        }
        if(typeof clazz === 'object'){
            return dealObjectClassName(clazz).join(' ')
        }
    }
    function render(vnode, container){
        if(vnode){
            patch(container._vnode, vnode, container)
        }else{
            if(container._vnode){
                // container.innerHTML = null
                unmount(container._vnode)
            }
            container._vnode = vnode
        }
    }
    function patch(oldNode, newNode, container, anchor){
        if(oldNode && oldNode.type !== newNode.type){ // 保证后面节点的类型相同或者旧节点置空
            unmount(oldNode)
            oldNode = null
        }
        const { newNodeType } = newNode
        if(typeof newNodeType === 'string'){
            if(!oldNode){
                mountElement(newNode, container, anchor)
            }else{
                patchElement(oldNode, newNode)
            }
        }else if(newNodeType === Text){
            if(!oldNode){ // 旧节点不存在或者类型不匹配被卸载
                const el = newNode.el = createText(newNode.children)
                insert(el, container)
            }else {
                const el = newNode.el = oldNode.el
                if(newNode.children !== oldNode.children){  // 旧文本和新文本内容不同才更新
                    setText(el, newNode.children)
                }
            }
        }else if(newNodeType === Comment){
            if(!oldNode){
                const el = newNode.el = createComment(newNode.children)
                insert(el, container)
            }else{
                const el = newNode.el = oldNode.el
                if(oldNode.children !== newNode.children){
                    setComment(el, newNode.children)
                }
            }
        }else if(newNodeType === Fragment){
            if(!oldNode){
                newNode.children.forEach(it => patch(null, it, container))
            }else{
                patchChildren(oldNode, newNode, container)
            }
        }else if(typeof newNodeType === 'object'){ // 组件
            if(!oldNode){
                mountComponent(oldNode, newNode, container, anchor)
            }else{
                patchComponent(oldNode, newNode, anchor)
            }
        }else if(newNodeType === 'xxxx'){
            // 其他类型的vnode

        }
    }
    function patchProps(el, key, prevValue, nextValue) {
        if(/^on/.test(key)){
            const eventName = key.slice(2).toLowerCase()
            const invokers = el._vei || (el._vei = {})
            let invoker = invokers[key]
            if(nextValue){
                if(!invoker){ // 没有invoker创建
                    invoker = el._vei[key] = (e) => {
                        if(e.timeStamp < invoker.attached) return
                        if(Array.isArray(invoker.value)){
                            invoker.value.forEach( fn => fn(e) )
                        }else{
                            invoker.value(e)
                        }
                    }
                    invoker.value = nextValue
                    invoker.attached = performance.now()
                    el.addEventListener(eventName, invoker)
                }else{
                    invoker.value = nextValue
                }
            }else if(invoker){ // 移除el上对应的事件
                el.removeEventListener(key, invoker)
            }
            // 没有事件函数nextValue，什么也不用处理
        }else if(key === 'class'){
            el.className = normalizeClass(nextValue) || ''
        }else if(shouldSetAsProps(el, key, nextValue)){
            const type = typeof el[key] // 获取原本节点的key属性值类型
            if(type === 'boolean' && nextValue === ''){
                el[key] = true
            }else{
                el[key] = nextValue
            }
        }else{
            el.setAttribute(key, nextValue)
        }
    }
    function mountElement(vnode, container, anchor){
        const el = vnode.el = createElement(vnode.type)
        if(typeof vnode.children === 'string'){
            setElementText(container, vnode.children)
        }else if(Array.isArray(vnode.children)){
            vnode.children.forEach(child => {
                patch(null, child, el)
            })
        }
        // props
        if(vnode.props){
            for(const key in vnode.props){
                // el.setAttribute(key, vnode.props[key])
                // el[key] = vnode.props[key]
                patchProps(el, key, null, vnode.props[key])
            }
        }
        insert(el, container, anchor)
    }
    function mountComponent(vnode, container, anchor){
        // 组件的选项对象
        const componentOptions = vnode.type
        const {render, data, props: propsOption, beforeCreate, created, beforeMount, mounted, beforeUpdate, updated} = componentOptions
        beforeCreate && beforeCreate()
        const state = reacive(data())
        const [props, attrs] = resolveProps(propsOption, vnode.props)
        const instance = {
            state,
            props: shallowReactive(props),
            isMounted: false,
            subTree
        }
        vnode.component = instance
        const renderContext = new Proxy(instance, {
            get(t, k, r){
                const {state, props} = t
                if(state && k in state){
                    return state[k]
                }else if(k in props){
                    return props[k]
                }else{
                    console.error('不存在')
                }
            },
            set(t, k, v, r){
                const {state, props} = t
                if(state && k in state){
                    state[k] = v
                }else if(k in props){
                    props[k] = v
                }else{
                    console.log('不存在');
                }
            }
        })
        created && created.call(renderContext)
        effect(() => {
            const subTree = render.call(state, state)
            if(!instance.isMounted){
                beforeMount && beforeMount.call(renderContext)
                patch(null, subTree, container, anchor)
                instance.isMounted = true
                mounted && mounted()
            }else{
                beforeUpdate && beforeUpdate.call(renderContext)
                patch(instance.subTree, subTree, container, anchor)
                updated && updated.call(renderContext)
            }
            instance.subTree = subTree
        }, {scheduler: queueJob})
        
    }
    function unmount(vnode) {
        if(vnode.nodeType === Fragment){
            vnode.children.forEach(c => unmount(c))
            return
        }
        const parent = vnode.el.parentNode
        if(parent) parent.removeChild(vnode.el)
    }
    function patchElement(n1, n2){
        const el = n2.el = n1.el
        const oldProps = n1.props
        const newProps = n2.props
        for(const key in newProps){
            if(newProps[key] !== oldProps[key]){
                patchProps(el, key, oldProps[key], newProps[key])
            }
        }
        for(const key in oldProps){
            if( !(key in newProps) ){
                patchProps(el, key, oldProps[key], null)
            }
        }
        patchChildren(n1, n2, el)
    }
    function patchChildren(n1, n2, container) {
        if(typeof n2.children === 'string'){
            if(Array.isArray(n1.children)){
                n1.children.forEach( node => unmount(node) )
            }

            
            setElementText(container, n2.children)
        }else if(Array.isArray(n2.children)){
            if(Array.isArray(n1.children)){ // n1 n2的子节点都是数组
                // 核心diff算法
                const oldChildren = n1.children
                const newChildren = n2.children
                for(let i = 0; i < oldChildren.length; i++){
                    patch(oldChildren[i], newChildren[i], container)
                }

            }else{
                // 新的数组，老节点是空
                setElementText(container, '')
                n2.children.forEach( node => patch(null, node, container) )
            }
        }
    }
    function patchComponent(n1, n2, anchor){
        const instance = (n2.component = n1.component)
        const {props} = instance
        if(hasPropChanged(n1.props, n2.props)){
            const [nextProps] = resolveProps(n2.type.props, n2.props)
            for(const k in nextProps){
                props[k] = nextProps[k]
            }
            for(const k in props){
                if(!(k in nextProps)){
                    delete props[k]
                }
            }
        }
    }
    function hydrate(){

    }
    return {
        render,
        hydrate
    }
}

const renderer = createRenderer()
renderer.render(vnode, document.querySelector('#app'))
