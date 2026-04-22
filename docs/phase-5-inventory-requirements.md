# Phase 5 - Inventory Module Requirements

## English

- Document Type: Functional Requirements
- Scope: Inventory Module
- Phase: Phase 5 - Stock Control
- Total Requirements: 60

This document captures the initial Phase 5 Inventory requirements baseline in the same modular ownership style used by the rest of the project. It is a planning and handoff reference only and does not mean the Inventory module is currently implemented. The requirements are grouped by section so review, estimation, discussion, and phased delivery can stay organized.

### Proposed module slices

- `item-master`
- `warehouses`
- `goods-receipts`
- `goods-issues`
- `inventory-transfers`
- `inventory-adjustments`
- `costing`
- `stock-ledger-inquiry`
- `posting-accounting`
- `validation-control`

## العربية

- نوع المستند: متطلبات وظيفية
- النطاق: وحدة المخزون
- المرحلة: المرحلة الخامسة - التحكم في المخزون
- إجمالي المتطلبات: 60

يوثق هذا المستند خط الأساس الأولي لمتطلبات وحدة المخزون في المرحلة الخامسة بنفس أسلوب الملكية المعيارية المستخدم في بقية المشروع. هذه الوثيقة مرجع للتخطيط والتسليم فقط، ولا تعني أن وحدة المخزون مطبقة حاليًا. تم تقسيم المتطلبات بحسب الأقسام لتسهيل المراجعة والتقدير والنقاش والتنفيذ المرحلي.

### التقسيم المقترح للوحدات الفرعية

- `item-master`
- `warehouses`
- `goods-receipts`
- `goods-issues`
- `inventory-transfers`
- `inventory-adjustments`
- `costing`
- `stock-ledger-inquiry`
- `posting-accounting`
- `validation-control`

## 1. Item Master | بطاقة الصنف

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-001 | The system shall allow the user to create inventory item master records. | يجب أن يسمح النظام للمستخدم بإنشاء بطاقات الأصناف الأساسية للمخزون. |
| REQ-INV-002 | The system shall allow the user to store item details such as item name, code, description, unit of measure, item category, and status. | يجب أن يسمح النظام للمستخدم بحفظ بيانات الصنف مثل اسم الصنف والرمز والوصف ووحدة القياس وفئة الصنف والحالة. |
| REQ-INV-003 | The system shall allow the user to classify an item as inventory, non-stock, service, or raw material according to business configuration. | يجب أن يسمح النظام للمستخدم بتصنيف الصنف كمخزني أو غير مخزني أو خدمة أو مادة خام وفقًا لإعدادات العمل. |
| REQ-INV-004 | The system shall allow the user to define default inventory, cost of goods sold, sales, and adjustment accounts for each item or item group. | يجب أن يسمح النظام للمستخدم بتحديد حسابات افتراضية للمخزون وتكلفة البضاعة المباعة والمبيعات والتسويات لكل صنف أو مجموعة أصناف. |
| REQ-INV-005 | The system shall allow the user to define reorder level, reorder quantity, and preferred warehouse for an item. | يجب أن يسمح النظام للمستخدم بتحديد حد إعادة الطلب وكمية إعادة الطلب والمستودع المفضل للصنف. |
| REQ-INV-006 | The system shall allow the user to edit item details before the item is deactivated. | يجب أن يسمح النظام للمستخدم بتعديل بيانات الصنف قبل تعطيله. |
| REQ-INV-007 | The system shall allow the user to deactivate an item while preserving historical inventory transactions. | يجب أن يسمح النظام للمستخدم بتعطيل الصنف مع الحفاظ على الحركات المخزنية التاريخية. |
| REQ-INV-008 | The system shall prevent the selection of deactivated items in new inventory transactions. | يجب أن يمنع النظام اختيار الأصناف المعطلة في الحركات المخزنية الجديدة. |
| REQ-INV-009 | The system shall allow the user to view the current on-hand quantity for each item. | يجب أن يسمح النظام للمستخدم بعرض الكمية المتاحة الحالية لكل صنف. |
| REQ-INV-010 | The system shall allow the user to view inventory valuation summary for each item where costing is enabled. | يجب أن يسمح النظام للمستخدم بعرض ملخص تقييم المخزون لكل صنف عند تفعيل احتساب التكلفة. |

## 2. Warehouses | المستودعات

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-011 | The system shall allow the user to create warehouse or inventory location master records. | يجب أن يسمح النظام للمستخدم بإنشاء بطاقات المستودعات أو مواقع التخزين. |
| REQ-INV-012 | The system shall allow the user to store warehouse details such as warehouse name, code, address, responsible person, and status. | يجب أن يسمح النظام للمستخدم بحفظ بيانات المستودع مثل اسم المستودع والرمز والعنوان والمسؤول والحالة. |
| REQ-INV-013 | The system shall allow the user to define a default in-transit or staging location where required by the inventory process. | يجب أن يسمح النظام للمستخدم بتحديد موقع افتراضي للبضاعة تحت النقل أو منطقة تجهيز عندما تتطلب عملية المخزون ذلك. |
| REQ-INV-014 | The system shall allow the user to edit warehouse details before the warehouse is deactivated. | يجب أن يسمح النظام للمستخدم بتعديل بيانات المستودع قبل تعطيله. |
| REQ-INV-015 | The system shall allow the user to deactivate a warehouse while preserving historical stock movements. | يجب أن يسمح النظام للمستخدم بتعطيل المستودع مع الحفاظ على حركات المخزون التاريخية. |
| REQ-INV-016 | The system shall prevent the selection of deactivated warehouses in new inventory transactions. | يجب أن يمنع النظام اختيار المستودعات المعطلة في الحركات المخزنية الجديدة. |

## 3. Goods Receipts | استلامات المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-017 | The system shall allow the user to record goods receipt transactions for inventory received into a selected warehouse. | يجب أن يسمح النظام للمستخدم بتسجيل حركات استلام المخزون للأصناف المستلمة إلى مستودع محدد. |
| REQ-INV-018 | The system shall allow the user to save goods receipt transactions in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ حركات استلام المخزون كمسودات قبل الترحيل. |
| REQ-INV-019 | The system shall require a receipt date and receiving warehouse for every goods receipt transaction. | يجب أن يطلب النظام تاريخ الاستلام والمستودع المستلم لكل حركة استلام مخزون. |
| REQ-INV-020 | The system shall allow the user to reference a purchase order or purchase invoice when creating a goods receipt. | يجب أن يسمح النظام للمستخدم بالربط بأمر شراء أو فاتورة شراء عند إنشاء حركة استلام مخزون. |
| REQ-INV-021 | The system shall allow the user to enter one or more item lines with item, quantity, unit cost, unit of measure, and line description. | يجب أن يسمح النظام للمستخدم بإدخال سطر واحد أو أكثر يتضمن الصنف والكمية وتكلفة الوحدة ووحدة القياس ووصف السطر. |
| REQ-INV-022 | The system shall assign or require a unique reference number for each goods receipt transaction. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل حركة استلام مخزون. |
| REQ-INV-023 | The system shall update the on-hand quantity of received items in the selected warehouse after posting. | يجب أن يقوم النظام بتحديث الكمية المتاحة للأصناف المستلمة في المستودع المحدد بعد الترحيل. |

## 4. Goods Issues | صرف المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-024 | The system shall allow the user to record goods issue transactions for inventory issued from a selected warehouse. | يجب أن يسمح النظام للمستخدم بتسجيل حركات صرف المخزون للأصناف المصروفة من مستودع محدد. |
| REQ-INV-025 | The system shall allow the user to save goods issue transactions in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ حركات صرف المخزون كمسودات قبل الترحيل. |
| REQ-INV-026 | The system shall require an issue date and issuing warehouse for every goods issue transaction. | يجب أن يطلب النظام تاريخ الصرف والمستودع الصارف لكل حركة صرف مخزون. |
| REQ-INV-027 | The system shall allow the user to reference a sales order, sales invoice, production request, or internal request when creating a goods issue. | يجب أن يسمح النظام للمستخدم بالربط بأمر بيع أو فاتورة بيع أو طلب إنتاج أو طلب داخلي عند إنشاء حركة صرف مخزون. |
| REQ-INV-028 | The system shall allow the user to enter one or more item lines with item, quantity, unit of measure, and line description. | يجب أن يسمح النظام للمستخدم بإدخال سطر واحد أو أكثر يتضمن الصنف والكمية ووحدة القياس ووصف السطر. |
| REQ-INV-029 | The system shall assign or require a unique reference number for each goods issue transaction. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل حركة صرف مخزون. |

## 5. Inventory Transfers | تحويلات المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-030 | The system shall allow the user to transfer inventory between warehouses or inventory locations. | يجب أن يسمح النظام للمستخدم بتحويل المخزون بين المستودعات أو مواقع التخزين. |
| REQ-INV-031 | The system shall allow the user to save inventory transfer transactions in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ حركات تحويل المخزون كمسودات قبل الترحيل. |
| REQ-INV-032 | The system shall require a transfer date, source warehouse, and destination warehouse for every inventory transfer. | يجب أن يطلب النظام تاريخ التحويل والمستودع المصدر والمستودع الوجهة لكل حركة تحويل مخزون. |
| REQ-INV-033 | The system shall prevent the selection of the same warehouse as both source and destination in one transfer transaction. | يجب أن يمنع النظام اختيار المستودع نفسه كمصدر ووجهة في حركة تحويل واحدة. |
| REQ-INV-034 | The system shall allow the user to enter one or more transfer lines with item, quantity, unit of measure, and line description. | يجب أن يسمح النظام للمستخدم بإدخال سطر تحويل واحد أو أكثر يتضمن الصنف والكمية ووحدة القياس ووصف السطر. |
| REQ-INV-035 | The system shall assign or require a unique reference number for each inventory transfer transaction. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل حركة تحويل مخزون. |

## 6. Inventory Adjustments | تسويات المخزون

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-036 | The system shall allow the user to record inventory adjustment transactions for stock count differences, damage, expiry, or other discrepancies. | يجب أن يسمح النظام للمستخدم بتسجيل حركات تسوية المخزون لفروقات الجرد أو التلف أو انتهاء الصلاحية أو أي فروقات أخرى. |
| REQ-INV-037 | The system shall allow the user to save inventory adjustment transactions in draft status before posting. | يجب أن يسمح النظام للمستخدم بحفظ حركات تسوية المخزون كمسودات قبل الترحيل. |
| REQ-INV-038 | The system shall require an adjustment date, warehouse, and adjustment reason for every inventory adjustment transaction. | يجب أن يطلب النظام تاريخ التسوية والمستودع وسبب التسوية لكل حركة تسوية مخزون. |
| REQ-INV-039 | The system shall allow the user to enter one or more adjustment lines with item, system quantity, counted quantity, variance quantity, and line description. | يجب أن يسمح النظام للمستخدم بإدخال سطر تسوية واحد أو أكثر يتضمن الصنف والكمية النظامية والكمية المعدودة وكمية الفرق ووصف السطر. |
| REQ-INV-040 | The system shall support both positive and negative stock adjustments. | يجب أن يدعم النظام تسويات المخزون الموجبة والسالبة. |
| REQ-INV-041 | The system shall assign or require a unique reference number for each inventory adjustment transaction. | يجب أن يقوم النظام بتوليد أو طلب رقم مرجع فريد لكل حركة تسوية مخزون. |

## 7. Costing | احتساب التكلفة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-042 | The system shall allow the organization to define the inventory valuation method used by the system. | يجب أن يسمح النظام للمنشأة بتحديد طريقة تقييم المخزون المستخدمة في النظام. |
| REQ-INV-043 | The system shall support configured inventory valuation methods such as FIFO, weighted average cost, or another approved method based on business policy. | يجب أن يدعم النظام طرق تقييم المخزون المهيأة مثل الوارد أولاً يصرف أولاً أو متوسط التكلفة المرجح أو أي طريقة معتمدة أخرى وفق سياسة العمل. |
| REQ-INV-044 | The system shall apply the selected valuation method consistently to inventory receipts, issues, transfers where relevant, and adjustments. | يجب أن يطبق النظام طريقة التقييم المختارة بشكل متسق على استلامات المخزون وصرفه وتحويلاته حيثما كان ذلك مناسبًا وعلى التسويات. |
| REQ-INV-045 | The system shall store cost layers or equivalent valuation records required to calculate item cost and inventory value. | يجب أن يحتفظ النظام بطبقات التكلفة أو سجلات التقييم المكافئة اللازمة لاحتساب تكلفة الصنف وقيمة المخزون. |
| REQ-INV-046 | The system shall calculate item issue cost and remaining inventory value according to the selected valuation method. | يجب أن يقوم النظام باحتساب تكلفة صرف الصنف وقيمة المخزون المتبقية وفق طريقة التقييم المختارة. |

## 8. Stock Ledger & Inquiry | سجل المخزون والاستعلام

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-047 | The system shall allow the user to view stock movement history for a selected item. | يجب أن يسمح النظام للمستخدم بعرض سجل حركات المخزون لصنف محدد. |
| REQ-INV-048 | The system shall allow the user to filter stock movements by warehouse, date range, and transaction type. | يجب أن يسمح النظام للمستخدم بتصفية حركات المخزون حسب المستودع والفترة الزمنية ونوع الحركة. |
| REQ-INV-049 | The system shall display reference number, transaction date, quantity in, quantity out, and running balance for each stock movement. | يجب أن يعرض النظام رقم المرجع وتاريخ الحركة والكمية الداخلة والكمية الخارجة والرصيد الجاري لكل حركة مخزون. |
| REQ-INV-050 | The system shall allow the user to drill down from stock inquiry to the source inventory transaction details. | يجب أن يسمح النظام للمستخدم بالانتقال من استعلام المخزون إلى تفاصيل الحركة المخزنية المصدر. |

## 9. Posting & Accounting Logic | الترحيل والمنطق المحاسبي

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-051 | The system shall automatically create the related accounting entry when a goods receipt transaction is posted and accounting integration is enabled. | يجب أن يقوم النظام تلقائيًا بإنشاء القيد المحاسبي المرتبط عند ترحيل حركة استلام مخزون وعند تفعيل التكامل المحاسبي. |
| REQ-INV-052 | The system shall automatically create the related accounting entry when a goods issue transaction is posted and accounting integration is enabled. | يجب أن يقوم النظام تلقائيًا بإنشاء القيد المحاسبي المرتبط عند ترحيل حركة صرف مخزون وعند تفعيل التكامل المحاسبي. |
| REQ-INV-053 | The system shall automatically create the related accounting entry when an inventory adjustment transaction is posted and accounting integration is enabled. | يجب أن يقوم النظام تلقائيًا بإنشاء القيد المحاسبي المرتبط عند ترحيل حركة تسوية مخزون وعند تفعيل التكامل المحاسبي. |
| REQ-INV-054 | The system shall update stock balances and inventory valuation only when the inventory transaction is posted successfully. | يجب أن يقوم النظام بتحديث أرصدة المخزون وتقييمه فقط عند نجاح ترحيل الحركة المخزنية. |
| REQ-INV-055 | The system shall lock posted inventory transactions so they cannot be edited directly without proper authorization or reversal. | يجب أن يقوم النظام بقفل الحركات المخزنية المرحلة بحيث لا يمكن تعديلها مباشرة دون صلاحية مناسبة أو عملية عكس. |

## 10. Validation & Control Rules | قواعد التحقق والرقابة

| Req ID | English Requirement | الترجمة العربية |
| --- | --- | --- |
| REQ-INV-056 | The system shall prevent posting inventory transactions with missing mandatory fields. | يجب أن يمنع النظام ترحيل الحركات المخزنية التي تحتوي على حقول إلزامية مفقودة. |
| REQ-INV-057 | The system shall prevent posting inventory transactions for deactivated items or deactivated warehouses. | يجب أن يمنع النظام ترحيل الحركات المخزنية المرتبطة بأصناف معطلة أو مستودعات معطلة. |
| REQ-INV-058 | The system shall prevent duplicate reference numbers within the same inventory transaction type according to system policy. | يجب أن يمنع النظام تكرار أرقام المراجع داخل نوع الحركة المخزنية نفسه وفق سياسة النظام. |
| REQ-INV-059 | The system shall maintain a history of all draft, posted, reversed, and adjusted inventory transactions for audit purposes. | يجب أن يحتفظ النظام بسجل لجميع الحركات المخزنية في حالات المسودة والمرحلة والمعكوسة والمسوّاة لأغراض المراجعة والتدقيق. |
| REQ-INV-060 | The system shall enforce stock availability rules according to configuration, including prevent-negative-stock policy where enabled. | يجب أن يفرض النظام قواعد توفر المخزون وفق الإعدادات، بما في ذلك سياسة منع المخزون السالب عند تفعيلها. |
