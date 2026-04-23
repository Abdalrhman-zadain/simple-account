# Phase 6 - Payroll Module Requirements

## English

- Document Type: Functional Requirements
- Scope: Payroll Module
- Phase: Phase 6 - Human Resources Financials
- Total Requirements: 60

This document captures the Phase 6 Payroll requirements baseline in the same modular ownership style used by the rest of the project. The Payroll module is now implemented for the employee, group setup, component/rule calculation, period, payslip, deduction/benefit, posting, payment, adjustment, reversal, reporting, and validation workflows; this file remains the bilingual requirements reference and coverage checklist for future refinements.

### Proposed module slices

- `employees`
- `payroll-setup`
- `payroll-periods`
- `payslips`
- `deductions`
- `benefits-allowances`
- `posting-accounting`
- `payroll-payments`
- `reporting-inquiry`
- `validation-control`

## العربية

- نوع المستند: متطلبات وظيفية
- النطاق: وحدة الرواتب
- المرحلة: المرحلة السادسة - الموارد البشرية المالية
- إجمالي المتطلبات: 60

يوثق هذا المستند خط الأساس الأولي لمتطلبات وحدة الرواتب في المرحلة السادسة بنفس أسلوب الملكية المعياري المستخدم في بقية المشروع. هذه الوثيقة مرجع للتخطيط والتسليم فقط، ولا تعني أن وحدة الرواتب مطبقة حاليًا. تم تقسيم المتطلبات بحسب الأقسام لتسهيل المراجعة والتقدير والنقاش ومواءمة الترجمة والتنفيذ المرحلي.

### التقسيم المقترح للوحدات الفرعية

- `employees`
- `payroll-setup`
- `payroll-periods`
- `payslips`
- `deductions`
- `benefits-allowances`
- `posting-accounting`
- `payroll-payments`
- `reporting-inquiry`
- `validation-control`

## 1. Employees | الموظفون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-001 | The system shall allow users to create employee master records. | يجب أن يسمح النظام للمستخدمين بإنشاء السجلات الأساسية للموظفين. |
| REQ-PY-002 | The system shall store employee details including employee name, employee code, department, position, joining date, payment method, and status. | يجب أن يحفظ النظام بيانات الموظف بما يشمل اسم الموظف ورمز الموظف والقسم والمنصب وتاريخ الالتحاق وطريقة الدفع والحالة. |
| REQ-PY-003 | The system shall allow a default salary structure to be assigned to each employee. | يجب أن يسمح النظام بتعيين هيكل راتب افتراضي لكل موظف. |
| REQ-PY-004 | The system shall allow the salary payment method for each employee to be defined as bank, cash, or another approved method. | يجب أن يسمح النظام بتحديد طريقة صرف راتب كل موظف كبنك أو نقدًا أو أي طريقة معتمدة أخرى. |
| REQ-PY-005 | The system shall allow employee details to be updated before the employee is deactivated. | يجب أن يسمح النظام بتحديث بيانات الموظف قبل تعطيله. |
| REQ-PY-006 | The system shall allow an employee to be deactivated without deleting historical payroll transactions or records. | يجب أن يسمح النظام بتعطيل الموظف دون حذف معاملات أو سجلات الرواتب التاريخية. |
| REQ-PY-007 | The system shall prevent inactive employees from being selected in new payroll transactions or newly generated payslips. | يجب أن يمنع النظام اختيار الموظفين غير النشطين في معاملات الرواتب الجديدة أو قسائم الرواتب التي يتم إنشاؤها حديثًا. |

## 2. Payroll Setup | إعداد الرواتب

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-008 | The system shall allow payroll components to be defined, including basic salary, allowances, overtime, bonuses, deductions, and employer contributions. | يجب أن يسمح النظام بتعريف مكونات الرواتب بما يشمل الراتب الأساسي والبدلات والعمل الإضافي والمكافآت والاستقطاعات ومساهمات صاحب العمل. |
| REQ-PY-009 | The system shall allow each payroll component to be classified as an earning, deduction, employer contribution, or benefit. | يجب أن يسمح النظام بتصنيف كل مكون من مكونات الرواتب كاستحقاق أو استقطاع أو مساهمة لصاحب العمل أو منفعة. |
| REQ-PY-010 | The system shall support fixed amount, percentage-based, formula-based, and quantity-based calculation methods for payroll components. | يجب أن يدعم النظام طرق احتساب مكونات الرواتب بالمبلغ الثابت أو النسبة المئوية أو المعادلة أو الكمية. |
| REQ-PY-011 | The system shall allow default payroll components to be assigned to an individual employee or to an employee group. | يجب أن يسمح النظام بتعيين مكونات الرواتب الافتراضية لموظف فردي أو لمجموعة موظفين. |
| REQ-PY-012 | The system shall allow payroll components to be linked to their corresponding accounts in the Chart of Accounts. | يجب أن يسمح النظام بربط مكونات الرواتب بحساباتها المقابلة في شجرة الحسابات. |
| REQ-PY-013 | The system shall allow tax, insurance, loan, and statutory deduction rules to be defined for payroll calculation. | يجب أن يسمح النظام بتعريف قواعد الضرائب والتأمين والقروض والاستقطاعات النظامية لاحتساب الرواتب. |
| REQ-PY-014 | The system shall allow payroll setup rules to be edited before they are applied to a posted payroll period. | يجب أن يسمح النظام بتعديل قواعد إعداد الرواتب قبل تطبيقها على فترة رواتب مرحّلة. |

## 3. Payroll Periods | فترات الرواتب

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-015 | The system shall allow payroll periods to be created for defined pay cycles such as monthly, biweekly, or weekly. | يجب أن يسمح النظام بإنشاء فترات رواتب لدورات دفع محددة مثل الشهرية أو نصف الشهرية أو الأسبوعية. |
| REQ-PY-016 | The system shall require each payroll period to include a start date, end date, payment date, and status. | يجب أن يطلب النظام أن تتضمن كل فترة رواتب تاريخ بداية وتاريخ نهاية وتاريخ دفع وحالة. |
| REQ-PY-017 | The system shall prevent overlapping payroll periods within the same payroll group or company scope. | يجب أن يمنع النظام تداخل فترات الرواتب ضمن نفس مجموعة الرواتب أو نطاق الشركة. |
| REQ-PY-018 | The system shall allow a payroll period to remain in draft status until final processing or posting is completed. | يجب أن يسمح النظام ببقاء فترة الرواتب في حالة مسودة حتى يكتمل الإجراء النهائي أو الترحيل. |
| REQ-PY-019 | The system shall allow a payroll period to be closed or locked after payroll posting is completed successfully. | يجب أن يسمح النظام بإغلاق أو قفل فترة الرواتب بعد اكتمال ترحيل الرواتب بنجاح. |

## 4. Payslips | قسائم الرواتب

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-020 | The system shall allow payslips to be generated for a single employee or in batch for multiple employees within a payroll period. | يجب أن يسمح النظام بإنشاء قسائم رواتب لموظف واحد أو بشكل جماعي لعدة موظفين ضمن فترة رواتب واحدة. |
| REQ-PY-021 | The system shall calculate gross pay based on assigned salary components, attendance inputs, overtime, bonuses, and other approved earnings. | يجب أن يحسب النظام إجمالي الأجر بناءً على مكونات الراتب المعينة ومدخلات الحضور والعمل الإضافي والمكافآت وغيرها من الاستحقاقات المعتمدة. |
| REQ-PY-022 | The system shall calculate total deductions based on deduction rules, statutory obligations, loan repayments, and other approved deductions. | يجب أن يحسب النظام إجمالي الاستقطاعات بناءً على قواعد الاستقطاع والالتزامات النظامية وسداد القروض وغيرها من الاستقطاعات المعتمدة. |
| REQ-PY-023 | The system shall calculate net pay as gross pay less employee deductions. | يجب أن يحسب النظام صافي الأجر على أنه إجمالي الأجر ناقص استقطاعات الموظف. |
| REQ-PY-024 | The system shall allow draft payslips to be reviewed and edited before payroll is posted. | يجب أن يسمح النظام بمراجعة وتعديل قسائم الرواتب في حالة المسودة قبل ترحيل الرواتب. |
| REQ-PY-025 | The system shall assign a unique reference number to each payslip. | يجب أن يخصص النظام رقم مرجع فريد لكل قسيمة راتب. |
| REQ-PY-026 | The system shall allow notes or payroll narration to be included on the payslip. | يجب أن يسمح النظام بإضافة ملاحظات أو بيان وصفي للرواتب على قسيمة الراتب. |
| REQ-PY-027 | The system shall prevent posted payslips from being modified except through an authorized adjustment or reversal process. | يجب أن يمنع النظام تعديل قسائم الرواتب المرحلة إلا من خلال عملية تعديل أو عكس معتمدة. |

## 5. Deductions | الاستقطاعات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-028 | The system shall allow employee deductions to be recorded, including tax, social insurance, loans, penalties, and other approved deductions. | يجب أن يسمح النظام بتسجيل استقطاعات الموظفين بما يشمل الضرائب والتأمينات الاجتماعية والقروض والجزاءات وغيرها من الاستقطاعات المعتمدة. |
| REQ-PY-029 | The system shall allow deductions to be configured as fixed amount, percentage-based, installment-based, or rule-based. | يجب أن يسمح النظام بتهيئة الاستقطاعات كمبلغ ثابت أو نسبة مئوية أو أقساط أو وفق قاعدة محددة. |
| REQ-PY-030 | The system shall allow deduction rules to be assigned to individual employees or employee groups. | يجب أن يسمح النظام بتعيين قواعد الاستقطاع لموظفين أفراد أو مجموعات موظفين. |
| REQ-PY-031 | The system shall track deduction balances where applicable, such as employee loans or installment plans. | يجب أن يتتبع النظام أرصدة الاستقطاعات عند الحاجة مثل قروض الموظفين أو خطط الأقساط. |
| REQ-PY-032 | The system shall automatically reduce the outstanding balance of tracked deductions when a payroll period is posted. | يجب أن يقوم النظام تلقائيًا بتخفيض الرصيد المستحق للاستقطاعات المتتبعة عند ترحيل فترة الرواتب. |

## 6. Benefits & Allowances | المزايا والبدلات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-033 | The system shall allow recurring or one-time employee benefits and allowances to be defined, including transport, housing, meals, health insurance, and other company benefits. | يجب أن يسمح النظام بتعريف مزايا وبدلات الموظفين الدورية أو لمرة واحدة بما يشمل النقل والسكن والوجبات والتأمين الصحي وغيرها من مزايا الشركة. |
| REQ-PY-034 | The system shall allow benefits and allowances to be configured as taxable or non-taxable according to payroll rules. | يجب أن يسمح النظام بتهيئة المزايا والبدلات كخاضعة للضريبة أو غير خاضعة للضريبة وفق قواعد الرواتب. |
| REQ-PY-035 | The system shall allow benefits and allowances to be assigned individually to employees or by payroll group. | يجب أن يسمح النظام بتعيين المزايا والبدلات بشكل فردي للموظفين أو حسب مجموعة الرواتب. |
| REQ-PY-036 | The system shall include approved benefits and allowances in payroll calculations according to their configured treatment. | يجب أن يدرج النظام المزايا والبدلات المعتمدة في احتساب الرواتب وفق المعالجة المهيأة لها. |

## 7. Payroll Posting | ترحيل الرواتب

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-037 | The system shall allow payroll to be posted only after payslips have been reviewed and validated for the payroll period. | يجب أن يسمح النظام بترحيل الرواتب فقط بعد مراجعة قسائم الرواتب والتحقق منها لفترة الرواتب. |
| REQ-PY-038 | The system shall automatically generate the related journal entry or journal entries when payroll is posted. | يجب أن يقوم النظام تلقائيًا بإنشاء قيد اليومية أو قيود اليومية المرتبطة عند ترحيل الرواتب. |
| REQ-PY-039 | The system shall post payroll amounts to salary expense accounts, payable accounts, tax liabilities, deduction liabilities, benefit accounts, and employer contribution accounts based on the configured setup. | يجب أن يرحل النظام مبالغ الرواتب إلى حسابات مصروف الرواتب والحسابات المستحقة وخصوم الضرائب وخصوم الاستقطاعات وحسابات المزايا وحسابات مساهمات صاحب العمل وفق الإعداد المهيأ. |
| REQ-PY-040 | The system shall update payroll-related balances after payroll posting is completed. | يجب أن يقوم النظام بتحديث الأرصدة المتعلقة بالرواتب بعد اكتمال ترحيل الرواتب. |
| REQ-PY-041 | The system shall change the payroll period status from draft to posted when payroll posting is completed successfully. | يجب أن يغير النظام حالة فترة الرواتب من مسودة إلى مرحلة عند اكتمال ترحيل الرواتب بنجاح. |
| REQ-PY-042 | The system shall lock posted payroll transactions from further editing unless proper authorization or reversal is used. | يجب أن يقفل النظام معاملات الرواتب المرحلة من أي تعديل لاحق ما لم يتم استخدام صلاحية مناسبة أو عملية عكس. |
| REQ-PY-043 | The system shall maintain an auditable link between the payroll posting entry, the payroll period, and the source payslips. | يجب أن يحتفظ النظام برابط قابل للتدقيق بين قيد ترحيل الرواتب وفترة الرواتب وقسائم الرواتب المصدرية. |

## 8. Payroll Payments | مدفوعات الرواتب

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-044 | The system shall allow salary payments for posted payroll amounts to be recorded through bank or cash accounts. | يجب أن يسمح النظام بتسجيل دفعات الرواتب للمبالغ المرحلة من خلال حسابات البنك أو الصندوق. |
| REQ-PY-045 | The system shall allow salary payments to be processed for one employee or in batch for multiple employees. | يجب أن يسمح النظام بمعالجة دفعات الرواتب لموظف واحد أو بشكل جماعي لعدة موظفين. |
| REQ-PY-046 | The system shall reduce outstanding payroll payable balances when salary payments are recorded successfully. | يجب أن يقوم النظام بتخفيض أرصدة الرواتب المستحقة عند تسجيل دفعات الرواتب بنجاح. |
| REQ-PY-047 | The system shall integrate payroll payments with the Bank & Cash module when the payment is made through a bank or cash account. | يجب أن يدمج النظام مدفوعات الرواتب مع وحدة البنوك والصندوق عندما يتم الدفع عبر حساب بنك أو صندوق. |
| REQ-PY-048 | The system shall maintain a reference between payroll payments and the posted payroll period or payslips they settle. | يجب أن يحتفظ النظام بمرجع بين مدفوعات الرواتب وفترة الرواتب المرحلة أو قسائم الرواتب التي تقوم بتسويتها. |

## 9. Reporting & Inquiry | التقارير والاستعلام

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-049 | The system shall allow payroll history to be viewed by employee, payroll period, and payroll component. | يجب أن يسمح النظام بعرض سجل الرواتب حسب الموظف أو فترة الرواتب أو مكون الرواتب. |
| REQ-PY-050 | The system shall display gross pay, deductions, employer contributions, and net pay for each payroll period. | يجب أن يعرض النظام إجمالي الأجر والاستقطاعات ومساهمات صاحب العمل وصافي الأجر لكل فترة رواتب. |
| REQ-PY-051 | The system shall allow payroll records to be filtered by employee, department, payroll group, date range, and payroll status. | يجب أن يسمح النظام بتصفية سجلات الرواتب حسب الموظف والقسم ومجموعة الرواتب والفترة الزمنية وحالة الرواتب. |
| REQ-PY-052 | The system shall allow the accounting reference or journal entry related to a posted payroll run to be viewed. | يجب أن يسمح النظام بعرض المرجع المحاسبي أو قيد اليومية المرتبط بعملية رواتب مرحلة. |
| REQ-PY-053 | The system shall allow payroll summaries to be produced showing totals by earning type, deduction type, and employer contribution type. | يجب أن يسمح النظام بإنتاج ملخصات الرواتب التي تعرض الإجماليات حسب نوع الاستحقاق ونوع الاستقطاع ونوع مساهمة صاحب العمل. |
| REQ-PY-054 | The system shall retain payroll records for historical inquiry and audit purposes. | يجب أن يحتفظ النظام بسجلات الرواتب لأغراض الاستعلام التاريخي والتدقيق. |

## 10. Validation & Control Rules | قواعد التحقق والرقابة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-PY-055 | The system shall require every payslip to belong to a valid payroll period and to an active employee. | يجب أن يطلب النظام أن تنتمي كل قسيمة راتب إلى فترة رواتب صحيحة وإلى موظف نشط. |
| REQ-PY-056 | The system shall prevent payroll from being posted when mandatory employee data or payroll setup data is missing. | يجب أن يمنع النظام ترحيل الرواتب عند وجود نقص في بيانات الموظف الإلزامية أو بيانات إعداد الرواتب. |
| REQ-PY-057 | The system shall prevent duplicate payslips for the same employee within the same payroll period unless an authorized adjustment process is used. | يجب أن يمنع النظام تكرار قسائم الرواتب لنفس الموظف ضمن نفس فترة الرواتب ما لم يتم استخدام عملية تعديل معتمدة. |
| REQ-PY-058 | The system shall prevent deletion of posted payroll records or posted financial records created from payroll. | يجب أن يمنع النظام حذف سجلات الرواتب المرحلة أو السجلات المالية المرحلة الناتجة عن الرواتب. |
| REQ-PY-059 | The system shall maintain a history of draft, posted, paid, adjusted, and reversed payroll transactions. | يجب أن يحتفظ النظام بسجل لمعاملات الرواتب في حالات المسودة والمرحلة والمدفوعة والمعدلة والمعكوسة. |
| REQ-PY-060 | The system shall ensure payroll posting is transactional so that all accounting entries and payroll status updates either succeed together or fail together. | يجب أن يضمن النظام أن يكون ترحيل الرواتب تنفيذيًا ضمن معاملة واحدة بحيث تنجح جميع القيود المحاسبية وتحديثات حالة الرواتب معًا أو تفشل معًا. |
