import React,{createContext,useContext} from 'react';
import bundled from '../../schema/graph_viewer_panel_schema.json';
export const PanelSchemaContext=createContext(bundled);
export const usePanelSchema=()=>useContext(PanelSchemaContext);
export const panelSchema=schema=>schema?.panel_presentation?.header ? schema.panel_presentation : bundled;
export {bundled};
