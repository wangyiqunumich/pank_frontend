import {compactSections} from './compactSections';
test('short records retain false, zero, and unknown values without mutation',()=>{
 const fields=[{key:'count',label:'Count',value:0},{key:'flag',label:'Flag',value:false},{key:'missing',label:'Missing',value:null}];
 const card={sections:[{title:'Evidence',fields}]};
 expect(compactSections(card)).toEqual({sections:card.sections,omitted:0});
});
test('oversized prose does not crowd out later concise evidence or alter full values',()=>{
 const prose='long explanation '.repeat(100);const card={sections:[{title:'Evidence',fields:[{key:'description',label:'Description',value:prose},{key:'pip',label:'PIP',value:.9,kind:'quantity'}]}]};
 expect(compactSections(card).sections[0].fields.map(f=>f.key)).toEqual(['pip']);
 expect(compactSections(card).omitted).toBe(1);expect(card.sections[0].fields[0].value).toBe(prose);
});
test('structured condition summary replaces verbose duplicate text without dropping source conditions',()=>{
 const card={widget:'expression',condition_statistics:[{condition:'ND',statistics:{cpm:0,pct_expr:2,n_donors:10}},{condition:'T1D',statistics:{cpm:1,pct_expr:3,n_donors:4}}],sections:[{title:'Evidence',fields:[{key:'evidence_summary',value:'long native text'},{key:'supported_conditions',value:['ND','T1D']}]}]};
 expect(compactSections(card)).toEqual({sections:[],omitted:0});
 expect(card.condition_statistics[0].statistics.cpm).toBe(0);
});
