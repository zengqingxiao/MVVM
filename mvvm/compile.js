function Compile (el, vm) {
  this.$vm = vm; // 实例
  // 判断是否是元素节点不是就是去querySelector去找 
  // 保存el到compile对象中
  this.$el = this.isElementNode(el) ? el : document.querySelector(el);

  if (this.$el) {
    // 这里的2 --> to
    this.$fragment = this.node2Fragment(this.$el); // 将节点转转移到内存（fragment）
    // 对节点初始化
    // 编译fragment中所有层次的子节点
    this.init();
    // 将编译好的fragment添加到页面的el元素中
    this.$el.appendChild(this.$fragment);
  }
}

Compile.prototype = {
  node2Fragment: function (el) {
    // 创建空的fragment
    var fragment = document.createDocumentFragment(),
      child;

    // 将全部原生节点拷贝到fragment
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }

    return fragment;
  },

  init: function () {
    // 编译指定元素（所有层次的子节点，包含文本节点和元素节点）
    this.compileElement(this.$fragment);
  },

  compileElement: function (el) {
    // 取出最外层的所有子节点（最外层的节点包含了文本节点和元素节点）
    var childNodes = el.childNodes,
      me = this;

    // 遍历所有子节点（text/element）    
    [].slice.call(childNodes).forEach(function (node) {
      var text = node.textContent; // 节点文本内容
      var reg = /\{\{(.*)\}\}/; // 匹配{{}}

      // 判断是否是元素节点
      if (me.isElementNode(node)) {

        //  编译元素节点（编译指令）
        me.compile(node);

        // 是否是文本节点，同时和正则匹配
      } else if (me.isTextNode(node) && reg.test(text)) {

        // 编译大括号文本节点
        me.compileText(node, RegExp.$1);
      }
      // 递归子节点，实现所有层次的节点的编译 
      if (node.childNodes && node.childNodes.length) {
        me.compileElement(node);
      }
    });
  },

  compile: function (node) {
    var nodeAttrs = node.attributes, // 获取元素节点的全部属性
      me = this;

    [].slice.call(nodeAttrs).forEach(function (attr) {
      var attrName = attr.name;
      if (me.isDirective(attrName)) {
        var exp = attr.value; // 事件触发的-->表达式（属性值） v-on:click='表达式'
        var dir = attrName.substring(2); // 去除'v-'
        // 事件指令
        if (me.isEventDirective(dir)) {
          compileUtil.eventHandler(node, me.$vm, exp, dir);
        } else {
          // 普通指令
          compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
        }
        // 移除指令属性 --> 也就是为什么我们定义的v- 在F12中是已经不存在的了 
        node.removeAttribute(attrName);
      }
    });
  },
  /**
   * 
   * @param {*} node // 文本节点  node = text  exp='naem'
   * @param {*} exp // 文本节点内容
   */
  compileText: function (node, exp) {
    compileUtil.text(node, this.$vm, exp);
  },

  isDirective: function (attr) {
    return attr.indexOf('v-') == 0;
  },

  isEventDirective: function (dir) {
    return dir.indexOf('on') === 0;
  },
  // 判断是否是元素节点
  isElementNode: function (node) {
    return node.nodeType == 1;
  },

  isTextNode: function (node) {
    return node.nodeType == 3;
  }
};

// 指令处理集合
var compileUtil = {
  // 这里包含了v-text 同时也包含了{{}}表达式
  text: function (node, vm, exp) {
    this.bind(node, vm, exp, 'text');
  },

  html: function (node, vm, exp) {
    this.bind(node, vm, exp, 'html');
  },

  model: function (node, vm, exp) {
    this.bind(node, vm, exp, 'model');

    var me = this,
      val = this._getVMVal(vm, exp);
    node.addEventListener('input', function (e) {
      var newValue = e.target.value;
      if (val === newValue) {
        return;
      }

      me._setVMVal(vm, exp, newValue);
      val = newValue;
    });
  },

  class: function (node, vm, exp) {
    this.bind(node, vm, exp, 'class');
  },

  bind: function (node, vm, exp, dir) {
    // 得到更新节点的函数
    var updaterFn = updater[dir + 'Updater'];
    // 调用函数 --> 更新节点
    updaterFn && updaterFn(node, this._getVMVal(vm, exp)); // 先取值在给节点赋值,进行页面的初始化

    // 对每一个表达式（除了事件）的表达式都进行添加订阅的绑定
    // 当表达式对应的值发生改变的时候对应的node节点的值也触发回调函数来发生改变
    // 这里的这个node是有通过闭包保存的
    new Watcher(vm, exp, function (value, oldValue) {
      updaterFn && updaterFn(node, value, oldValue);
    });
  },

  // 事件处理
  eventHandler: function (node, vm, exp, dir) {
    // 查看定义的事件名称
    var eventType = dir.split(':')[1],
      // 去配置中去找事件
      fn = vm.$options.methods && vm.$options.methods[exp];

    if (eventType && fn) {
      // 绑定时间名 ；回调函数 ； 函数的this为vm ； 冒泡机制
      node.addEventListener(eventType, fn.bind(vm), false);
    }
  },

  // 从vm中得到表达式（exp）中对应的值
  _getVMVal: function (vm, exp) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  },

  _setVMVal: function (vm, exp, value) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k, i) {
      // 非最后一个key，更新val的值
      // {{this.zzz.zz.z}} 的这个val写在模板中
      if (i < exp.length - 1) {
        val = val[k];
      } else {
        val[k] = value;
      }
    });
  }
};

// 更新器（er）去更新节点
// 包含多个更新节点的方法的工具对象
var updater = {
  /**
   * 
   * @param {*} node // 当前文本节点
   * @param {*} value // 需要赋值的值
   */
  textUpdater: function (node, value) {
    node.textContent = typeof value == 'undefined' ? '' : value; // 对节点的textContent赋值
  },

  htmlUpdater: function (node, value) {
    node.innerHTML = typeof value == 'undefined' ? '' : value;
  },

  // 原有class 和 定义表达式的class 合并
  classUpdater: function (node, value, oldValue) {
    var className = node.className;

    // 在监听发现修改后移除旧的class
    className = className.replace(oldValue, '').replace(/\s$/, '');
    var space = className && String(value) ? ' ' : '';
    node.className = className + space + value;
  },

  modelUpdater: function (node, value, oldValue) {
    node.value = typeof value == 'undefined' ? '' : value;
  }
};