function Observer (data) {
  this.data = data;
  this.walk(data); // 开始 走起
}

Observer.prototype = {

  walk: function (data) {
    var me = this;
    // 遍历data中全部的属性
    Object.keys(data).forEach(function (key) {
      me.convert(key, data[key]);
    });
  },

  convert: function (key, val) {
    this.defineReactive(this.data, key, val); // 定义响应式
  },

  // 定义响应 数据劫持的关键
  defineReactive: function (data, key, val) {
    var dep = new Dep(); // 与data中的属性一一对应，虽然这里不是用let但是要记得的是ES5中的函数也是有作用域的也是会影响var的作用域链的
    var childObj = observe(val); // 遍历对象中的每一个值

    // 使用属性描述符来添加命名访问器属性（get/set）
    Object.defineProperty(data, key, {
      enumerable: true, // 可枚举
      configurable: false, // 不能再define


      // 这里就是建立Dep和wather关系的地方

      get: function () {
        if (Dep.target) {
          dep.depend();
        }
        return val;
      },


      set: function (newVal) {
        if (newVal === val) {
          return;
        }
        
        val = newVal;
        // 新的值是object的话，进行监听
        childObj = observe(newVal);
        // 通知订阅者
        dep.notify();
      }
    });
  }
};

// 判断data 是否为空
function observe (value, vm) {
  if (!value || typeof value !== 'object') {
    return;
  }

  return new Observer(value); // 观察data中所有属性
};


var uid = 0;

function Dep () {
  this.id = uid++;
  this.subs = []; // 多个sub订阅者的数组
}

Dep.prototype = {
  addSub: function (sub) {
    this.subs.push(sub);
  },

  depend: function () {
    Dep.target.addDep(this);
  },

  removeSub: function (sub) {
    var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
  },

  notify: function () {
    // 这里是sub就是放的Watcher
    this.subs.forEach(function (sub) {
      sub.update();
    });
  }
};

Dep.target = null;