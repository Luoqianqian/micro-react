function createElement(type, props, ...children) {
  // 节点对象——>type,props(...attribute, children)
  return {
    type,
    props: {
      ...props,
      children: children.map(child => 
        typeof child === 'object'? child: createTextElement(text)
      ),
    }
  }
}

function createTextElement(text) {
  return {
    type: 'TEXT-ELEMENT',
    props: {
      nodeValue: text,
      children: [],
    }
  }
}

export default createElement;