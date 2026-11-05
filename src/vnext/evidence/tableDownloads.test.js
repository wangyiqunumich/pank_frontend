import {collectTable} from './tableDownloads';
test('cancellation during final page never returns a partial or completed export',async()=>{
 const controller=new AbortController();
 const request=jest.fn(async()=>{controller.abort();return {state:'available',records:[{value:0}],has_more:false};});
 await expect(collectTable(request,{},controller.signal)).rejects.toMatchObject({name:'AbortError'});
});
test('export reads all exact filtered pages and fails on a later error',async()=>{
 const query={ref:{kind:'edge',type_id:'QTL',id:'e'},table_id:'credible_members',filters:{condition:'ND'}};
 const request=jest.fn().mockResolvedValueOnce({state:'available',records:[{pip:0}],has_more:true,next_cursor:'next'}).mockResolvedValueOnce({state:'unavailable',records:[],has_more:false});
 await expect(collectTable(request,query)).rejects.toThrow('no partial');
 expect(request.mock.calls[1][1]).toEqual({...query,limit:100,cursor:'next'});
});

test('source navigation replaces raw artifacts with source pages and deduplicates Ensembl',()=>{
 const {tableSources,sourcePageUrl}=require('./tableDownloads');
 const card={ref:{kind:'node',type_id:'Gene',id:'INS'}};
 const sources=[{id:'xref',href:'https://ftp.ebi.ac.uk/pub/xref.tsv.gz',title:'xref'},
 {id:'core',href:'https://ftp.ensembl.org/pub/release-116/mysql/',title:'core'}];
 expect(tableSources(card,{id:'accessions',download:{source_ids:['xref','core']}},[],{}, {table_downloads:{sources}})).toHaveLength(1);
 expect(sourcePageUrl(sources[0])).toBe('https://www.ensembl.org/Homo_sapiens/Info/Index');
 expect(sourcePageUrl({href:'https://pankbase-data-v1.s3.us-west-2.amazonaws.com/raw.rds',library_url:'https://data.pankbase.org/matrix-files/PKB123/'})).toBe('https://data.pankbase.org/matrix-files/PKB123/');
 expect(sourcePageUrl({href:'https://pankbase-data-v1.s3.us-west-2.amazonaws.com/raw.rds',library_url:'https://doi.org/10.123/foo'})).toBe('https://data.pankbase.org/');
 expect(sourcePageUrl({href:'https://example.org/raw.tsv.gz'})).toBeNull();
 expect(sourcePageUrl({href:'https://example.org/raw.tsv.gz',source_page_url:'https://example.org/study/123'})).toBe('https://example.org/study/123');
});
