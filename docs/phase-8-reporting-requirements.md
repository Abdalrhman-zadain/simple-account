# Phase 8 - Reporting & Control Module Requirements

## English

- Document Type: Functional Requirements
- Scope: Reporting & Control Module
- Phase: Phase 8 - Reporting & Control
- Total Requirements: 54

This document captures the Phase 8 Reporting & Control requirements baseline in the same bilingual ownership style used by the other implemented phases. The current codebase now includes an end-to-end Phase 8 slice for the reporting workspace, including summary inquiry, trial balance, balance sheet, profit and loss, cash movement reporting, general ledger inquiry, audit inquiry, saved report definitions, snapshots, export outputs, and bilingual UI coverage.

### Proposed module slices

- `report-definitions`
- `financial-statements`
- `cash-flow-reporting`
- `general-ledger-inquiry`
- `audit-inquiry`
- `snapshot-comparison`
- `validation-control`

## العربية

- نوع المستند: متطلبات وظيفية
- النطاق: وحدة التقارير والرقابة
- المرحلة: المرحلة الثامنة - التقارير والرقابة
- إجمالي المتطلبات: 54

يوثق هذا المستند خط الأساس لمتطلبات المرحلة الثامنة الخاصة بوحدة التقارير والرقابة بنفس أسلوب الملكية ثنائي اللغة المستخدم في بقية المراحل المنفذة. يتضمن التنفيذ الحالي شريحة متكاملة لوحدة التقارير تشمل الاستعلام الملخص، ميزان المراجعة، الميزانية العمومية، قائمة الأرباح والخسائر، تقارير حركة النقد، استعلام دفتر الأستاذ العام، استعلام التدقيق، تعريفات التقارير المحفوظة، اللقطات المرجعية، مخرجات التصدير، والتغطية الثنائية للواجهة.

### التقسيم المقترح للوحدات الفرعية

- `report-definitions`
- `financial-statements`
- `cash-flow-reporting`
- `general-ledger-inquiry`
- `audit-inquiry`
- `snapshot-comparison`
- `validation-control`

## 1. Report Definitions & Filters | تعريفات التقارير والفلاتر

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-001 | The system shall provide a centralized reporting workspace for all Phase 8 financial and control reports. | يجب أن يوفر النظام مساحة عمل مركزية للتقارير لجميع تقارير المرحلة الثامنة المالية والرقابية. |
| REQ-RPT-002 | The system shall allow the user to select a reporting date range for supported reports. | يجب أن يسمح النظام للمستخدم بتحديد نطاق تاريخي للتقارير المدعومة. |
| REQ-RPT-003 | The system shall allow the user to apply comparison-period filters when the selected report supports comparative analysis. | يجب أن يسمح النظام للمستخدم بتطبيق فلاتر فترة المقارنة عندما يدعم التقرير المحدد التحليل المقارن. |
| REQ-RPT-004 | The system shall allow the user to choose the reporting basis, such as accrual basis or cash basis, where applicable. | يجب أن يسمح النظام للمستخدم باختيار أساس التقرير مثل أساس الاستحقاق أو الأساس النقدي عند الحاجة. |
| REQ-RPT-005 | The system shall allow the user to include or exclude zero-balance rows where the report design supports that option. | يجب أن يسمح النظام للمستخدم بتضمين أو استبعاد الصفوف ذات الأرصدة الصفرية عندما يدعم تصميم التقرير ذلك. |
| REQ-RPT-006 | The system shall allow the user to filter reports by configured dimensions such as account type, currency, department, branch, project, or journal-entry type. | يجب أن يسمح النظام للمستخدم بتصفية التقارير حسب الأبعاد المهيأة مثل نوع الحساب أو العملة أو القسم أو الفرع أو المشروع أو نوع القيد اليومي. |
| REQ-RPT-007 | The system shall allow the user to save reusable report definitions and rerun reports from saved definitions. | يجب أن يسمح النظام للمستخدم بحفظ تعريفات تقارير قابلة لإعادة الاستخدام وإعادة تشغيل التقارير من التعريفات المحفوظة. |
| REQ-RPT-008 | The system shall enforce report-catalog visibility and control actions based on the user role or assigned permissions. | يجب أن يفرض النظام إظهار كتالوج التقارير وإجراءات التحكم بناءً على دور المستخدم أو الصلاحيات الممنوحة له. |

## 2. Trial Balance | ميزان المراجعة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-009 | The system shall generate a trial balance using posted ledger transactions only. | يجب أن ينشئ النظام ميزان مراجعة باستخدام حركات دفتر الأستاذ المرحلة فقط. |
| REQ-RPT-010 | The system shall display account code and account name for each trial balance row. | يجب أن يعرض النظام رمز الحساب واسم الحساب لكل صف في ميزان المراجعة. |
| REQ-RPT-011 | The system shall display debit totals and credit totals for each account within the selected period. | يجب أن يعرض النظام إجماليات المدين وإجماليات الدائن لكل حساب ضمن الفترة المحددة. |
| REQ-RPT-012 | The system shall display total debit and total credit values for the trial balance report. | يجب أن يعرض النظام إجمالي قيم المدين وإجمالي قيم الدائن لتقرير ميزان المراجعة. |
| REQ-RPT-013 | The system shall allow the user to include or exclude zero-balance accounts in the trial balance. | يجب أن يسمح النظام للمستخدم بتضمين أو استبعاد الحسابات ذات الرصيد الصفري في ميزان المراجعة. |
| REQ-RPT-014 | The system shall allow the user to drill through from a trial balance account row into general ledger details for the selected account. | يجب أن يسمح النظام للمستخدم بالانتقال التفصيلي من صف حساب في ميزان المراجعة إلى تفاصيل دفتر الأستاذ العام للحساب المحدد. |

## 3. Balance Sheet | الميزانية العمومية

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-015 | The system shall generate a balance sheet using posted balances as of a selected reporting date. | يجب أن ينشئ النظام ميزانية عمومية باستخدام الأرصدة المرحلة حتى تاريخ التقرير المحدد. |
| REQ-RPT-016 | The system shall classify balance sheet rows into assets, liabilities, and equity. | يجب أن يصنف النظام صفوف الميزانية العمومية إلى أصول وخصوم وحقوق ملكية. |
| REQ-RPT-017 | The system shall show current-period values and comparison-period values when comparison filters are applied. | يجب أن يعرض النظام قيم الفترة الحالية وقيم فترة المقارنة عند تطبيق فلاتر المقارنة. |
| REQ-RPT-018 | The system shall show variance amounts between the current period and the comparison period. | يجب أن يعرض النظام مبالغ الفروقات بين الفترة الحالية وفترة المقارنة. |
| REQ-RPT-019 | The system shall keep the balance sheet reconcilable to the same posted ledger source used by other financial reports for the same filters. | يجب أن يحافظ النظام على قابلية مطابقة الميزانية العمومية مع نفس مصدر دفتر الأستاذ المرحل المستخدم في بقية التقارير المالية لنفس الفلاتر. |

## 4. Profit & Loss Statement | قائمة الأرباح والخسائر

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-020 | The system shall generate a profit and loss statement using posted revenue and expense activity only. | يجب أن ينشئ النظام قائمة أرباح وخسائر باستخدام نشاط الإيرادات والمصروفات المرحل فقط. |
| REQ-RPT-021 | The system shall group profit and loss rows by revenue and expense classifications. | يجب أن يجمع النظام صفوف قائمة الأرباح والخسائر حسب تصنيفات الإيرادات والمصروفات. |
| REQ-RPT-022 | The system shall show values for the selected reporting period and the comparison period when requested. | يجب أن يعرض النظام قيم فترة التقرير المحددة وفترة المقارنة عند الطلب. |
| REQ-RPT-023 | The system shall show variance amounts between the selected period and the comparison period. | يجب أن يعرض النظام مبالغ الفروقات بين الفترة المحددة وفترة المقارنة. |
| REQ-RPT-024 | The system shall display net income or net loss for the selected period. | يجب أن يعرض النظام صافي الربح أو صافي الخسارة للفترة المحددة. |
| REQ-RPT-025 | The system shall keep profit and loss results reconcilable to the posted general ledger for the same filters and period. | يجب أن يحافظ النظام على قابلية مطابقة نتائج قائمة الأرباح والخسائر مع دفتر الأستاذ العام المرحل لنفس الفلاتر والفترة. |

## 5. Cash Flow / Cash Movement Reporting | تقارير التدفق النقدي وحركة النقد

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-026 | The system shall provide cash movement reporting based on active bank and cash posting accounts. | يجب أن يوفر النظام تقارير حركة النقد بالاعتماد على حسابات البنك والصندوق المرحلية النشطة. |
| REQ-RPT-027 | The system shall display opening balance, period movement, and closing balance for the selected reporting period. | يجب أن يعرض النظام الرصيد الافتتاحي وحركة الفترة والرصيد الختامي لفترة التقرير المحددة. |
| REQ-RPT-028 | The system shall show comparison-period net movement when a comparison period is selected. | يجب أن يعرض النظام صافي حركة فترة المقارنة عند اختيار فترة مقارنة. |
| REQ-RPT-029 | The system shall classify cash flow movements into operating, investing, financing, or unclassified categories. | يجب أن يصنف النظام حركات التدفق النقدي إلى فئات تشغيلية أو استثمارية أو تمويلية أو غير مصنفة. |
| REQ-RPT-030 | The system shall derive cash movement values from posted accounting activity rather than from a separate manually maintained balance store. | يجب أن يستمد النظام قيم حركة النقد من النشاط المحاسبي المرحل بدلاً من مخزن أرصدة منفصل تتم صيانته يدويًا. |
| REQ-RPT-031 | The system shall present the cash movement report in a format that supports export and formal reporting output. | يجب أن يعرض النظام تقرير حركة النقد بصيغة تدعم التصدير ومخرجات التقارير الرسمية. |

## 6. General Ledger Reporting | تقارير دفتر الأستاذ العام

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-032 | The system shall provide account-based general ledger inquiry within the reporting workspace. | يجب أن يوفر النظام استعلام دفتر الأستاذ العام حسب الحساب داخل مساحة عمل التقارير. |
| REQ-RPT-033 | The system shall display opening balance, period debits, period credits, running balance, and closing balance for the selected account. | يجب أن يعرض النظام الرصيد الافتتاحي ومدين الفترة ودائن الفترة والرصيد الجاري والرصيد الختامي للحساب المحدد. |
| REQ-RPT-034 | The system shall display journal reference information for each general ledger row. | يجب أن يعرض النظام معلومات مرجع القيد لكل صف في دفتر الأستاذ العام. |
| REQ-RPT-035 | The system shall allow the user to open the related source document from supported general ledger rows. | يجب أن يسمح النظام للمستخدم بفتح المستند المصدر المرتبط من صفوف دفتر الأستاذ العام المدعومة. |
| REQ-RPT-036 | The system shall keep general ledger inquiry aligned with the same posted-ledger source used by trial balance, balance sheet, and profit and loss reports. | يجب أن يحافظ النظام على توافق استعلام دفتر الأستاذ العام مع نفس مصدر دفتر الأستاذ المرحل المستخدم في ميزان المراجعة والميزانية العمومية وقائمة الأرباح والخسائر. |
| REQ-RPT-037 | The system shall allow the user to reach general ledger details from other report drill-through actions where supported. | يجب أن يسمح النظام للمستخدم بالوصول إلى تفاصيل دفتر الأستاذ العام من إجراءات الانتقال التفصيلي في التقارير الأخرى عند الدعم. |

## 7. Audit Reports | تقارير التدقيق

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-038 | The system shall provide audit inquiry by selected date range. | يجب أن يوفر النظام استعلام تدقيق حسب النطاق التاريخي المحدد. |
| REQ-RPT-039 | The system shall display audit details such as entity, action, user, and timestamp for each audit event. | يجب أن يعرض النظام تفاصيل التدقيق مثل الكيان والإجراء والمستخدم والطابع الزمني لكل حدث تدقيق. |
| REQ-RPT-040 | The system shall allow the user to drill through to recognized source routes or records from supported audit rows. | يجب أن يسمح النظام للمستخدم بالانتقال التفصيلي إلى المسارات أو السجلات المصدر المعروفة من صفوف التدقيق المدعومة. |
| REQ-RPT-041 | The system shall provide exception-focused audit summaries for reporting and control review. | يجب أن يوفر النظام ملخصات تدقيق تركز على الاستثناءات لأغراض مراجعة التقارير والرقابة. |
| REQ-RPT-042 | The system shall support export-oriented compliance or audit packages from reporting activity and audit data. | يجب أن يدعم النظام حزم الامتثال أو التدقيق الموجهة للتصدير من نشاط التقارير وبيانات التدقيق. |
| REQ-RPT-043 | The system shall log reporting-related actions such as viewing reports, saving definitions, creating snapshots, and generating exports. | يجب أن يسجل النظام الإجراءات المرتبطة بالتقارير مثل عرض التقارير وحفظ التعريفات وإنشاء اللقطات وتوليد التصديرات. |

## 8. Snapshot & Comparative Reporting | اللقطات المرجعية والتقارير المقارنة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-044 | The system shall calculate comparison-period values and variances for supported reports. | يجب أن يحسب النظام قيم فترة المقارنة والفروقات للتقارير المدعومة. |
| REQ-RPT-045 | The system shall allow the user to persist report snapshots for point-in-time reference. | يجب أن يسمح النظام للمستخدم بحفظ لقطات مرجعية للتقارير للرجوع إليها في نقطة زمنية محددة. |
| REQ-RPT-046 | The system shall store traceability metadata for each snapshot, such as report type, filters, and generation context. | يجب أن يخزن النظام بيانات التتبع الوصفية لكل لقطة مثل نوع التقرير والفلاتر وسياق التوليد. |
| REQ-RPT-047 | The system shall allow the user to rerun a report from a saved definition or saved snapshot context where supported. | يجب أن يسمح النظام للمستخدم بإعادة تشغيل التقرير من تعريف محفوظ أو من سياق لقطة محفوظة عند الدعم. |
| REQ-RPT-048 | The system shall support snapshot locking or version-control policies so historical reporting records remain auditable. | يجب أن يدعم النظام سياسات قفل اللقطات أو التحكم في الإصدارات بحيث تبقى السجلات التاريخية للتقارير قابلة للتدقيق. |

## 9. Validation & Control Rules | قواعد التحقق والرقابة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-RPT-049 | The system shall use posted ledger data only for official financial report balances and totals. | يجب أن يستخدم النظام بيانات دفتر الأستاذ المرحلة فقط لأرصدة وإجماليات التقارير المالية الرسمية. |
| REQ-RPT-050 | The system shall prevent draft journal entries or draft operational documents from being treated as posted report balances. | يجب أن يمنع النظام اعتبار قيود اليومية المسودة أو المستندات التشغيلية المسودة كأرصدة تقارير مرحلة. |
| REQ-RPT-051 | The system shall display configuration warnings when required reporting mappings, segment definitions, or fiscal periods are missing. | يجب أن يعرض النظام تحذيرات إعداد عندما تكون التعيينات المطلوبة للتقارير أو تعريفات القطاعات أو الفترات المالية مفقودة. |
| REQ-RPT-052 | The system shall apply modification controls to saved report definitions and snapshots according to authorization rules. | يجب أن يطبق النظام ضوابط التعديل على تعريفات التقارير المحفوظة واللقطات المرجعية وفقًا لقواعد الصلاحيات. |
| REQ-RPT-053 | The system shall keep export outputs consistent with the selected report filters, report values, and rendered report structure. | يجب أن يحافظ النظام على اتساق مخرجات التصدير مع فلاتر التقرير المحددة وقيم التقرير وبنية التقرير المعروضة. |
| REQ-RPT-054 | The system shall require bilingual English and Arabic terminology alignment when report names, filters, actions, tabs, or column labels are extended. | يجب أن يفرض النظام توافق المصطلحات العربية والإنجليزية عند توسيع أسماء التقارير أو الفلاتر أو الإجراءات أو علامات التبويب أو عناوين الأعمدة. |
