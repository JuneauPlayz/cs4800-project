# SplitStack Project Deliverables Submission Index

Version: 1.1  
Date: May 12, 2026

This index maps the deliverables to the files in this repository. PDF versions of every generated markdown document live in `docs/pdf/`.

## Submission Checklist

| Required Deliverable | File or Folder | Status |
| --- | --- | --- |
| Project Charter (PM) | `docs/project_charter.md` (PDF: `docs/pdf/project_charter.pdf`) | Generated |
| Functional/Requirement Spec (BA) | `planning files/Project_Requirements_Specification_v1.0_FINAL.docx` (PDF alongside) | Rewritten v1.0 |
| Use Cases | `planning files/SplitStack_Use_Cases_v1.0_FINAL.docx` (PDF alongside) | Rewritten v1.0 |
| Activity Diagrams | `docs/functional_design_diagrams.md` (PDF: `docs/pdf/functional_design_diagrams.pdf`) | Generated |
| Domain Object Model or ER Diagram | `docs/functional_design_diagrams.md` (PDF: `docs/pdf/functional_design_diagrams.pdf`) | Generated |
| Technical/Design Spec (DEV) | `docs/technical_design_spec.md` (PDF: `docs/pdf/technical_design_spec.pdf`) | Generated |
| Context/Deployment Diagram | `docs/technical_design_spec.md` (PDF: `docs/pdf/technical_design_spec.pdf`) | Generated |
| Architecture Layout | `planning files/splitstack software architecture.png`, `docs/technical_design_spec.md` | Existing plus generated |
| Component Diagram | `docs/technical_design_spec.md` (PDF: `docs/pdf/technical_design_spec.pdf`) | Generated |
| Class Hierarchy and Relationship Diagrams | `docs/technical_design_spec.md` (PDF: `docs/pdf/technical_design_spec.pdf`) | Generated |
| Sequence Diagrams | `docs/technical_design_spec.md` (PDF: `docs/pdf/technical_design_spec.pdf`) | Generated |
| Test Case Spec (QA) | `docs/splitstack_test_case_specification.md` (PDF: `docs/pdf/splitstack_test_case_specification.pdf`) | Existing |
| Test Strategy/Approach | `docs/test_plan_and_results_summary.md` (PDF: `docs/pdf/test_plan_and_results_summary.pdf`) | Generated |
| Test Plan | `docs/test_plan_and_results_summary.md` (PDF: `docs/pdf/test_plan_and_results_summary.pdf`) | Generated |
| Traceability Matrix | `docs/splitstack_test_case_specification.md` (PDF: `docs/pdf/splitstack_test_case_specification.pdf`) | Existing |
| Test Cases | `docs/splitstack_test_case_specification.md` (PDF: `docs/pdf/splitstack_test_case_specification.pdf`) | Existing |
| Test Results Summary | `docs/test_plan_and_results_summary.md` (PDF: `docs/pdf/test_plan_and_results_summary.pdf`) | Generated |
| Project Source Code | `website/`, `mobile-app/` | Existing |
| Source Code Manifest | `docs/project_source_code_manifest.md` (PDF: `docs/pdf/project_source_code_manifest.pdf`) | Generated |
| Build and Deployment Instructions | `README.md`, `mobile-app/README.md`, `docs/build_deployment_instructions.md` (PDF: `docs/pdf/build_deployment_instructions.pdf`) | Existing plus generated |
| Release Notes | `RELEASE_NOTES.md` | Generated |

## Recommended Files and Folders to Submit

Submit the full repository when possible. If the submission system requires selecting individual items, include:

- `planning files/` (use the `_v1.0_FINAL` versions of the requirements spec and use cases)
- `docs/` (markdown sources) and/or `docs/pdf/` (rendered submission PDFs)
- `website/`
- `mobile-app/`
- `README.md`
- `RELEASE_NOTES.md`
- `Mobile_receipt_scanning.mov`

## Document Versions in `planning files/`

| Document | February 2026 original | May 2026 as-built |
| --- | --- | --- |
| Requirements Specification | `Project_Requirements_Specification (2).docx` (kept for history; describes 3-phase plan) | `Project_Requirements_Specification_v1.0_FINAL.docx` (use this for grading) |
| Use Cases | `SplitStack_Use_Cases (1) (3).docx` (kept for history) | `SplitStack_Use_Cases_v1.0_FINAL.docx` (use this for grading) |

The "as-built" versions describe only features that are actually implemented in SplitStack 1.0.0; deferred Phase 2/3 items are listed as Out of Scope.

## Notes

- The `planning files` folder alone does not include the source code, release notes, generated diagrams, test plan/results summary, or standalone build/deployment instructions.
- Mermaid diagrams are included in Markdown files. GitHub and many Markdown renderers display Mermaid diagrams automatically. PDF copies with rendered diagrams are available under `docs/pdf/`.
- The project has no formal git release tags. `RELEASE_NOTES.md` documents the final project submission release based on the current `main` branch.

