import { createElement, render} from "./my-react";
import { useState } from '../my-react/render';

function Counter() {
  const [state, setState] = useState(1)
  return (
    <h1 onClick={() => setState(c => c + 1)}>
      Count: {state}
    </h1>
  )
}

const element = <Counter />
const container = document.getElementById("root")
render(element, container)
