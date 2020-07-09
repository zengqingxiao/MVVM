// 这个就是一开始的构造函数了
function MVVM (options) {
  // 将配置对象保存
  this.$options = options;
  // 将配置对象中的data保存
  var data = this._data = this.$options.data;
  // 保存实例对象
  var me = this;

  // 数据代理
  // 对data中全部的属性进行
  // 实现 vm.xxx -> vm._data.xxx
  /**
   * 1.什么是数据代理：通过一个对象代理对另一个对象中属性的操作(读/写)
   * 2.vue中的数据代理是一个什么样的：通过wm对象(也就是vue实例)来代理data对象中所有的属性操作
   * 3.好处是什么：更简单的操作data中的数据，其实就是少些了一层data就可以去修改和读取data中的值
   * 4：注意：（这里并没处理）以 _ 或 $ 开头的 property 不会被 Vue 实例代理，因为它们可能和 Vue 内置的 property、API 方法冲突。你可以使用例如 vm.$data._property 的方式访问这些 property 
   */
  Object.keys(data).forEach(function (key) {
    me._proxy(key);
  });

  observe(data, this); // 观察

  // el：'#app'
  // 创建一个编译对象
  this.$compile = new Compile(options.el || document.body, this) // 编译
}

MVVM.prototype = {
  $watch: function (key, cb, options) {
    new Watcher(this, key, cb);
  },

  _proxy: function (key) {
    var me = this;
    // 通过属性描述符来给实例添加属性
    Object.defineProperty(me, key, {
      configurable: false, //除了[[value]] 以外都不可以在修改了，不可写
      enumerable: true, // 是否可枚举
      // 读取的时候触发
      get: function proxyGetter () {
        return me._data[key];
      },
      // 修改的时候触发
      set: function proxySetter (newVal) {
        me._data[key] = newVal;
      }
    });
  }
};