import React,{createContext,useContext} from 'react';
import bundled from '../../schema/graph_viewer_panel_schema.json';
export const PanelSchemaContext=createContext(bundled);
export const usePanelSchema=()=>useContext(PanelSchemaContext);
const resolvedPolicies = new WeakMap();
export function panelSchema(schema) {
  const policy = schema?.panel_presentation;
  if (!policy?.header || !policy.footer || !policy.layout || !policy.tables) return bundled;
  if (policy.record_view && policy.value_labels?.treatment) return policy;
  // Older deployed schemas still own presentation. Fill in the new optional
  // declarations from the generated policy until their schema is updated.
  if (!resolvedPolicies.has(policy)) {
    resolvedPolicies.set(policy, {
      ...policy,
      record_view: policy.record_view ?? bundled.record_view,
      value_labels: {...bundled.value_labels, ...policy.value_labels},
      literal_value_fields: [...new Set([...bundled.literal_value_fields, ...(policy.literal_value_fields || [])])],
    });
  }
  return resolvedPolicies.get(policy);
}
export {bundled};
