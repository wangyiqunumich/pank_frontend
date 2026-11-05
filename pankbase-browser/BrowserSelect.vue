<template><div class="browser-select-value" ref="anchor">
  <button ref="trigger" type="button" role="combobox" class="browser-select-trigger" :disabled="disabled" :aria-label="$attrs['aria-label']" aria-haspopup="listbox" :aria-expanded="String(open)" :aria-controls="open ? menuId : undefined" :title="selectedLabel" @click="open ? close() : show()" @keydown="keydown">
    <span>{{ selectedLabel || placeholder }}</span><svg viewBox="0 0 24 24" aria-hidden="true" :class="{'is-open':open}"><path d="m7 10 5 5 5-5"/></svg>
  </button>
  <div ref="menu" v-show="open" :id="menuId" class="browser-select-menu" role="listbox" :aria-label="$attrs['aria-label']" :style="menuStyle" @keydown="keydown">
    <div v-for="(option,i) in items" :key="i" ref="options" role="option" tabindex="-1" :aria-selected="String(option.value===value)" :class="{'is-active':i===active}" @click="choose(option)" @pointermove="active=i">{{ option.label }}</div>
  </div>
</div></template>
<script>
export default {
  inheritAttrs:false,
  props:{value:[String,Number],options:{type:Array,default:()=>[]},disabled:Boolean,placeholder:{type:String,default:'Select…'}},
  data:()=>({open:false,active:0,menuStyle:{},prefix:'',prefixTimer:null,menuId:`browser-select-${Math.random().toString(36).slice(2)}`}),
  computed:{
    items(){return this.options.map(option=>typeof option==='object'?option:{value:option,label:String(option)});},
    selectedLabel(){return this.items.find(option=>option.value===this.value)?.label||'';},
  },
  mounted(){
    // Same-origin srcDoc browsers share the host's menu layer so menus can
    // escape iframe clipping and the floating composer. Keep fullscreen menus
    // inside the native dialog's top layer.
    this.hostFrame=window.frameElement;
    this.popupWindow=this.hostFrame?window.parent:window;
    this.popupDocument=this.popupWindow.document;
    const dialog=this.hostFrame?.closest('dialog');
    (dialog?.open?dialog:this.popupDocument.body).appendChild(this.$refs.menu);
    this.outside=event=>{if(!this.$el.contains(event.target)&&!this.$refs.menu.contains(event.target))this.close(false);};
    this.reposition=()=>{if(this.open)this.position();};
    this.blur=()=>{clearTimeout(this.blurTimer);this.blurTimer=setTimeout(()=>{if(!this.popupDocument.hasFocus())this.close(false);},0);};
    document.addEventListener('pointerdown',this.outside,true);document.addEventListener('focusin',this.outside);
    window.addEventListener('resize',this.reposition);this.popupWindow.addEventListener('blur',this.blur);document.addEventListener('scroll',this.reposition,true);
    if(this.popupDocument!==document){this.popupDocument.addEventListener('pointerdown',this.outside,true);this.popupDocument.addEventListener('focusin',this.outside);this.popupDocument.addEventListener('scroll',this.reposition,true);this.popupWindow.addEventListener('resize',this.reposition);}
  },
  beforeDestroy(){clearTimeout(this.prefixTimer);clearTimeout(this.blurTimer);document.removeEventListener('pointerdown',this.outside,true);document.removeEventListener('focusin',this.outside);window.removeEventListener('resize',this.reposition);this.popupWindow.removeEventListener('blur',this.blur);document.removeEventListener('scroll',this.reposition,true);if(this.popupDocument!==document){this.popupDocument.removeEventListener('pointerdown',this.outside,true);this.popupDocument.removeEventListener('focusin',this.outside);this.popupDocument.removeEventListener('scroll',this.reposition,true);this.popupWindow.removeEventListener('resize',this.reposition);}this.$refs.menu.remove();},
  watch:{disabled(value){if(value)this.close(false);}},
  methods:{
    position(){const anchor=(this.$el.closest('.browser-select,.highlight-control')||this.$el).getBoundingClientRect(),frame=this.hostFrame?.getBoundingClientRect(),box={top:anchor.top+(frame?.top||0),bottom:anchor.bottom+(frame?.top||0),left:anchor.left+(frame?.left||0),width:anchor.width},view=this.popupWindow,width=Math.min(view.innerWidth-16,Math.max(box.width,160)),below=view.innerHeight-box.bottom-12,above=box.top-12,height=Math.min(280,this.items.length*32+12),up=below<height&&above>below,maxHeight=Math.max(32,Math.min(280,up?above:below));this.menuStyle={position:'fixed',left:`${Math.max(8,Math.min(box.left,view.innerWidth-width-8))}px`,top:`${up?Math.max(8,box.top-Math.min(height,maxHeight)-4):box.bottom+4}px`,width:`${width}px`,maxHeight:`${maxHeight}px`};},
    show(){if(this.disabled||!this.items.length)return;const dialog=this.hostFrame?.closest('dialog');(dialog?.open?dialog:this.popupDocument.body).appendChild(this.$refs.menu);this.open=true;this.active=Math.max(0,this.items.findIndex(option=>option.value===this.value));this.position();this.focusOption();},
    focusOption(){this.$nextTick(()=>{const option=this.$refs.options?.[this.active];option?.focus({preventScroll:true});option?.scrollIntoView({block:'nearest'});});},
    close(focus=true){if(!this.open)return;this.open=false;if(focus)this.$refs.trigger.focus({preventScroll:true});},
    choose(option){if(option.value!==this.value){this.$emit('input',option.value);this.$emit('change',option.value);}this.close();},
    keydown(event){
      if(event.key==='Escape'&&this.open){event.preventDefault();event.stopPropagation();this.close();return;}
      if(event.key==='Tab'){this.close();return;}
      if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(event.key)){
        event.preventDefault();if(!this.open){this.show();return;}
        if(event.key==='Enter'||event.key===' '){this.choose(this.items[this.active]);return;}
        this.active=event.key==='Home'?0:event.key==='End'?this.items.length-1:(this.active+(event.key==='ArrowDown'?1:-1)+this.items.length)%this.items.length;this.focusOption();
      }else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
        event.preventDefault();if(!this.open)this.show();clearTimeout(this.prefixTimer);this.prefix+=event.key.toLowerCase();this.prefixTimer=setTimeout(()=>{this.prefix='';},500);
        const next=this.items.findIndex(option=>option.label.toLowerCase().startsWith(this.prefix));if(next>=0){this.active=next;this.focusOption();}
      }
    },
  },
};
</script>
<style src="../src/vnext/browserSelect.css"></style>
