function Watcher (vm, exp, cb) {
  this.cb = cb;
  this.vm = vm;
  this.exp = exp;
  this.depIds = {}; // 每一次都是一个新对象
  this.value = this.get(); // 执行这个 获取当前data的值间距触发data的set函数
}

Watcher.prototype = {
  // 执行回调函数取修改dom的值
  update: function () {
    this.run();
  },

  run: function () {
    var value = this.get();
    var oldVal = this.value;
    if (value !== oldVal) {
      this.value = value;
    
      this.cb.call(this.vm, value, oldVal);
    }
  },

  addDep: function (dep) {
    // 1. 每次调用run()的时候会触发相应属性的getter
    // getter里面会触发dep.depend()，继而触发这里的addDep
    // 2. 假如相应属性的dep.id已经在当前watcher的depIds里，说明不是一个新的属性，仅仅是改变了其值而已
    // 则不需要将当前watcher添加到该属性的dep里
    // 3. 假如相应属性是新的属性，则将当前watcher添加到新属性的dep里
    // 如通过 vm.child = {name: 'a'} 改变了 child.name 的值，child.name 就是个新属性
    // 则需要将当前watcher(child.name)加入到新的 child.name 的dep里
    // 因为此时 child.name 是个新值，之前的 setter、dep 都已经失效，如果不把 watcher 加入到新的 child.name 的dep中
    // 通过 child.name = xxx 赋值的时候，对应的 watcher 就收不到通知，等于失效了
    // 4. 每个子属性的watcher在添加到子属性的dep的同时，也会添加到父属性的dep
    // 监听子属性的同时监听父属性的变更，这样，父属性改变时，子属性的watcher也能收到通知进行update
    // 这一步是在 this.get() --> this.getVMVal() 里面完成，forEach时会从父级开始取值，间接调用了它的getter
    // 触发了addDep(), 在整个forEach过程，当前wacher都会加入到每个父级过程属性的dep
    // 例如：当前watcher的是'child.child.name', 那么child, child.child, child.child.name这三个属性的dep都会加入当前watcher


    // zqx:
    // 每一个表达式都会产生一个新的watcher，然后这个watcher会加到表达式对应data的dep的subs中，当那个data的值发生改变的时候就会遍历subs中的watcher去改变值
    // 当我们data是某一个对象的参数的时候，例如：a.b
    // 那么会先获取到data a的get 从而吧当前b的watcher也加入到了data a 的Dep的subs中，这样当a发生修改的时候 b的值也会被监听

    // depIds：我目前看到的作用就是防止重复添加
    // 具体场景
    // {{a.b.c}} = 2
    // 变成了{{a.b.c}} = 3 重新触发跟新后重新compile那么这个whtcher是不会在添加a，b，c的depid了
    if (!this.depIds.hasOwnProperty(dep.id)) {
      dep.addSub(this);
      this.depIds[dep.id] = dep;
    }
  },
  get: function () {
    Dep.target = this;
    var value = this.getVMVal(); // 复制 Dep.this, 遍历有影响的data
    Dep.target = null;
    return value;
  },

  getVMVal: function () {
    var exp = this.exp.split('.');
    var val = this.vm._data; // 初始为data 如果exp为a.b.c 那么过程为 data.a  data.a.b  data.a.b.c
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  }
};