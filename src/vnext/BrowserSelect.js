import React, {useRef,useState} from 'react';
import {MenuItem,Select} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import './browserSelect.css';

export default function BrowserSelect({value,onChange,options,disabled=false,label,placeholder='Select…'}) {
  const anchor=useRef(null),[menuWidth,setMenuWidth]=useState(160);
  return <Select ref={anchor} className="browser-select-value" variant="standard" disableUnderline displayEmpty value={value} disabled={disabled}
    onChange={event=>onChange(event.target.value)}
    onOpen={()=>setMenuWidth(anchor.current?.closest('.browser-select')?.getBoundingClientRect().width||160)}
    SelectDisplayProps={{'aria-label':label,title:options.find(option=>option.value===value)?.label||placeholder}}
    IconComponent={KeyboardArrowDownRoundedIcon}
    MenuProps={{container:()=>{const dialog=anchor.current?.closest('dialog');return dialog?.open?dialog:document.body;},marginThreshold:8,sx:{zIndex:1400},
      // MUI closes its menu; prevent the native fullscreen dialog's Escape default.
      onKeyDown:event=>{if(event.key==='Escape')event.preventDefault();},
      PaperProps:{className:'browser-select-menu',sx:{minWidth:menuWidth,maxWidth:'calc(100vw - 16px)',maxHeight:280,borderRadius:'8px'}},MenuListProps:{dense:true,sx:{py:0}}}}
    sx={{font:'500 12px/18px Inter, system-ui, sans-serif',color:'#1e293b',
      '& .MuiSelect-select':{minHeight:'18px!important',lineHeight:'18px',p:'0 20px 0 0!important',backgroundColor:'transparent!important'},
      '& .MuiSelect-icon':{width:18,height:18,top:0,right:0,color:'#94a3b8'}}}>
    {!options.length&&<MenuItem value="" disabled>{placeholder}</MenuItem>}
    {options.map(option=><MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
  </Select>;
}
