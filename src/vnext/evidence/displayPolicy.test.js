import {visibleField,displayValue,presentCard} from './displayPolicy';
test('internal object keys stay private while source accessions and scientific terms remain literal',()=>{
 for(const key of ['record_id','credible_set_id','snapshot_id','qtl_signal_id','source_set'])expect(visibleField(key,'internal')).toBe(false);
 for(const key of ['source_id','pankbase_id','rrid']){expect(visibleField(key,'source_123')).toBe(true);expect(displayValue(key,'source_123')).toBe('source_123');}
 for(const value of ['SuSiE','sQTL'])expect(displayValue('method',value,{replace_underscores:true})).toBe(value);
});
test('unspecified effect units remain explained without a unit suffix',()=>{
 const card=presentCard({ref:{kind:'edge',type_id:'QTL',id:'a'},sections:[],fields:[{key:'slope',value:2,unit:'source units (unspecified)'}],provenance:{},tables:[]});
 expect(card.fields[0].show_unit).toBe(false);expect(card.fields[0].description).toContain('not establish a dimensionless');
});
