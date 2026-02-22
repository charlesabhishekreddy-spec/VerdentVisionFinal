export function Progress({value=0}){return <div className="h-2 bg-gray-200 rounded"><div className="h-2 bg-green-600 rounded" style={{width:`${value}%`}} /></div>}
