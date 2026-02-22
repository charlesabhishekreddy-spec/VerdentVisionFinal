export function Toggle({pressed,onPressedChange,children}){return <button onClick={()=>onPressedChange?.(!pressed)}>{children}</button>}
