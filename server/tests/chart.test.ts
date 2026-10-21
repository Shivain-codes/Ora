import test from 'node:test';
import assert from 'node:assert/strict';
import { adviseChart } from '../chart';
test('time series -> line',()=>assert.deepEqual(adviseChart([{year:2001,count:5},{year:2002,count:8}]),{type:'line',xKey:'year',yKey:'count',title:'count by year'}));
test('category + numbers -> bar',()=>assert.equal(adviseChart([{genre:'Comedy',count:4},{genre:'Drama',count:7}])?.type,'bar'));
test('no chart for empty, singleton, nested, nonfinite, mixed or duplicate axes',()=>{
  for(const rows of [[],[{year:2001,count:2}],[{title:'A',imdb:{rating:5}},{title:'B',imdb:{rating:7}}],[{x:'A',count:NaN},{x:'B',count:2}],[{x:'A',count:'2'},{x:'B',count:3}],[{x:'A',count:2},{x:'A',count:3}]])assert.equal(adviseChart(rows),undefined);
});
