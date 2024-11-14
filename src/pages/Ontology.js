import React from 'react';
import { Container, Typography } from '@mui/material';
import NavBar from '../NavBar';
import './Ontology.css';

const ontologyTreeHtml = `
<details style="margin-left: 0px;">
  <summary><a href="#">PanKgraph Root</a></summary>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0009987">cellular process</a></summary>
    <details style="margin-left: 40px;">
      <summary><a href="http://purl.obolibrary.org/obo/GO_0007165">signal transduction</a></summary>
      <div style="margin-left: 60px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0007186">G protein-coupled receptor signaling pathway</a></div>
    </details>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0004888">transmembrane signaling receptor activity</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0004930">G protein-coupled receptor activity</a></div>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0004984">olfactory receptor activity</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0110165">cellular anatomical entity</a></summary>
    <details style="margin-left: 40px;">
      <summary><a href="http://purl.obolibrary.org/obo/GO_0016020">membrane</a></summary>
      <div style="margin-left: 60px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0005886">plasma membrane</a></div>
    </details>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0009986">cell surface</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0005488">binding</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0005515">protein binding</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0007606">sensory perception of chemical stimulus</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0007608">sensory perception of smell</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0050907">detection of chemical stimulus involved in sensory perception</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0050911">detection of chemical stimulus involved in sensory perception of smell</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0006952">defense response</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0006954">inflammatory response</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0005035">death receptor activity</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0005031">tumor necrosis factor receptor activity</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0044092">negative regulation of molecular function</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0043433">negative regulation of DNA-binding transcription factor activity</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0008150">biological_process</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0016032">viral process</a></div>
    <details style="margin-left: 40px;">
      <summary><a href="http://purl.obolibrary.org/obo/GO_0050896">response to stimulus</a></summary>
      <div style="margin-left: 60px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0006955">immune response</a></div>
    </details>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0044409">symbiont entry into host</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0046718">symbiont entry into host cell</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0098552">side of membrane</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0009897">external side of plasma membrane</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0019221">cytokine-mediated signaling pathway</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0033209">tumor necrosis factor-mediated signaling pathway</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0006355">regulation of DNA-templated transcription</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0045892">negative regulation of DNA-templated transcription</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0140272">exogenous protein binding</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0001618">virus receptor activity</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0002702">positive regulation of production of molecular mediator of immune response</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0002639">positive regulation of immunoglobulin production</a></div>
  </details>
  <details style="margin-left: 20px;">
    <summary><a href="http://purl.obolibrary.org/obo/GO_0030888">regulation of B cell proliferation</a></summary>
    <div style="margin-left: 40px;">&#8226; <a href="http://purl.obolibrary.org/obo/GO_0030890">positive regulation of B cell proliferation</a></div>
  </details>
</details>`;

function Ontology() {
  return (
    <div>
      <NavBar />
      <Container>
        <Typography variant="h4" gutterBottom>
          Ontology Tree
        </Typography>
        <div dangerouslySetInnerHTML={{ __html: ontologyTreeHtml }} />
      </Container>
    </div>
  );
}

export default Ontology;
