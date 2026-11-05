import {recordDesign,objectSections,hasExtraRecord} from './recordDesign';
import {compactSections} from './compactSections';
const field=(key,value)=>({key,label:key,value});
test('short cell with only provenance extras cannot expand',()=>{
 const fields=[field('id','CL_0000169'),field('name','beta cell')];
 const card={sections:[{title:'Identity',fields}],fields:[...fields,field('data_source','CL'),field('data_version','2026'),field('license','CC0')]};
 expect(hasExtraRecord(card,compactSections(card,objectSections(card)),[])).toBe(false);
 expect(hasExtraRecord(card,compactSections(card,objectSections(card)),[{id:'owned'}])).toBe(true);
});
test('production Gene order and pills retain source values without inventing GC',()=>{
 const card={ref:{kind:'node',type_id:'Gene',id:'ENSG1'},sections:[{title:'Identity',fields:[field('id','ENSG1'),field('description','Own description'),field('chr','X')]}]};
 const styled=recordDesign(card);
 expect(styled.sections.map(s=>s.title)).toEqual(['Gene Identity','Description','Chromosomal Location']);
 expect(styled.sections[2].fields[0].design_format).toBe('label_chr(#0FB47D)');
 expect(styled.sections.flatMap(s=>s.fields).some(f=>f.key==='GC_percentage')).toBe(false);
});
test('compact expression uses condition-labelled rows and preserves zero',()=>{
 const card={widget:'expression',sections:[],condition_statistics:[{condition:'ND',statistics:{cpm:0,pct_expr:0}}]};
 const sections=objectSections(card);
 expect(sections[0].title).toBe('ND');expect(sections[0].fields.map(f=>f.value)).toEqual([0,0]);
});

test('SNP keeps all source populations and zero frequency beyond compact API preview',()=>{
 const card={ref:{kind:'node',type_id:'Variant',id:'rs1'},sections:[{title:'Alleles',fields:[field('ref','A'),field('alt','G')]}],fields:[field('freq','P1:1,0|P2:0.5,0.5|P3:0.2,0.8|P4:0.3,0.7|P5:0.4,0.6')],frequencies:[]};
 const shown=recordDesign(card);expect(shown.frequencies).toHaveLength(10);expect(shown.frequencies[1].frequency).toBe(0);
});
