import type { ChartSpec, JsonDoc } from '../../shared/types';
export function ResultChart({rows,spec}:{rows:JsonDoc[];spec:ChartSpec}) {
  const data=rows.filter(r=>typeof r[spec.yKey]==='number'&&Number.isFinite(r[spec.yKey]));
  if(!data.length)return null;
  const values=data.map(r=>Number(r[spec.yKey]));
  const min=Math.min(0,...values);const max=Math.max(0,...values);const span=max-min||1;
  const width=640,height=250,left=55,right=20,top=20,bottom=48;
  const plotW=width-left-right,plotH=height-top-bottom;
  const y=(v:number)=>top+(max-v)/span*plotH;
  const step=plotW/data.length;const x=(i:number)=>left+step*(i+.5);
  return <figure className="chart-panel"><figcaption>{spec.title}</figcaption><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${spec.type} chart: ${spec.title}. Exact values are in the data table below.`}>
    {[0,.5,1].map(f=>{const v=min+span*f;return <g key={f}><line className="chart-grid" x1={left} x2={width-right} y1={y(v)} y2={y(v)}/><text className="chart-label" x={left-9} y={y(v)+4} textAnchor="end">{v.toLocaleString(undefined,{maximumFractionDigits:1,notation:'compact'})}</text></g>;})}
    {spec.type==='line'&&<polyline className="chart-line" points={data.map((r,i)=>`${x(i)},${y(Number(r[spec.yKey]))}`).join(' ')}/>}
    {data.map((r,i)=><g key={i}>{spec.type==='bar'?<rect className="chart-bar" x={x(i)-step*.32} y={Math.min(y(0),y(values[i]))} width={step*.64} height={Math.max(1,Math.abs(y(values[i])-y(0)))} rx={2}><title>{`${r[spec.xKey]}: ${values[i]}`}</title></rect>:<circle className="chart-point" cx={x(i)} cy={y(values[i])} r={3}><title>{`${r[spec.xKey]}: ${values[i]}`}</title></circle>}{(i%Math.ceil(data.length/7)===0||i===data.length-1)&&<text className="chart-label" x={x(i)} y={height-18} textAnchor="middle">{String(r[spec.xKey]).slice(0,12)}</text>}</g>)}
  </svg><details className="chart-data"><summary>View chart data</summary><div className="table-scroll"><table><thead><tr><th>{spec.xKey}</th><th>{spec.yKey}</th></tr></thead><tbody>{data.map((r,i)=><tr key={i}><td>{String(r[spec.xKey])}</td><td>{values[i].toLocaleString()}</td></tr>)}</tbody></table></div></details></figure>;
}
