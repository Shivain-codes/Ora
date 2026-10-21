import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResultChart } from '../../src/components/chart';
test('SVG bar chart handles negative/zero values and supplies exact accessible data',()=>{
  const html=renderToStaticMarkup(createElement(ResultChart,{rows:[{genre:'Fixture A',count:-3},{genre:'Fixture B',count:0},{genre:'Fixture C',count:8}],spec:{type:'bar',xKey:'genre',yKey:'count',title:'TEST FIXTURE'}}));
  assert.ok(html.includes('<table>'));assert.ok(html.includes('role="img"'));assert.ok(html.includes('Fixture A'));assert.ok(html.includes('-3'));assert.ok(!html.includes('NaN'));assert.ok(!html.includes('Infinity'));assert.ok(!/height="-/.test(html));
});
test('SVG line chart renders series and escapes labels',()=>{
  const html=renderToStaticMarkup(createElement(ResultChart,{rows:[{year:2001,count:1},{year:2002,count:2}],spec:{type:'line',xKey:'year',yKey:'count',title:'<script>test</script>'}}));
  assert.ok(html.includes('<polyline'));assert.ok(!html.includes('<script>'));assert.ok(html.includes('2001'));
});
