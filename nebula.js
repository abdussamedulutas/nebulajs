"use strict";
/**
 * @returns {nb.fn}
 */
const nb = (...args) => new nb.fn(nb.dom(...args));
/**
 * ########################################
 * ########                       #########
 * ########   Test Extensions     #########
 * ########                       #########
 * ########################################
 */
/**
 * @returns {Boolean}
 */
nb.isNode = (e) => !e ? null : !!e.nodeType && !!e.nodeName;
/**
 * @returns {Boolean}
 */
nb.isElement = (e) => nb.isNode(e) && (e.nodeType == Node.ELEMENT_NODE);
/**
 * @returns {Boolean}
 */
nb.isText = (e) => nb.isNode(e) && (e.nodeType == Node.TEXT_NODE);
/**
 * @returns {Boolean}
 */
nb.isComment = (e) => nb.isNode(e) && (e.nodeType == Node.COMMENT_NODE);
/**
 * @returns {Boolean}
 */
nb.isDocument = (e) => nb.isNode(e) && (e.nodeType == Node.DOCUMENT_NODE);
/**
 * @returns {Boolean}
 */
nb.isFragment = (e) => nb.isNode(e) && (e.nodeType == Node.DOCUMENT_FRAGMENT_NODE);

/**
 * ########################################
 * ########                       #########
 * ########   Create DOM Nodes    #########
 * ########                       #########
 * ########################################
 */

/**
 * @param {String} e 
 * @returns {nb.fn}
 */
nb.createComment = (e) => nb(document.createComment(e));

/**
 * @param {String} e 
 * @returns {nb.fn}
 */
nb.createText = (e) => nb(document.createTextNode(e));

/**
 * @param {String} e 
 * @returns {nb.fn}
 */
nb.createElement = (e) => nb(document.createElement(e||"div"));
/**
 * @returns {DocumentFragment}
 */
nb.createFragment = () => document.createDocumentFragment();


/**
 * ###########################################
 * ########                          #########
 * ######## Search & Get DOM Context #########
 * ########                          #########
 * ###########################################
 */


/**
 * 
 * @param  {...String|Number|Node|HTMLElement|RegExp|Comment|Text|NodeList} args 
 * @returns {(Node|HTMLElement)[]}
 */
nb.dom = (...args) => {
    let result = [];
    let searchThing = thing => {
        if(!thing) return;
        if(nb.isDesignJSON(thing)) return result.push(nb.design(thing).first());
        if(thing instanceof Array) return thing.forEach(searchThing);
        if(nb.isNode(thing)) result.push(thing);
        if(thing instanceof nb.fn) result.push(...thing);
        else if(typeof thing == "string")
            result.push.apply(result,Array.from(document.querySelectorAll(thing)));
        else if(thing.constructor && thing.constructor.name == "NodeList")
            result.push.apply(result,Array.from(thing));
    }
    args.forEach(searchThing);
    return result;
}

/**
 * Test usable for nb.design
 * @param {Object} o 
 */
nb.isDesignJSON = function(o){
    let flag = false;
    if(o && o.$) flag |= true;
    if(o && o[0] && o[0].$) flag |= true;
    return flag;
};

/**
 * ######################################
 * ########                     #########
 * ######## nb class contructor #########
 * ########                     #########
 * ######################################
 */

/**
 * @param {Node|HTMLElement|Comment|Text|DocumentFragment} e 
 * @public
 * @class
 */
nb.fn = function(e){
    /**
     * @type {HTMLElement[]}
     */
    this.$arg = e || [];
    this.$scope = this;
    this[Symbol.iterator] = function(){
        let k = [];
        Array.prototype.push.apply(k,this.$arg);
        return {
            next: () => {
                let val = k.pop();
                return {
                    value: val,
                    done: !val
                }
            }
        }
    };
    let that = this;
    Object.defineProperty(this,"length",{
        get:() => that.$arg.length,
        set:() => {throw new Error("length not writable variable")}
    })
    Object.defineProperty(this,"elem",{
        get:() => this.elements.$arg[0],
        set:() => {throw new Error("elem not writable variable")}
    })
    Object.defineProperty(this,"elements",{
        get:() => this.filter(nb.isElement),
        set:() => {throw new Error("elements not writable variable")}
    })
    Object.defineProperty(this,"texts",{
        get:() => this.filter(nb.isText),
        set:() => {throw new Error("elements not writable variable")}
    })
    Object.defineProperty(this,"empty",{
        get:() =>  that.$arg.length == 0,
        set:() => {throw new Error("empty not writable variable")}
    })
}


/**
 * #################################################
 * ########                                #########
 * ######## NB events publishing / Tasking #########
 * ########    And Function scheduling     #########
 * ########  Stable execute Async codes    #########
 * ########                                #########
 * #################################################
 */

/**
 * @class nb.event
 * @public
 */
nb.event=function(){
    let k=this.constructor.name=='event',u=k?this:{},
    events = {},
    invoke = {};
    /**
     * @param {String} eventName
     */
    u.on=u.addEventListener=function(eventName,callback){
        (events[eventName]||=[]).push(callback);
        return u
    },
    u.then=function(f){
        u.on('then',f);
        return u
    },
    u.catch=function(f){
        u.on('catch',f);
        return u
    },
    u.task=function(name,f,maxCall){
        (invoke[name]||={c:[],r:[],data:null}).c.push({f:f,args:[],mc:maxCall||-1,cc:0,mct:-1});
    },
    u.invoke=async function(name,...args){
        let i = (invoke[name]||={c:[],r:[],data:null}),flags=0,data=i.data,d=new Date().getTime();
        for(let o of i.c) if(o.cc<=o.mc && mct<d){
            let k = {
                callCount:o.cc,
                setMaxCallCount:e => o.mc = e,
                setValue:e =>{ data = e, flags |= 2},
                getValue:() => data,
                stop:() => flags |= 1,
            };
            if(o.f.constructor.name == 'AsyncFunction') await o.f.apply(k,[k,...args]);
            else o.f.apply(k,[k,...args]);
            if(flags & 1) break;
        };
        if(flags & 2) i.data = data;
    },
    u.result=async function(ename,f){
        invoke[ename]||={c:[],r:[],data:null};
        if(f == undefined) return new Promise(result=>{
            if(invoke[ename].data !== null)
            {
                result(invoke[ename].data)
            }else{
                invoke[ename].r.push(()=>result())
            }
        });
        else{
            if(invoke[ename].data !== null)
            {
                f(invoke[ename].data)
            }else{
                invoke[ename].r.push(f)
            }
        };
    },
    u.emit=u.dispatch=function(eventName,...args){
        let p = typeof eventName == "string" ? eventName : eventName instanceof Event ? eventName.type : "";
       if(events[p] && events[p].length)
        {

            events[p].forEach(f => f(...args))
        }
    };
    if(!k) return u;
};
nb.core={};

(function(){
    let channel = new nb.event();
    window.addEventListener("load",event => channel.dispatch(event));
    window.addEventListener("DOMContentLoaded",event => channel.dispatch(event));
    window.addEventListener("storage",event => channel.dispatch(event));
    window.addEventListener("message",event => channel.dispatch(event));
    window.addEventListener("offline",event => channel.dispatch(event));
    window.addEventListener("online",event => channel.dispatch(event));
    window.addEventListener("orientationchange",event => channel.dispatch(event));
    window.addEventListener("resize",event => channel.dispatch(event));
    nb.load = f => channel.on('load',f);
    nb.DOMContentLoaded = f => channel.on('DOMContentLoaded',f);
    nb.storage = f => channel.on('storage',f);
    nb.message = f => channel.on('message',f);
    nb.offline = f => channel.on('offline',f);
    nb.online = f => channel.on('online',f);
    nb.orientationchange = f => channel.on('orientationchange',f);
    nb.resize = f => channel.on('resize',f);
})();


/**
 * ###################################################
 * ########                                  #########
 * ########   NB String parcelizator module  #########
 * ######## Create Parser / Lexer / Analyzer #########
 * ########                                  #########
 * ###################################################
 */


/**
 * @class
 */
function Hemex(){};
Hemex.EOL = "\n";
/**
 * All whitespace keycode
 * @type {Number[]}
 */
Hemex.WhiteSpace = [
    9,10,11,12,13,32,133
];
/**
 * Current cursor position
 * @type {Number}
 */
Hemex.prototype.offset = 0;
Hemex.prototype.offsetMap = [];


/**
 * ###################################################
 * ########                                  #########
 * ######## Parser layering suite system     #########
 * ########                                  #########
 * ###################################################
 */

/**
 * Add offset layer
 */
Hemex.prototype.beginPosition = function(){
    this.offsetMap.push(
        this.getLastPosition()
    )
}
/**
 * Commit offset layer
 */
Hemex.prototype.acceptPosition = function(){
    let t = this.offsetMap.pop();
    this.setLastPosition(t)
}
/**
 * Returns not committed length between the previous offset
 * @returns {[Number,Number]}
 */
Hemex.prototype.positionRange = function(){
    let len = this.offsetMap.length;
    if(len == 0)
    {
        return [0,this.offset]
    }else if(len == 1){
        return [this.offset,this.offsetMap[len - 1]]
    }else{
        return [this.offsetMap[len - 2],this.offsetMap[len - 1]]
    }
}
/**
 * 
 * @returns {String}
 */
Hemex.prototype.getPositionRange = function(){
    let u = this.positionRange();
    return this.text.slice(u[0],u[1])
}
/**
 * Rollback from to previous offset from committed data
 */
Hemex.prototype.rejectPosition = function(){
    this.offsetMap.pop()
}
/**
 * Get current position from current layer
 * @returns {Number}
 */
Hemex.prototype.getLastPosition = function(){
    return this.offsetMap.length == 0 ? this.offset : this.offsetMap.slice(-1)[0]
}
/** 
 * Set current position from current layer
 * @param {Number} n Offset
 */
Hemex.prototype.setLastPosition = function(n){
    if(this.offsetMap.length == 0)
        this.offset = n
    else this.offsetMap[this.offsetMap.length - 1] = n
}

/**
 * #####################################################
 * ########                                    #########
 * ######## Parsing char/layer layout position #########
 * ########                                    #########
 * #####################################################
 */

/**
 * Get current position from current layer
 * @returns {Number}
 */
Hemex.prototype.getOffset = function(){
    return this.getLastPosition()
}
/** 
 * Set current position from current layer
 * @param {Number} n Offset
 */
Hemex.prototype.setOffset = function(n){
    this.setLastPosition(n);
    return this.getLastPosition()
}
/**
 *  text length
 *  @type {Number}
 */
Hemex.prototype.length = 0;

/**
 * Hemex lexing data
 *  @type {String} data
 */
Hemex.prototype.text = "";

/**
 * set lexing data
 * @param {String} text 
 * @returns {void}
 */
Hemex.prototype.setText = function(text){
    this.offset = 0;
    this.length = text.length;
    this.text = text;
}

/**
 * get lexing all data
 * @returns {String}
 */
Hemex.prototype.getText = function(){
    return this.text;
}
/**
 * Get one character from cursor
 * @param {Number} n 
 * @returns {String}
 */
Hemex.prototype.getChar = function(n){
    return this.text.charAt(n?this.getOffset()+n:this.getOffset())
}
/**
 * Boolean
 * @param {Number} n 
 * @returns {String}
 */
Hemex.prototype.isChar = function(b){
    return this.getChar() == b
}
/**
 * Dump all data from cursor position to end of char
 * @param {Number} n 
 */
Hemex.prototype.dump = function(n){
    return this.text.slice(this.getOffset(),this.getOffset()+n)
}
/**
 * Control coming end of line
 * @returns {Bollean}
 */
Hemex.prototype.isEnd = function(){
    return this.length >= this.getOffset()
}
/**
 * Forward one char
 */
Hemex.prototype.nextChar = function(){
    this.setOffset(this.getOffset() + 1);
}
/**
 * Forward n char
 */
Hemex.prototype.toChar = function(n){
    this.setOffset(this.getOffset() + n);
}
/**
 * Reading while end of line
 * @returns {String}
 */
Hemex.prototype.getLine = function(){
    return this.readWhileFunc(function(){
        switch(this.getChar())
        {
            case Hemex.EOL: return false;
            default: return true;
        }
    }.bind(this))
}

/**
 * #####################################################
 * ########                                    #########
 * ######## Written to make it easy to use     #########
 * ########                                    #########
 * #####################################################
 */

/**
 * Read all data until the function returns false
 * @param {Boolean} p
 * @param {(char:String)=>Boolean} e 
 * @returns {String}
 */
Hemex.prototype.readWhileFunc = function(e,p){
    let k = [];
    while(this.isEnd()){
        if(e(p)) k.push(this.getChar())
        else return k.join('')
        this.nextChar();
    };
    return k.length == 0 ? false : k.join('')
}
Hemex.prototype.each = function(e,p){
    let k = [];
    while(this.isEnd())
        if(!e(p)) return;
        else this.nextChar();
}
Hemex.prototype.while = function(e,p){
    let k = [];
    while(this.isEnd())
        if(!e(p)) return;
}
/**
 * Controlling for current char type
 * @param {Boolean} reverse
 * @returns {Boolean}
 */
Hemex.prototype.isNumber = function(reverse){
    let c = this.getChar().charCodeAt(0);
    let result = c >= 48 && c <= 57;
    return reverse ? !result : result;
}
/**
 * Read all data until char type is not number
 * @param {Boolean} reverse
 * @returns {String}
 */
Hemex.prototype.readNumbers = function(reverse){
    return this.readWhileFunc(this.isNumber.bind(this),reverse)
}
/**
 * Controlling for current char type
 * @param {Boolean} reverse
 * @returns {Boolean}
 */
Hemex.prototype.isBigLetter = function(reverse){
    let c = this.getChar().charCodeAt(0);
    let result = c >= 97 && c <= 122;
    return reverse ? !result : result;
}
/**
 * Controlling for current char type
 * @param {Boolean} reverse
 * @returns {Boolean}
 */
Hemex.prototype.isSmallLetter = function(reverse){
    let c = this.getChar().charCodeAt(0);
    let result = c >= 65 && c <= 90;
    return reverse ? !result : result;
}
/**
 * Controlling for current char type
 * @param {Boolean} reverse
 * @returns {Boolean}
 */
Hemex.prototype.isLetter = function(reverse){
    let result = this.isSmallLetter() || this.isBigLetter()
    return reverse ? !result : result;
}
/**
 * Read all data until char type is not letter
 * @param {Boolean} reverse
 * @returns {String}
 */
Hemex.prototype.readLetters = function(reverse){
    return this.readWhileFunc(this.isLetter.bind(this),reverse)
}
/**
 * Controlling for current char type
 * @param {Boolean} reverse
 * @returns {Boolean}
 */
Hemex.prototype.isWhiteSpace = function(reverse){
    let c = this.getChar(),ct = c.charCodeAt(0);
    let result = (
        c == '\n' ||
        c == '\r' ||
        c == '\t' ||
        c == ' ' ||
        Hemex.WhiteSpace.includes(ct)
    )
    return reverse ? !result : result;
}
/**
 * Read all data until char type is not white space
 * @param {Boolean} reverse
 * @returns {String}
 */
Hemex.prototype.readWhiteSpace = function(reverse){
    return this.readWhileFunc(this.isWhiteSpace.bind(this),reverse)
}

/**
 * #####################################################
 * ########                                    #########
 * ######## Utils                              #########
 * ########                                    #########
 * #####################################################
 */

/**
 * Controlling data
 * @param {Boolean} reverse
 * @returns {String}
 */
Hemex.prototype.include = function(words,next){
    this.beginPosition();
    for(let i = 0; i<words.length; i++)
    {
        if(words[i] != this.getChar())
        {
            this.rejectPosition();
            return false;
        };
        this.nextChar();
    };
    if(next) this.acceptPosition();
    else this.rejectPosition();
    return true;
}
/**
 * Controlling data
 * @param {Boolean} reverse
 * @returns {String}
 */
Hemex.prototype.includes = function(arrays,next){
    if(next) this.beginPosition();
    let flags = Array.from(arrays).fill(true);
    let index = 0;
    this.each(function(){
        let stopLoop = true;
        for(let T in arrays)
        {
            if(!flags[T] || arrays[T].length <= index) continue;
            stopLoop = false;
            flags[T] &= arrays[T][index] == this.getChar()
        };
        index++;
        return !stopLoop && flags.filter(function(val){return val}).length != 0;
    }.bind(this));
    let result = arrays.filter(function(_,index){return flags[index]});
    if(next) this.rejectPosition();
    return result.length == 0 ? false : result
}

Hemex.prototype.readNumber = function(){
    let data = [];
    let base = 10;
    let nextDot = false;
    let c = this.getChar();
    if(this.isChar('0'))
    {
        this.nextChar();
        switch(this.getChar())
        {
            case 'x':{
                base = 16;
                this.nextChar();
                data.push('0x')
                break;
            }
            case 'b':{
                base = 16;
                this.nextChar();
                data.push('0b')
                break;
            }
            default:{
                base = 8;
                this.nextChar();
                data.push('0')
            }
        }
    }else base = 10;
    this.each(()=>{
        switch(c = this.getChar())
        {
            case '0':
            case '1':{
                data.push(c);
                break;
            }
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':{
                if(base >= 8){
                    data.push(c);
                    break;
                }else return false;
            }
            case '8':
            case '9':{
                if(base >= 10){
                    data.push(c);
                    break;
                }else return false;
            }
            case 'A': case 'a':
            case 'B': case 'b':
            case 'C': case 'c':
            case 'D': case 'd':
            /* case 'E': case 'e': */
            case 'F': case 'f':{
                if(base >= 16){
                    data.push(c);
                    break;
                }else return false;
            }
            case '.':{
                if(!nextDot){
                    if(data.length == 0){
                        data.push("0");
                    }else data.push(".");
                    nextDot = true;
                    isFloat = true;
                }else{
                    throw new Error("Float number in Double dot");
                };
                break;
            }
            case 'E':case 'e':{
                if(this.getChar(1)!='+'){
                    if(base == 16){
                        data.push(c);
                        break;
                    }else return false;
                };
                if(data.length == 0){
                    this.rejectPosition();
                    return false;
                };
                data.push('e');
                this.nextChar();
                if(this.getChar()=='+' || this.getChar()=='-'){
                    data.push(char());
                    this.nextChar();
                };
                let result = null;
                this.each(()=>{
                    switch(this.getChar()){
                        case '0':
                        case '1':
                        case '2':
                        case '3':
                        case '4':
                        case '5':
                        case '6':
                        case '7':
                        case '8':
                        case '9':{
                            data.push(this.getChar());
                            this.nextChar();
                            break;
                        }
                        default:{
                            return false;
                        }
                    }
                })
            }
            default:{
                return false;
            }
        };
        return true
    });
    return data.length == 0 ? false : [data.join(''),base]
}
nb.hemex = Hemex;

/**
 * #####################################################
 * ########                                    #########
 * ######## DOM Modification Methods           #########
 * ########                                    #########
 * #####################################################
 */

/**
 * @returns {HTMLElement[]}
 */
nb.fn.prototype.all = function(){
    return [...this]
};
/**
 * @returns {HTMLElement}
 */
nb.fn.prototype.first = function(){
    return [...this][0]
};
/**
 * @returns {HTMLElement}
 */
nb.fn.prototype.last = function(){
    let y = [...this];
    return y.length == 0 ? null : y[y.length - 1]
};
/**
 * @param {(func:nb.fn) => {}} func
 */
nb.fn.prototype.each = function(func)
{
    this.$arg.forEach(elem => {
        func.call(nb(elem),elem)
    })
    return this;
};
/**
 * @param {(func:nb.fn) => {}} func
 * @returns {nb.fn}
 */
nb.fn.prototype.filter = function(func)
{
    return nb(this.$arg.filter(elem => {
        return func.call(nb(elem),elem)
    }))
};
/**
 * @param {(func:nb.fn) => {}} func
 * @returns {nb.fn}
 */
nb.fn.prototype.map = function(func)
{
    return nb(this.$arg.map(elem => {
        return func.call(nb(elem),elem)
    }))
};
/**
 * @param {String} selector
 * @returns {nb.fn}
 */
nb.fn.prototype.parent = function(selector)
{
    let parents = [];
    this.each(elem => {
        selector ? parents.push(...elem.closest()) : elem.parentNode && parents.push(elem.parentNode)
    })
    return new nb.fn(parents);
};
/**
 * @param {String} selector
 * @returns {nb.fn}
 */
nb.fn.prototype.child = function(selector)
{
    let results = [];
    this.each(elem => {
        let childs = Array.from(elem.children);
        if(selector) childs = childs.filter(i => i.matches(selector))
        results.push(...childs)
    })
    return new nb.fn(results);
};
/**
 * @param {String} selector
 * @returns {nb.fn}
 */
nb.fn.prototype.find = function(selector)
{
    let results = [];
    this.each(elem => {
        let childs = Array.from(elem.querySelectorAll(selector));
        results.push(...childs)
    })
    return new nb.fn(results);
};
/**
 * @param {String} selector
 * @returns {nb.fn}
 */
nb.fn.prototype.next = function(selector)
{
    let results = [];
    this.each(elem => {
        if(!selector)
        {
            elem.nextElementSibling && results.push(elem.nextElementSibling)
        }else{
            let current = elem.nextElementSibling;
            while(current && current.matches(selector)){
                current = current.nextElementSibling
            };
            current && results.push(current);
        }
    })
    return new nb.fn(results);
};
/**
 * @param {String} selector
 * @returns {nb.fn}
 */
nb.fn.prototype.nextNode = function()
{
    let results = [];
    this.eachh(elem => {
        elem.nextSibling && results.push(elem.nextSibling)
    })
    return new nb.fn(results);
};
/**
 * @param {String} selector
 * @returns {nb.fn}
 */
nb.fn.prototype.prev = function(selector)
{
    let results = [];
    this.each(elem => {
        if(!selector)
        {
            elem.previousElementSibling && results.push(elem.previousElementSibling)
        }else{
            let current = elem.previousElementSibling;
            while(current && current.matches(selector)){
                current = current.previousElementSibling
            };
            current && results.push(current);
        }
    })
    return new nb.fn(results);
};
/**
 * @param {String} selector
 * @returns {nb.fn}
 */
nb.fn.prototype.prevNode = function()
{
    let results = [];
    this.each(elem => {
        elem.previousSibling && results.push(elem.previousSibling)
    })
    return new nb.fn(results);
};
/**
 * @param {String} selector
 * @returns {nb.fn|false}
 */
nb.fn.prototype.is = function(selector)
{
    let results = [];
    this.each(elem => {
        nb.isElement(elem) && elem.matches(selector) && results.push(elem)
    })
    return new nb.fn(results);
};
/**
 * 
 * @param {String} name 
 * @param {String} value 
 */
nb.fn.prototype.attr = function(name,value)
{
    if(this.empty) return this; 
    if(typeof name == "string")
    {
        if(name && value)
        {
            this.elements.each(function(){
                this.elem.setAttribute(name,value)
            })
            return this;
        }
        if(name)
        {
            return this.elem && this.elem.getAttribute(name)
        }
    }else if(!!name){
        this.elements.each(function(){
            Object.entries(name).forEach(([name,value]) => {
                this.elem.setAttribute(name,value)
            })
        })
    }else{
        return this.elem && this.elem.attributes;
    }
    return this;
};
/**
 * 
 * @param {String} name 
 * @param {String} value 
 */
nb.fn.prototype.removeAttr = function(name,value)
{
    if(typeof name == "string")
    {
        if(name && value)
        {
            this.each(function(elem){
                if(elem.attributes[name]?.value == value)
                {
                    elem.removeAttribute(name)
                }
            })
        }
        if(name)
        {
            this.each(function(elem){
                elem.removeAttribute(name)
            })
        }
    }else if(!!name && name instanceof Array){
        this.each(function(elem){
            name.forEach(name => {
                elem.removeAttribute(name)
            })
        })
    }
    return this;
};
/**
 * 
 * @param {String} name 
 * @param {String} value 
 */
nb.fn.prototype.toggleAttr = function(name,value)
{
    this.each(function(){
        this.attr(name) === undefined ? this.attr(name,value === undefined ? "" : value) : this.removeAttr(name)
    })
    return this;
};
/**
 * 
 * @param {String} name 
 * @param {String} value 
 */
nb.fn.prototype.truncate = function()
{
    this.each(function(elem){
        elem.textContent = "";
    });
    return this;
};
/**
 * 
 * @param {String} name 
 * @param {String} value 
 */
nb.fn.prototype.clone = function(deep)
{
    return new nb.fn(this.$arg.map(function(elem){
        return elem.cloneNode(deep)
    }))
};
nb.fn.prototype.add = function(...args)
{
    let dom = nb.dom(...args);
    dom.forEach(elem => {
        this.$arg[0].append(elem)
    })
    return this;
};
nb.fn.prototype.put = function(...args)
{
    let dom = nb.dom(...args);
    dom.length && this.each(elem => {
        dom[0].append(elem)
    })
    return this;
};
nb.fn.prototype.remove = function(selector)
{
    this.each(elem => {
        !!selector ? elem.matches(selector) && elem.remove() : elem.remove();
    })
    return this;
};
nb.fn.prototype.html = function(value)
{
    if(value === undefined)
    {
        return this.$arg[0].innerHTML
    }else{
        this.each(function(elem){
            elem.innerHTML = value;
        });
        return this;
    }
};
nb.fn.prototype.text = function(value)
{
    if(value === undefined)
    {
        return this.$arg[0].innerText
    }else{
        this.each(function(elem){
            elem.innerText = value;
        });
        return this;
    }
};
nb.fn.prototype.textContent = function(value)
{
    if(value === undefined)
    {
        return this.$arg[0].textContent
    }else{
        this.each(function(elem){
            elem.textContent = value;
        });
        return this;
    }
};
nb.fn.prototype.value = function(value)
{
    if(value === undefined)
    {
        if(nb.isText(this.$arg[0]))
        {
            return this.$arg[0].data
        }else if(nb.isElement(this.$arg[0])){
            return (this.$arg[0].tagName == "INPUT" && this.$arg[0].getAttribute("type").toLowerCase() == "checkbox") ? this.$arg[0].checked : this.$arg[0].value
        }
    }else{
        this.each(function(node){
            if(nb.isText(node))
            {
                node.data = value;
            }else if(elem.tagName == "INPUT" && elem.getAttribute("type").toLowerCase() == "checkbox")
            {
                !!value ? elem.setAttribute("checked","") : elem.removeAttribute("checked")
            }else{
                elem.value = value
            }
        });
        return this;
    }
};
nb.fn.prototype.on = function(eventName,query,callback,options){
    let events = eventName.split(/\s*,\s*/g)
    if(typeof query == "function"){
        options = callback;
        callback = query;
        return this.each(function(){
            let elem = this.$arg[0];
            events.forEach(function(event){
                elem.addEventListener(event,callback,options)
            })
        })
    }else{
        return this.each(function(){
            let elem = this.$arg[0];
            events.forEach(function(event){
                elem.addEventListener(event,function(evnt){
                    let tevent = (evnt || window.event);
                    nb(tevent.path).is(query).each(function(elem){
                        callback.apply(this.$arg[0],[tevent])
                    })
                });
            })
        })
    }
}
nb.fn.prototype.trigger = function(eventName,options){
    if(eventName instanceof Event){
        return this.each(function(){
            this.$elem[0].dispatchEvent(eventName)
        })
    }else{
        let events = eventName.split(/\s*,\s*/g);
        return this.each(function(){
            events.forEach(event => {
                this.$arg[0].dispatchEvent(new Event(event,options))
            })
        })
    }
}
nb.fn.prototype.off = function(eventName,callback){
    if(this.empty) return this;
    let events = eventName.split(/\s*,\s*/g)
    return this.each(function(){
        let elem = this.$arg[0];
        events.forEach(function(event){
            elem.removeEventListener(event,callback)
        })
    })
}
nb.fn.prototype.css = function(name,value,periority){
    if(this.empty || !this.elem) return this;
    if(typeof name == "string")
    {
        if(value === undefined)
        {
            if(name.indexOf(':') != -1)
            {
                nb.css.applyCSSRuleDom(this.elem,name);
                return this
            }else return this.elem.style[name]
        }else{
            this.elem.style[name] = value;
            return this;
        }
    }else if(!(name instanceof Array)){
        Object.entries(name).forEach(([name,value]) => {
            this.elem.style[name] = value;
        })
    }else name.forEach(({name,value}) => {
        this.elem.style[name] = value;
    })
    return this;
}
nb.fn.prototype.offset = function(type){
    if(this.empty) return this;
    let f = this.first();
    if(type == "dom"){
        return {
            width:f.clientWidth,
            height:f.clientHeight,
            left:f.clientLeft,
            top:f.clientTop
        }
    }else if(!type || type == "rect"){
        let rect = f.getClientRects()[0];
        return {
            width:rect.width,
            height:rect.height,
            left:rect.left,
            top:rect.top,
            right:rect.right,
            bottom:rect.bottom
        };
    }else if(type == "scroll"){
        return {
            width:f.scrollLeft,
            height:f.scrollHeight,
            left:f.scrollLeft,
            top:f.scrollTop
        }
    }
}

/**
 * #####################################################
 * ########                                    #########
 * ########     NB CSS theme design functions  #########
 * ######## CSS Parsing/optimizing/minimizing  #########
 * ########        JSON CSS3 to DOM CSS3       #########
 * ########                                    #########
 * #####################################################
 */

nb.css = function(){};
nb.css.ids = {};
nb.css.classes = {};
Object.defineProperty(nb.css,"id",{
    get:function(){
        let u = 1;
        while(1)
        {
            u+=0.5;
            let rnumber = function(){
                return parseInt(65 + Math.random() * 10)
            };
            let bigLet = function(){
                return String.fromCharCode(parseInt(65 + Math.random() * 24))
            };
            let smLet = function(){
                return String.fromCharCode(parseInt(97 + Math.random() * 24))
            };
            let randLet = function(){
                return [rnumber,bigLet,smLet][parseInt(Math.random() * 10) % 3]();
            };
            let id = smLet()+Array(parseInt(u)).fill(0).map(function(){return randLet()}).join('');
            if(nb.css.ids[id]) continue;
            else return id;
        }
    },
    set:() => {throw new Error("nb.css.id not writable variable")}
})
nb.css.serializeRule = function(obj,retObj)
{
    let rule = [];
    for(let name in obj)
    {
        let value = obj[name]
        if(typeof value == "string" || typeof value == "number" || typeof value == "function")
        {
            rule.push([
                nb.css.serializeRule.names(name),
                typeof obj[name] == "function" ? obj[name]() : obj[name]
            ])
        }else{
            if(typeof obj[name].$ != "undefined")
            {
                rule.push([
                    nb.css.serializeRule.names(name),
                    typeof obj[name].$ == "function" ? obj[name].$() : obj[name].$
                ])
                delete obj[name].$;
            }
            let m = nb.css.serializeRule(obj[name],true).map(([cname,value]) => cname != '$' ? [name+"-"+cname,value] : [name,value]);
            Array.prototype.push.apply(rule,m)
        }
    }
    return retObj ? rule : rule.map(([name,value]) => name+":"+value).join(";")
}
nb.css.serializeKeyframes = function(name,obj)
{
    let result = ["@keyframes "+name+"{"];
    for(let key in obj)
    {
        result.push(key+"{"+nb.css.serializeRule(obj[key])+"}")
    }
    result.push("}");
    return result.join('')
}
nb.css.serializeRule.bigLetter = /([a-z][A-Z])/;
nb.css.serializeRule.tireLetter = /(-)([a-z])/i;
nb.css.serializeRule.names = a => a.replace(new RegExp(nb.css.serializeRule.bigLetter,"gm"),i => i[0]+"-"+i[1].toLowerCase()).replace(/\-?\$$/g,'');
nb.css.serializeRule.namesRev = a => a.replace(new RegExp(nb.css.serializeRule.tireLetter,"gm"),i => i[1].toUpperCase());

nb.css.var = function(name,value)
{
    if(value === undefined)
    {
        return "var(--"+name+")"
    }else{
        nb.css.vars[name] = value
    }
}
nb.css.vars = {};
nb.css.calc = val => 'calc('+val+')';
nb.css.attr = val => 'attr('+val+')';
nb.css.serializeCSSObject = function(selector,o)
{
    let css = [];
    o.merge && o.merge.split(/\s+/g).forEach(name => {
        if(!nb.css.classes[name]) return console.warn(name+" js-css not found")
        nb.css.copyCSSObject(o,nb.css.classes[name]);
    })
    for(let name in o)
    {
        if(name == "merge") continue;
        if(name == "style")
        {
            css.push(selector + "{"+nb.css.serializeRule(o[name])+"}");
            continue;
        }
        if(name.startsWith("@media"))
        {
            css.push(nb.css.mediaTitleResolver(name));
            css.push('{');
            for(let _selector in o[name])
            {
                let sname = (/^\s*[^\&]/i.test(_selector) ?  '& ' + _selector : _selector).replace(/\&/g,selector);
                css.push(sname + "{"+nb.css.serializeRule(o[name][_selector])+"}");
            }
            css.push('}');
            continue;
        }
        let sname = (/^\s*[^\&]/i.test(name) ?  '& ' + name : name).replace(/\&/g,selector);
        if(name.startsWith("@keyframe"))
        {
            css.push(
                nb.css.serializeKeyframes(name.split(/@keyframe\s*/)[1],o[name])
            )
            continue;
        }
        css.push(sname + "{"+nb.css.serializeRule(o[name])+"}");
    }
    return css.join('')
}
nb.css.copyCSSObject = function(target,source){
    for(let name in source) switch(name)
    {
        case "merge":{
            source[name].split(/\s+/g).forEach(name => {
                if(!nb.css.classes[name]) return console.warn(name+" js-css not found")
                nb.css.copyCSSObject(target,nb.css.classes[name]);
            })
            break;
        };
        default:{
            if(typeof target[name] === "undefined" || typeof target[name] == "string" || typeof source[name] == "number" || typeof source[name] == "function")
            {
                if(typeof source[name] == "object")
                {
                    target[name] = {...source[name]}
                }else{
                    target[name] = source[name]
                }
            }else if(typeof target[name] == "string" || typeof target[name] == "number" || typeof target[name] == "function"){
                target[name] = {$:target[name],...source[name]};
            }else if(typeof source[name] == "string" || typeof source[name] == "number" || typeof source[name] == "function"){
                target[name].$ = source[name]
            }else{
                nb.css.copyCSSObject(target[name], source[name])
            }
        }
    }
}
nb.css.mediaTitleResolver = function(e){
    let result = ["@media screen"];
    let tn = /^\s*\@media\s*\(\s*(.*)\s*\)\s*$/i.exec(e);
    tn[1].split(/\s*,\s*/g).forEach(size => {
        let max,min;
        if(size.indexOf('-') != -1)
        {
            let sizes = size.split("-");
            min = sizes[0];
            max = sizes[1];
            min !== undefined && result.push(" and (min-width:"+min+"px)")
            max !== undefined && result.push(" and (max-width:"+max+"px)")
        }else{
            result.push(" and (max-width:"+size[0]+")")
        }
    })
    return result.join('');
}
nb.css.add = function(name,cssObject)
{
    if(nb.css.classes[name]) throw new Error(name+" rule already exists");
    nb.css.classes[name] = Object.freeze(cssObject);
}
nb.css.applyCSSRuleDom = function(element,css){
    css.split(/\s*;\s*/g).map(function(e){
        let [name,value] = e.split(/\s*:\s*/g);
        value && (element.style[
            nb.css.serializeRule.namesRev(name.trim())
        ] = value.trim())
    })
}
nb.css.ids = {};
nb.css.dom = nb.createElement("style");
nb.css.ready = false;
nb.css.use = function(id,selector)
{
    if(!nb.css.ready){
        nb.css.dom.put(document.head);
        nb.css.ready = true;
    }
    let cssObjectName = (
        typeof id == "string" ? id.split(/\s+/g,) : id
    ).sort();

    if(nb.css.ids[cssObjectName.join(',')])
    {
        return nb.css.ids[cssObjectName.join(',')];
    }
    let did = nb.css.ids[cssObjectName.join(',')] = selector ? selector : nb.css.id;

    let rawCSSRule = nb.css.serializeCSSObject("." + did,{
        merge:cssObjectName.join(' ')
    });
    nb.createComment(cssObjectName.join(' ')).put(nb.css.dom);
    nb.createText(rawCSSRule).put(nb.css.dom);
    return did
}



/**
 * #######################################################
 * ########           NB RGB Module              #########
 * ######## Color data processing and processing #########
 * ######## RGBA/DecimalNumber/HEX Colors        #########
 * ######## Lighting/Darking/contrast/gamma      #########
 * #######################################################
 */


nb.rgb = (...args) => new nb.RGB(...args);

nb.RGB = function(...args)
{
    this.value = {
        R:0,
        G:0,
        B:0,
        A:0
    }
    if(args[0] instanceof nb.RGB) this.value = Object.assign({},args[0].value);
    else if(args.length != 0) this.value = nb.RGB.init(...args) || this.value;
};

nb.RGB.init = function(...args){
    if(args.length == 0) return;
    let val;
    val = nb.RGB.hex3(args[0]);
    if(args[0] instanceof Array && args[0].filter(v => v instanceof Number).length >= 3){
        val = {
            R:nb.RGB.digit(args[0][0]),
            G:nb.RGB.digit(args[0][1]),
            B:nb.RGB.digit(args[0][2]),
            A:typeof args[0][3] == "number" ? args[0][3] : 255
        }
    }else if(typeof args[0] == "number" && typeof args[1] == "number" && typeof args[2] == "number"){
        val = {
            R:nb.RGB.digit(args[0]),
            G:nb.RGB.digit(args[1]),
            B:nb.RGB.digit(args[2]),
            A:typeof args[3] == "number" ? args[3] : 255
        }
    }else if(args[0].R != undefined && args[0].G != undefined && args[0].B != undefined){
        val = {
            R:args[0].R,
            G:args[0].G,
            B:args[0].B,
            A:args[0].A?args[0].A:255
        }
    }else val = (
        val || (
            typeof args[0] == "number" && (val = nb.RGB.hexNumberToRGB(args[0]))
        ) || typeof args[0] == "string" &&  (
            val = nb.RGB.hex3a(args[0])
        ) || (
            val = nb.RGB.hex3a(args[0])
        ) || (
            val = nb.RGB.hex6(args[0])
        ) || (
            val = nb.RGB.hex6a(args[0])
        ) || (
            val = nb.RGB.rgb(args[0])
        ) || (
            val = nb.RGB.rgba(args[0])
        )
    );
    if(val) return val;
    else return false;
}
var _c0 = c => ('0'+c.toString(16)).slice(-1).charAt(0);
var _c1 = c => ('00'+c.toString(16)).slice(-2);
nb.RGB.prototype.toHex3 = function(){
    return '#'+[
        _c0(this.value.R),
        _c0(this.value.G),
        _c0(this.value.B)
    ].join('')
};
nb.RGB.prototype.toHex4 = function(){
    return '#'+[
        _c0(this.value.R),
        _c0(this.value.G),
        _c0(this.value.B),
        _c0(this.value.A)
    ].join('')
};
nb.RGB.prototype.toHex6 = function(){
    return '#'+[
        _c1(this.value.R),
        _c1(this.value.G),
        _c1(this.value.B)
    ].join('')
};
nb.RGB.prototype.toHex8 = function(){
    return '#'+[
        _c1(this.value.R),
        _c1(this.value.G),
        _c1(this.value.B),
        _c1(this.value.A)
    ].join('')
};
nb.RGB.prototype.toRGB = function(){
    return 'rgb('+Object.values(this.value).slice(0,3).join(', ')+')'
};
nb.RGB.prototype.toRGBA = function(){
    return 'rgb('+Object.values(this.value).slice(0,4).join(', ')+')'
};
nb.RGB.prototype.isTransparent = function(){
    return this.value.A == 0;
};
nb.RGB.prototype.isWhite = function(){
    return this.value.R == 255 && this.value.G == 255 && this.value.B == 255;
};
nb.RGB.prototype.isBlack = function(){
    return this.value.R == 0 && this.value.G == 0 && this.value.B == 0;
};
nb.RGB.prototype.isBlack = function(){
    return this.value.R == 0 && this.value.G == 0 && this.value.B == 0;
};

nb.RGB.hex3 = (str) => {
    let y = /^#?([0-9A-F]{3})$/i.exec(str),m,r,g,b,
    k = (y && (m = y[1]) && {
        R:nb.RGB.hex(r=m.slice(0,1) && (r=='f'?'ff':r+'0')),
        G:nb.RGB.hex(g=m.slice(1,2) && (g=='f'?'ff':g+'0')),
        B:nb.RGB.hex(b=m.slice(2,3) && (b=='f'?'ff':b+'0')),
        A:255
    }) || false;
    return k;
}
nb.RGB.hex3a = (str) => {
    let y = /^#?([0-9A-F]{4})$/i.exec(str),m,r,g,b,
    k = (y && (m = y[1]) && {
        R:nb.RGB.hex(r=m.slice(0,1) && (r=='f'?'ff':r+'0')),
        G:nb.RGB.hex(g=m.slice(1,2) && (g=='f'?'ff':g+'0')),
        B:nb.RGB.hex(b=m.slice(2,3) && (b=='f'?'ff':b+'0')),
        a:nb.RGB.hex(b=m.slice(2,3) && (b=='f'?'ff':b+'0'))
    }) || false;
    return k;
}
nb.RGB.hex6 = (str) => {
    let y = /^#?([0-9A-F]{6})$/i.exec(str),m,
    k = (y && (m = y[1]) && {
        R:nb.RGB.hex(m.slice(0,2)),
        G:nb.RGB.hex(m.slice(2,4)),
        B:nb.RGB.hex(m.slice(4,6)),
        A:255
    }) || false;
    return k;
}
nb.RGB.hex6a = (str) => {
    let y = /^#?([0-9A-F]{8})$/i.exec(str),m,
    k = (y && (m = y[1]) && {
        R:nb.RGB.hex(m.slice(0,2)),
        G:nb.RGB.hex(m.slice(2,4)),
        B:nb.RGB.hex(m.slice(4,6)),
        A:nb.RGB.hex(m.slice(6,8))
    }) || false;
    return k;
}
nb.RGB.rgb = (str) => {
    let y = /^rgb\((\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\)$/i.exec(str) || /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/i.exec(str),
    k = (y && {
        R:nb.RGB.digit(y[1]),
        G:nb.RGB.digit(y[2]),
        B:nb.RGB.digit(y[3]),
        A:255
    }) || false;
    return k;
}
nb.RGB.rgba = (str) => {
    let y = /^rgb\((\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*\/\s*([\d\.\%]{1,3})\)$/i.exec(str) || /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3}),([\d\.]{1,3}\%?)\)$/i.exec(str),
    k = (y && {
        R:nb.RGB.digit(y[1]),
        G:nb.RGB.digit(y[2]),
        B:nb.RGB.digit(y[3]),
        A:nb.RGB.perctangleORDigit(y[4])
    }) || false;
    return k;
}
nb.RGB.hexNumberToARGB = function(v){
    if(0x010000 > v || v > 0xffffffff) return false;
    let B = v & 0xff;
    let G = v >> 8 & 0xff;
    let R = v >> 16 & 0xff;
    let A = v > 0x00ffffff ? v >> 24 & 0xff : 255;
    return {R,G,B,A}
}
nb.RGB.rgbaTOHexNumber = function(R,G,B,A){
    let val = 0
    val |= nb.RGB.digit(B);
    val |= nb.RGB.digit(G) >> 8;
    val |= nb.RGB.digit(R) >> 16;
    val |= nb.RGB.digit(A) >> 24;
    return val;
}
nb.RGB.digit = v => Math.max(Math.min(255,parseFloat(v)),0);
nb.RGB.isDigit = v => typeof v == "number" ? v >= 0 && v <= 255 : false;
nb.RGB.hex = v => Math.max(Math.min(255,parseInt(v,16)),0);
nb.RGB.number = v => {
    let val;
    if(v.toString().endsWith('%'))
    {
        val = 255 / (100 / parseInt(v));
    }else if(/^\-?\d{0,3}.\d{1,7}$/i.test(v) && v >= -1 && v <= 1){
        val = 255 * parseFloat(v);
    }else if(typeof v == "number" && v >= -255 && v <= 255 ){
        val = v;
    }
    return Number.isNaN(val) ? 255 : val
};

nb.RGB.perctangleORDigit = function(v)
{
    let val;
    if(v.toString().endsWith('%'))
    {
        val = nb.RGB.digit(255 / (100 / parseInt(v)))
    }else{
        val = 255 * parseFloat(v);
    };
    return Number.isNaN(val) ? 255 : val
}

nb.RGB.prototype.get = function(k){
    switch(k.toString().toLowerCase())
    {
        case 'r':
        case 'red':
        case '1':
            return this.value.R;
        case 'g':
        case 'green':
        case '2':
            return this.value.G;
        case 'b':
        case 'blue':
        case '3':
            return this.value.B;
        case 'a':
        case 'alpha':
        case '4':
            return this.value.A;
        case 'array':
            return [this.value.R,this.value.G,this.value.B,this.value.A]
        case 'object':
            return Object.assign({},this.value)
    };
};
nb.RGB.prototype.set = function(k,val){
    switch(k.toString().toLowerCase())
    {
        case 'r':
        case 'red':
        case '1':
            this.value.R = val;
            break;
        case 'g':
        case 'green':
        case '2':
            this.value.G = val;
            break;
        case 'b':
        case 'blue':
        case '3':
            this.value.B = val;
            break;
        case 'a':
        case 'alpha':
        case '4':
            this.value.A = val;
            break;
        case 'array':
            this.value.R = val[0];
            this.value.G = val[1];
            this.value.B = val[2];
            this.value.A = val[3];
            break;
        case 'object':
            this.value = val
    };
    return this;
};
nb.RGB.prototype.add = function(c,n){
    this.set(c,nb.RGB.digit(this.get(c)+n))
    return this;
};
nb.RGB.prototype.lightR = v => this.add('r',nb.RGB.number(v || +15));
nb.RGB.prototype.lightG = v => this.add('g',nb.RGB.number(v || +15));
nb.RGB.prototype.lightB = v => this.add('b',nb.RGB.number(v || +15));
nb.RGB.prototype.darkR = v => this.add('r',nb.RGB.number(v || -15));
nb.RGB.prototype.darkG = v => this.add('g',nb.RGB.number(v || -15));
nb.RGB.prototype.darkB = v => this.add('b',nb.RGB.number(v || -15));

nb.RGB.prototype.revert = function(){
    this.set('r',nb.RGB.digit(255 - this.get('r')))
    this.set('g',nb.RGB.digit(255 - this.get('g')))
    this.set('b',nb.RGB.digit(255 - this.get('b')))
};
nb.RGB.prototype.difference = function(){
    let v = nb.RGB.init.apply(null,arguments);
    if(!v) return this;
    this.set('r',nb.RGB.digit(this.get('r') - v.R));
    this.set('g',nb.RGB.digit(this.get('g') - v.G));
    this.set('b',nb.RGB.digit(this.get('b') - v.B));
    return this;
};
nb.RGB.prototype.lighten = function(){
    let v = nb.RGB.init.apply(null,arguments);
    if(!v) return this;
    this.set('r',nb.RGB.digit(this.get('r') + v.R));
    this.set('g',nb.RGB.digit(this.get('g') + v.G));
    this.set('b',nb.RGB.digit(this.get('b') + v.B));
    return this;
};

nb.RGB.prototype.light = function(n){
    let l = nb.RGB.number(Math.max(n,-n) || +15);
    this.add('r',l);
    this.add('g',l);
    this.add('b',l);
    return this;
};
nb.RGB.prototype.dark = function(n){
    let l = nb.RGB.number(Math.min(n,-n) || -15);
    this.add('r',l);
    this.add('g',l);
    this.add('b',l);
    return this;
};
nb.RGB.prototype.toString = function(){
    return this.isTransparent() ? this.toRGBA() : this.toHex6()
};


/**
 * #######################################################
 * ########           NB Ajax Module             #########
 * ######## Usign XHR for Server comminication   #########
 * ########                                      #########
 * #######################################################
 */

nb.xhr = function()
{

    let _url,
        _baseurl = this.baseURL,
        _data,
        _method,
        _successCallback,
        _errorCallback,
        _strings = [],
        _callbacks = [],
        _objects = [],
        _downloadProgress,
        _headers = {},
        _type,
        _uploadProgress,
        _args;
    (_args=Array.from(arguments)).forEach(argument => {
        if(typeof argument == "string")
        {
            _strings.push(argument)
        }else if(typeof argument == "function"){
            _callbacks.push(argument)
        }else if(typeof argument == "object"){
            _objects.push(argument)
        }
    });
    if(_args.length == 1 && _objects.length == 1)
    {
        let o = _objects[0];
        o.baseURL && (_baseurl = new URL(o.url,this.baseURL));
        o.url && (_url = new URL(o.url,_baseurl));
        o.data && (_data = o.data);
        o.success && (_successCallback = o.success);
        o.error && (_errorCallback = o.error);
        o.upload && (_uploadProgress = o.upload);
        o.download && (_downloadProgress = o.download);
        o.method && (_method = o.method.toUpperCase());
        o.type && (_type = o.type);
        o.headers && (_headers = o.headers);
    }else{
        _strings = _strings.filter(x => {
            let y = nb.xhr.methods.includes(x.toUpperCase());
            return !(y && (_method = x.toUpperCase()));
        });
        _strings.length == 1 && (_url ||= new URL(_strings[0],this.baseURL));
        _strings.length == 2 && (_url ||= new URL(_strings[0],this.baseURL)) && nb.xhr.putParams(_strings[1],this.url);
        _callbacks[0] && (_successCallback = _callbacks[0]);
        _callbacks[1] && (_errorCallback = _callbacks[1]);
        _callbacks[2] && (_uploadProgress = _callbacks[2]);
        _callbacks[3] && (_downloadProgress = _callbacks[3]);
        _objects.length == 1 && (_data = _objects[0]);
        _objects.length == 2 && (_data = _objects[0]) && (_headers = _objects[1]);
        _objects.length == 3 && (_data = _objects[0]) && (_headers = _objects[1]) && nb.xhr.putParams(_objects[2],this.url);
    };

    this.url = _url;
    this.method = _method || this.method;
    this.headers = _headers;

    if(_data)
    {
        let t;
        if(_data instanceof FormData)
        {
            if(!_method) _method = "POST";
            if(!_type) _type = "multipart";
            else switch(_type){
                case "multipart":
                    this.data = _data;
                    break;
                case "json":
                    t = {};
                    for(let [name,value] of obj.entries()) t[name]=value;
                    this.data = JSON.stringify(t);
                    if(_method != "GET") this.headers['content-type'] ||= nb.xhr.jsonHeader;
                    break;
                case "text":
                    t = [];
                    if(_method != "GET"){
                        this.headers['content-type'] ||= nb.xhr.txtHeader;
                        for(let [name,value] of obj.entries()) t.push([encodeURIComponent(name),encodeURIComponent(value)].join('\r\n'));
                        this.data = t.join('\r\n\r\n');
                    }else{
                        nb.xhr.putParams(_data,this.url);
                    }
                    break;
            }
            this.data = _data;
        }else{
            switch(_type){
                case "multipart":
                    t = new FormData();
                    for(let name in _data) t.append(name,_data[name]);
                    this.data = t;
                    break;
                case "json":
                    this.data = JSON.stringify(_data);
                    if(_method != "GET") this.headers['content-type'] = nb.xhr.jsonHeader;
                    break;
                case "text":
                    if(_method != "GET"){
                        this.headers['content-type'] = nb.xhr.txtHeader;
                        if(typeof _data != "string")
                        {
                            t = [];
                            for(let [name,value] of obj.entries()) t.push([encodeURIComponent(name),encodeURIComponent(value)].join('\r\n'));
                            this.data = t.join('\r\n\r\n');
                        }else{
                            this.data = _data;
                        }
                    }else{
                        nb.xhr.putParams(_data,this.url);
                    }
                    break;
            }
            if(_method == "GET")
            {
                nb.xhr.putParams(_data,this.url)
            }
        }
    };

    this.request = new XMLHttpRequest();
    this.request.onabort = e => this.trigger("abort",e)
    this.request.onerror = e => this.trigger("error",e)
    this.request.onload = e => this.trigger("load",e)
    this.request.onprogress = e => this.trigger("downloadprogress",e)
    this.request.onreadystatechange = e => this.trigger("statechange",e)
    this.request.ontimeout = e => this.trigger("timeout",e)
    this.request.upload.onprogress = e => this.trigger("timeout",uploadprogress)

    for(let headerName in this.headers)
    {
        this.request.setRequestHeader(headerName,this.headers[headerName])
    }

    _errorCallback && this.error(_errorCallback);
    _successCallback && this.success(_successCallback);
    _downloadProgress && this.downloadprogress(_downloadProgress);
    _uploadProgress && this.uploadprogress(_uploadProgress);
};
nb.xhr.prototype.data = undefined;
nb.xhr.prototype.method = "GET";
nb.xhr.prototype.baseURL = new URL(window.location);
nb.xhr.prototype.url = new URL(window.location);
nb.xhr.prototype.postDataType = "application/x-www-form-urlencoded";
nb.xhr.prototype.postType = "multipart";
nb.xhr.prototype.charset = "utf8";
nb.xhr.prototype.headers = {};
nb.xhr.prototype.isWaiting = false;
nb.xhr.prototype.isLoaded = false;
nb.xhr.prototype.ready = false;
nb.xhr.prototype.events = {
    load:[],
    success:[],
    timeout:[],
    error:[],
    start:[],
    finish:[],
    downloadprogress:[],
    uploadprogress:[],
    abort:[],
    statechange:[],
    redirect:[]
};
nb.xhr.prototype.trigger = function(event,...args){
    this.events[event].forEach(f => f.apply(this,args));
}
nb.xhr.prototype.load = function(f){this.events.load.push(f)};
nb.xhr.prototype.success = function(f){this.events.success.push(f)};
nb.xhr.prototype.timeout = function(f){this.events.timeout.push(f)};
nb.xhr.prototype.error = function(f){this.events.error.push(f)};
nb.xhr.prototype.start = function(f){this.events.start.push(f)};
nb.xhr.prototype.finish = function(f){this.events.finish.push(f)};
nb.xhr.prototype.downloadprogress = function(f){this.events.downloadprogress.push(f)};
nb.xhr.prototype.uploadprogress = function(f){this.events.uploadprogress.push(f)};
nb.xhr.prototype.abort = function(f){this.events.abort.push(f)};
nb.xhr.prototype.redirect = function(f){this.events.redirect.push(f)};
nb.xhr.prototype.statechange = function(f){this.events.statechange.push(f)};
nb.xhr.prototype.responseData = undefined;
nb.xhr.prototype.load(function(i) {
    let contentType = this.request.getResponseHeader("content-type");
    let isJSON = nb.xhr.jsonReg.test(contentType);
    let isXML = nb.xhr.xmlBased.test(contentType);
    if(isJSON){
       this.responseData = JSON.parse(this.request.response)
    }else if(isXML){
        this.responseData = this.request.responseXML;
    }else{
        this.responseData = this.request.response;
    }
    this.isWaiting = false;
    if (this.request.status >= 200 && this.request.status < 300) {
        this.trigger("success",this.responseData);
    }else if (this.request.status >= 300 && this.request.status < 400) {
        this.trigger("redirect",this.request.getResponseHeader("location"));
    };
    this.isLoaded = true;
    this.ready = true;
    this.trigger("finish");
});
nb.xhr.prototype.error(function(i) {
    this.isWaiting = false;
    this.isLoaded = true;
    this.ready = false;
    this.trigger("finish");
});
nb.xhr.prototype.send = async function(){
    if(this.isWaiting) return;
    this.trigger("start",this);
    this.isWaiting = true;
    this.request.open(this.method,this.url.toString(),true);
    this.request.send(this.data);
    return await new Promise(ok=>{
        this.finish(i => ok(this.responseData));
    })
};

nb.xhr.prototype.then = function(f){
    if(this.isWaiting)
    {
        this.finish(k => f(this.responseData));
    }else if(this.isLoaded){
        f.apply(this.request,[this.responseData])
    }else{
        this.send();
        this.finish(k => f(this.responseData));
    }
};
nb.xhr.prototype.catch = function(f){
    if(this.isWaiting)
    {
        this.error(x => f(this.request.responseText));
        this.timeout(x => f(this.request.responseText));
    }else if(!this.isLoaded){
        this.send();
        this.error(x => f(this.request.responseText));
        this.timeout(x => f(this.request.responseText));
    }
};
nb.xhr.methods = ['POST','PUT','OPTIONS','HEAD','GET','PATCH','DELETE']
nb.xhr.multipartHeader = "multipart/form-data";
nb.xhr.jsonHeader = "application/json; charset=utf8";
nb.xhr.urlEncodedHeader = "application/x-www-form-urlencoded";
nb.xhr.txtHeader = "text/plain; charset=utf8";

nb.xhr.multipartReg = /^multipart\/form\-data$/i;
nb.xhr.jsonReg = /^application\/json(;.+)?$/;
nb.xhr.urlEncodedReg = /^application\/x\-www\-form\-urlencoded$/;
nb.xhr.txtReg = /^text\/plain(;.+)?$/;
nb.xhr.xmlBased = /^application\/(rss\+|xhtml\+)?xml$|^image\/svg\+xml$|^text\/(html|xml)$/;
/**
 * @param {URL} url 
 */
nb.xhr.putParams = function(obj,url){
    if(obj instanceof FormData)
    {
        for(let [name,value] of obj.entries()){
            url.searchParams.set(name,value)
        };
    }else if(typeof obj == "string")
    {
        url.search = obj.startsWith('?') ? obj : '?' + obj;
    }else if(obj instanceof Array)
    {
        obj.forEach(([name,value]) => {
            url.searchParams.set(name,value)
        })
    }else{
        for(var name in obj)
            url.searchParams.set(name,obj[name])
    }
};


/**
 * #######################################################
 * ########                                      #########
 * ######## File / Blob / DataURL convert utils  #########
 * ########                                      #########
 * #######################################################
 */


nb.blobTOFile = function(blob,filename){
    return new File([blob],filename,{
        type:blob.type,
        lastModified:new Date()
    })
}
nb.fileTOBlob = function(file){
    return new Blob([file],{
        type:file.type
    })
}
nb.DataURLToBlob = async function(dataURL){
    return await (await fetch(dataURL)).blob();
}
nb.DataURLToFile = async function(dataURL,filename){
    let blob = await (await fetch(dataURL)).blob();
    return new File([blob],filename,{
        lastModified:new Date(),
        type:blob.type
    })
}
nb.fileTODataURL = nb.blobTODataURL = async function(file){
    return await new Promise(ok=>{
        let reader = new FileReader();
        reader.onload = function(){
            ok(reader.result)
        };
        reader.readAsDataURL(file)
    })
}


/**
 * #######################################################
 * ########                                      #########
 * ########        NB NoSQL IndexedDB Module     #########
 * ########   Save Database Storage from Client  #########
 * ########                                      #########
 * #######################################################
 */


/**
 * @type {IDBFactory}
 */
nb.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
nb.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: "readwrite"}; // This line should only be needed if it is needed to support the object's constants for older browsers
nb.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;


nb.IndexedDB = function(o){
    let isReady = false;
    /**
     * @type {IDBFactory}
     */
    let db;
    this.loadevents = [];
    this.scope = e => this.loadevents.push(e);
    this.connect = function(){
        let dbRequest = nb.indexedDB.open(o.name,o.version||1);
        dbRequest.onupgradeneeded = function(ev){
            let db = ev.target.result;
            o.tables.forEach(table => {
                let objectStore = db.createObjectStore(table.name, {keyPath:table.primarykey});
                table.columns.forEach(name => objectStore.createIndex(name,name))
            })
        };
        dbRequest.onsuccess = function(e){
            db = e.target.result;
            isReady = true;
            that.loadevents.forEach(f => f.apply(that))
        };
        dbRequest.onerror = i => isReady = false;
    };
    this.add = async function(name,value){
        var store = db.transaction([name], "readwrite").objectStore(name).add(value);
        await new Promise(ok => store.onsuccess = store.onerror = event => ok(event.target.result));
    }
    this.clear = async function(name){
        var store = db.transaction([name], "readwrite").objectStore(name).clear();
        await new Promise(ok => store.onsuccess = store.onerror = event => ok(event.target.result));
    }
    this.count = async function(name){
        var store = db.transaction([name], "readonly").objectStore(name).count();
        await new Promise(ok => store.onsuccess = store.onerror = event => ok(event.target.result));
    }
    this.delete = async function(name,value){
        var store = db.transaction([name], "readwrite").objectStore(name).delete(value);
        await new Promise(ok => store.onsuccess = store.onerror = event => ok(event.target.result));
    }
    this.getAll = async function(name){
        var store = db.transaction([name], "readonly").objectStore(name).getAll();
        await new Promise(ok => store.onsuccess = store.onerror = event => ok(event.target.result));
    }
    this.put = async function(name,value){
        var store = db.transaction([name], "readwrite").objectStore(name).put(value);
        await new Promise(ok => store.onsuccess = store.onerror = event => ok(event.target.result));
    }
    let that = this;
}
nb.load(function(){
    nb.mutationSubsystems.mutationScan(document.body);
    new MutationObserver(function(changes){
        changes.forEach(function(change){
            change.addedNodes.forEach(node => {
                nb.isElement(node) ? (node.tagName.startsWith('NB:') ? nb.mutationSubsystems.mutationElement(node) : null) : nb.isText(node) ? nb.mutationSubsystems.mutationTextNode(node) : 0;
            })
            if(change.type == "characterData")
            {
                nb.isText(change.target) && nb.mutationSubsystems.mutationTextNode(change.target)
            }
            if(change.type == "attributes")
            {
                nb.isElement(change.target) && nb.mutationSubsystems.mutationAttribute(change.target,change.attributeName)
            }
        })
    }).observe(document.body, {
        subtree: true,  
        childList: true,
        characterData: true,
        attributes:true
    });
})

/**
 * ########################################################
 * ########                                       #########
 * ########         NB Mutation Module            #########
 * ######## Listening Real time DOM modifications #########
 * ########                                       #########
 * ########################################################
 */

nb.mutationSubsystems = {};
nb.mutationSubsystems.mutationScan=function(tree){
    for(let node of tree.childNodes)
    {
        if(nb.isElement(node))
        {
            if(node.tagName.startsWith('NB:'))
            {
                nb.mutationSubsystems.mutationElement(node)
            }else node.childNodes.length && nb.mutationSubsystems.mutationScan(node);
        }else{
            nb.mutationSubsystems.mutationTextNode(node)
        }
    }
};
/**
 * 
 * @param {HTMLElement} elem 
 */
nb.mutationSubsystems.mutationElement = function(elem){
    let t = /^NB:(.+)$/i.exec(elem.tagName);
    if(!t) return;
    let k = false;
    let container = nb.createFragment();
    nb.mutationSubsystems.event.emit("element",function(elem){
        nb(elem).put(container);
        k = true;
    },elem,t[1]);
    if(k)
    {
        elem.replaceWith(container)
    }
}
/**
 * 
 * @param {HTMLElement} elem 
 */
nb.mutationSubsystems.mutationAttribute = function(elem,attrName){
    let t = /^NB:(.+)$/i.exec(elem.tagName);
    if(!t) return;
    let k = false;
    let container = nb.createFragment();
    nb.mutationSubsystems.event.emit("attribute",function(elem){
        nb(elem).put(container);
        k = true;
    },elem,attrName,t[1]);
    if(k)
    {
        elem.replaceWith(container)
    }
}
/**
 * 
 * @param {Text} text 
 */
nb.mutationSubsystems.mutationTextNode = function(text){
    let j = text.data + '',k=[];
    let u = function(){
        let container = nb.createFragment();
        let cOk = false;
        j.replace(/(.*)\{\{\s*([^\}]+)\s*\}\}(.*)/ig,function(stats,textP,node,textN){
            let t = false;
            nb.mutationSubsystems.event.emit("text",function(elem){
                t = nb(elem).first();
            },node);
            if(t)
            {
                container.append(textP);
                container.append(t);
                container.append(textN);
                cOk = true;
            }
        });
        if(cOk)
        {
            text.replaceWith(container)
        }
    };
    u();
};
nb.mutationSubsystems.event = new nb.event();

/**
 * ##################################################
 * ########                                #########
 * ######## Create DOM Tree from json data #########
 * ########                                #########
 * #################################################
 */


/**
 * 
 * @param {{$:String,$class:String,className:String,value:String}} o 
 * @returns 
 */
nb.design = function(o){
    if(!o) return null;
    let doc = nb.createFragment(),current=null;
    if(o instanceof Array)
    {
        for(let jselement of o)
        {
            if(typeof jselement == "string" || nb.isText(jselement)){
                doc.append(jselement);
                continue;
            }
            current = nb.createElement(jselement.$||"div");
            for(let key in jselement)
            {
                switch(key)
                {
                    case "$":break;
                    case "style":{
                        if(typeof jselement.style == "string" || typeof jselement.style == "number")
                        {
                            current.elem.style = jselement.style;
                            break;
                        }else if(typeof jselement.style == "object"){
                            current.elem.style = nb.css.serializeRule(jselement.style);
                            break;
                        }else continue;
                    }
                    case "in":
                        current.add(nb.design(jselement.in));
                        break;
                    default:{
                        if(key.startsWith('$'))
                        {
                            current.attr(key.substring(1),jselement[key])
                        }else{
                            current.elem[key] = jselement[key];
                        }
                    }
                }
            };
            doc.append(current.first());
        }
    }else{
        let jselement = o;
        if(typeof jselement == "string" || nb.isText(jselement)){
            doc.append(jselement);
        }else {
            current = nb.createElement(jselement.$||"div");
            for(let key in jselement)
            {
                switch(key)
                {
                    case "$":break;
                    case "in":
                        current.add(nb.design(jselement.in));
                        break;
                    default:{
                        if(key.startsWith('$'))
                        {
                            current.attr(key.substring(1),jselement[key])
                        }else{
                            current.elem[key] = jselement[key];
                        }
                    }
                }
            };
            doc.append(current.first());
        }
    };  
    return nb(doc)
};