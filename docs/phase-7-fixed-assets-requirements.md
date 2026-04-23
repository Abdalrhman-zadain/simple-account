# Phase 7 - Fixed Assets Module Requirements

## English

- Document Type: Functional Requirements
- Scope: Fixed Assets Module
- Phase: Phase 7 - Fixed Assets
- Total Requirements: 54

This document captures the Phase 7 Fixed Assets requirements baseline in the same bilingual ownership style used by the other implemented phases. The current codebase now includes an end-to-end Phase 7 slice for category setup, fixed-asset register, acquisition posting/reversal, depreciation runs with schedule/history visibility, disposal posting/reversal, transfer posting/reversal, audit history, summary inquiry, and bilingual UI coverage.

### Proposed module slices

- `asset-register`
- `asset-acquisition`
- `depreciation`
- `asset-disposal`
- `asset-transfers`
- `posting-accounting`
- `validation-control`

## العربية

- نوع المستند: متطلبات وظيفية
- النطاق: وحدة الأصول الثابتة
- المرحلة: المرحلة السابعة - الأصول الثابتة
- إجمالي المتطلبات: 54

يوثق هذا المستند خط الأساس لمتطلبات المرحلة السابعة الخاصة بوحدة الأصول الثابتة بنفس أسلوب الملكية ثنائي اللغة المستخدم في بقية المراحل. يتضمن التنفيذ الحالي شريحة أولية متكاملة لوحدة الأصول الثابتة تشمل تهيئة الفئات، سجل الأصول، ترحيل الاقتناء، دورات الاستهلاك، ترحيل الاستبعاد، ترحيل النقل، الاستعلام الملخص، والتغطية الثنائية للواجهة.

### التقسيم المقترح للوحدات الفرعية

- `asset-register`
- `asset-acquisition`
- `depreciation`
- `asset-disposal`
- `asset-transfers`
- `posting-accounting`
- `validation-control`

## 1. Asset Register | سجل الأصول

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-FA-001 | The system shall allow the user to create fixed asset master records. | يجب أن يسمح النظام للمستخدم بإنشاء السجلات الأساسية للأصول الثابتة. |
| REQ-FA-002 | The system shall allow the user to store essential fixed asset details such as asset code, asset name, category, acquisition date, useful life, depreciation method, status, and location. | يجب أن يسمح النظام بحفظ بيانات الأصل الأساسية مثل رمز الأصل واسم الأصل والفئة وتاريخ الاقتناء والعمر الإنتاجي وطريقة الاستهلاك والحالة والموقع. |
| REQ-FA-003 | The system shall allow the user to classify fixed assets by category such as buildings, vehicles, machinery, furniture, equipment, or other defined classes. | يجب أن يسمح النظام بتصنيف الأصول الثابتة حسب الفئة مثل المباني والمركبات والآلات والأثاث والمعدات أو أي فئات أخرى معرفة. |
| REQ-FA-004 | The system shall allow the user to assign each fixed asset to a responsible department, cost center, employee, or physical location. | يجب أن يسمح النظام بإسناد كل أصل ثابت إلى قسم مسؤول أو مركز تكلفة أو موظف أو موقع فعلي. |
| REQ-FA-005 | The system shall allow the user to define the depreciation start date for each fixed asset. | يجب أن يسمح النظام بتحديد تاريخ بدء الاستهلاك لكل أصل ثابت. |
| REQ-FA-006 | The system shall allow the user to store residual value or salvage value for each fixed asset when applicable. | يجب أن يسمح النظام بحفظ القيمة التخريدية أو المتبقية لكل أصل ثابت عند الحاجة. |
| REQ-FA-007 | The system shall allow the user to edit fixed asset details before the asset is posted to depreciation or disposed, subject to authorization rules. | يجب أن يسمح النظام بتعديل بيانات الأصل الثابت قبل ترحيله إلى الاستهلاك أو استبعاده وفقاً لصلاحيات الاعتماد. |
| REQ-FA-008 | The system shall allow the user to deactivate or retire an asset from active use while preserving its historical transactions and balances. | يجب أن يسمح النظام بتعطيل الأصل أو إحالته للتقاعد مع الاحتفاظ بحركاته التاريخية وأرصدته. |
| REQ-FA-009 | The system shall display the current book value, accumulated depreciation, acquisition cost, and status of each fixed asset. | يجب أن يعرض النظام القيمة الدفترية الحالية ومجمع الاستهلاك وتكلفة الاقتناء وحالة كل أصل ثابت. |
| REQ-FA-010 | The system shall prevent the selection of inactive or disposed fixed assets in new operational transactions, except where needed for inquiry or reporting. | يجب أن يمنع النظام اختيار الأصول الثابتة غير النشطة أو المستبعدة في المعاملات التشغيلية الجديدة إلا عند الحاجة للاستعلام أو التقارير. |

## 2. Asset Acquisition | اقتناء الأصل

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-FA-011 | The system shall allow the user to record fixed asset acquisition transactions. | يجب أن يسمح النظام بتسجيل معاملات اقتناء الأصول الثابتة. |
| REQ-FA-012 | The system shall allow the user to create asset acquisitions from supplier purchases, manual entries, or capitalization of eligible costs. | يجب أن يسمح النظام بإنشاء اقتناء الأصل من مشتريات الموردين أو الإدخالات اليدوية أو رسملة التكاليف المؤهلة. |
| REQ-FA-013 | The system shall require acquisition date, acquisition cost, and asset category for every asset acquisition transaction. | يجب أن يطلب النظام تاريخ الاقتناء وتكلفة الاقتناء وفئة الأصل لكل معاملة اقتناء. |
| REQ-FA-014 | The system shall allow the user to link an acquisition to a supplier, purchase invoice, or payment reference when applicable. | يجب أن يسمح النظام بربط الاقتناء بالمورد أو فاتورة الشراء أو مرجع الدفع عند الحاجة. |
| REQ-FA-015 | The system shall allow the user to capitalize additional directly attributable costs such as freight, installation, or setup into the asset cost. | يجب أن يسمح النظام برسملة التكاليف الإضافية المباشرة مثل الشحن أو التركيب أو التجهيز ضمن تكلفة الأصل. |
| REQ-FA-016 | The system shall assign or require a unique reference number for each asset acquisition transaction. | يجب أن يخصص النظام أو يطلب رقماً مرجعياً فريداً لكل معاملة اقتناء أصل. |
| REQ-FA-017 | The system shall automatically create the related journal entry when an asset acquisition is posted. | يجب أن ينشئ النظام قيد اليومية المرتبط تلقائياً عند ترحيل اقتناء الأصل. |
| REQ-FA-018 | The system shall update the fixed asset register and relevant general ledger balances after an acquisition is posted. | يجب أن يحدث النظام سجل الأصول الثابتة وأرصدة دفتر الأستاذ ذات الصلة بعد ترحيل الاقتناء. |

## 3. Depreciation | الاستهلاك

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-FA-019 | The system shall allow the user to define the depreciation method for each fixed asset, such as straight-line or declining balance. | يجب أن يسمح النظام بتحديد طريقة الاستهلاك لكل أصل ثابت مثل القسط الثابت أو الرصيد المتناقص. |
| REQ-FA-020 | The system shall allow the user to define useful life in months or years for each fixed asset. | يجب أن يسمح النظام بتحديد العمر الإنتاجي بالأشهر أو السنوات لكل أصل ثابت. |
| REQ-FA-021 | The system shall calculate periodic depreciation based on acquisition cost, residual value, useful life, depreciation method, and depreciation start date. | يجب أن يحسب النظام الاستهلاك الدوري بناءً على تكلفة الاقتناء والقيمة المتبقية والعمر الإنتاجي وطريقة الاستهلاك وتاريخ بدء الاستهلاك. |
| REQ-FA-022 | The system shall allow the user to run depreciation for a selected period for one asset, a category of assets, or all eligible assets. | يجب أن يسمح النظام بتشغيل الاستهلاك لفترة محددة لأصل واحد أو لفئة من الأصول أو لكل الأصول المؤهلة. |
| REQ-FA-023 | The system shall prevent duplicate depreciation posting for the same asset and the same accounting period. | يجب أن يمنع النظام ترحيل الاستهلاك المكرر لنفس الأصل ولنفس الفترة المحاسبية. |
| REQ-FA-024 | The system shall automatically create the related journal entry when depreciation is posted. | يجب أن ينشئ النظام قيد اليومية المرتبط تلقائياً عند ترحيل الاستهلاك. |
| REQ-FA-025 | The system shall update accumulated depreciation, depreciation expense, and net book value after depreciation is posted. | يجب أن يحدث النظام مجمع الاستهلاك ومصروف الاستهلاك وصافي القيمة الدفترية بعد ترحيل الاستهلاك. |
| REQ-FA-026 | The system shall allow the user to view the depreciation schedule and posted depreciation history for each fixed asset. | يجب أن يسمح النظام بعرض جدول الاستهلاك وتاريخ الاستهلاك المرحل لكل أصل ثابت. |

## 4. Asset Disposal | استبعاد الأصل

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-FA-027 | The system shall allow the user to record fixed asset disposal transactions. | يجب أن يسمح النظام بتسجيل معاملات استبعاد الأصول الثابتة. |
| REQ-FA-028 | The system shall require a disposal date for every asset disposal transaction. | يجب أن يطلب النظام تاريخ الاستبعاد لكل معاملة استبعاد أصل. |
| REQ-FA-029 | The system shall allow the user to record disposal proceeds, disposal expenses, and the disposal method such as sale, write-off, or scrap. | يجب أن يسمح النظام بتسجيل متحصلات الاستبعاد ومصروفات الاستبعاد وطريقة الاستبعاد مثل البيع أو الشطب أو الخردة. |
| REQ-FA-030 | The system shall calculate the gain or loss on disposal based on book value and proceeds. | يجب أن يحسب النظام الربح أو الخسارة من الاستبعاد بناءً على القيمة الدفترية والمتحصلات. |
| REQ-FA-031 | The system shall automatically create the related journal entry when a disposal is posted. | يجب أن ينشئ النظام قيد اليومية المرتبط تلقائياً عند ترحيل الاستبعاد. |
| REQ-FA-032 | The system shall update the asset status to disposed and prevent further depreciation after disposal is posted. | يجب أن يحدث النظام حالة الأصل إلى مستبعد ويمنع أي استهلاك لاحق بعد ترحيل الاستبعاد. |
| REQ-FA-033 | The system shall maintain a link between the disposed asset and the disposal transaction for audit and reporting purposes. | يجب أن يحتفظ النظام برابط بين الأصل المستبعد ومعاملة الاستبعاد لأغراض التدقيق والتقارير. |

## 5. Asset Transfers | نقل الأصل

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-FA-034 | The system shall allow the user to transfer a fixed asset between departments, cost centers, branches, or physical locations. | يجب أن يسمح النظام بنقل الأصل الثابت بين الأقسام أو مراكز التكلفة أو الفروع أو المواقع الفعلية. |
| REQ-FA-035 | The system shall require a transfer date and source and destination assignments for every asset transfer transaction. | يجب أن يطلب النظام تاريخ النقل وإسنادات المصدر والوجهة لكل معاملة نقل أصل. |
| REQ-FA-036 | The system shall allow the user to record a reason or note for each asset transfer. | يجب أن يسمح النظام بتسجيل سبب أو ملاحظة لكل عملية نقل أصل. |
| REQ-FA-037 | The system shall update the asset master record to reflect the new department, cost center, branch, or location after a transfer is posted. | يجب أن يحدث النظام السجل الأساسي للأصل ليعكس القسم أو مركز التكلفة أو الفرع أو الموقع الجديد بعد ترحيل النقل. |
| REQ-FA-038 | The system shall maintain a complete transfer history for each fixed asset. | يجب أن يحتفظ النظام بتاريخ نقل كامل لكل أصل ثابت. |
| REQ-FA-039 | The system shall prevent transfers of disposed or inactive assets unless specifically authorized for correction purposes. | يجب أن يمنع النظام نقل الأصول المستبعدة أو غير النشطة إلا إذا تم التصريح بذلك لأغراض التصحيح. |

## 6. Posting & Accounting Logic | منطق الترحيل والمحاسبة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-FA-040 | The system shall record all fixed asset financial transactions using double-entry accounting. | يجب أن يسجل النظام جميع المعاملات المالية للأصول الثابتة باستخدام القيد المزدوج. |
| REQ-FA-041 | The system shall post fixed asset acquisitions to the general ledger. | يجب أن يرحل النظام اقتناء الأصول الثابتة إلى دفتر الأستاذ العام. |
| REQ-FA-042 | The system shall post depreciation transactions to the general ledger. | يجب أن يرحل النظام معاملات الاستهلاك إلى دفتر الأستاذ العام. |
| REQ-FA-043 | The system shall post disposal transactions to the general ledger. | يجب أن يرحل النظام معاملات الاستبعاد إلى دفتر الأستاذ العام. |
| REQ-FA-044 | The system shall update fixed asset balances and related ledger balances after successful posting. | يجب أن يحدث النظام أرصدة الأصول الثابتة وأرصدة الأستاذ المرتبطة بعد الترحيل الناجح. |
| REQ-FA-045 | The system shall change transaction status from draft to posted when fixed asset posting is completed successfully. | يجب أن يغير النظام حالة المعاملة من مسودة إلى مرحلة عند اكتمال ترحيل الأصل الثابت بنجاح. |
| REQ-FA-046 | The system shall prevent direct modification of posted fixed asset transactions and require reversal or adjustment procedures instead. | يجب أن يمنع النظام التعديل المباشر على معاملات الأصول الثابتة المرحلة وأن يطلب بدلاً من ذلك إجراءات عكس أو تعديل. |

## 7. Validation & Control Rules | قواعد التحقق والضبط

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-FA-047 | The system shall allow the user to save fixed asset transactions in draft status before posting. | يجب أن يسمح النظام بحفظ معاملات الأصول الثابتة في حالة مسودة قبل الترحيل. |
| REQ-FA-048 | The system shall require a unique reference number for each fixed asset acquisition, depreciation batch, disposal, and transfer transaction. | يجب أن يطلب النظام رقماً مرجعياً فريداً لكل اقتناء أصل وكل دفعة استهلاك وكل استبعاد وكل معاملة نقل. |
| REQ-FA-049 | The system shall prevent posting transactions to deactivated or invalid general ledger accounts. | يجب أن يمنع النظام ترحيل المعاملات إلى حسابات دفتر أستاذ عام معطلة أو غير صحيحة. |
| REQ-FA-050 | The system shall prevent depreciation posting for assets whose acquisition has not been posted. | يجب أن يمنع النظام ترحيل الاستهلاك للأصول التي لم يتم ترحيل اقتنائها. |
| REQ-FA-051 | The system shall prevent disposal of an asset that has already been disposed. | يجب أن يمنع النظام استبعاد أصل تم استبعاده مسبقاً. |
| REQ-FA-052 | The system shall maintain a full audit history of draft, posted, transferred, depreciated, and disposed fixed asset transactions. | يجب أن يحتفظ النظام بتاريخ تدقيق كامل لمعاملات الأصول الثابتة في حالات المسودة والترحيل والنقل والاستهلاك والاستبعاد. |
| REQ-FA-053 | The system shall prevent deletion of posted fixed asset financial records. | يجب أن يمنع النظام حذف السجلات المالية المرحلة الخاصة بالأصول الثابتة. |
| REQ-FA-054 | The system shall allow the user to reverse posted fixed asset transactions by creating new reversing entries linked to the original posted records. | يجب أن يسمح النظام بعكس معاملات الأصول الثابتة المرحلة من خلال إنشاء قيود عكسية جديدة مرتبطة بالسجلات الأصلية المرحلة. |
