
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** sistema-de-mandados-pcsp (4)
- **Date:** 2026-03-09
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Save edits to Priority and DP Region successfully from Warrant Detail
- **Test Code:** [TC001_Save_edits_to_Priority_and_DP_Region_successfully_from_Warrant_Detail.py](./TC001_Save_edits_to_Priority_and_DP_Region_successfully_from_Warrant_Detail.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ffbb079c-32ab-4088-96be-cfb49562d4f5/b8cf63db-daee-44c1-81cd-f2840bf16d0f
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Cancel save prompt when attempting to leave with unsaved DP Region changes
- **Test Code:** [TC002_Cancel_save_prompt_when_attempting_to_leave_with_unsaved_DP_Region_changes.py](./TC002_Cancel_save_prompt_when_attempting_to_leave_with_unsaved_DP_Region_changes.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ffbb079c-32ab-4088-96be-cfb49562d4f5/9bc5d976-8089-4a99-9d56-a18ec5ef3ffc
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Confirm save prompt when leaving with unsaved changes and land on Dashboard
- **Test Code:** [TC003_Confirm_save_prompt_when_leaving_with_unsaved_changes_and_land_on_Dashboard.py](./TC003_Confirm_save_prompt_when_leaving_with_unsaved_changes_and_land_on_Dashboard.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ffbb079c-32ab-4088-96be-cfb49562d4f5/b4629f24-09d8-4c42-b09b-6a120c3d786b
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 No save prompt when leaving without making any changes
- **Test Code:** [TC004_No_save_prompt_when_leaving_without_making_any_changes.py](./TC004_No_save_prompt_when_leaving_without_making_any_changes.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ffbb079c-32ab-4088-96be-cfb49562d4f5/31503a3c-c766-4ee6-921e-e29ca5839bac
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Priority toggle changes visible state and is persisted after saving
- **Test Code:** [TC005_Priority_toggle_changes_visible_state_and_is_persisted_after_saving.py](./TC005_Priority_toggle_changes_visible_state_and_is_persisted_after_saving.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Priority control or any labels containing 'Prioridade', 'Prioritário', 'Priorizar', or 'Priority' were not found on the warrant detail page for warrant 123.
- No Save/Confirm UI element (labels such as 'Salvar', 'Confirmar', 'Salvar alterações', or 'Salvar e continuar') was found to allow persisting a Priority change.
- No toggle or switch controls were found that could represent a Priority setting on the current page.
- An attempted interaction with element index 12030 failed due to the element being not interactable or the index being stale, preventing additional click-based verification.
- The page only displays unrelated action buttons (Voltar, Início, Editar, Imprimir, Reabrir, Apagar) and no controls relevant to setting or saving Priority.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ffbb079c-32ab-4088-96be-cfb49562d4f5/0769b3f5-4e8c-459d-b4a1-e1231066e373
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Dismiss save prompt via Escape keeps user on detail page with unsaved changes
- **Test Code:** [TC006_Dismiss_save_prompt_via_Escape_keeps_user_on_detail_page_with_unsaved_changes.py](./TC006_Dismiss_save_prompt_via_Escape_keeps_user_on_detail_page_with_unsaved_changes.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Save confirmation modal 'Save changes' did not appear after clicking 'Início' (Dashboard).
- Pressing Escape did not return the user to the warrant detail page; the application is at '/#/' (dashboard) instead of a warrant-detail URL.
- Warrant detail page is not open, so it is not possible to verify that the DP Region change ('Outras Cidades') persisted or is visible.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/ffbb079c-32ab-4088-96be-cfb49562d4f5/ed888aa0-c85b-479e-a839-8c042d125f39
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **66.67** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---