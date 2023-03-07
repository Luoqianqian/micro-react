import { object } from "prop-types";

// 下一次执行
let nextUnitWork = null;
// 正在执行的渲染
let wipRoot = null;
// 上一次渲染
let currentRoot = null;
// 要删除的fiber
let deletion = null;


function createDom(fiber) {
  const dom = fiber.type === 'TEXT_ELEMENT'?
    document.createTextNode(fiber.props.nodeValue)
    : document.createElement(fiber.type);
  // 赋予attribute
  object.keys(fiber.props)
    .filter(key => key !== 'children')
    .forEach(key => {dom[key] = fiber.props[key]})

  // 递归渲染子元素
  fiber.props.children.forEach( child => render(child, dom));
  return dom;
}



// 发布第一个fiber
function render(element, container) {
  // 创建节点对象类型创建fiber节点
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    // 开始啥也没有,需要调度生成
    child: null,
    alternate: currentRoot,
  }
   // 有下一个任务就可以进行workLoop了
  nextUnitWork = wipRoot;
}

// commit阶段

function commitRoot () {
  deletion.forEach((item) => commitWork(item))
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function updateDom(dom, prevProps, nextProps) {
  const isProperty = key => key !== 'children';
  const isEvent = key => key.startsWith('on');
  // 删除不存在或者更新的event
  object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !key in nextProps || prevProps[key] !== nextProps[key])
    .forEach(key => {
      const eventType = key.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[key]);
    })
  // 添加新的event
  object.keys(nextProps)
    .filter(isEvent)
    .filter(key => !key in prevProps)
    .forEach(key => {
      const eventType = key.toLowerCase.substring(2);
      dom.addEventListener(eventType, nextProps[key]);
    })
  // 删除不存在的props
  object.keys(prevProps).filter(isProperty)
    .fiber(key => !key in nextProps).forEach(key => dom[key] = '');

  // 添加新的或者改变的props
  object(nextProps).filter(isProperty)
    .filter(key => !key in prevProps || prevProps[key] !== nextProps[key])
    .forEach(key => dom[key] = nextProps[key]);
}

function commitWork(fiber) {
  if(!fiber) {
    return;
  }
  // 寻找最近的父DOM节点
  let domParent = fiber.parent.dom;
  while(!domParent.dom) {
    domParent = domParent.parent;
  }
  const parentDom = domParent.dom;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom) {
    parentDom.append(fiber.dom);
  } else if (fiber.effectTag === 'DELETION' && fiber.dom) {
    commitDelition(fiber, parentDom);
  } else if (effectTag === 'UPDATE' && fiber.dom) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibiling);
}
// 寻找最近的子节点
function commitDelition(fiber, parentDom) {
  if (fiber.dom) {
    parentDom.removeChild(fiber.dom);
  } else {
    commitDelition(fiber.child, parentDom);
  }
}

// 调度函数
function workLoop(deadLine) {
  // 执行时间是否到期
  let shouldYield = false;
  // 当下一个任务存在 且 时间未到期
  while(nextUnitWork && !shouldYield) {
    // 执行任务，取得下一次执行
    nextUnitWork = performUnitOfWork(nextUnitWork);
    // 判断是否还有执行时间，有->继续执行下一条任务
    shouldYield = deadLine.timeRemaining < 1;
  }
  // 重新请求
  requestIdleCallback(workLoop);

  // commit 阶段
  if(!nextUnitWork && wipRoot) {
    commitRoot();
  }
}

// 请求在空闲时执行渲染
requestIdleCallback(workLoop)

// 执行一个渲染任务单元，并返回新的任务
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;

  if(isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  // 有child, 优先
  if(fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while(nextFiber) {
    // 有sibling，其次
    if(nextFiber.sibiling) {
      return nextFiber.sibiling;
    }
    // 向上查找父亲是否有兄弟节点
    nextFiber = nextFiber.sibiling;
  }
}
// 处理非函数式组件
function updateHostComponent(fiber) {
  if(!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  const elements = fiber.props.children;
  reconcileCildren(fiber, elements);
}
// 处理函数式组件
function updateFunctionComponent(fiber) {
  const children = [fiber.type(fiber.props)]
  reconcileCildren(fiber, children);
}

function reconcileCildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;
  // 注意用 || 取长,遍历做新旧节点对比
  while(index < elements.length || oldFiber) {
    let element = elements[index];
    let sameType = element && oldFiber && oldFiber.type === element[type];
    // 如果type相同，只需要更新
    if(sameType) {
      newFiber =  {
        type: oldFiber.type,
        dom: oldFiber.dom,
        props: element.props,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };
    }
    // 如果新的存在，但是type不同，则新建
    if(element && !sameType) {
      newFiber = {
        type: element.type,
        dom: null,
        props: element.props,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      };
      // 有fiber,但是type不同，把旧fiber推进deletion统一删除
      if(oldFiber && !sameType ) {
        oldFiber.effectTag = 'DELETION';
        deletion.push(oldFiber);
      }
      if(oldFiber) {
        // 下一个oldFiber
        oldFiber = oldFiber.sibling;
      }
      if(index === 0) {
        wipFiber.child = newFiber;
      }else {
        prevSibling.sibiling = newFiber;
      }
      prevSibling = newFiber;
      index++;
    }
  }
}