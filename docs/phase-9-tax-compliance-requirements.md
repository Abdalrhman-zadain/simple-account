# Phase 9 - Tax & Compliance Module Requirements

## English

- Document Type: Functional Requirements
- Scope: Tax & Compliance Module
- Phase: Phase 9 - Tax, VAT, WHT & Compliance
- Total Requirements: 95

This document captures the Phase 9 Tax & Compliance requirements baseline in the same bilingual ownership style used by the other phase requirement documents. The current codebase does not yet implement an end-to-end Phase 9 slice; this document is a translated baseline for future tax, VAT, withholding tax, filing, settlement, and compliance work without implying that those capabilities already exist in the product.

### Proposed module slices

- `tax-jurisdictions`
- `tax-codes-rates`
- `tax-account-mapping`
- `sales-tax`
- `purchase-tax`
- `withholding-tax`
- `special-tax-treatments`
- `tax-returns`
- `tax-settlements`
- `tax-adjustments`
- `tax-reporting-audit`
- `validation-control`

## العربية

- نوع المستند: متطلبات وظيفية
- النطاق: وحدة الضرائب والامتثال
- المرحلة: المرحلة التاسعة - الضرائب وضريبة القيمة المضافة والاستقطاع والامتثال
- إجمالي المتطلبات: 95

يوثق هذا المستند خط الأساس لمتطلبات المرحلة التاسعة الخاصة بوحدة الضرائب والامتثال بنفس أسلوب الملكية ثنائي اللغة المستخدم في بقية مستندات المراحل. لا يتضمن النظام الحالي حتى الآن شريحة منفذة بالكامل للمرحلة التاسعة؛ ويعد هذا المستند خط أساس مترجماً لأعمال الضرائب وضريبة القيمة المضافة وضريبة الاستقطاع والإقرارات والتسويات والامتثال مستقبلاً دون الإشارة إلى أن هذه القدرات منفذة حالياً في المنتج.

### التقسيم المقترح للوحدات الفرعية

- `tax-jurisdictions`
- `tax-codes-rates`
- `tax-account-mapping`
- `sales-tax`
- `purchase-tax`
- `withholding-tax`
- `special-tax-treatments`
- `tax-returns`
- `tax-settlements`
- `tax-adjustments`
- `tax-reporting-audit`
- `validation-control`

## 1. Tax Jurisdictions & Company Tax Profile | الجهات الضريبية والملف الضريبي للشركة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-001 | The system shall allow authorized users to create and maintain tax jurisdiction master records such as country, state, emirate, region, or other tax authority scope. | يجب أن يسمح النظام للمستخدمين المخولين بإنشاء وصيانة السجلات الأساسية للجهات الضريبية مثل الدولة أو الولاية أو الإمارة أو المنطقة أو أي نطاق آخر للسلطة الضريبية. |
| REQ-TX-002 | The system shall allow each company or branch to be linked to one or more applicable tax jurisdictions. | يجب أن يسمح النظام بربط كل شركة أو فرع بجهة ضريبية واحدة أو أكثر حسب ما ينطبق عليه. |
| REQ-TX-003 | The system shall store company tax registration details, including tax registration number, registration name, effective date, expiry date where applicable, and tax authority reference. | يجب أن يخزن النظام بيانات التسجيل الضريبي للشركة بما في ذلك رقم التسجيل الضريبي واسم التسجيل وتاريخ السريان وتاريخ الانتهاء عند الحاجة ومرجع السلطة الضريبية. |
| REQ-TX-004 | The system shall allow users to define whether a company or branch is tax registered, non-registered, exempt, or outside the scope of a tax regime. | يجب أن يسمح النظام للمستخدمين بتحديد ما إذا كانت الشركة أو الفرع مسجلة ضريبياً أو غير مسجلة أو معفاة أو خارج نطاق نظام ضريبي معين. |
| REQ-TX-005 | The system shall allow different tax rules to apply by company, branch, country, customer, supplier, item, service, or transaction type when configured. | يجب أن يسمح النظام بتطبيق قواعد ضريبية مختلفة بحسب الشركة أو الفرع أو الدولة أو العميل أو المورد أو الصنف أو الخدمة أو نوع المعاملة عند تهيئتها. |
| REQ-TX-006 | The system shall maintain historical tax registration information so that prior-period transactions and reports continue to use the tax profile that applied at the transaction date. | يجب أن يحتفظ النظام ببيانات التسجيل الضريبي التاريخية بحيث تستمر معاملات وتقارير الفترات السابقة في استخدام الملف الضريبي الذي كان سارياً في تاريخ المعاملة. |
| REQ-TX-007 | The system shall prevent unauthorized users from changing tax jurisdiction or tax registration setup. | يجب أن يمنع النظام المستخدمين غير المخولين من تغيير إعدادات الجهة الضريبية أو التسجيل الضريبي. |
| REQ-TX-008 | The system shall allow a default tax jurisdiction to be assigned to each company or branch for transaction entry and reporting purposes. | يجب أن يسمح النظام بتعيين جهة ضريبية افتراضية لكل شركة أو فرع لأغراض إدخال المعاملات وإعداد التقارير. |

## 2. Tax Codes, Rates & Effective Dates | الأكواد الضريبية والنسب وتواريخ السريان

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-009 | The system shall allow authorized users to create tax codes such as standard VAT, zero-rated VAT, exempt VAT, out-of-scope tax, reverse charge, withholding tax, import tax, and other approved tax types. | يجب أن يسمح النظام للمستخدمين المخولين بإنشاء أكواد ضريبية مثل ضريبة القيمة المضافة القياسية وضريبة القيمة المضافة بنسبة صفرية والضريبة المعفاة والضريبة خارج النطاق والاحتساب العكسي وضريبة الاستقطاع وضريبة الاستيراد وغيرها من الأنواع الضريبية المعتمدة. |
| REQ-TX-010 | The system shall allow each tax code to store a tax type, rate percentage, description, active status, and applicable jurisdiction. | يجب أن يسمح النظام لكل كود ضريبي بتخزين نوع الضريبة ونسبة الضريبة والوصف وحالة النشاط والجهة الضريبية المطبقة. |
| REQ-TX-011 | The system shall allow tax codes to be configured with effective start and end dates. | يجب أن يسمح النظام بتهيئة الأكواد الضريبية بتواريخ بداية ونهاية سريان. |
| REQ-TX-012 | The system shall apply the tax rate that is effective on the transaction date. | يجب أن يطبق النظام النسبة الضريبية السارية في تاريخ المعاملة. |
| REQ-TX-013 | The system shall prevent overlapping effective-date ranges for the same tax code and jurisdiction where overlapping would create ambiguous tax calculation. | يجب أن يمنع النظام تداخل فترات السريان لنفس الكود الضريبي ونفس الجهة الضريبية عندما يؤدي ذلك إلى غموض في احتساب الضريبة. |
| REQ-TX-014 | The system shall allow tax codes to be restricted to sales, purchases, payroll, fixed assets, manual journals, or other supported modules. | يجب أن يسمح النظام بقصر استخدام الأكواد الضريبية على المبيعات أو المشتريات أو الرواتب أو الأصول الثابتة أو القيود اليدوية أو غيرها من الوحدات المدعومة. |
| REQ-TX-015 | The system shall allow tax codes to be marked as recoverable, non-recoverable, partially recoverable, payable, or report-only based on tax treatment. | يجب أن يسمح النظام بتمييز الأكواد الضريبية على أنها قابلة للاسترداد أو غير قابلة للاسترداد أو قابلة للاسترداد جزئياً أو مستحقة الدفع أو مخصصة للتقارير فقط بحسب المعالجة الضريبية. |
| REQ-TX-016 | The system shall allow tax codes to be deactivated while preserving historical transactions and reports that used the tax code. | يجب أن يسمح النظام بتعطيل الأكواد الضريبية مع الحفاظ على المعاملات والتقارير التاريخية التي استخدمت ذلك الكود الضريبي. |

## 3. Tax Account Mapping | ربط الحسابات الضريبية

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-017 | The system shall allow each tax code to be mapped to the appropriate general ledger account or accounts. | يجب أن يسمح النظام بربط كل كود ضريبي بحساب أو حسابات دفتر الأستاذ العام المناسبة. |
| REQ-TX-018 | The system shall support separate account mapping for output tax, input tax, withholding tax payable, withholding tax receivable, tax expense, tax clearing, and tax settlement accounts. | يجب أن يدعم النظام ربطاً منفصلاً للحسابات الخاصة بضريبة المخرجات وضريبة المدخلات وضريبة الاستقطاع المستحقة وضريبة الاستقطاع المستردة ومصروف الضريبة وحسابات المقاصة الضريبية وحسابات التسوية الضريبية. |
| REQ-TX-019 | The system shall prevent posting taxable transactions when the required tax account mapping is missing. | يجب أن يمنع النظام ترحيل المعاملات الخاضعة للضريبة عند غياب ربط الحسابات الضريبية المطلوب. |
| REQ-TX-020 | The system shall allow tax account mapping to vary by company, branch, jurisdiction, module, or tax type where required. | يجب أن يسمح النظام باختلاف ربط الحسابات الضريبية بحسب الشركة أو الفرع أو الجهة الضريبية أو الوحدة أو نوع الضريبة عند الحاجة. |
| REQ-TX-021 | The system shall prevent direct posting to system-controlled tax clearing accounts unless the user has specific authorization. | يجب أن يمنع النظام الترحيل المباشر إلى حسابات المقاصة الضريبية الخاضعة لتحكم النظام ما لم يكن لدى المستخدم صلاحية خاصة. |
| REQ-TX-022 | The system shall maintain a history of changes to tax account mapping, including user, date, old value, and new value. | يجب أن يحتفظ النظام بسجل لتغييرات ربط الحسابات الضريبية يشمل المستخدم والتاريخ والقيمة السابقة والقيمة الجديدة. |

## 4. Sales Tax / Output VAT | ضريبة المبيعات / ضريبة القيمة المضافة على المخرجات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-023 | The system shall calculate sales tax or output VAT on sales invoices, credit notes, and other taxable sales documents based on the selected tax code. | يجب أن يحسب النظام ضريبة المبيعات أو ضريبة القيمة المضافة على المخرجات على فواتير المبيعات والإشعارات الدائنة وغيرها من مستندات المبيعات الخاضعة للضريبة بناءً على الكود الضريبي المحدد. |
| REQ-TX-024 | The system shall allow tax to be calculated at line level so that different invoice lines may use different tax codes. | يجب أن يسمح النظام باحتساب الضريبة على مستوى السطر بحيث يمكن لأسطر الفاتورة المختلفة استخدام أكواد ضريبية مختلفة. |
| REQ-TX-025 | The system shall calculate tax-exclusive and tax-inclusive prices according to transaction configuration. | يجب أن يحسب النظام الأسعار قبل الضريبة والأسعار شاملة الضريبة وفقاً لتهيئة المعاملة. |
| REQ-TX-026 | The system shall post output tax to the configured tax payable account when a taxable sales invoice is posted. | يجب أن يرحل النظام ضريبة المخرجات إلى حساب الضريبة المستحقة المهيأ عند ترحيل فاتورة مبيعات خاضعة للضريبة. |
| REQ-TX-027 | The system shall reverse or reduce output tax when a sales credit note is posted against a taxable sales invoice. | يجب أن يعكس النظام أو يخفض ضريبة المخرجات عند ترحيل إشعار دائن للمبيعات مقابل فاتورة مبيعات خاضعة للضريبة. |
| REQ-TX-028 | The system shall preserve the tax code, tax rate, taxable base, and tax amount on each posted sales tax line for audit and reporting purposes. | يجب أن يحتفظ النظام بالكود الضريبي والنسبة الضريبية والأساس الخاضع للضريبة ومبلغ الضريبة في كل سطر ضريبة مبيعات مرحل لأغراض التدقيق والتقارير. |
| REQ-TX-029 | The system shall prevent posted sales tax amounts from being modified directly after posting except through authorized adjustment or credit note procedures. | يجب أن يمنع النظام تعديل مبالغ ضريبة المبيعات المرحلة مباشرة بعد الترحيل إلا من خلال إجراءات تعديل أو إشعار دائن معتمدة. |
| REQ-TX-030 | The system shall allow sales transactions to be classified for tax reporting as domestic sales, export sales, exempt sales, zero-rated sales, or out-of-scope sales where applicable. | يجب أن يسمح النظام بتصنيف معاملات المبيعات لأغراض التقارير الضريبية على أنها مبيعات محلية أو مبيعات تصدير أو مبيعات معفاة أو مبيعات بنسبة صفرية أو مبيعات خارج النطاق عند الحاجة. |

## 5. Purchase Tax / Input VAT | ضريبة المشتريات / ضريبة القيمة المضافة على المدخلات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-031 | The system shall calculate purchase tax or input VAT on supplier invoices, debit notes, and other taxable purchase documents based on the selected tax code. | يجب أن يحسب النظام ضريبة المشتريات أو ضريبة القيمة المضافة على المدخلات على فواتير الموردين والإشعارات المدينة وغيرها من مستندات المشتريات الخاضعة للضريبة بناءً على الكود الضريبي المحدد. |
| REQ-TX-032 | The system shall allow input tax to be calculated at purchase invoice line level. | يجب أن يسمح النظام باحتساب ضريبة المدخلات على مستوى سطر فاتورة الشراء. |
| REQ-TX-033 | The system shall identify whether input tax is fully recoverable, non-recoverable, or partially recoverable based on tax code and configuration. | يجب أن يحدد النظام ما إذا كانت ضريبة المدخلات قابلة للاسترداد بالكامل أو غير قابلة للاسترداد أو قابلة للاسترداد جزئياً بناءً على الكود الضريبي والتهيئة. |
| REQ-TX-034 | The system shall post recoverable input tax to the configured input tax account when a taxable purchase invoice is posted. | يجب أن يرحل النظام ضريبة المدخلات القابلة للاسترداد إلى حساب ضريبة المدخلات المهيأ عند ترحيل فاتورة شراء خاضعة للضريبة. |
| REQ-TX-035 | The system shall post non-recoverable input tax to the configured expense, asset, or inventory cost account according to transaction treatment. | يجب أن يرحل النظام ضريبة المدخلات غير القابلة للاسترداد إلى حساب المصروف أو الأصل أو تكلفة المخزون المهيأ وفقاً لمعالجة المعاملة. |
| REQ-TX-036 | The system shall reverse or reduce input tax when a purchase debit note or supplier credit adjustment is posted. | يجب أن يعكس النظام أو يخفض ضريبة المدخلات عند ترحيل إشعار مدين للمشتريات أو تعديل دائن من المورد. |
| REQ-TX-037 | The system shall preserve the supplier invoice tax reference, tax code, tax rate, taxable base, and tax amount on each posted purchase tax line. | يجب أن يحتفظ النظام بمرجع الضريبة في فاتورة المورد والكود الضريبي والنسبة الضريبية والأساس الخاضع للضريبة ومبلغ الضريبة في كل سطر ضريبة مشتريات مرحل. |
| REQ-TX-038 | The system shall allow purchase transactions to be classified for tax reporting as domestic purchases, imports, exempt purchases, capital purchases, or out-of-scope purchases where applicable. | يجب أن يسمح النظام بتصنيف معاملات المشتريات لأغراض التقارير الضريبية على أنها مشتريات محلية أو واردات أو مشتريات معفاة أو مشتريات رأسمالية أو مشتريات خارج النطاق عند الحاجة. |

## 6. Withholding Tax (WHT) | ضريبة الاستقطاع

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-039 | The system shall allow authorized users to configure withholding tax types, rates, jurisdictions, and applicable service or payment categories. | يجب أن يسمح النظام للمستخدمين المخولين بتهيئة أنواع ضريبة الاستقطاع ونسبها وجهاتها الضريبية وفئات الخدمات أو الدفعات التي تنطبق عليها. |
| REQ-TX-040 | The system shall allow withholding tax to be calculated on supplier invoices, supplier payments, customer receipts, or manual withholding entries depending on configuration. | يجب أن يسمح النظام باحتساب ضريبة الاستقطاع على فواتير الموردين أو دفعات الموردين أو مقبوضات العملاء أو قيود الاستقطاع اليدوية بحسب التهيئة. |
| REQ-TX-041 | The system shall support withholding tax calculation based on gross amount, net amount, taxable base, or manually entered amount where authorized. | يجب أن يدعم النظام احتساب ضريبة الاستقطاع بناءً على المبلغ الإجمالي أو المبلغ الصافي أو الأساس الخاضع للضريبة أو مبلغ مدخل يدوياً عند السماح بذلك. |
| REQ-TX-042 | The system shall post withholding tax to the configured withholding tax payable or receivable account when the related transaction is posted. | يجب أن يرحل النظام ضريبة الاستقطاع إلى حساب ضريبة الاستقطاع المستحقة أو المستردة المهيأ عند ترحيل المعاملة المرتبطة. |
| REQ-TX-043 | The system shall reduce the supplier payable or customer receivable balance by the withholding amount when withholding is applied to a settlement transaction. | يجب أن يخفض النظام رصيد المورد الدائن أو رصيد العميل المدين بمقدار الاستقطاع عند تطبيق الاستقطاع على معاملة تسوية. |
| REQ-TX-044 | The system shall maintain the relationship between the withholding tax entry, the source invoice, the payment or receipt, and the tax authority liability. | يجب أن يحتفظ النظام بالعلاقة بين قيد ضريبة الاستقطاع والفاتورة المصدرية والدفعة أو المقبوض والالتزام تجاه السلطة الضريبية. |
| REQ-TX-045 | The system shall allow withholding tax certificates or references to be recorded and attached to the related transaction. | يجب أن يسمح النظام بتسجيل شهادات أو مراجع ضريبة الاستقطاع وإرفاقها بالمعاملة المرتبطة. |
| REQ-TX-046 | The system shall support withholding tax reports by supplier, customer, jurisdiction, tax type, period, and payment status. | يجب أن يدعم النظام تقارير ضريبة الاستقطاع بحسب المورد أو العميل أو الجهة الضريبية أو نوع الضريبة أو الفترة أو حالة السداد. |
| REQ-TX-047 | The system shall prevent duplicate withholding tax calculation for the same invoice or settlement unless an authorized adjustment is recorded. | يجب أن يمنع النظام احتساب ضريبة الاستقطاع بشكل مكرر لنفس الفاتورة أو التسوية ما لم يتم تسجيل تعديل معتمد. |

## 7. Reverse Charge, Imports, Exports & Exemptions | الاحتساب العكسي والاستيراد والتصدير والإعفاءات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-048 | The system shall support reverse charge tax treatment where the buyer records both output tax and input tax according to applicable rules. | يجب أن يدعم النظام المعالجة الضريبية للاحتساب العكسي عندما يسجل المشتري كلاً من ضريبة المخرجات وضريبة المدخلات وفقاً للقواعد المطبقة. |
| REQ-TX-049 | The system shall allow import tax and customs-related tax treatment to be recorded separately from normal domestic purchase tax. | يجب أن يسمح النظام بتسجيل ضريبة الاستيراد والمعالجة الضريبية المرتبطة بالجمارك بشكل منفصل عن ضريبة المشتريات المحلية المعتادة. |
| REQ-TX-050 | The system shall allow export transactions to be classified as zero-rated, exempt, out-of-scope, or taxable according to the configured tax rules. | يجب أن يسمح النظام بتصنيف معاملات التصدير على أنها بنسبة صفرية أو معفاة أو خارج النطاق أو خاضعة للضريبة وفقاً للقواعد الضريبية المهيأة. |
| REQ-TX-051 | The system shall allow exempt sales or purchases to be recorded with the proper tax code and reported separately from taxable transactions. | يجب أن يسمح النظام بتسجيل المبيعات أو المشتريات المعفاة باستخدام الكود الضريبي الصحيح والإبلاغ عنها بشكل منفصل عن المعاملات الخاضعة للضريبة. |
| REQ-TX-052 | The system shall allow tax exemption certificates, customer exemption documents, supplier exemption documents, or export support documents to be attached to relevant transactions. | يجب أن يسمح النظام بإرفاق شهادات الإعفاء الضريبي أو مستندات إعفاء العملاء أو مستندات إعفاء الموردين أو مستندات دعم التصدير بالمعاملات ذات الصلة. |
| REQ-TX-053 | The system shall preserve the reason for using zero-rated, exempt, reverse charge, or out-of-scope treatment when a reason is required by configuration. | يجب أن يحتفظ النظام بسبب استخدام المعاملة بنسبة صفرية أو معفاة أو خاضعة للاحتساب العكسي أو خارج النطاق عندما تتطلب التهيئة تسجيل السبب. |
| REQ-TX-054 | The system shall allow tax reporting to separate domestic, import, export, exempt, reverse charge, and out-of-scope tax bases. | يجب أن يسمح النظام بفصل الأسس الضريبية المحلية والاستيراد والتصدير والمعفاة والاحتساب العكسي وخارج النطاق في التقارير الضريبية. |
| REQ-TX-055 | The system shall prevent use of restricted tax treatments unless the required master data, transaction classification, or supporting document is available according to configuration. | يجب أن يمنع النظام استخدام المعالجات الضريبية المقيدة ما لم تكن البيانات الأساسية المطلوبة أو تصنيف المعاملة أو المستند الداعم متوفراً وفقاً للتهيئة. |

## 8. Tax Returns & Declarations | الإقرارات والتصاريح الضريبية

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-056 | The system shall allow authorized users to create tax reporting periods according to the applicable tax authority frequency such as monthly, quarterly, semiannual, or annual. | يجب أن يسمح النظام للمستخدمين المخولين بإنشاء فترات التقارير الضريبية وفقاً لدورية الجهة الضريبية المطبقة مثل الشهري أو الربع سنوي أو نصف السنوي أو السنوي. |
| REQ-TX-057 | The system shall generate tax return summaries using posted transactions only. | يجب أن ينشئ النظام ملخصات الإقرارات الضريبية باستخدام المعاملات المرحلة فقط. |
| REQ-TX-058 | The system shall calculate output tax, recoverable input tax, non-recoverable tax, withholding tax, reverse charge tax, and net tax payable or refundable where applicable. | يجب أن يحسب النظام ضريبة المخرجات وضريبة المدخلات القابلة للاسترداد والضريبة غير القابلة للاسترداد وضريبة الاستقطاع وضريبة الاحتساب العكسي وصافي الضريبة المستحقة أو القابلة للاسترداد عند الحاجة. |
| REQ-TX-059 | The system shall allow users to drill down from tax return totals to the source transactions supporting each tax amount. | يجب أن يسمح النظام للمستخدمين بالانتقال التفصيلي من إجماليات الإقرار الضريبي إلى المعاملات المصدرية الداعمة لكل مبلغ ضريبي. |
| REQ-TX-060 | The system shall allow tax returns to be saved in draft status before final submission or approval. | يجب أن يسمح النظام بحفظ الإقرارات الضريبية في حالة مسودة قبل الاعتماد النهائي أو التقديم. |
| REQ-TX-061 | The system shall allow finalized tax returns to be locked so that submitted figures cannot be modified directly. | يجب أن يسمح النظام بقفل الإقرارات الضريبية النهائية بحيث لا يمكن تعديل الأرقام المقدمة مباشرة. |
| REQ-TX-062 | The system shall allow users to record the submission date, tax authority reference number, submitted by user, and submission status for each tax return. | يجب أن يسمح النظام للمستخدمين بتسجيل تاريخ التقديم ورقم مرجع السلطة الضريبية واسم المستخدم الذي قام بالتقديم وحالة التقديم لكل إقرار ضريبي. |
| REQ-TX-063 | The system shall allow tax returns to be exported to Excel, PDF, or another approved format for review and submission support. | يجب أن يسمح النظام بتصدير الإقرارات الضريبية إلى Excel أو PDF أو أي صيغة معتمدة أخرى لأغراض المراجعة ودعم التقديم. |
| REQ-TX-064 | The system shall maintain tax return statuses such as draft, under review, approved, submitted, amended, paid, refunded, and closed. | يجب أن يحتفظ النظام بحالات الإقرار الضريبي مثل مسودة وتحت المراجعة ومعتمد ومقدم ومعدل ومدفوع ومسترد ومغلق. |

## 9. Tax Payments, Refunds & Settlements | المدفوعات الضريبية والمبالغ المستردة والتسويات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-065 | The system shall allow authorized users to record tax payments made to tax authorities from bank or cash accounts. | يجب أن يسمح النظام للمستخدمين المخولين بتسجيل المدفوعات الضريبية المسددة للسلطات الضريبية من حسابات البنك أو النقدية. |
| REQ-TX-066 | The system shall allow authorized users to record tax refunds received from tax authorities into bank or cash accounts. | يجب أن يسمح النظام للمستخدمين المخولين بتسجيل المبالغ الضريبية المستردة المستلمة من السلطات الضريبية إلى حسابات البنك أو النقدية. |
| REQ-TX-067 | The system shall link tax payments or refunds to the related tax return, tax jurisdiction, and tax period. | يجب أن يربط النظام المدفوعات أو المبالغ الضريبية المستردة بالإقرار الضريبي المرتبط والجهة الضريبية والفترة الضريبية. |
| REQ-TX-068 | The system shall automatically create the related journal entry when a tax payment or refund is posted. | يجب أن ينشئ النظام قيد اليومية المرتبط تلقائياً عند ترحيل دفعة ضريبية أو مبلغ ضريبي مسترد. |
| REQ-TX-069 | The system shall reduce the tax payable balance when a tax payment is posted. | يجب أن يخفض النظام رصيد الضريبة المستحقة عند ترحيل دفعة ضريبية. |
| REQ-TX-070 | The system shall reduce the tax receivable or refund claim balance when a tax refund is posted. | يجب أن يخفض النظام رصيد الضريبة المستردة أو مطالبة الاسترداد عند ترحيل مبلغ ضريبي مسترد. |
| REQ-TX-071 | The system shall support partial tax payments and track outstanding tax payable or refundable balances by tax period. | يجب أن يدعم النظام المدفوعات الضريبية الجزئية وتتبع الأرصدة الضريبية المستحقة أو القابلة للاسترداد القائمة بحسب الفترة الضريبية. |
| REQ-TX-072 | The system shall maintain a settlement history showing tax return amount, payments, refunds, adjustments, and remaining balance. | يجب أن يحتفظ النظام بسجل للتسوية يوضح مبلغ الإقرار الضريبي والمدفوعات والمبالغ المستردة والتعديلات والرصيد المتبقي. |

## 10. Tax Adjustments, Corrections & Amendments | التعديلات والتصحيحات والتعديلات على الإقرارات الضريبية

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-073 | The system shall allow authorized users to create tax adjustment transactions for corrections, penalties, late fees, disallowed input tax, tax reclassification, or manual tax corrections. | يجب أن يسمح النظام للمستخدمين المخولين بإنشاء معاملات تعديل ضريبي للتصحيحات أو الغرامات أو رسوم التأخير أو ضريبة المدخلات غير المسموح بها أو إعادة التصنيف الضريبي أو التصحيحات الضريبية اليدوية. |
| REQ-TX-074 | The system shall require a reason, adjustment date, tax period, tax code, amount, and supporting description for every tax adjustment. | يجب أن يطلب النظام سبب التعديل وتاريخ التعديل والفترة الضريبية والكود الضريبي والمبلغ والوصف الداعم لكل تعديل ضريبي. |
| REQ-TX-075 | The system shall automatically create the related journal entry when a tax adjustment is posted. | يجب أن ينشئ النظام قيد اليومية المرتبط تلقائياً عند ترحيل تعديل ضريبي. |
| REQ-TX-076 | The system shall allow tax adjustments to be included in the current tax return or linked to an amended prior-period tax return according to configuration. | يجب أن يسمح النظام بإدراج التعديلات الضريبية في الإقرار الضريبي الحالي أو ربطها بإقرار معدل لفترة سابقة وفقاً للتهيئة. |
| REQ-TX-077 | The system shall prevent adjustment to a submitted tax return unless the user has specific authorization and an amendment reason is recorded. | يجب أن يمنع النظام تعديل إقرار ضريبي مقدم ما لم يكن لدى المستخدم صلاحية خاصة ويتم تسجيل سبب التعديل. |
| REQ-TX-078 | The system shall maintain a link between each tax adjustment, the affected tax return, and the source transaction where applicable. | يجب أن يحتفظ النظام برابط بين كل تعديل ضريبي والإقرار الضريبي المتأثر والمعاملة المصدرية عند الحاجة. |
| REQ-TX-079 | The system shall preserve original submitted tax return figures and show amended figures separately when a tax return amendment is recorded. | يجب أن يحتفظ النظام بالأرقام الأصلية المقدمة في الإقرار الضريبي وأن يعرض الأرقام المعدلة بشكل منفصل عند تسجيل تعديل على الإقرار. |

## 11. Reporting, Compliance & Audit | التقارير والامتثال والتدقيق

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-080 | The system shall provide tax reports by company, branch, jurisdiction, tax period, tax code, customer, supplier, and transaction type. | يجب أن يوفر النظام تقارير ضريبية بحسب الشركة أو الفرع أو الجهة الضريبية أو الفترة الضريبية أو الكود الضريبي أو العميل أو المورد أو نوع المعاملة. |
| REQ-TX-081 | The system shall provide a VAT or sales tax transaction listing showing source document, date, party, taxable amount, tax code, tax rate, and tax amount. | يجب أن يوفر النظام كشفاً لمعاملات ضريبة القيمة المضافة أو ضريبة المبيعات يوضح المستند المصدر والتاريخ والطرف والمبلغ الخاضع للضريبة والكود الضريبي والنسبة الضريبية ومبلغ الضريبة. |
| REQ-TX-082 | The system shall provide an input tax report showing recoverable, non-recoverable, and partially recoverable input tax. | يجب أن يوفر النظام تقرير ضريبة المدخلات يوضح ضريبة المدخلات القابلة للاسترداد وغير القابلة للاسترداد والقابلة للاسترداد جزئياً. |
| REQ-TX-083 | The system shall provide an output tax report showing taxable, zero-rated, exempt, out-of-scope, and reverse charge sales where applicable. | يجب أن يوفر النظام تقرير ضريبة المخرجات يوضح المبيعات الخاضعة للضريبة والنسبة الصفرية والمعفاة وخارج النطاق والخاضعة للاحتساب العكسي عند الحاجة. |
| REQ-TX-084 | The system shall provide a withholding tax report showing withholding base, withholding amount, rate, source transaction, party, certificate reference, and payment status. | يجب أن يوفر النظام تقرير ضريبة الاستقطاع يوضح أساس الاستقطاع ومبلغ الاستقطاع والنسبة والمعاملة المصدرية والطرف ومرجع الشهادة وحالة السداد. |
| REQ-TX-085 | The system shall allow users to reconcile tax report balances to general ledger tax account balances for the same period and filters. | يجب أن يسمح النظام للمستخدمين بمطابقة أرصدة التقارير الضريبية مع أرصدة حسابات الضرائب في دفتر الأستاذ العام لنفس الفترة ونفس الفلاتر. |
| REQ-TX-086 | The system shall log all tax-sensitive actions including tax setup changes, tax code changes, tax return generation, approval, submission, payment, refund, adjustment, and amendment. | يجب أن يسجل النظام جميع الإجراءات الحساسة ضريبياً بما في ذلك تغييرات إعدادات الضرائب وتغييرات الأكواد الضريبية وإنشاء الإقرارات الضريبية واعتمادها وتقديمها وسدادها واستردادها وتعديلها. |
| REQ-TX-087 | The system shall restrict access to tax reports, tax returns, and tax setup based on role-based permissions. | يجب أن يقيد النظام الوصول إلى التقارير الضريبية والإقرارات الضريبية وإعدادات الضرائب بناءً على الصلاحيات المعتمدة على الأدوار. |

## 12. Validation & Control Rules | قواعد التحقق والرقابة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-TX-088 | The system shall prevent posting taxable transactions when the selected tax code is inactive, expired, or not valid for the transaction date. | يجب أن يمنع النظام ترحيل المعاملات الخاضعة للضريبة عندما يكون الكود الضريبي المحدد غير نشط أو منتهي الصلاحية أو غير صالح لتاريخ المعاملة. |
| REQ-TX-089 | The system shall prevent posting taxable transactions when the selected tax code is not allowed for the transaction module or transaction type. | يجب أن يمنع النظام ترحيل المعاملات الخاضعة للضريبة عندما لا يكون الكود الضريبي المحدد مسموحاً به لوحدة المعاملة أو نوعها. |
| REQ-TX-090 | The system shall prevent posting taxable transactions when mandatory tax registration, party tax information, or tax account mapping is missing according to configuration. | يجب أن يمنع النظام ترحيل المعاملات الخاضعة للضريبة عند غياب التسجيل الضريبي الإلزامي أو البيانات الضريبية للطرف أو ربط الحسابات الضريبية وفقاً للتهيئة. |
| REQ-TX-091 | The system shall prevent tax return finalization when unreconciled tax exceptions exist, unless an authorized override reason is recorded. | يجب أن يمنع النظام إنهاء الإقرار الضريبي عندما توجد استثناءات ضريبية غير مسواة ما لم يتم تسجيل سبب تجاوز معتمد. |
| REQ-TX-092 | The system shall exclude draft transactions from official tax reports and tax returns. | يجب أن يستبعد النظام المعاملات المسودة من التقارير الضريبية الرسمية والإقرارات الضريبية. |
| REQ-TX-093 | The system shall ensure tax posting is transactional so that source transaction posting, tax ledger posting, and general ledger posting either succeed together or fail together. | يجب أن يضمن النظام أن يكون الترحيل الضريبي تنفيذياً كوحدة واحدة بحيث ينجح ترحيل المعاملة المصدرية وترحيل سجل الضريبة وترحيل دفتر الأستاذ العام معاً أو يفشلوا معاً. |
| REQ-TX-094 | The system shall prevent deletion of posted tax records, submitted tax returns, tax payments, tax refunds, or tax adjustments. | يجب أن يمنع النظام حذف السجلات الضريبية المرحلة أو الإقرارات الضريبية المقدمة أو المدفوعات الضريبية أو المبالغ الضريبية المستردة أو التعديلات الضريبية. |
| REQ-TX-095 | The system shall maintain a complete audit history for draft, posted, reversed, adjusted, submitted, amended, paid, refunded, and closed tax transactions. | يجب أن يحتفظ النظام بسجل تدقيق كامل للمعاملات الضريبية في حالات المسودة والترحيل والعكس والتعديل والتقديم والدفع والاسترداد والإغلاق. |
