import {recordDesign,objectSections,hasExtraRecord,expandedSections} from './recordDesign';
import {compactSections} from './compactSections';
const field=(key,value)=>({key,label:key,value});
test('short cell with only provenance extras cannot expand',()=>{
 const fields=[field('id','CL_0000169'),field('name','beta cell')];
 const card={sections:[{title:'Identity',fields}],fields:[...fields,field('data_source','CL'),field('data_version','2026'),field('license','CC0'),field('license_url','https://example.org/license')]};
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

test('declared section groups merge matching fields and keep unused fields once',()=>{
 const positions=[field('chr','X'),field('genome_assembly','GRCh38')];
 const gene={ref:{kind:'node',type_id:'Gene',id:'ENSG1'},sections:[{title:'Position',fields:positions}],fields:positions};
 const coords=expandedSections(recordDesign(gene));
 expect(coords.map(section=>section.title)).toEqual(['Gene Identity','Chromosomal Location']);
 expect(coords[1].fields.map(f=>f.key)).toEqual(['chr','genome_assembly']);
 const donorFields=[field('id','HPAP-123'),field('gender','female'),field('bmi',0),field('other','preserved')];
 const donor={ref:{kind:'node',type_id:'donor'},sections:[{title:'Donor',fields:donorFields.slice(0,1)}],fields:donorFields};
 const sections=expandedSections(donor);
 expect(sections.map(section=>[section.title, section.fields.map(f=>f.value)])).toEqual([
   ['Donor',['HPAP-123']], ['Demographics',['female']], ['Clinical measurements',[0]], ['Additional details',['preserved']],
 ]);
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

test('variant complete record puts the common SNP flag with alleles and preserves the suspect reason',()=>{
 const ref={kind:'node',type_id:'Variant',id:'rs1'};
 const fields=[field('id',ref.id),field('ref','T'),field('alt','C'),field('common_snp',false),field('variant_suspect_reason',0)];
 const sections=[{title:'Interpretation',fields:[{...fields[3],label:'Common SNP'},{...fields[4],label:'Variant suspect reason'}]}];
 const record={ref,title:ref.id,sections,fields};
 const details=expandedSections(recordDesign(record));
 expect(details.map(section=>[section.title,section.fields.map(f=>[f.key,f.value])])).toEqual([
  ['Variant Alleles',[['ref','T'],['alt','C'],['common_snp',false]]],
  ['Additional details',[['variant_suspect_reason',0]]],
 ]);
 expect(details[1].fields[0].label).toBe('Variant suspect reason');
});
