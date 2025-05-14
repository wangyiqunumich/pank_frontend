import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {Container, Box, FormControl, InputLabel, Select, MenuItem, Button, TextField, Typography, CircularProgress} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { useSelector, useDispatch } from 'react-redux';
import { useParams } from 'react-router-dom';

const dropdownOptions = {
    'sequence variant': ["SNP3","SNP1", "SNP2"],
    r: ["QTL","QTL1", "QTL2"],
    t: ["CFTR1", "CFTR2"],
  };
  
  const AISearch = ({ initialQuery = '' }) => {
    const dispatch = useDispatch();
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [matchedQuestion,setMatchedQuestion] = useState('');
    const [cypherQuery,setCypherQuery] = useState('');
    const [dropdownValues,setDropdownValues] = useState({});
    const [sequence, setSequence] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // 添加 useEffect 在页面加载时检查 initialQuery
    useEffect(() => {
        if (initialQuery) {
        handleCheck();
        }
    }, []); // 空依赖数组确保只在组件挂载时执行一次

    // 使用 useEffect 监听 matchedQuestion 的变化
    useEffect(() => {
        if (matchedQuestion) {
            const newSequence = splitTextAndTags(matchedQuestion);
            setSequence(newSequence);
        } else {
            setSequence([]);
        }
    }, [matchedQuestion]);

    // 添加 useEffect 来监听 sequence 变化, 并更新 matchedQuestion 和 cypherQuery
    useEffect(() => {
        if (sequence.length > 0) {
            const newMatchedQuestion = sequence
                .map(item => item.content)
                .join('');
            const tags = sequence
                .filter(item => item.isTag)
                .map(item => {
                    const match = item.content.match(/@@\{([^}]+)\}\{([^}]+)\}/);
                    return {
                        type: match[1].toLowerCase(),
                        value: match[2]
                    };
                });
            let newCypherQuery = cypherQuery;
            tags.forEach(tag => {
                newCypherQuery = newCypherQuery.replace(
                    new RegExp(`(${tag.type}:)[a-zA-Z0-9]+`), 
                    `$1${tag.value}`
                );
            });
            setMatchedQuestion(newMatchedQuestion);
            setCypherQuery(newCypherQuery);
        }
    }, [sequence, cypherQuery]);

    const handleCheck = async () => {
        if (!searchQuery) {
            setSearchQuery('Tell me which SNP serves as the QTL for CFTR?');
            return;
        }
        // setMatchedQuestion("Which @@{Sequence variant}{SNP} serves as the @@{Expression QTLs}{QTL} for @@{Gene}{CFTR}?");
        setIsLoading(true);
        try {
            const encodedQuery = encodeURIComponent(searchQuery);
            const response = await fetch(`https://glkb.dcmb.med.umich.edu/api/external/gkb_translator?question=${encodedQuery}`);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            if (data.in_scope) {
                setMatchedQuestion(data.rephrase);
                setCypherQuery(data.cypher_query);
            } else {
                alert("Sorry, this question is out of scope. Please try a different question.");
                setMatchedQuestion('');
                setCypherQuery('');
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert("An error occurred while processing your question. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleClear = async () => {
        setSearchQuery('');
        setMatchedQuestion('');
        setDropdownValues({});
        setCypherQuery('');
        setSequence([]);
    };

    // const renderDropdown = (key) => (
    //   <Select
    //     value={dropdownValues[key]}
    //     onChange={(e) => dispatch(setDropdownValues({ ...dropdownValues, [key]: e.target.value }))}
    //   >
    //     {dropdownOptions[key].map((option) => (
    //       <MenuItem key={option} value={option}>{option}</MenuItem>
    //     ))}
    //   </Select>
    // );
    
    const renderSequence = () => {
        return sequence.map((item, index) => {
            if (item.isTag) {
                const match = item.content.match(/@@\{([^}]+)\}\{([^}]+)\}/);
                const tagType = match[1].toLowerCase();
                const tagValue = match[2];
                
                const options = dropdownOptions[tagType] || [tagValue];
                const defaultValue = tagValue;

                const handleChange = (e) => {
                    setDropdownValues({ ...dropdownValues, [tagType]: e.target.value });
                    
                    const newSequence = sequence.map((seqItem, seqIndex) => {
                        if (seqIndex === index) {
                            return {
                                ...seqItem,
                                content: `@@{${tagType}}{${e.target.value}}`
                            };
                        }
                        return seqItem;
                    });
                    setSequence(newSequence);
                };

                return (
                    <Box key={index} component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
                        <Select
                            size="small"
                            value={defaultValue}
                            onChange={handleChange}
                            sx={{ minWidth: 100, mx: 1 }}
                        >
                            {options.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>
                );
            } else {
                return <span key={index}>{item.content}</span>;
            }
        });
    };

    function splitTextAndTags(text) {
        const regex = /@@\{([^}]+)\}\{([^}]+)\}/g;  // 新的正则表达式匹配 @{type}{value} 格式
        const sequence = [];
        
        let lastIndex = 0;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            // 添加标记之前的文本（如果有的话）
            if (match.index > lastIndex) {
                sequence.push({
                    content: text.slice(lastIndex, match.index),
                    isTag: false
                });
            }
            
            // 添加标记，使用新的格式
            sequence.push({
                content: `@@{${match[1]}}{${match[2]}}`,
                isTag: true
            });
            
            lastIndex = regex.lastIndex;
        }
        
        // 添加最后一段文本（如果有的话）
        if (lastIndex < text.length) {
            sequence.push({
                content: text.slice(lastIndex),
                isTag: false
            });
        }
        
        return sequence;
    };


    const handleSearch = async () => {
        // 检查是否有有效的匹配问题和查询
        // if (!matchedQuestion.trim() || !cypherQuery.trim()) {
        if (!cypherQuery.trim()) {
            alert("Please first type your question.");
            return;
        }

        // 构建查询参数
        const params = new URLSearchParams({
            matchedQuestion: matchedQuestion.replace(/\s+/g, '_'),
            cypherQuery: cypherQuery.replace(/\s+/g, '_'),
        });

        // 重定向到中间页面
        window.location.href = `/result?${params.toString()}`; 
    };
  


    return (
        <Box sx={{ flexDirection: "column", alignItems: "center", width: 572 ,marginTop: 2,}}>
        <Box sx={{ display: "flex", gap: 5, width: 522, backgroundColor: "#EAF4FF" }}>
        {/* Search Input Field */}
        <TextField
            variant="outlined"
            placeholder="E.g. Tell me which {SNP} serves as the {QTL} for {CFTR}?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{
            backgroundColor: "#fff",
            borderRadius: 2,
            "& .MuiOutlinedInput-root": {
                borderRadius: 2,
            },
            width: 572
            }}
        />
           <Button 
             variant="contained" 
             sx={{ borderRadius: 2, px: 3, width: 100, my: 1, borderRadius: 20, backgroundColor: "#1D3E62" }}
             onClick={handleCheck}
             disabled={isLoading}
           >
             {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Check'}
           </Button>
         </Box>
        <Typography variant="h6" sx={{ mt: 4 }}>Matched Question</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            {renderSequence()}
        </Box>
        
        <Typography variant="h6" sx={{ mt: 4 }}>Graph Visualization</Typography>
        <Box border={1} p={2} sx={{ 
            height: 200,  // 固定高度
            mt: 1,       // 减少与标题的间距
            overflow: 'auto',  // 内容过多时显示滚动条
            backgroundColor: '#f5f5f5'  // 可选：添加背景色使其更醒目
        }}>
            <Typography variant="body2">{cypherQuery || '[Graph representation goes here]'}</Typography>
        </Box>
  
        <Box display="flex" justifyContent="space-between" mt={2}>
          <Button variant="outlined" 
          sx={{ borderRadius: 2, px: 3, width: 200, my: 1, borderRadius: 20}}
          onClick={handleClear}>Clear All</Button>
          <Button variant="contained" 
          sx={{ borderRadius: 2, px: 3, width: 200, my: 1, borderRadius: 20, backgroundColor: "#1D3E62" }}
          onClick={handleSearch}>Submit</Button>
        </Box>
      </Box>
    );
  };



export default AISearch;
